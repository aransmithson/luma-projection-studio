import { describe, expect, it } from "vitest";
import {
  createProject,
  createSurface,
  parseProject,
  serializeProject,
} from "./model";
import {
  addLayer,
  changeLayer,
  layerFor,
  layerIdFor,
  layerRows,
  layersFor,
  moveToLayer,
  removeLayer,
  renderedProject,
  projectionItems,
  reorderLayer,
  reorderSurface,
} from "./layers";
import { effectiveSolo, subtractSurface } from "./cutouts";
import { createLiquidStack, withStack } from "./stacks";

function fixture() {
  const p = createProject("blank"),
    parent = p.surfaces[0];
  p.surfaces.push({ ...createSurface("quad", 2), cutoutOf: parent.id });
  p.surfaces.push(createSurface("triangle", 3));
  return addLayer(p, "front");
}
describe("named layers", () => {
  it("keeps holes beneath their parent after reordering", () => {
    const p = fixture(),
      [parent, hole, other] = p.surfaces;
    expect(layerRows(p, layersFor(p)[0].id).map((s) => s.id)).toEqual([
      other.id,
      parent.id,
      hole.id,
    ]);
    const next = reorderSurface(p, parent.id, 1);
    expect(layerRows(next, layersFor(p)[0].id).map((s) => s.id)).toEqual([
      parent.id,
      hole.id,
      other.id,
    ]);
  });
  it("releases solo when the parent of a selected hole is hidden", () => {
    const p = fixture(),
      [parent, hole] = p.surfaces;
    expect(effectiveSolo(p.surfaces, hole.id)).toBe(parent.id);
    parent.visible = false;
    expect(effectiveSolo(p.surfaces, hole.id)).toBeNull();
    expect(effectiveSolo(p.surfaces, "deleted")).toBeNull();
  });
  it("places liquid links after their topmost member and beneath foreground layers", () => {
    const { project, stack } = createLiquidStack(createProject("blank"))!;
    let p = addLayer(project, "front");
    p = moveToLayer(p, p.surfaces[0].id, "front");
    const items = projectionItems(p);
    expect(items.at(-1)).toHaveProperty("surface.id", project.surfaces[0].id);
    expect(items.at(-2)).toHaveProperty("stack.id", stack.id);
    expect(projectionItems(p)).toBe(items);
    expect(renderedProject(renderedProject(p))).toBe(renderedProject(p));
    const hidden = {
      ...p,
      surfaces: p.surfaces.map((s) =>
        s.id === stack.surfaceIds[2] ? { ...s, visible: false } : s,
      ),
    };
    expect(projectionItems(hidden).at(-2)).toHaveProperty("stack.id", stack.id);
    const lowered = reorderLayer(p, "front", -1);
    expect(projectionItems(lowered).at(-1)).toHaveProperty(
      "stack.id",
      stack.id,
    );
  });
  it("reads legacy projects without rewriting their saved format", () => {
    const p = createProject("winter");
    expect(layersFor(p)).toHaveLength(1);
    expect(renderedProject(p)).toBe(p);
    expect(parseProject(serializeProject(p))).toEqual(p);
    expect(p.layers).toBeUndefined();
  });
  it("moves a parent and holes together, even when a hole is selected", () => {
    const p = fixture(),
      next = moveToLayer(p, p.surfaces[1].id, "front");
    expect(next.surfaces.filter((s) => s.layerId === "front")).toHaveLength(2);
    expect(layerIdFor(next, next.surfaces[0])).toBe(layersFor(p)[0].id);
    expect(parseProject(serializeProject(next))).toEqual(next);
  });
  it("hides and locks the group without changing per-shape settings", () => {
    const p = fixture(),
      id = layersFor(p)[0].id;
    p.surfaces[2].visible = false;
    const changed = changeLayer(p, id, { visible: false, locked: true });
    expect(
      renderedProject(changed).surfaces.every((s) => !s.visible && s.locked),
    ).toBe(true);
    expect(changed.surfaces).toEqual(p.surfaces);
    const restored = changeLayer(changed, id, { visible: true, locked: false });
    expect(renderedProject(restored).surfaces.map((s) => s.visible)).toEqual([
      true,
      true,
      false,
    ]);
    expect(renderedProject(changed)).toBe(renderedProject(changed));
  });
  it("orders whole layers while preserving their internal order", () => {
    let p = fixture();
    p = moveToLayer(p, p.surfaces[0].id, "front");
    const before = renderedProject(p).surfaces.map((s) => s.id);
    p = reorderLayer(p, "front", -1);
    expect(renderedProject(p).surfaces.map((s) => s.id)).toEqual([
      before[1],
      before[2],
      before[0],
    ]);
  });
  it("only reorders regular shapes within the same layer", () => {
    const p = fixture();
    expect(reorderSurface(p, p.surfaces[1].id, 1)).toBe(p);
    const reordered = reorderSurface(p, p.surfaces[0].id, 1);
    expect(reordered.surfaces[2].id).toBe(p.surfaces[0].id);
    const moved = moveToLayer(p, p.surfaces[2].id, "front");
    expect(reorderSurface(moved, p.surfaces[0].id, 1)).toBe(moved);
  });
  it("prevents edits across locked layers and locked shape groups", () => {
    const p = fixture(),
      id = layersFor(p)[0].id;
    const locked = changeLayer(p, id, { locked: true });
    expect(moveToLayer(locked, p.surfaces[0].id, "front")).toBe(locked);
    expect(reorderLayer(locked, "front", -1)).toBe(locked);
    expect(reorderSurface(locked, p.surfaces[0].id, 1)).toBe(locked);
    expect(subtractSurface(locked, p.surfaces[0].id, p.surfaces[2].id)).toBe(
      locked,
    );
    p.surfaces[1].locked = true;
    expect(moveToLayer(p, p.surfaces[0].id, "front")).toBe(p);
    const destinationLocked = changeLayer(p, "front", { locked: true });
    expect(moveToLayer(destinationLocked, p.surfaces[2].id, "front")).toBe(
      destinationLocked,
    );
  });
  it("moves a subtracted shape into its parent's layer", () => {
    let p = fixture();
    p = moveToLayer(p, p.surfaces[2].id, "front");
    const next = subtractSurface(p, p.surfaces[0].id, p.surfaces[2].id);
    expect(next.surfaces[2].layerId).toBe(next.surfaces[0].layerId);
    expect(parseProject(serializeProject(next))).toEqual(next);
  });
  it("only removes empty unlocked layers and retains one", () => {
    const p = fixture(),
      id = layersFor(p)[0].id;
    expect(removeLayer(p, id)).toBe(p);
    const next = removeLayer(p, "front");
    expect(next.layers).toHaveLength(1);
    expect(removeLayer(next, id)).toBe(next);
  });
  it("creates liquid stacks in the chosen layer and protects locked members", () => {
    const p = fixture(),
      result = createLiquidStack(p, "front")!;
    expect(
      result.project.surfaces.slice(-3).every((s) => s.layerId === "front"),
    ).toBe(true);
    const locked = changeLayer(result.project, "front", { locked: true });
    expect(createLiquidStack(locked, "front")).toBeNull();
    expect(withStack(locked, { ...result.stack, color: "#ff0000" })).toBe(
      locked,
    );
  });
  it("validates layer IDs, references, hole membership and the layer limit", () => {
    const p = fixture();
    for (const bad of [
      { ...p, layers: [] },
      { ...p, layers: [p.layers![0], p.layers![0]] },
      {
        ...p,
        layers: Array.from({ length: 17 }, (_, i) => ({
          ...p.layers![0],
          id: `layer-${i}`,
        })),
      },
      { ...p, surfaces: p.surfaces.map((s) => ({ ...s, layerId: "missing" })) },
      {
        ...p,
        surfaces: p.surfaces.map((s, i) =>
          i === 1 ? { ...s, layerId: "front" } : s,
        ),
      },
    ])
      expect(() => parseProject(serializeProject(bad))).toThrow();
    expect(layerFor(p, p.surfaces[0]).name).toBe("Layer 1");
  });
});
