import { describe, expect, it } from "vitest";
import { createTrainTrack } from "./trainTrack";
import { contains, isSimplePolygon } from "./geometry";
import { edgeTrackPoint } from "./edgeTrack";
import { surfaceOutline } from "./curves";
import { createSurface } from "./model";

describe("shape-following railway", () => {
  const rectangle = [
    { x: 0.2, y: 0.1 },
    { x: 0.8, y: 0.1 },
    { x: 0.8, y: 0.9 },
    { x: 0.2, y: 0.9 },
  ];
  it("insets by a pixel distance, independent of outline winding", () => {
    const track = createTrainTrack(rectangle, 800, 400, 20);
    expect(track.points[0].x).toBeCloseTo(20);
    expect(track.points[0].y).toBeCloseTo(20);
    expect(track.points[2].x).toBeCloseTo(780);
    expect(track.points[2].y).toBeCloseTo(380);
    expect(track.length).toBeCloseTo(2240);
    const reversed = createTrainTrack([...rectangle].reverse(), 800, 400, 20);
    expect(reversed.length).toBeCloseTo(track.length);
    for (const p of reversed.points)
      expect(
        track.points.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1e-6),
      ).toBe(true);
    expect(edgeTrackPoint(track, 0.23)).toEqual(edgeTrackPoint(track, 1.23));
  });
  it("keeps a narrow concave track inside the shape and preserves input geometry", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.15 },
      { x: 0.15, y: 0.15 },
      { x: 0.15, y: 1 },
      { x: 0, y: 1 },
    ];
    const before = JSON.stringify(points),
      track = createTrainTrack(points, 800, 400, 35);
    expect(isSimplePolygon(track.points)).toBe(true);
    for (let i = 0; i < 400; i++) {
      const p = edgeTrackPoint(track, i / 400);
      expect(contains(points, { x: p.x / 800, y: p.y / 400 })).toBe(true);
    }
    expect(JSON.stringify(points)).toBe(before);
  });
  it("retains curved boundaries and changes when a control point moves", () => {
    const surface = createSurface("quad", 1, rectangle, "toy-train");
    surface.curves = [
      { control1: { x: 0.3, y: 0.32 }, control2: { x: 0.7, y: 0.32 } },
      null,
      null,
      null,
    ];
    const outline = surfaceOutline(surface),
      track = createTrainTrack(outline, 800, 400, 14);
    expect(track.points.length).toBeGreaterThan(4);
    const before = JSON.stringify(track.points);
    surface.curves[0]!.control1.y = 0.45;
    expect(
      JSON.stringify(
        createTrainTrack(surfaceOutline(surface), 800, 400, 14).points,
      ),
    ).not.toBe(before);
    expect(
      track.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
    ).toBe(true);
  });
});
