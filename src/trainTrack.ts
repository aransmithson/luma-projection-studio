import { bounds, contains, isSimplePolygon } from "./geometry";
import { createEdgeTrack } from "./edgeTrack";
import type { Point } from "./types";

// Offset toward the polygon interior. Back off on tight or concave shapes so
// the railway remains a valid closed contour, even after a placement edit.
export function createTrainTrack(
  outline: Point[],
  width: number,
  height: number,
  inset: number,
  fit = true,
) {
  const b = fit ? bounds(outline) : { x: 0, y: 0, width: 1, height: 1 };
  const pixels = outline.map((p) => ({
    x: ((p.x - b.x) / Math.max(b.width, 1e-8)) * width,
    y: ((p.y - b.y) / Math.max(b.height, 1e-8)) * height,
  }));
  const winding =
    Math.sign(
      pixels.reduce((sum, p, i) => {
        const q = pixels[(i + 1) % pixels.length];
        return sum + p.x * q.y - q.x * p.y;
      }, 0),
    ) || 1;
  const normalize = (points: Point[]) =>
    points.map((p) => ({ x: p.x / width, y: p.y / height }));
  for (let attempt = 0; attempt < 8; attempt++) {
    const offset = inset / 2 ** attempt;
    const insetPoints = pixels.map((p, i) => {
      const a = pixels[(i + pixels.length - 1) % pixels.length],
        b = pixels[(i + 1) % pixels.length];
      const d1 = Math.max(1e-8, Math.hypot(p.x - a.x, p.y - a.y)),
        d2 = Math.max(1e-8, Math.hypot(b.x - p.x, b.y - p.y));
      const n1 = {
          x: (-(p.y - a.y) / d1) * winding,
          y: ((p.x - a.x) / d1) * winding,
        },
        n2 = {
          x: (-(b.y - p.y) / d2) * winding,
          y: ((b.x - p.x) / d2) * winding,
        };
      const divisor = Math.max(0.2, 1 + n1.x * n2.x + n1.y * n2.y);
      const dx = ((n1.x + n2.x) * offset) / divisor,
        dy = ((n1.y + n2.y) * offset) / divisor;
      const limit = Math.min(
        1,
        (offset * 3) / Math.max(1e-8, Math.hypot(dx, dy)),
      );
      return { x: p.x + dx * limit, y: p.y + dy * limit };
    });
    if (
      isSimplePolygon(normalize(insetPoints), 1e-8) &&
      insetPoints.every((p, i) => {
        const q = insetPoints[(i + 1) % insetPoints.length];
        return [0, 0.25, 0.5, 0.75].every((f) =>
          contains(pixels, {
            x: p.x + (q.x - p.x) * f,
            y: p.y + (q.y - p.y) * f,
          }),
        );
      })
    )
      return createEdgeTrack(insetPoints);
  }
  return createEdgeTrack(pixels);
}
