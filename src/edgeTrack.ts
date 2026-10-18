import type { Point } from "./types";

export type EdgeTrack = {
  points: Point[];
  distances: number[];
  length: number;
};
const wrap = (n: number, length: number) => ((n % length) + length) % length;

export function createEdgeTrack(
  points: Point[],
  width = 1,
  height = 1,
): EdgeTrack {
  const pixels = points.map((p) => ({ x: p.x * width, y: p.y * height }));
  const distances = [0];
  for (let i = 0; i < pixels.length; i++) {
    const a = pixels[i],
      b = pixels[(i + 1) % pixels.length];
    distances.push(distances[i] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return { points: pixels, distances, length: distances.at(-1) || 0 };
}

function atDistance(track: EdgeTrack, distance: number) {
  const d = wrap(distance, track.length);
  let low = 0,
    high = track.points.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (track.distances[mid] <= d) low = mid;
    else high = mid - 1;
  }
  const a = track.points[low],
    b = track.points[(low + 1) % track.points.length];
  const fraction =
    (d - track.distances[low]) /
    Math.max(1e-12, track.distances[low + 1] - track.distances[low]);
  return {
    index: low,
    point: { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction },
  };
}

export function edgeTrackPoint(track: EdgeTrack, progress: number): Point {
  if (track.length <= 0) return track.points[0] || { x: 0, y: 0 };
  return atDistance(track, progress * track.length).point;
}

// Include every corner crossed by a trail segment so it never cuts across a concave boundary.
export function edgeTrackSection(
  track: EdgeTrack,
  from: number,
  to: number,
): Point[] {
  if (track.length <= 0 || to <= from) return [];
  const distance = wrap(from * track.length, track.length),
    end = distance + (to - from) * track.length;
  const start = atDistance(track, distance),
    points = [start.point];
  let next = start.index + 1,
    lap = 0;
  while (lap <= Math.ceil(to - from)) {
    const boundary = track.distances[next] + lap * track.length;
    if (boundary >= end) break;
    points.push(track.points[next % track.points.length]);
    next++;
    if (next > track.points.length) {
      next = 1;
      lap++;
    }
  }
  points.push(atDistance(track, end).point);
  return points;
}
