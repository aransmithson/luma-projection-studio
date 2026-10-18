import { describe, expect, it } from "vitest";
import { bounds, contains, rotate } from "./geometry";
import { surfaceOutline, validSurfaceGeometry } from "./curves";
import { changeSurface } from "./cutouts";
import {
  createProject,
  createSurface,
  parseProject,
  serializeProject,
} from "./model";
import {
  editableOutline,
  frameFromDrag,
  presetGeometry,
  presetLabels,
  ringHoleGeometry,
  smoothCorner,
  type ShapePreset,
} from "./shapePresets";

describe("preset placement and outline refinement", () => {
  it.each(Object.keys(presetLabels) as ShapePreset[])(
    "%s stays inside the dragged frame and survives project save/open",
    (preset) => {
      const frame = { x: 0.15, y: 0.2, width: 0.63, height: 0.55 };
      const geometry = presetGeometry(preset, frame);
      expect(validSurfaceGeometry(geometry)).toBe(true);
      const outline = surfaceOutline(geometry);
      for (const p of outline) {
        expect(p.x).toBeGreaterThanOrEqual(frame.x - 1e-9);
        expect(p.x).toBeLessThanOrEqual(frame.x + frame.width + 1e-9);
        expect(p.y).toBeGreaterThanOrEqual(frame.y - 1e-9);
        expect(p.y).toBeLessThanOrEqual(frame.y + frame.height + 1e-9);
      }
      const project = createProject("blank");
      project.surfaces = [{ ...createSurface(geometry.kind, 1), ...geometry }];
      expect(parseProject(serializeProject(project))).toEqual(project);
    },
  );
  it("draws equal projector-pixel sides in all four directions and clamps without distorting them", () => {
    for (const end of [
      { x: 0.95, y: 0.95 },
      { x: 0.01, y: 0.95 },
      { x: 0.95, y: 0.01 },
      { x: 0.01, y: 0.01 },
    ]) {
      const f = frameFromDrag({ x: 0.2, y: 0.7 }, end, true, 1920, 1080);
      expect(f.width * 1920).toBeCloseTo(f.height * 1080, 7);
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.x + f.width).toBeLessThanOrEqual(1);
      expect(f.y + f.height).toBeLessThanOrEqual(1);
    }
  });
  it("does not accept an accidental click as valid shape geometry", () => {
    const f = frameFromDrag(
      { x: 0.4, y: 0.5 },
      { x: 0.4, y: 0.5 },
      false,
      1920,
      1080,
    );
    expect(validSurfaceGeometry(presetGeometry("quad", f))).toBe(false);
  });
  it("keeps a ring's editable hole inside the outer surface through group rotation", () => {
    const f = { x: 0.3, y: 0.2, width: 0.4, height: 0.5 };
    const parent = {
      ...createSurface("ellipse", 1),
      ...presetGeometry("ring", f),
    };
    const hole = {
      ...createSurface("ellipse", 2),
      ...ringHoleGeometry(f),
      cutoutOf: parent.id,
    };
    const result = changeSurface([parent, hole], parent.id, {
      points: rotate(parent.points, 31, 16 / 9),
    });
    expect(result).not.toEqual([parent, hole]);
    expect(result.every(validSurfaceGeometry)).toBe(true);
    expect(result[1].points.every((p) => contains(result[0].points, p))).toBe(
      true,
    );
    const project = createProject("blank");
    project.surfaces = result;
    expect(parseProject(serializeProject(project))).toEqual(project);
  });
  it("smooths the tangent at a corner without moving its anchor or far handles", () => {
    const surface = createSurface("polygon", 1);
    const before = structuredClone(surface);
    const change = smoothCorner(surface, 0, 16 / 9)!;
    expect(change).not.toBeNull();
    const incoming = change.curves![3]!.control2,
      outgoing = change.curves![0]!.control1,
      p = surface.points[0];
    expect(
      (incoming.x - p.x) * (outgoing.y - p.y) -
        (incoming.y - p.y) * (outgoing.x - p.x),
    ).toBeCloseTo(0, 9);
    expect(
      (incoming.x - p.x) * (outgoing.x - p.x) +
        (incoming.y - p.y) * (outgoing.y - p.y),
    ).toBeLessThan(0);
    expect(validSurfaceGeometry({ ...surface, ...change })).toBe(true);
    expect(surface).toEqual(before);
    expect(smoothCorner({ ...surface, locked: true }, 0, 16 / 9)).toBeNull();
  });
  it("rejects a smooth tangent that would leave the projector canvas", () => {
    const surface = {
      ...createSurface("quad", 1),
      ...presetGeometry("quad", { x: 0, y: 0, width: 0.7, height: 0.7 }),
    };
    expect(smoothCorner(surface, 0, 16 / 9)).toBeNull();
  });
  it("converts a rotated ellipse to four smooth editable arcs without changing its position", () => {
    const surface = createSurface("ellipse", 1);
    surface.points = rotate(surface.points, 29, 16 / 9);
    const change = editableOutline(surface)!;
    expect(change.kind).toBe("polygon");
    expect(change.points).toHaveLength(4);
    expect(change.curves?.filter(Boolean)).toHaveLength(4);
    expect(validSurfaceGeometry({ ...surface, ...change })).toBe(true);
    const a = bounds(surface.points),
      b = bounds(surfaceOutline({ ...surface, ...change }));
    expect(a.x + a.width / 2).toBeCloseTo(b.x + b.width / 2, 6);
    expect(a.y + a.height / 2).toBeCloseTo(b.y + b.height / 2, 6);
    // Each extreme stays within a projector pixel of the original sampled ellipse.
    expect(Math.abs(a.x - b.x) * 1920).toBeLessThan(1);
    expect(Math.abs(a.y - b.y) * 1080).toBeLessThan(1);
    expect(Math.abs(a.x + a.width - b.x - b.width) * 1920).toBeLessThan(1);
    expect(Math.abs(a.y + a.height - b.y - b.height) * 1080).toBeLessThan(1);
  });
  it("preserves irregular imported ellipse outlines rather than fitting a different curve", () => {
    const surface = createSurface("ellipse", 1);
    surface.points[8] = {
      x: surface.points[8].x + 0.01,
      y: surface.points[8].y,
    };
    expect(validSurfaceGeometry(surface)).toBe(true);
    const change = editableOutline(surface)!;
    expect({ ...surface, ...change }.points).toEqual(surface.points);
    expect(change.kind).toBe("polygon");
  });
  it("leaves an existing hole in place when its parent ellipse becomes editable", () => {
    const surface = createSurface("ellipse", 1),
      hole = {
        ...createSurface("ellipse", 2),
        ...ringHoleGeometry(bounds(surface.points)),
        cutoutOf: surface.id,
      };
    const result = changeSurface(
      [surface, hole],
      surface.id,
      editableOutline(surface)!,
    );
    expect(result[1]).toEqual(hole);
    expect(result[0].kind).toBe("polygon");
  });
});
