import {
  background,
  glow,
  hslHex,
  hue,
  line,
  random,
  rgba,
  TAU,
} from "./common";
import { dreamPhase } from "./dreamMotion";

export type XY = [number, number];
export const pigment = (tone: number, light = 0.56, alpha = 1) =>
  rgba(hslHex(tone, 0.84, light), alpha);

// A uniform art space preserves circles on wide and tall mapping surfaces.
// All motion comes from the shared time; no frame history or random state.
export function beginVision(
  c: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  color: string,
  seed: number,
) {
  const p = dreamPhase(t),
    a = p * TAU,
    tone = hue(color),
    variant = random(19, seed) * TAU;
  background(c, w, h, "#09051c", "#030914");
  const unit = Math.min(w, h) / 800;
  c.translate(w / 2, h / 2);
  c.scale(unit, unit);
  const width = w / unit,
    height = h / unit;
  glow(c, 0, 0, 580, hslHex(tone - 25), 0.17);
  c.lineJoin = "round";
  c.lineCap = "round";
  return { p, a, tone, variant, width, height };
}

export function polygon(c: CanvasRenderingContext2D, points: XY[]) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
}

export function gem(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  tone: number,
  turn = 0,
) {
  const points: XY[] = Array.from({ length: 6 }, (_, i) => [
    x + r * Math.cos(turn + (i * TAU) / 6),
    y + r * Math.sin(turn + (i * TAU) / 6),
  ]);
  for (let i = 0; i < 6; i++) {
    polygon(c, [[x - r * 0.2, y - r * 0.18], points[i], points[(i + 1) % 6]]);
    c.fillStyle = pigment(tone + i * 7, 0.24 + 0.09 * i);
    c.fill();
  }
  line(c, points, pigment(tone, 0.85, 0.7), 0.8, true);
  line(
    c,
    [
      [x - r * 0.45, y - r * 0.4],
      [x - r * 0.12, y - r * 0.55],
    ],
    "#fff5da",
    1.2,
  );
}

export function petal(
  c: CanvasRenderingContext2D,
  root: number,
  tip: number,
  breadth: number,
  tone: number,
  bend = 0,
) {
  c.beginPath();
  c.moveTo(root, 0);
  c.bezierCurveTo(
    root + (tip - root) * 0.2,
    -breadth,
    tip * 0.83,
    -breadth * 0.7 + bend,
    tip,
    bend,
  );
  c.bezierCurveTo(
    tip * 0.72,
    breadth + bend,
    root + (tip - root) * 0.1,
    breadth * 0.7,
    root,
    0,
  );
  const g = c.createLinearGradient(root, -breadth, tip, breadth);
  g.addColorStop(0, pigment(tone - 35, 0.14));
  g.addColorStop(0.36, pigment(tone, 0.48));
  g.addColorStop(0.62, pigment(tone + 32, 0.76));
  g.addColorStop(1, pigment(tone + 65, 0.23));
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = pigment(tone + 38, 0.85, 0.65);
  c.lineWidth = 1;
  c.stroke();
  for (let vein = -1; vein <= 1; vein++) {
    c.beginPath();
    c.moveTo(root, 0);
    c.quadraticCurveTo(
      (root + tip) / 2,
      vein * breadth * 0.25,
      tip * 0.94,
      bend * 0.9,
    );
    c.strokeStyle = pigment(tone + 45, 0.85, vein ? 0.26 : 0.65);
    c.stroke();
  }
}
