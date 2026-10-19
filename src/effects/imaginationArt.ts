import { background, line, oval, rgba, TAU, type Painter } from "./common";
import { imaginationPhase } from "./imaginationMotion";
export type ArtContext = CanvasRenderingContext2D;
export function rounded(
  c: ArtContext,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | number[],
  fill: string | CanvasGradient,
  border?: string,
  width = 3,
) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (border) {
    c.strokeStyle = border;
    c.lineWidth = width;
    c.stroke();
  }
}
export function polygon(
  c: ArtContext,
  points: number[][],
  fill: string,
  border?: string,
  width = 3,
) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (border) {
    c.strokeStyle = border;
    c.lineWidth = width;
    c.stroke();
  }
}
export function face(
  c: ArtContext,
  x: number,
  y: number,
  size: number,
  phase: number,
  ink = "#17263b",
  buttons = false,
) {
  const blink = 1 - 0.92 * Math.pow(Math.max(0, Math.cos(phase * TAU * 3)), 36);
  for (const side of [-1, 1]) {
    const ex = x + side * size * 0.28;
    oval(c, ex, y, size * 0.14, size * 0.18 * blink, buttons ? ink : "#fff7e9");
    if (buttons)
      line(
        c,
        [
          [ex - size * 0.06, y - size * 0.05],
          [ex + size * 0.06, y + size * 0.05],
        ],
        "#e9dbbd",
        size * 0.035,
      );
    else
      oval(
        c,
        ex + Math.sin(phase * TAU * 2) * size * 0.035,
        y,
        size * 0.055,
        size * 0.09 * blink,
        ink,
      );
  }
  c.beginPath();
  c.moveTo(x - size * 0.18, y + size * 0.24);
  c.quadraticCurveTo(x, y + size * 0.4, x + size * 0.18, y + size * 0.24);
  c.strokeStyle = ink;
  c.lineWidth = size * 0.045;
  c.lineCap = "round";
  c.stroke();
}
export function ring(
  c: ArtContext,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  width = 2,
  angle = 0,
) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.001, rx), Math.max(0.001, ry), angle, 0, TAU);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
export function stitch(
  c: ArtContext,
  x: number,
  y: number,
  s: number,
  color: string,
) {
  line(
    c,
    [
      [x - s * 0.32, y - s * 0.33],
      [x, y + s * 0.35],
      [x + s * 0.32, y - s * 0.33],
    ],
    "#071b2438",
    s * 0.32,
  );
  line(
    c,
    [
      [x - s * 0.32, y - s * 0.33],
      [x, y + s * 0.35],
      [x + s * 0.32, y - s * 0.33],
    ],
    color,
    s * 0.2,
  );
  line(
    c,
    [
      [x - s * 0.27, y - s * 0.3],
      [x - s * 0.035, y + s * 0.2],
    ],
    "#ffffff50",
    s * 0.055,
  );
}
export const imaginationPainter =
  (
    draw: (c: ArtContext, p: number, color: string, seed: number) => void,
  ): Painter =>
  (c, time, w, h, color, seed) => {
    c.save();
    c.scale(w / 1000, h / 650);
    background(c, 1000, 650, "#090f20", "#17243c");
    draw(c, imaginationPhase(time, seed), color, seed);
    c.restore();
  };
export function shadow(
  c: ArtContext,
  x: number,
  y: number,
  rx: number,
  ry: number,
) {
  oval(c, x, y, rx, ry, rgba("#000000", 0.28));
}
