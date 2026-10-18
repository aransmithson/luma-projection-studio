import { isSimplePolygon, validPoints } from "./geometry";
import type { BezierEdge, Point, Surface } from "./types";

export const mixPoint = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
export function cubicPoint(
  a: Point,
  curve: BezierEdge,
  b: Point,
  t: number,
): Point {
  const s = 1 - t;
  return {
    x:
      s ** 3 * a.x +
      3 * s * s * t * curve.control1.x +
      3 * s * t * t * curve.control2.x +
      t ** 3 * b.x,
    y:
      s ** 3 * a.y +
      3 * s * s * t * curve.control1.y +
      3 * s * t * t * curve.control2.y +
      t ** 3 * b.y,
  };
}
export const hasCurves = (surface: Pick<Surface, "curves">) =>
  !!surface.curves?.some(Boolean);
export function surfaceOutline(
  surface: Pick<Surface, "points" | "curves">,
  budget = 192,
): Point[] {
  if (!hasCurves(surface)) return surface.points;
  const count = surface.curves!.filter(Boolean).length,
    straight = surface.points.length - count;
  const steps = Math.max(1, Math.floor((budget - straight) / count));
  return surface.points.flatMap((point, i) => {
    const curve = surface.curves?.[i];
    return curve
      ? Array.from({ length: steps }, (_, j) =>
          cubicPoint(
            point,
            curve,
            surface.points[(i + 1) % surface.points.length],
            j / steps,
          ),
        )
      : [point];
  });
}
export function surfacePath(
  surface: Pick<Surface, "points" | "curves">,
  width: number,
  height: number,
) {
  const p = (v: Point) => `${v.x * width},${v.y * height}`;
  return (
    `M${p(surface.points[0])} ` +
    surface.points
      .map((_, i) => {
        const edge = surface.curves?.[i],
          next = surface.points[(i + 1) % surface.points.length];
        return edge
          ? `C${p(edge.control1)} ${p(edge.control2)} ${p(next)}`
          : `L${p(next)}`;
      })
      .join(" ") +
    " Z"
  );
}
export function validSurfaceGeometry(
  surface: Pick<Surface, "kind" | "points" | "curves">,
) {
  if (!validPoints(surface.kind, surface.points)) return false;
  if (
    surface.curves &&
    (surface.curves.length !== surface.points.length ||
      (surface.kind === "ellipse" && hasCurves(surface)))
  )
    return false;
  if (
    surface.curves?.some(
      (edge) =>
        edge &&
        [edge.control1, edge.control2].some(
          (p) =>
            !Number.isFinite(p.x + p.y) ||
            p.x < 0 ||
            p.x > 1 ||
            p.y < 0 ||
            p.y > 1,
        ),
    )
  )
    return false;
  // Tessellation points may be much closer together than editable anchors.
  return !hasCurves(surface) || isSimplePolygon(surfaceOutline(surface), 1e-8);
}
export function edgeCurve(
  surface: Surface,
  index: number,
  enabled: boolean,
): (BezierEdge | null)[] {
  const curves = surface.points.map((_, i) => surface.curves?.[i] || null),
    a = surface.points[index],
    b = surface.points[(index + 1) % surface.points.length];
  curves[index] = enabled
    ? { control1: mixPoint(a, b, 1 / 3), control2: mixPoint(a, b, 2 / 3) }
    : null;
  return curves;
}
export function transformCurves(
  before: Point[],
  after: Point[],
  curves: Surface["curves"],
): Surface["curves"] {
  if (!curves || before.length !== after.length) return undefined;
  // Recognise a whole-surface affine transform; otherwise move handles with their anchors.
  const origin = before[0],
    target = after[0];
  let affine: ((p: Point) => Point) | undefined;
  for (let i = 1; i < before.length - 1 && !affine; i++) {
    const u = { x: before[i].x - origin.x, y: before[i].y - origin.y },
      v = { x: before[i + 1].x - origin.x, y: before[i + 1].y - origin.y },
      det = u.x * v.y - u.y * v.x;
    if (Math.abs(det) < 1e-8) continue;
    const map = (p: Point) => {
      const dx = p.x - origin.x,
        dy = p.y - origin.y,
        a = (dx * v.y - dy * v.x) / det,
        b = (u.x * dy - u.y * dx) / det;
      return {
        x:
          target.x +
          a * (after[i].x - target.x) +
          b * (after[i + 1].x - target.x),
        y:
          target.y +
          a * (after[i].y - target.y) +
          b * (after[i + 1].y - target.y),
      };
    };
    if (
      before.every((p, j) => {
        const q = map(p);
        return Math.hypot(q.x - after[j].x, q.y - after[j].y) < 1e-7;
      })
    )
      affine = map;
    break;
  }
  return curves.map((edge, i) => {
    if (!edge) return null;
    const next = (i + 1) % before.length;
    const move = (p: Point, anchor: number) =>
      affine
        ? affine(p)
        : {
            x: p.x + after[anchor].x - before[anchor].x,
            y: p.y + after[anchor].y - before[anchor].y,
          };
    return {
      control1: move(edge.control1, i),
      control2: move(edge.control2, next),
    };
  });
}
export function insertSurfaceCorner(
  surface: Surface,
  index: number,
): Partial<Surface> | null {
  if (surface.kind !== "polygon" || surface.points.length >= 64) return null;
  const points = [...surface.points],
    curves = surface.points.map((_, i) => surface.curves?.[i] || null),
    a = points[index],
    b = points[(index + 1) % points.length],
    edge = curves[index];
  let midpoint = mixPoint(a, b, 0.5),
    next: BezierEdge | null = null;
  if (edge) {
    const p01 = mixPoint(a, edge.control1, 0.5),
      p12 = mixPoint(edge.control1, edge.control2, 0.5),
      p23 = mixPoint(edge.control2, b, 0.5),
      p012 = mixPoint(p01, p12, 0.5),
      p123 = mixPoint(p12, p23, 0.5);
    midpoint = mixPoint(p012, p123, 0.5);
    curves[index] = { control1: p01, control2: p012 };
    next = { control1: p123, control2: p23 };
  }
  points.splice(index + 1, 0, midpoint);
  curves.splice(index + 1, 0, next);
  const change = { points, curves: surface.curves ? curves : undefined };
  return validSurfaceGeometry({ ...surface, ...change }) ? change : null;
}
export function removeSurfaceCorner(
  surface: Surface,
  index: number,
): Partial<Surface> | null {
  if (surface.kind !== "polygon" || surface.points.length <= 3) return null;
  const points = surface.points.filter((_, i) => i !== index),
    curves = surface.points.map((_, i) => surface.curves?.[i] || null);
  curves[(index + curves.length - 1) % curves.length] = null;
  curves.splice(index, 1);
  const change = { points, curves: surface.curves ? curves : undefined };
  return validSurfaceGeometry({ ...surface, ...change }) ? change : null;
}
