import { bounds, clamp } from "./geometry";
import { edgeCurve, validSurfaceGeometry } from "./curves";
import type { BezierEdge, Point, Surface } from "./types";

export type ShapePreset =
  | "quad"
  | "triangle"
  | "ellipse"
  | "rounded"
  | "arch"
  | "hexagon"
  | "star"
  | "diamond"
  | "ring";
export type ShapeFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type ShapeGeometry = Pick<Surface, "kind" | "points" | "curves">;
export const presetLabels: Record<ShapePreset, string> = {
  quad: "Rectangle",
  triangle: "Triangle",
  ellipse: "Ellipse",
  rounded: "Rounded rectangle",
  arch: "Arch",
  hexagon: "Hexagon",
  star: "Star",
  diamond: "Diamond",
  ring: "Ring",
};
export const extraPresets: ShapePreset[] = [
  "rounded",
  "arch",
  "hexagon",
  "star",
  "diamond",
  "ring",
];
const K = 0.5522847498307936;

/** Shift constrains a physical square on the projector, even on a widescreen canvas. */
export function frameFromDrag(
  start: Point,
  end: Point,
  constrained: boolean,
  width: number,
  height: number,
): ShapeFrame {
  const a = { x: clamp(start.x), y: clamp(start.y) },
    b = { x: clamp(end.x), y: clamp(end.y) };
  let dx = b.x - a.x,
    dy = b.y - a.y;
  if (constrained) {
    const sx = dx < 0 ? -1 : 1,
      sy = dy < 0 ? -1 : 1;
    const size = Math.min(
      Math.max(Math.abs(dx) * width, Math.abs(dy) * height),
      (sx > 0 ? 1 - a.x : a.x) * width,
      (sy > 0 ? 1 - a.y : a.y) * height,
    );
    dx = (sx * size) / width;
    dy = (sy * size) / height;
  }
  return {
    x: Math.min(a.x, a.x + dx),
    y: Math.min(a.y, a.y + dy),
    width: Math.abs(dx),
    height: Math.abs(dy),
  };
}

export function presetGeometry(
  preset: ShapePreset,
  frame: ShapeFrame,
): ShapeGeometry {
  const p = (x: number, y: number): Point => ({
    x: frame.x + x * frame.width,
    y: frame.y + y * frame.height,
  });
  let points: Point[], curves: (BezierEdge | null)[] | undefined;
  let kind: Surface["kind"] = "polygon";
  if (preset === "quad") {
    kind = "quad";
    points = [p(0, 0), p(1, 0), p(1, 1), p(0, 1)];
  } else if (preset === "triangle") {
    kind = "triangle";
    points = [p(0.5, 0), p(1, 1), p(0, 1)];
  } else if (preset === "ellipse" || preset === "ring") {
    kind = "ellipse";
    points = Array.from({ length: 48 }, (_, i) =>
      p(
        0.5 + Math.cos((i * Math.PI) / 24) * 0.5,
        0.5 + Math.sin((i * Math.PI) / 24) * 0.5,
      ),
    );
  } else if (preset === "rounded") {
    const r = 0.18,
      k = r * K;
    points = [
      p(r, 0),
      p(1 - r, 0),
      p(1, r),
      p(1, 1 - r),
      p(1 - r, 1),
      p(r, 1),
      p(0, 1 - r),
      p(0, r),
    ];
    curves = [
      null,
      { control1: p(1 - r + k, 0), control2: p(1, r - k) },
      null,
      { control1: p(1, 1 - r + k), control2: p(1 - r + k, 1) },
      null,
      { control1: p(r - k, 1), control2: p(0, 1 - r + k) },
      null,
      { control1: p(0, r - k), control2: p(r - k, 0) },
    ];
  } else if (preset === "arch") {
    points = [p(0.5, 0), p(1, 0.42), p(1, 1), p(0, 1), p(0, 0.42)];
    curves = [
      { control1: p(0.5 + 0.5 * K, 0), control2: p(1, 0.42 * (1 - K)) },
      null,
      null,
      null,
      { control1: p(0, 0.42 * (1 - K)), control2: p(0.5 - 0.5 * K, 0) },
    ];
  } else if (preset === "diamond")
    points = [p(0.5, 0), p(1, 0.5), p(0.5, 1), p(0, 0.5)];
  else {
    const count = preset === "star" ? 10 : 6;
    const unit = Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2,
        r = preset === "star" && i % 2 ? 0.44 : 1;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
    const b = bounds(unit);
    points = unit.map((q) => p((q.x - b.x) / b.width, (q.y - b.y) / b.height));
  }
  return { kind, points, curves };
}

export function ringHoleGeometry(frame: ShapeFrame) {
  return presetGeometry("ellipse", {
    x: frame.x + frame.width * 0.22,
    y: frame.y + frame.height * 0.22,
    width: frame.width * 0.56,
    height: frame.height * 0.56,
  });
}

/** Collinear handles provide a smooth tangent through this anchor. Back off near other edges. */
export function smoothCorner(
  surface: Surface,
  index: number,
  aspect: number,
): Partial<Surface> | null {
  if (
    surface.locked ||
    surface.kind === "ellipse" ||
    index < 0 ||
    index >= surface.points.length
  )
    return null;
  const n = surface.points.length,
    previous = (index + n - 1) % n;
  const a = surface.points[previous],
    p = surface.points[index],
    b = surface.points[(index + 1) % n];
  const d1 = Math.hypot((p.x - a.x) * aspect, p.y - a.y),
    d2 = Math.hypot((b.x - p.x) * aspect, b.y - p.y);
  if (!d1 || !d2) return null;
  const tx = ((p.x - a.x) * aspect) / d1 + ((b.x - p.x) * aspect) / d2,
    ty = (p.y - a.y) / d1 + (b.y - p.y) / d2,
    length = Math.hypot(tx, ty);
  if (length < 1e-6) return null;
  const initial = edgeCurve(surface, index, true);
  // Preserve the far handle on each edge if it was already curved.
  initial[index] = surface.curves?.[index] || initial[index];
  initial[previous] =
    surface.curves?.[previous] || edgeCurve(surface, previous, true)[previous];
  for (let attempt = 0; attempt < 9; attempt++) {
    const factor = 0.3 * 0.6 ** attempt,
      curves = initial.map((edge) => (edge ? { ...edge } : null));
    curves[previous]!.control2 = {
      x: p.x - (tx / length / aspect) * d1 * factor,
      y: p.y - (ty / length) * d1 * factor,
    };
    curves[index]!.control1 = {
      x: p.x + (tx / length / aspect) * d2 * factor,
      y: p.y + (ty / length) * d2 * factor,
    };
    if (validSurfaceGeometry({ ...surface, curves })) return { curves };
  }
  return null;
}

/** Preserve the outline and existing holes; regular ellipses become four editable arcs. */
export function editableOutline(surface: Surface): Partial<Surface> | null {
  if (surface.locked || surface.kind === "polygon") return null;
  if (surface.kind !== "ellipse" || surface.points.length !== 48)
    return { kind: "polygon" };
  const points = [0, 12, 24, 36].map((i) => surface.points[i]);
  const center = {
    x: (points[0].x + points[2].x) / 2,
    y: (points[0].y + points[2].y) / 2,
  };
  // Older/imported projects can label an arbitrary outline as an ellipse.
  // Retain all of its vertices instead of replacing it with a different shape.
  if (
    surface.points.some((p, i) => {
      const angle = (i * Math.PI) / 24;
      const x =
        center.x +
        (points[0].x - center.x) * Math.cos(angle) +
        (points[1].x - center.x) * Math.sin(angle);
      const y =
        center.y +
        (points[0].y - center.y) * Math.cos(angle) +
        (points[1].y - center.y) * Math.sin(angle);
      return Math.hypot(p.x - x, p.y - y) > 1e-7;
    })
  )
    return { kind: "polygon" };
  const curves = points.map((p, i) => {
    const next = points[(i + 1) % 4];
    return {
      control1: {
        x: p.x + (next.x - center.x) * K,
        y: p.y + (next.y - center.y) * K,
      },
      control2: {
        x: next.x + (p.x - center.x) * K,
        y: next.y + (p.y - center.y) * K,
      },
    };
  });
  const change = { kind: "polygon" as const, points, curves };
  return validSurfaceGeometry({ ...surface, ...change })
    ? change
    : { kind: "polygon" };
}
