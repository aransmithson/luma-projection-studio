export type Painter = (
  ctx: CanvasRenderingContext2D,
  time: number,
  width: number,
  height: number,
  color: string,
  seed: number,
  scale?: number,
  side?: "left" | "right",
) => void;
export const TAU = Math.PI * 2;
export const mod = (n: number, d: number) => ((n % d) + d) % d;
export const random = (i: number, seed = 1) => {
  const n = Math.sin(i * 127.1 + seed * 31.7) * 43758.5453;
  return n - Math.floor(n);
};
export const rgba = (hex: string, a: number) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a))})`;
export const smooth = (n: number) => {
  const x = Math.max(0, Math.min(1, n));
  return x * x * (3 - 2 * x);
};
export function hue(hex: string) {
  const [r, g, b] = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const max = Math.max(r, g, b),
    d = max - Math.min(r, g, b);
  return d === 0
    ? 0
    : mod(
        (max === r
          ? (g - b) / d
          : max === g
            ? (b - r) / d + 2
            : (r - g) / d + 4) * 60,
        360,
      );
}
export function hslHex(h: number, s = 0.85, l = 0.65) {
  const a = s * Math.min(l, 1 - l);
  return (
    "#" +
    [0, 8, 4]
      .map((n) => {
        const k = mod(n + h / 30, 12);
        return Math.round(
          255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))),
        )
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}
export function background(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  top: string,
  bottom = top,
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(-w * 4, -h * 4, w * 9, h * 9);
}
export function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha = 1,
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.001, r));
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.45, rgba(color, alpha * 0.3));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
export function oval(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  rotation = 0,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.001, rx), Math.max(0.001, ry), rotation, 0, TAU);
  ctx.fill();
}
export function line(
  ctx: CanvasRenderingContext2D,
  points: number[][],
  color: string,
  width: number,
  close = false,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
  ctx.stroke();
}
export function star(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  rotation = 0,
) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rotation + (i * Math.PI) / 4,
      r = i % 2 ? radius * 0.22 : radius;
    const px = x + Math.cos(a) * r,
      py = y + Math.sin(a) * r;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
