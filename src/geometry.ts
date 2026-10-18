import earcut from "earcut";
import type { Point, ShapeKind } from "./types";

export const clamp = (n: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, n));
export function bounds(points: Point[]) {
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  const x = Math.min(...xs),
    y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
export function makePoints(kind: ShapeKind): Point[] {
  if (kind === "triangle")
    return [
      { x: 0.5, y: 0.25 },
      { x: 0.68, y: 0.7 },
      { x: 0.32, y: 0.7 },
    ];
  if (kind === "ellipse")
    return Array.from({ length: 48 }, (_, i) => ({
      x: 0.5 + Math.cos((i * Math.PI) / 24) * 0.15,
      y: 0.5 + Math.sin((i * Math.PI) / 24) * 0.24,
    }));
  return [
    { x: 0.32, y: 0.28 },
    { x: 0.68, y: 0.28 },
    { x: 0.68, y: 0.72 },
    { x: 0.32, y: 0.72 },
  ];
}
export function translate(points: Point[], dx: number, dy: number) {
  const b = bounds(points);
  dx = clamp(dx, -b.x, 1 - b.x - b.width);
  dy = clamp(dy, -b.y, 1 - b.y - b.height);
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}
export function resize(points: Point[], width: number, height: number) {
  const b = bounds(points);
  return points.map((p) => ({
    x: b.x + ((p.x - b.x) * width) / Math.max(0.001, b.width),
    y: b.y + ((p.y - b.y) * height) / Math.max(0.001, b.height),
  }));
}
export function rotate(points: Point[], degrees: number, aspect: number) {
  const b = bounds(points),
    cx = b.x + b.width / 2,
    cy = b.y + b.height / 2;
  const a = (degrees * Math.PI) / 180;
  return points.map((p) => {
    const x = (p.x - cx) * aspect,
      y = p.y - cy;
    return {
      x: cx + (x * Math.cos(a) - y * Math.sin(a)) / aspect,
      y: cy + x * Math.sin(a) + y * Math.cos(a),
    };
  });
}
export function contains(points: Point[], p: Point) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function polygonArea(points: Point[]) {
  return (
    Math.abs(
      points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p.x * q.y - q.x * p.y;
      }, 0),
    ) / 2
  );
}
const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
export function isSimplePolygon(points: Point[], minimumEdgeLength = 0.0001) {
  if (points.length < 3 || polygonArea(points) < 0.00001) return false;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    if (Math.hypot(a.x - b.x, a.y - b.y) < minimumEdgeLength) return false;
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      const c = points[j],
        d = points[(j + 1) % points.length];
      const abC = cross(a, b, c),
        abD = cross(a, b, d),
        cdA = cross(c, d, a),
        cdB = cross(c, d, b);
      if (
        abC * abD <= 0 &&
        cdA * cdB <= 0 &&
        Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <=
          Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) &&
        Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <=
          Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y))
      )
        return false;
    }
  }
  return true;
}
export function isConvex(points: Point[]) {
  let sign = 0;
  for (let i = 0; i < points.length; i++) {
    const c = cross(
      points[i],
      points[(i + 1) % points.length],
      points[(i + 2) % points.length],
    );
    if (Math.abs(c) < 0.00001) return false;
    if (sign && Math.sign(c) !== sign) return false;
    sign = Math.sign(c);
  }
  return true;
}
export function validPoints(kind: ShapeKind, points: Point[]) {
  return (
    points.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1) &&
    isSimplePolygon(points) &&
    (kind !== "quad" || isConvex(points))
  );
}
export function triangles(points: Point[]) {
  const indices = earcut(points.flatMap((p) => [p.x, p.y]));
  return new Float32Array(indices.flatMap((i) => [points[i].x, points[i].y]));
}

// Solve the inverse homography: projector coordinates -> the effect's unit square.
// WebGL expects this 3x3 matrix in column-major order.
export function inverseQuadMap(points: Point[]): Float32Array {
  const targets = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const matrix: number[][] = [];
  points.forEach(({ x, y }, i) => {
    const [u, v] = targets[i];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++)
      if (Math.abs(matrix[r][col]) > Math.abs(matrix[pivot][col])) pivot = r;
    [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
    const div = matrix[col][col];
    if (Math.abs(div) < 1e-10) return boundingMap(points);
    for (let c = col; c <= 8; c++) matrix[col][c] /= div;
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const factor = matrix[r][col];
      for (let c = col; c <= 8; c++) matrix[r][c] -= factor * matrix[col][c];
    }
  }
  const h = matrix.map((row) => row[8]);
  return new Float32Array([h[0], h[3], h[6], h[1], h[4], h[7], h[2], h[5], 1]);
}
export function boundingMap(points: Point[]) {
  const b = bounds(points),
    w = Math.max(b.width, 0.0001),
    h = Math.max(b.height, 0.0001);
  return new Float32Array([1 / w, 0, 0, 0, 1 / h, 0, -b.x / w, -b.y / h, 1]);
}

export function moveVertex(
  kind: ShapeKind,
  points: Point[],
  index: number,
  position: Point,
): Point[] | null {
  if (index < 0 || index >= points.length) return null;
  const next = points.map((point, i) =>
    i === index ? { x: clamp(position.x), y: clamp(position.y) } : point,
  );
  return validPoints(kind, next) ? next : null;
}

export function insertVertex(points: Point[], after: number): Point[] | null {
  if (points.length >= 64 || after < 0 || after >= points.length) return null;
  const a = points[after],
    b = points[(after + 1) % points.length];
  const next = [
    ...points.slice(0, after + 1),
    { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    ...points.slice(after + 1),
  ];
  return validPoints("polygon", next) ? next : null;
}

export function removeVertex(points: Point[], index: number): Point[] | null {
  if (points.length <= 3 || index < 0 || index >= points.length) return null;
  const next = points.filter((_, i) => i !== index);
  return validPoints("polygon", next) ? next : null;
}
