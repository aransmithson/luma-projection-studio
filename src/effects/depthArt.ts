import { background, glow, line, random, rgba, TAU } from "./common";
import { makeFace, project3, rotate3, type Face, type Vec3 } from "./spatial";

export type Finish = "stone" | "metal" | "enamel" | "crystal";
export type Material = { color: string; finish?: Finish; emission?: number };
export type LitFace = Face & Material;
export type Transform = (p: Vec3) => Vec3;
export const identity: Transform = (p) => p;
export const depthPhase = (time: number) =>
  Math.round((((time % 24) + 24) % 24) * 1e6) / 24e6;
export function transform(
  centre: Vec3,
  angles: Vec3 = [0, 0, 0],
  world: Transform = identity,
): Transform {
  return (p) =>
    world(rotate3(p, ...angles).map((v, i) => v + centre[i]) as Vec3);
}
export function face(
  faces: LitFace[],
  points: Vec3[],
  material: Material,
  move: Transform = identity,
  twoSided = false,
) {
  const vertices = points.map(move);
  const f =
    makeFace(vertices) ?? (twoSided ? makeFace(vertices.reverse()) : null);
  if (f) faces.push({ ...f, ...material });
}
export function box(
  faces: LitFace[],
  half: Vec3,
  material: Material,
  move: Transform = identity,
  bevel = 0.025,
) {
  const [x, y, z] = half,
    b = Math.min(bevel, x * 0.3, y * 0.3, z * 0.7);
  const front: Vec3[] = [
    [-x + b, -y + b, z],
    [x - b, -y + b, z],
    [x - b, y - b, z],
    [-x + b, y - b, z],
  ];
  const rim: Vec3[] = [
    [-x, -y, z - b],
    [x, -y, z - b],
    [x, y, z - b],
    [-x, y, z - b],
  ];
  const back: Vec3[] = rim.map((p) => [p[0], p[1], -z]);
  face(faces, front, material, move);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    face(faces, [front[j], front[i], rim[i], rim[j]], material, move);
    face(faces, [rim[j], rim[i], back[i], back[j]], material, move);
  }
  face(faces, [...back].reverse(), material, move);
}
export function torus(
  faces: LitFace[],
  radius: number,
  tube: number,
  material: Material,
  move: Transform,
  segments = 64,
  sides = 8,
) {
  const point = (a: number, b: number): Vec3 => [
    (radius + tube * Math.cos(b)) * Math.cos(a),
    (radius + tube * Math.cos(b)) * Math.sin(a),
    tube * Math.sin(b),
  ];
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < sides; j++) {
      const a = (i / segments) * TAU,
        a1 = ((i + 1) / segments) * TAU,
        b = (j / sides) * TAU,
        b1 = ((j + 1) / sides) * TAU;
      face(
        faces,
        [point(a, b), point(a1, b), point(a1, b1), point(a, b1)],
        material,
        move,
      );
    }
}
export function crystal(
  faces: LitFace[],
  radius: number,
  height: number,
  material: Material,
  move: Transform,
) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU,
      b = ((i + 1) / 6) * TAU;
    const p: Vec3 = [Math.cos(a) * radius, 0, Math.sin(a) * radius];
    const q: Vec3 = [Math.cos(b) * radius, 0, Math.sin(b) * radius];
    const pt: Vec3 = [p[0], -height * 0.7, p[2]],
      qt: Vec3 = [q[0], -height * 0.7, q[2]];
    face(faces, [q, p, pt, qt], material, move, true);
    face(faces, [qt, pt, [0, -height, 0]], material, move, true);
  }
}
const grains = new Map<string, HTMLCanvasElement>();
function grain(finish: Finish) {
  let tile = grains.get(finish);
  if (tile) return tile;
  tile = document.createElement("canvas");
  tile.width = tile.height = 96;
  const c = tile.getContext("2d")!;
  for (let i = 0; i < 1800; i++) {
    const x = random(i, 54) * 96,
      y = random(i, 91) * 96;
    c.fillStyle = i % 3 ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.17)";
    c.fillRect(
      x,
      y,
      finish === "metal" ? 4 + random(i, 7) * 15 : random(i, 5) * 1.6 + 0.3,
      finish === "metal" ? 0.35 : random(i, 12) * 1.4 + 0.3,
    );
  }
  grains.set(finish, tile);
  return tile;
}
function tint(hex: string, light: number, spec: number) {
  return `rgb(${[1, 3, 5].map((i) => Math.round(Math.min(255, parseInt(hex.slice(i, i + 2), 16) * light + spec * 210))).join(",")})`;
}
export function paint(
  c: CanvasRenderingContext2D,
  faces: LitFace[],
  w: number,
  h: number,
  size = 0.43,
) {
  const stone = c.createPattern(grain("stone"), "repeat")!,
    metal = c.createPattern(grain("metal"), "repeat")!;
  faces.sort((a, b) => a.depth - b.depth);
  for (const f of faces) {
    const pts = f.points.map((p) => project3(p, w, h, size)),
      n = f.normal;
    const diffuse =
      0.27 + 0.65 * Math.max(0, -n[0] * 0.38 - n[1] * 0.48 + n[2] * 0.78);
    const shine = Math.pow(
      Math.max(0, -n[0] * 0.26 - n[1] * 0.32 + n[2] * 0.91),
      f.finish === "stone" ? 6 : 24,
    );
    const light = diffuse + (f.emission || 0) * 0.6,
      spec = shine * (f.finish === "stone" ? 0.05 : 0.42);
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    const xs = pts.map((p) => p[0]),
      ys = pts.map((p) => p[1]);
    const x = Math.min(...xs),
      y = Math.min(...ys),
      dx = Math.max(...xs) - x,
      dy = Math.max(...ys) - y;
    const g = c.createLinearGradient(x, y, x + dx + 0.01, y + dy + 0.01);
    if (f.finish === "metal" && Math.max(dx, dy) > Math.min(w, h) * 0.13) {
      [
        [0, 0.48],
        [0.24, 1.04],
        [0.43, 1.36],
        [0.49, 0.55],
        [0.68, 0.9],
        [1, 0.58],
      ].forEach(([p, k]) =>
        g.addColorStop(p, tint(f.color, light * k, spec * k)),
      );
    } else {
      g.addColorStop(0, tint(f.color, light * 1.12, spec));
      g.addColorStop(0.5, tint(f.color, light, spec * 0.7));
      g.addColorStop(1, tint(f.color, light * 0.79, spec * 0.3));
    }
    c.fillStyle = g;
    c.fill();
    if (f.finish === "stone" || f.finish === "metal") {
      c.globalAlpha = f.finish === "stone" ? 0.48 : 0.2;
      c.fillStyle = f.finish === "stone" ? stone : metal;
      c.fill();
      c.globalAlpha = 1;
    }
    // Crisp bevel highlights remain readable on a projector without thick outlines.
    c.lineWidth = Math.max(0.35, Math.min(w, h) * 0.00085);
    c.strokeStyle = rgba(
      f.finish === "crystal" ? f.color : "#e6f5ff",
      0.08 + spec * 0.38 + (f.emission || 0) * 0.25,
    );
    c.stroke();
  }
}
export function chamber(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  seed: number,
  grid = true,
) {
  background(c, w, h, "#040711", "#111b2a");
  glow(c, w * 0.51, h * 0.35, h * 0.72, color, 0.15);
  const g = c.createLinearGradient(0, h * 0.6, 0, h);
  g.addColorStop(0, "#060c17");
  g.addColorStop(1, "#202538");
  c.fillStyle = g;
  c.fillRect(0, h * 0.75, w, h * 0.25);
  if (grid) {
    for (let i = -8; i <= 8; i++)
      line(
        c,
        [project3([i * 0.5, 1.1, -6], w, h), project3([i * 0.5, 1.1, 2], w, h)],
        rgba(color, 0.085),
        0.6,
      );
    for (let i = -6; i <= 2; i++)
      line(
        c,
        [project3([-6, 1.1, i], w, h), project3([6, 1.1, i], w, h)],
        rgba(color, 0.07),
        0.6,
      );
  }
  for (let i = 0; i < 32; i++) {
    c.fillStyle = rgba(color, 0.12 + random(i, seed) * 0.16);
    c.fillRect(random(i, seed + 1) * w, random(i, seed + 2) * h * 0.8, 1, 1);
  }
}
export function shadow(
  c: CanvasRenderingContext2D,
  p: Vec3,
  w: number,
  h: number,
  r = 0.4,
  alpha = 0.45,
) {
  const [x, y] = project3([p[0], 1.08, p[2]], w, h);
  c.save();
  c.translate(x, y);
  c.scale(1, 0.22);
  glow(c, 0, 0, h * r, "#000000", alpha);
  c.restore();
}
export function sparkles(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: number,
  seed: number,
  color: string,
  amount = 30,
) {
  for (let i = 0; i < amount; i++) {
    const a = random(i, seed) * TAU + p * TAU,
      r = 0.24 + random(i, seed + 1) * 0.65;
    const x = w * 0.5 + Math.cos(a) * h * r,
      y = h * 0.5 + Math.sin(a) * h * r * 0.65;
    const intensity = Math.pow(0.5 + 0.5 * Math.sin(p * TAU * 2 + i), 8);
    if (intensity < 0.03) continue;
    glow(c, x, y, h * 0.012, color, intensity * 0.8);
    line(
      c,
      [
        [x - h * 0.006, y],
        [x + h * 0.006, y],
      ],
      rgba("#ffffff", intensity),
      0.7,
    );
  }
}
