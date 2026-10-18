import { describe, expect, it } from "vitest";
import {
  cubicPoint,
  edgeCurve,
  insertSurfaceCorner,
  removeSurfaceCorner,
  surfaceOutline,
  transformCurves,
  validSurfaceGeometry,
} from "./curves";
import {
  createProject,
  createSurface,
  parseProject,
  serializeProject,
} from "./model";
import { polygonArea, rotate, translate } from "./geometry";

describe("Bézier mapping", () => {
  const curved = () => {
    const surface = createSurface("polygon", 1, [
      { x: 0.2, y: 0.25 },
      { x: 0.8, y: 0.25 },
      { x: 0.8, y: 0.75 },
      { x: 0.2, y: 0.75 },
    ]);
    surface.curves = edgeCurve(surface, 0, true);
    surface.curves[0]!.control1.y = 0.1;
    surface.curves[0]!.control2.y = 0.1;
    return surface;
  };
  it("renders a curved outline while retaining editable anchors", () => {
    const surface = curved(),
      outline = surfaceOutline(surface);
    expect(surface.points).toHaveLength(4);
    expect(outline.length).toBeGreaterThan(32);
    expect(outline.length).toBeLessThanOrEqual(192);
    expect(surfaceOutline(surface, 64).length).toBeLessThanOrEqual(64);
    expect(polygonArea(outline)).toBeGreaterThan(polygonArea(surface.points));
    expect(validSurfaceGeometry(surface)).toBe(true);
  });
  it("splits a curved edge without changing its path", () => {
    const surface = curved(),
      change = insertSurfaceCorner(surface, 0)!;
    expect(change.points).toHaveLength(5);
    for (const t of [0, 0.2, 0.5, 0.8, 1]) {
      const actual = cubicPoint(
          change.points![0],
          change.curves![0]!,
          change.points![1],
          t,
        ),
        expected = cubicPoint(
          surface.points[0],
          surface.curves![0]!,
          surface.points[1],
          t / 2,
        );
      expect(actual.x).toBeCloseTo(expected.x, 8);
      expect(actual.y).toBeCloseTo(expected.y, 8);
    }
  });
  it("allows curved edges on narrow projection details without rejecting fine tessellation", () => {
    const surface = createSurface("quad", 1, [
      { x: 0.2, y: 0.25 },
      { x: 0.205, y: 0.25 },
      { x: 0.205, y: 0.75 },
      { x: 0.2, y: 0.75 },
    ]);
    surface.curves = edgeCurve(surface, 0, true);
    expect(validSurfaceGeometry(surface)).toBe(true);
    surface.curves[0]!.control1.y -= 0.001;
    expect(validSurfaceGeometry(surface)).toBe(true);
  });
  it("translates and rotates handles along with the whole surface", () => {
    const surface = curved(),
      moved = translate(surface.points, 0.05, 0.03),
      curves = transformCurves(surface.points, moved, surface.curves)!;
    expect(curves[0]!.control1.x).toBeCloseTo(
      surface.curves![0]!.control1.x + 0.05,
      8,
    );
    expect(curves[0]!.control2.y).toBeCloseTo(0.13, 8);
    const turned = rotate(surface.points, 15, 1920 / 1080),
      controls = transformCurves(surface.points, turned, surface.curves);
    expect(
      validSurfaceGeometry({ ...surface, points: turned, curves: controls }),
    ).toBe(true);
  });
  it("rejects crossed curves, invalid handles and mismatched edge lists", () => {
    const surface = curved();
    surface.curves![0]!.control1.y = 1;
    surface.curves![0]!.control2.y = 1;
    expect(validSurfaceGeometry(surface)).toBe(false);
    surface.curves = edgeCurve(surface, 0, true);
    surface.curves[0]!.control1.x = -1;
    expect(validSurfaceGeometry(surface)).toBe(false);
    surface.curves = [];
    expect(validSurfaceGeometry(surface)).toBe(false);
  });
  it("round-trips curves and keeps geometry valid after removing an anchor", () => {
    const project = createProject("blank"),
      surface = curved();
    project.surfaces = [surface];
    expect(parseProject(serializeProject(project))).toEqual(project);
    const change = removeSurfaceCorner(surface, 1)!;
    expect(validSurfaceGeometry({ ...surface, ...change })).toBe(true);
    expect(change.curves).toHaveLength(3);
  });
});
