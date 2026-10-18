import { describe, expect, it } from "vitest";
import { createEdgeTrack, edgeTrackPoint, edgeTrackSection } from "./edgeTrack";

const square = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];
const pathLength = (points: { x: number; y: number }[]) =>
  points
    .slice(1)
    .reduce(
      (sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y),
      0,
    );

describe("light travelling along a shape perimeter", () => {
  it("uses physical edge lengths rather than equal time for unequal edges", () => {
    const track = createEdgeTrack(square, 300, 100);
    expect(track.length).toBe(800);
    expect(edgeTrackPoint(track, 1 / 8)).toEqual({ x: 100, y: 0 });
    expect(edgeTrackPoint(track, 3 / 8)).toEqual({ x: 300, y: 0 });
    expect(edgeTrackPoint(track, 1 / 2)).toEqual({ x: 300, y: 100 });
    expect(edgeTrackPoint(track, 7 / 8)).toEqual({ x: 0, y: 100 });
  });
  it("wraps both the head and trailing light continuously across the start corner", () => {
    const track = createEdgeTrack(square, 100, 100);
    expect(edgeTrackPoint(track, 1)).toEqual(edgeTrackPoint(track, 0));
    expect(edgeTrackPoint(track, -0.125)).toEqual(edgeTrackPoint(track, 0.875));
    expect(edgeTrackSection(track, 0.875, 1.125)).toEqual([
      { x: 0, y: 50 },
      { x: 0, y: 0 },
      { x: 50, y: 0 },
    ]);
    expect(edgeTrackSection(track, -0.125, 0.125)).toEqual(
      edgeTrackSection(track, 0.875, 1.125),
    );
  });
  it("keeps concave corners in a trail instead of cutting across the shape", () => {
    const track = createEdgeTrack([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 3 },
      { x: 0, y: 3 },
    ]);
    const trail = edgeTrackSection(track, 5 / 12, 7 / 12);
    expect(trail).toEqual([
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ]);
    expect(pathLength(trail)).toBeCloseTo(2);
  });
  it("travels equal distances through many corners at every phase", () => {
    const track = createEdgeTrack([
      { x: 0, y: 0 },
      { x: 8, y: 0 },
      { x: 8, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 3 },
      { x: 0, y: 3 },
    ]);
    for (const start of [-0.3, 0, 0.23, 0.49, 0.99, 45.6]) {
      expect(
        pathLength(edgeTrackSection(track, start, start + 0.23)),
      ).toBeCloseTo(track.length * 0.23, 8);
    }
  });
  it("preserves full laps including the closing edge", () => {
    const track = createEdgeTrack(square);
    expect(pathLength(edgeTrackSection(track, 0.1, 2.1))).toBeCloseTo(8);
    expect(edgeTrackSection(track, 0, 1)).toEqual([...square, square[0]]);
  });
  it("handles degenerate outlines without non-finite coordinates", () => {
    expect(edgeTrackPoint(createEdgeTrack([]), 0.7)).toEqual({ x: 0, y: 0 });
    const point = createEdgeTrack([
      { x: 0.3, y: 0.7 },
      { x: 0.3, y: 0.7 },
    ]);
    expect(edgeTrackPoint(point, 0.7)).toEqual({ x: 0.3, y: 0.7 });
    expect(edgeTrackSection(point, 0, 1)).toEqual([]);
    const duplicate = createEdgeTrack([square[0], ...square]);
    expect(edgeTrackPoint(duplicate, 0.125)).toEqual({ x: 0.5, y: 0 });
  });
});
