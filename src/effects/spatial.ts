import { rgba } from "./common";

export type Vec3 = [number, number, number];
export type Face = {
  points: Vec3[];
  normal: Vec3;
  depth: number;
  alpha: number;
};
const CAMERA = 4.8;

export function rotate3([x, y, z]: Vec3, ax: number, ay: number, az = 0): Vec3 {
  const y1 = y * Math.cos(ax) - z * Math.sin(ax),
    z1 = y * Math.sin(ax) + z * Math.cos(ax);
  const x2 = x * Math.cos(ay) + z1 * Math.sin(ay),
    z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
  return [
    x2 * Math.cos(az) - y1 * Math.sin(az),
    x2 * Math.sin(az) + y1 * Math.cos(az),
    z2,
  ];
}

export function project3(
  [x, y, z]: Vec3,
  w: number,
  h: number,
  size = 0.43,
): [number, number] {
  const k = (CAMERA / Math.max(0.6, CAMERA - z)) * Math.min(w, h) * size;
  return [w / 2 + x * k, h / 2 + y * k];
}

export function makeFace(points: Vec3[], alpha = 1): Face | null {
  const a = points[0],
    b = points[1],
    c = points[2];
  const u = b.map((v, i) => v - a[i]),
    v = c.map((q, i) => q - a[i]);
  const n: Vec3 = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const length = Math.hypot(...n);
  if (length < 1e-10) return null;
  const normal = n.map((q) => q / length) as Vec3;
  const centre = [0, 1, 2].map(
    (i) => points.reduce((sum, p) => sum + p[i], 0) / points.length,
  );
  if (
    -centre[0] * normal[0] -
      centre[1] * normal[1] +
      (CAMERA - centre[2]) * normal[2] <=
    0
  )
    return null;
  return { points, normal, depth: centre[2], alpha };
}

const cubeFaces = [
  [4, 5, 6, 7],
  [1, 0, 3, 2],
  [0, 4, 7, 3],
  [5, 1, 2, 6],
  [0, 1, 5, 4],
  [7, 6, 2, 3],
];
export function addBox(
  faces: Face[],
  centre: Vec3,
  half: Vec3,
  transform: (point: Vec3) => Vec3,
  alpha = 1,
) {
  const vertices: Vec3[] = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ].map((p) => transform(p.map((v, i) => centre[i] + v * half[i]) as Vec3));
  for (const indices of cubeFaces) {
    const face = makeFace(
      indices.map((i) => vertices[i]),
      alpha,
    );
    if (face) faces.push(face);
  }
}

export function paintFaces(
  ctx: CanvasRenderingContext2D,
  faces: Face[],
  w: number,
  h: number,
  color: string,
  metallic = false,
  size = 0.43,
) {
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  const tint = (brightness: number) =>
    `rgb(${rgb.map((c) => Math.round(Math.min(255, c * brightness + Math.max(0, brightness - 0.9) * 120))).join(",")})`;
  faces.sort((a, b) => a.depth - b.depth);
  for (const face of faces) {
    const points = face.points.map((p) => project3(p, w, h, size)),
      n = face.normal;
    const diffuse =
      0.2 + 0.65 * Math.max(0, -0.38 * n[0] - 0.48 * n[1] + 0.78 * n[2]);
    const spec = Math.pow(
      Math.max(0, -0.2 * n[0] - 0.26 * n[1] + 0.94 * n[2]),
      18,
    );
    const bright = diffuse + spec * 0.7;
    ctx.globalAlpha = face.alpha;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    if (metallic) {
      const xs = points.map((p) => p[0]),
        ys = points.map((p) => p[1]);
      const left = Math.min(...xs),
        top = Math.min(...ys),
        right = Math.max(...xs),
        bottom = Math.max(...ys);
      const gradient = ctx.createLinearGradient(
        left,
        top,
        right + 0.01,
        bottom + 0.01,
      );
      [
        [0, 0.45],
        [0.23, 0.9],
        [0.42, 1.35],
        [0.48, 0.45],
        [0.55, 0.66],
        [0.83, 1.15],
        [1, 0.35],
      ].forEach(([stop, value]) =>
        gradient.addColorStop(stop, tint(bright * value)),
      );
      ctx.fillStyle = gradient;
    } else ctx.fillStyle = tint(bright);
    ctx.fill();
    ctx.strokeStyle = rgba(
      "#e6f5ff",
      metallic ? 0.12 + spec * 0.45 : 0.1 + spec * 0.3,
    );
    ctx.lineWidth = Math.max(0.4, Math.min(w, h) * 0.0011);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
