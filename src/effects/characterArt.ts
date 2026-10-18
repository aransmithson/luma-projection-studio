import { TAU } from "./common";
import { tint } from "./materials";

export function velvet(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
) {
  const g = c.createRadialGradient(
    x - rx * 0.35,
    y - ry * 0.45,
    rx * 0.05,
    x + rx * 0.12,
    y + ry * 0.2,
    Math.max(rx, ry) * 1.2,
  );
  g.addColorStop(0, tint(color, 1.15, 16));
  g.addColorStop(0.45, color);
  g.addColorStop(1, tint(color, 0.48));
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fill();
}
export function shaped(
  c: CanvasRenderingContext2D,
  color: string,
  draw: () => void,
) {
  const g = c.createLinearGradient(-0.6, -1.5, 0.5, 0.8);
  g.addColorStop(0, tint(color, 1.15, 12));
  g.addColorStop(0.5, color);
  g.addColorStop(1, tint(color, 0.57));
  c.beginPath();
  draw();
  c.closePath();
  c.fillStyle = g;
  c.fill();
}
