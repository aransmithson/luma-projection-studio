import { hslHex, hue, mod, random, rgba, smooth, type Painter } from "./common";
import type { EffectId } from "../types";

type Material =
  | "red-brick"
  | "limestone"
  | "castle-stone"
  | "timber"
  | "slate"
  | "concrete";
const tiles = new Map<string, HTMLCanvasElement>();
export function tint(hex: string, factor: number, lift = 0) {
  return (
    "#" +
    [1, 3, 5]
      .map((i) =>
        Math.round(
          Math.max(
            0,
            Math.min(255, parseInt(hex.slice(i, i + 2), 16) * factor + lift),
          ),
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function face(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  seed: number,
  rough = false,
) {
  const g = c.createLinearGradient(x, y, x + w * 0.3, y + h);
  g.addColorStop(0, tint(color, 1.12, 5));
  g.addColorStop(0.22, tint(color, 1.03));
  g.addColorStop(1, tint(color, 0.79));
  c.fillStyle = g;
  c.beginPath();
  if (rough) {
    c.moveTo(x + 4, y + 2);
    c.lineTo(x + w * 0.4, y - 1);
    c.lineTo(x + w - 3, y + 3);
    c.lineTo(x + w + 1, y + h * 0.65);
    c.lineTo(x + w - 5, y + h - 2);
    c.lineTo(x + w * 0.35, y + h + 1);
    c.lineTo(x + 2, y + h - 4);
    c.closePath();
  } else c.roundRect(x, y, w, h, 2);
  c.fill();
  c.save();
  c.clip();
  for (let i = 0; i < 85; i++) {
    const px = x + random(i, seed) * w,
      py = y + random(i + 99, seed) * h;
    c.fillStyle = i % 3 ? "#00000019" : "#ffffff24";
    c.fillRect(
      px,
      py,
      0.5 + random(i + 201, seed) * 3,
      0.4 + random(i + 300, seed) * 1.8,
    );
  }
  c.strokeStyle = "#ffffff24";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x + 3, y + 2);
  c.lineTo(x + w - 4, y + 2);
  c.stroke();
  c.strokeStyle = "#00000038";
  c.beginPath();
  c.moveTo(x + w - 2, y + 4);
  c.lineTo(x + w - 2, y + h - 2);
  c.lineTo(x + 4, y + h - 2);
  c.stroke();
  c.restore();
}
function makeTile(material: Material, color: string, seed: number) {
  const key = `${material}:${color}:${seed}`;
  const cached = tiles.get(key);
  if (cached) return cached;
  const tile = document.createElement("canvas");
  tile.width = tile.height = 512;
  const c = tile.getContext("2d")!;
  c.fillStyle = material === "limestone" ? "#827e70" : "#25272a";
  c.fillRect(0, 0, 512, 512);
  if (
    material === "red-brick" ||
    material === "limestone" ||
    material === "castle-stone"
  ) {
    const rowHeight = material === "red-brick" ? 64 : 128,
      brickWidth = material === "limestone" ? 256 : 128;
    for (let row = 0; row < 512 / rowHeight; row++)
      for (let col = -1; col <= 512 / brickWidth; col++) {
        const key = mod(col, 512 / brickWidth) + row * 17,
          variation = 0.82 + random(key, seed) * 0.36;
        const x = col * brickWidth - ((row % 2) * brickWidth) / 2,
          y = row * rowHeight;
        face(
          c,
          x + 3,
          y + 3,
          brickWidth - 6,
          rowHeight - 6,
          tint(color, variation),
          seed + key,
          material === "castle-stone",
        );
        if (material === "castle-stone") {
          c.fillStyle = "#30492b20";
          for (let i = 0; i < 12; i++)
            c.fillRect(
              x + random(key + i, seed) * brickWidth,
              y + rowHeight - 4 - random(i + 10, seed) * 14,
              3,
              2,
            );
        }
        if (material === "red-brick") {
          c.strokeStyle = "#241c1730";
          c.lineWidth = 0.8;
          c.beginPath();
          c.moveTo(x + 18, y + 35);
          c.lineTo(x + 32 + random(key, seed) * 20, y + 30);
          c.lineTo(x + 45, y + 39);
          c.stroke();
        }
      }
  } else if (material === "timber") {
    for (let board = 0; board < 4; board++) {
      const x = board * 128,
        key = seed + board * 37;
      face(
        c,
        x + 2,
        0,
        124,
        512,
        tint(color, 0.82 + random(board, seed) * 0.32),
        key,
      );
      c.save();
      c.beginPath();
      c.rect(x + 3, 0, 122, 512);
      c.clip();
      for (let grain = 0; grain < 65; grain++) {
        c.strokeStyle = grain % 4 === 0 ? "#f1d6a322" : "#24170730";
        c.lineWidth = 0.4 + random(grain, key);
        c.beginPath();
        for (let y = 0; y <= 512; y += 8) {
          const px =
            x +
            grain * 2 +
            Math.sin(y / 70 + grain * 0.2) * 3 +
            Math.sin(y / 130 + grain) * 6;
          if (y) c.lineTo(px, y);
          else c.moveTo(px, y);
        }
        c.stroke();
      }
      const knotY = 120 + random(13, key) * 270;
      for (let r = 18; r > 1; r -= 2) {
        c.strokeStyle = `rgba(47,27,12,${0.1 + (18 - r) * 0.006})`;
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(x + 65, knotY, r * 0.65, r * 1.6, -0.12, 0, Math.PI * 2);
        c.stroke();
      }
      for (const y of [22, 490]) {
        c.fillStyle = "#201c18";
        c.beginPath();
        c.arc(x + 18, y, 2.2, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#dbc9aa";
        c.fillRect(x + 17, y - 1, 2, 0.7);
      }
      c.restore();
    }
  } else if (material === "slate") {
    const rh = 512 / 6;
    for (let row = 0; row < 6; row++)
      for (let col = -1; col < 5; col++) {
        const x = col * 128 - (row % 2) * 64,
          y = row * rh,
          key = mod(col, 4) + row * 9;
        face(
          c,
          x + 2,
          y + 3,
          124,
          rh - 5,
          tint(color, 0.72 + random(key, seed) * 0.5),
          seed + key,
          true,
        );
        c.save();
        c.beginPath();
        c.rect(x + 4, y + 6, 120, rh - 12);
        c.clip();
        for (let line = 0; line < 12; line++) {
          c.strokeStyle = line % 2 ? "#e5eeff16" : "#111c2720";
          c.lineWidth = 0.7;
          c.beginPath();
          c.moveTo(x, y + line * 9);
          c.lineTo(x + 128, y + line * 9 - 20);
          c.stroke();
        }
        c.restore();
        c.fillStyle = "#00000070";
        c.fillRect(x, y + rh - 3, 128, 3);
        c.fillStyle = "#d6e6ff45";
        c.fillRect(x + 4, y + rh - 5, 120, 1);
      }
  } else {
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        face(
          c,
          x * 256 + 1,
          y * 256 + 1,
          254,
          254,
          tint(color, 0.91 + random(x + y * 2, seed) * 0.15),
          seed + x + y * 2,
        );
        for (const dx of [38, 218])
          for (const dy of [38, 218]) {
            const g = c.createRadialGradient(
              x * 256 + dx - 1,
              y * 256 + dy - 1,
              0.4,
              x * 256 + dx,
              y * 256 + dy,
              4,
            );
            g.addColorStop(0, "#4e504e");
            g.addColorStop(0.65, "#656761");
            g.addColorStop(1, "#d2d4cc");
            c.fillStyle = g;
            c.beginPath();
            c.arc(x * 256 + dx, y * 256 + dy, 4, 0, Math.PI * 2);
            c.fill();
          }
      }
  }
  for (let i = 0; i < 4500; i++) {
    c.fillStyle = i % 2 ? "#ffffff0c" : "#00000013";
    c.fillRect(
      random(i, seed + 9) * 512,
      random(i + 4500, seed + 9) * 512,
      0.4 + random(i + 9000, seed + 9) * 1.8,
      0.6,
    );
  }
  // Multiscale, deterministic mineral variation adds surface roughness without
  // paying for image generation or pixel work during animation playback.
  const pixels = c.getImageData(0, 0, 512, 512),
    data = pixels.data;
  const hash = (x: number, y: number) => {
    let n =
      (Math.imul(x, 374761393) +
        Math.imul(y, 668265263) +
        Math.imul(seed, 1013904223)) |
      0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x: number, y: number, step: number) => {
    const ix = Math.floor(x / step),
      iy = Math.floor(y / step),
      fx = x / step - ix,
      fy = y / step - iy;
    const a = hash(ix, iy),
      b = hash(ix + 1, iy),
      d = hash(ix, iy + 1),
      e = hash(ix + 1, iy + 1);
    return (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy;
  };
  const roughness =
    material === "red-brick"
      ? 0.32
      : material === "castle-stone"
        ? 0.4
        : material === "timber"
          ? 0.1
          : 0.19;
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const i = (x + y * 512) * 4;
      const variation =
        (noise(x, y, 32) - 0.5) * roughness +
        (noise(x, y, 5) - 0.5) * roughness * 0.8 +
        (hash(x + 123, y + 387) - 0.5) * roughness * 0.35;
      for (let channel = 0; channel < 3; channel++)
        data[i + channel] *= 1 + variation;
    }
  c.putImageData(pixels, 0, 0);
  tiles.set(key, tile);
  if (tiles.size > 24) tiles.delete(tiles.keys().next().value!);
  return tile;
}
function materialFill(
  ctx: CanvasRenderingContext2D,
  material: Material,
  w: number,
  h: number,
  color: string,
  seed: number,
) {
  const scale = (Math.min(w, h) / 512) * 1.35;
  const pattern = ctx.createPattern(makeTile(material, color, seed), "repeat")!;
  pattern.setTransform(new DOMMatrix().scale(scale));
  ctx.fillStyle = pattern;
  ctx.fillRect(-w * 4, -h * 4, w * 9, h * 9);
  return scale;
}
const materialPainter =
  (material: Material): Painter =>
  (ctx, _t, w, h, color, seed) => {
    materialFill(ctx, material, w, h, color, seed);
  };
const brickPainter =
  (wave: boolean): Painter =>
  (ctx, t, w, h, color, seed) => {
    const scale = materialFill(ctx, "red-brick", w, h, "#654f50", seed),
      bw = 128 * scale,
      bh = 64 * scale;
    const transform = ctx.getTransform(),
      x0 = -transform.e / transform.a,
      y0 = -transform.f / transform.d;
    const x1 = x0 + w / transform.a,
      y1 = y0 + h / transform.d;
    for (let row = Math.floor(y0 / bh); row <= Math.ceil(y1 / bh); row++)
      for (
        let col = Math.floor(x0 / bw) - 1;
        col <= Math.ceil(x1 / bw) + 1;
        col++
      ) {
        const key = col + row * 113,
          x = col * bw - (mod(row, 2) * bw) / 2,
          y = row * bh;
        const phase = mod(t / 24 + random(key, seed), 1);
        const pulse = wave
          ? Math.pow(
              Math.max(0, Math.sin((t * Math.PI) / 6 - col * 0.65 - row * 0.4)),
              4,
            )
          : smooth(phase / 0.12) * (1 - smooth((phase - 0.24) / 0.25));
        if (pulse < 0.003) continue;
        const shade = hslHex(
          hue(color) +
            random(key + 999, seed) * 210 +
            Math.sin((t * Math.PI) / 12) * 70,
          0.82,
          0.58,
        );
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const g = ctx.createLinearGradient(x, y, x + bw * 0.2, y + bh);
        g.addColorStop(0, rgba(shade, pulse * 0.92));
        g.addColorStop(1, rgba(shade, pulse * 0.45));
        ctx.fillStyle = g;
        ctx.fillRect(
          x + 4 * scale,
          y + 4 * scale,
          bw - 8 * scale,
          bh - 8 * scale,
        );
        ctx.strokeStyle = rgba(shade, pulse * 0.75);
        ctx.lineWidth = 1.4 * scale;
        ctx.strokeRect(
          x + 4 * scale,
          y + 4 * scale,
          bw - 8 * scale,
          bh - 8 * scale,
        );
        ctx.restore();
      }
  };
export const materialPainters: Partial<Record<EffectId, Painter>> = {
  "red-brick": materialPainter("red-brick"),
  limestone: materialPainter("limestone"),
  "castle-stone": materialPainter("castle-stone"),
  timber: materialPainter("timber"),
  slate: materialPainter("slate"),
  concrete: materialPainter("concrete"),
  "chromatic-bricks": brickPainter(false),
  "brick-ripple": brickPainter(true),
};
