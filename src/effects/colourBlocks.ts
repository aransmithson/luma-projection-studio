import { hslHex, hue, mod, random, smooth, TAU, type Painter } from "./common";
import { tint } from "./materials";
import type { EffectId } from "../types";

export const BLOCK_LOOP = 16;
type Mode = "spectrum" | "mosaic" | "ripples" | "flip" | "rise";

function panel(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  shine: number,
) {
  const gradient = c.createLinearGradient(x, y, x + w * 0.5, y + h);
  gradient.addColorStop(0, tint(color, 1.05, 18));
  gradient.addColorStop(0.4, color);
  gradient.addColorStop(1, tint(color, 0.55));
  c.fillStyle = gradient;
  c.beginPath();
  c.roundRect(x, y, w, h, Math.min(w, h) * 0.045);
  c.fill();
  c.strokeStyle = "#ffffff38";
  c.lineWidth = Math.max(0.6, w * 0.012);
  c.beginPath();
  c.moveTo(x + w * 0.04, y + h * 0.96);
  c.lineTo(x + w * 0.04, y + h * 0.04);
  c.lineTo(x + w * 0.96, y + h * 0.04);
  c.stroke();
  c.fillStyle = `rgba(255,255,255,${0.035 + shine * 0.1})`;
  c.beginPath();
  c.moveTo(x + w * 0.04, y + h * 0.04);
  c.lineTo(x + w * 0.96, y + h * 0.04);
  c.lineTo(x + w * 0.04, y + h * 0.55);
  c.closePath();
  c.fill();
}
function face(c: CanvasRenderingContext2D, points: number[][], color: string) {
  c.fillStyle = color;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}
const blocks =
  (mode: Mode): Painter =>
  (ctx, t, w, h, color, seed) => {
    const phase = mod(t, BLOCK_LOOP) / BLOCK_LOOP,
      a = phase * TAU,
      base = hue(color) + (random(809, seed) - 0.5) * 80;
    const cell = Math.min(w, h) * 0.23,
      gap = cell * 0.07,
      side = cell - 2 * gap;
    const transform = ctx.getTransform(),
      x0 = -transform.e / transform.a,
      y0 = -transform.f / transform.d;
    const x1 = x0 + w / transform.a,
      y1 = y0 + h / transform.d;
    const centerX = (w / cell) * (0.3 + random(11, seed) * 0.4),
      centerY = (h / cell) * (0.3 + random(12, seed) * 0.4);
    ctx.fillStyle = "#050913";
    ctx.fillRect(-w * 4, -h * 4, w * 9, h * 9);
    for (
      let row = Math.floor(y0 / cell) - 1;
      row <= Math.ceil(y1 / cell) + 1;
      row++
    )
      for (
        let col = Math.floor(x0 / cell) - 1;
        col <= Math.ceil(x1 / cell) + 1;
        col++
      ) {
        const key = col + row * 127,
          offset = random(key, seed),
          x = col * cell + gap,
          y = row * cell + gap;
        const distance = Math.hypot(col + 0.5 - centerX, row + 0.5 - centerY);
        let shade = base + phase * 360 + col * 17 + row * 23,
          light = 0.43,
          shine = 0.5;
        if (mode === "mosaic") {
          const p = mod(phase * 4 + offset * 4, 4),
            step = Math.floor(p),
            fade = smooth(p - step);
          const from = random(key + step * 1009, seed + 71) * 360;
          const to = random(key + mod(step + 1, 4) * 1009, seed + 71) * 360;
          shade = base + from + (mod(to - from + 180, 360) - 180) * fade;
          light = 0.31 + 0.22 * (0.5 + 0.5 * Math.sin(a + offset * TAU));
          shine = fade;
        } else if (mode === "ripples") {
          const ripple = 0.5 + 0.5 * Math.cos(a * 2 - distance * 1.0);
          shade = base + phase * 360 - distance * 19;
          light = 0.15 + 0.45 * ripple ** 2;
          shine = ripple;
        } else if (mode === "rise") {
          shine = (0.5 + 0.5 * Math.sin(a * 2 - col * 0.48 - row * 0.6)) ** 2;
          light = 0.28 + shine * 0.25;
          shade = base + phase * 360 + row * 29 - col * 13;
        }
        const ink = hslHex(shade, 0.8, light);
        if (mode === "flip") {
          const angle = a * 2 + col * 0.33 + row * 0.65 + offset * 0.22,
            cos = Math.cos(angle),
            squeeze = Math.max(0.025, Math.abs(cos));
          const width = side * squeeze,
            px = x + (side - width) / 2,
            back = cos < 0;
          const tile = hslHex(
            base + phase * 360 + col * 14 + row * 22 + (back ? 155 : 0),
            0.77,
            0.4 + 0.08 * squeeze,
          );
          ctx.fillStyle = "#111b2d";
          ctx.fillRect(x, y, side, side);
          face(
            ctx,
            [
              [px + width, y],
              [px + width + cell * 0.045, y + cell * 0.035],
              [px + width + cell * 0.045, y + side - cell * 0.035],
              [px + width, y + side],
            ],
            tint(tile, 0.32),
          );
          panel(ctx, px, y, width, side, tile, squeeze);
        } else if (mode === "rise") {
          const depth = cell * (0.025 + shine * 0.18),
            dx = depth * 0.42,
            dy = depth * 0.65;
          ctx.fillStyle = "#00000075";
          ctx.fillRect(x + dx, y + dy, side, side);
          face(
            ctx,
            [
              [x + side - dx, y - dy],
              [x + side, y],
              [x + side, y + side],
              [x + side - dx, y + side - dy],
            ],
            tint(ink, 0.46),
          );
          face(
            ctx,
            [
              [x - dx, y + side - dy],
              [x + side - dx, y + side - dy],
              [x + side, y + side],
              [x, y + side],
            ],
            tint(ink, 0.33),
          );
          panel(ctx, x - dx, y - dy, side, side, ink, shine);
        } else {
          ctx.fillStyle = "#00000080";
          ctx.fillRect(x + cell * 0.025, y + cell * 0.035, side, side);
          panel(ctx, x, y, side, side, ink, shine);
        }
      }
  };
export const colourBlockPainters: Partial<Record<EffectId, Painter>> = {
  "block-spectrum": blocks("spectrum"),
  "block-mosaic": blocks("mosaic"),
  "block-ripples": blocks("ripples"),
  "block-flip": blocks("flip"),
  "block-rise": blocks("rise"),
};
