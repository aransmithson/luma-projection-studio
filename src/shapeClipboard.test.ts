import { describe, expect, it } from "vitest";
import {
  createProject,
  createSurface,
  parseProject,
  serializeProject,
} from "./model";
import { copyShapeData, pastedShapes } from "./shapeClipboard";
import { defaultColorOverlay } from "./compositing";
import { presetGeometry } from "./shapePresets";

function fixture() {
  const p = createProject("blank"),
    source = p.surfaces[0];
  Object.assign(
    source,
    presetGeometry("arch", { x: 0.2, y: 0.2, width: 0.5, height: 0.6 }),
    {
      effectId: "single-eyeball",
      effectSide: "right",
      colorCycle: true,
      colorOverlay: defaultColorOverlay,
      blend: "screen",
      locked: true,
    },
  );
  p.surfaces.push({ ...createSurface("quad", 2), cutoutOf: source.id });
  return p;
}
describe("shape clipboard", () => {
  it("pastes independent IDs and preserves effects, curves and holes", () => {
    const p = fixture(),
      before = structuredClone(p),
      data = copyShapeData(p, p.surfaces[0].id),
      copies = pastedShapes(data, 2, 0);
    expect(copies).toHaveLength(2);
    expect(copies[0].id).not.toBe(p.surfaces[0].id);
    expect(copies[1].cutoutOf).toBe(copies[0].id);
    expect(copies[0]).toMatchObject({
      ...p.surfaces[0],
      id: copies[0].id,
      name: `${p.surfaces[0].name} copy`,
      locked: false,
    });
    expect(p).toEqual(before);
    copies[0].points[0].x += 0.01;
    expect(p).toEqual(before);
  });
  it("uses a snapshot, even after the original is edited or removed", () => {
    const p = fixture(),
      data = copyShapeData(p, p.surfaces[0].id);
    p.surfaces = [];
    expect(pastedShapes(data, 0)).toHaveLength(2);
  });
  it("keeps group offsets together and clamps all points and curve handles to the canvas", () => {
    const p = fixture(),
      data = copyShapeData(p, p.surfaces[0].id);
    const copies = pastedShapes(data, 0, 5);
    const dx = copies[0].points[0].x - p.surfaces[0].points[0].x;
    expect(copies[1].points[0].x - p.surfaces[1].points[0].x).toBeCloseTo(dx);
    expect(
      parseProject(serializeProject({ ...p, surfaces: copies })),
    ).toBeTruthy();
  });
  it("copies a hole by itself as a regular shape, independent of its old parent", () => {
    const p = fixture(),
      copies = pastedShapes(copyShapeData(p, p.surfaces[1].id), 0, 0);
    expect(copies).toHaveLength(1);
    expect(copies[0].cutoutOf).toBeUndefined();
  });
  it("does not carry source layer IDs into a different project", () => {
    const p = fixture();
    p.surfaces.forEach((s) => (s.layerId = "old-layer"));
    const copies = pastedShapes(copyShapeData(p, p.surfaces[0].id), 0);
    expect(copies.every((s) => s.layerId === undefined)).toBe(true);
  });
  it("rejects the whole paste at capacity", () => {
    const p = fixture(),
      data = copyShapeData(p, p.surfaces[0].id);
    expect(pastedShapes(data, 30)).toHaveLength(2);
    expect(() => pastedShapes(data, 31)).toThrow("Nothing was pasted");
  });
  it("rejects arbitrary text, malformed geometry and unrelated extra shapes", () => {
    const p = fixture();
    expect(() => pastedShapes("hello", 0)).toThrow();
    expect(() => pastedShapes("LUMA_SHAPES_V1\n{", 0)).toThrow();
    p.surfaces[0].points[0].x = NaN;
    expect(() => pastedShapes(copyShapeData(p, p.surfaces[0].id), 0)).toThrow();
    const unrelated = createProject("winter");
    expect(() =>
      pastedShapes("LUMA_SHAPES_V1\n" + serializeProject(unrelated), 0),
    ).toThrow();
  });
});
