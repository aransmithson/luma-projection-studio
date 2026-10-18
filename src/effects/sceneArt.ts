import { background, TAU } from "./common";

// The illustrated collections share a 1000 x 600 stage, drawn at the surface's resolution.
export function stage(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  top: string,
  bottom = top,
) {
  background(c, w, h, top, bottom);
  c.save();
  c.scale(w / 1000, h / 600);
}
export function polygon(
  c: CanvasRenderingContext2D,
  points: number[][],
  fill: string,
) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}
export function panel(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string | CanvasGradient,
  radius = 6,
) {
  c.fillStyle = fill;
  c.beginPath();
  c.roundRect(x, y, w, h, radius);
  c.fill();
}
export function gradient(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  x2: number,
  y2: number,
  colors: string[],
) {
  const g = c.createLinearGradient(x, y, x2, y2);
  colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color));
  return g;
}
export function leaf(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  color: string,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(size * 0.2, -size * 0.65, size * 0.85, -size * 0.4, size, 0);
  c.bezierCurveTo(size * 0.7, size * 0.45, size * 0.2, size * 0.35, 0, 0);
  c.fillStyle = color;
  c.fill();
  c.strokeStyle = "#ffffff30";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(size * 0.85, 0);
  c.stroke();
  c.restore();
}
export function disk(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string | CanvasGradient,
) {
  c.fillStyle = fill;
  c.beginPath();
  c.arc(x, y, Math.max(0.01, r), 0, TAU);
  c.fill();
}
