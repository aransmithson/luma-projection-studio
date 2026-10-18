import type { AudioFrame } from "../types";
import { demoAudio, musicIds, type MusicEffectId } from "../audioAnalysis";
import {
  glow,
  hslHex,
  hue,
  line,
  oval,
  rgba,
  TAU,
  type Painter,
} from "./common";

type C = CanvasRenderingContext2D;
const sample = (data: number[], position: number) => {
  const x = Math.max(
      0,
      Math.min(data.length - 1, position * (data.length - 1)),
    ),
    i = Math.floor(x);
  return data[i] + (data[Math.min(i + 1, data.length - 1)] - data[i]) * (x - i);
};
function polygon(c: C, points: number[][], fill: string) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}
function backdrop(c: C, w: number, h: number, color: string, energy: number) {
  c.fillStyle = "#02050c";
  c.fillRect(0, 0, w, h);
  glow(c, w * 0.5, h * 0.65, Math.max(w, h) * 0.55, color, 0.03 + energy * 0.1);
  c.lineWidth = 0.6;
  c.strokeStyle = "#5b95ae10";
  for (let i = 1; i < 12; i++) {
    c.beginPath();
    c.moveTo((w * i) / 12, 0);
    c.lineTo((w * i) / 12, h);
    c.stroke();
  }
  for (let i = 1; i < 8; i++) {
    c.beginPath();
    c.moveTo(0, (h * i) / 8);
    c.lineTo(w, (h * i) / 8);
    c.stroke();
  }
}
export function drawMusicEffect(
  c: C,
  id: MusicEffectId,
  time: number,
  audio: AudioFrame,
  color: string,
  seed = 42,
  scale = 1,
) {
  const w = c.canvas.width,
    h = c.canvas.height,
    u = Math.min(w, h),
    phase = (((time % 8) + 8) % 8) / 8;
  const baseHue = hue(color) + (seed % 17) * 1.4,
    colour = (p: number, l = 0.62) => hslHex(baseHue + p * 125, 0.88, l);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";
  backdrop(c, w, h, color, audio.level);
  c.save();
  const count = Math.max(
    12,
    Math.min(64, Math.round(32 / Math.max(0.25, scale))),
  );
  if (id === "eq-bars" || id === "eq-mirror") {
    const mirror = id === "eq-mirror",
      base = mirror ? h * 0.5 : h * 0.83,
      span = w * 0.88,
      step = span / count,
      bw = step * 0.67,
      max = mirror ? h * 0.4 : h * 0.7;
    for (let i = 0; i < count; i++) {
      const p = i / (count - 1),
        value = sample(audio.bands, p),
        peak = sample(audio.peaks, p),
        x = w * 0.06 + i * step,
        ink = colour(p),
        height = max * value;
      c.fillStyle = rgba(ink, 0.07);
      c.fillRect(x, base - max, bw, max);
      if (mirror) c.fillRect(x, base, bw, max);
      if (value > 0.001) {
        glow(c, x + bw / 2, base - height, u * 0.065, ink, value * 0.3);
        const g = c.createLinearGradient(0, base, 0, base - max);
        g.addColorStop(0, rgba(ink, 0.38));
        g.addColorStop(0.65, ink);
        g.addColorStop(1, "#f1ffff");
        c.fillStyle = g;
        c.fillRect(x, base - height, bw, height);
        if (mirror) {
          const reflection = c.createLinearGradient(0, base, 0, base + max);
          reflection.addColorStop(0, ink);
          reflection.addColorStop(1, rgba(ink, 0.15));
          c.fillStyle = reflection;
          c.fillRect(x, base, bw, height);
        } else {
          const reflection = c.createLinearGradient(0, base + 4, 0, h);
          reflection.addColorStop(0, rgba(ink, 0.3));
          reflection.addColorStop(1, rgba(ink, 0));
          c.fillStyle = reflection;
          c.fillRect(x, base + 4, bw, height * 0.21);
        }
      }
      if (!mirror) {
        c.fillStyle = "#02050c";
        for (let y = base - 4; y > base - max; y -= Math.max(4, h * 0.026))
          c.fillRect(x, y, bw, Math.max(1, h * 0.006));
      }
      c.fillStyle = rgba("#ecffff", peak * 0.9);
      c.fillRect(x, base - max * peak - 2, bw, Math.max(1, u * 0.004));
      if (mirror) c.fillRect(x, base + max * peak, bw, Math.max(1, u * 0.004));
    }
    line(
      c,
      [
        [w * 0.05, base],
        [w * 0.95, base],
      ],
      rgba(color, 0.35 + audio.level * 0.45),
      Math.max(1, u * 0.004),
    );
  } else if (id === "eq-halo") {
    const cx = w / 2,
      cy = h / 2,
      r = u * (0.2 + Math.min(2, scale) * 0.025),
      rays = 96;
    glow(c, cx, cy, r * 1.8, color, audio.bass * 0.18);
    for (let i = 0; i < rays; i++) {
      const p = i / rays,
        a = p * TAU - Math.PI / 2,
        v = sample(audio.bands, p),
        outer = r + u * 0.2 * v,
        ink = colour(p);
      line(
        c,
        [
          [cx + Math.cos(a) * r, cy + Math.sin(a) * r],
          [cx + Math.cos(a) * outer, cy + Math.sin(a) * outer],
        ],
        rgba(ink, 0.16 + v * 0.84),
        Math.max(1, u * 0.009),
      );
      if (v > 0.15)
        oval(
          c,
          cx + Math.cos(a) * outer,
          cy + Math.sin(a) * outer,
          u * 0.0035,
          u * 0.0035,
          "#dfffff",
        );
    }
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.arc(cx, cy, r * (0.6 + i * 0.1) + audio.beat * u * 0.018, 0, TAU);
      c.strokeStyle = rgba(
        colour(i / 4),
        0.08 + audio.bass * (0.35 - i * 0.06),
      );
      c.lineWidth = u * 0.003;
      c.stroke();
    }
    glow(c, cx, cy, r * 0.75, color, audio.beat * 0.32);
    oval(
      c,
      cx,
      cy,
      r * 0.14 * (0.3 + audio.bass),
      r * 0.14 * (0.3 + audio.bass),
      rgba("#f1ffff", audio.level),
    );
  } else if (id === "eq-wave") {
    const amplitude = h * 0.32 * Math.min(1.6, scale),
      ink = colour((seed % 7) / 7),
      points = audio.wave.map((v, i) => [
        w * (0.04 + (i / (audio.wave.length - 1)) * 0.92),
        h * 0.47 - v * amplitude,
      ]);
    const area = c.createLinearGradient(0, h * 0.2, 0, h * 0.8);
    area.addColorStop(0, rgba(ink, 0.22 * audio.level));
    area.addColorStop(1, rgba(ink, 0));
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.lineTo(w * 0.96, h * 0.47);
    c.lineTo(w * 0.04, h * 0.47);
    c.closePath();
    c.fillStyle = area;
    c.fill();
    for (let i = 4; i >= 1; i--)
      line(c, points, rgba(ink, audio.level * 0.04), u * 0.008 * i * i);
    line(
      c,
      points,
      rgba(ink, 0.15 + audio.level * 0.85),
      Math.max(1, u * 0.006),
    );
    line(c, points, "#eaffff", Math.max(0.6, u * 0.0018));
    line(
      c,
      audio.wave.map((v, i) => [
        w * (0.04 + (i / 127) * 0.92),
        h * 0.75 + v * amplitude * 0.35,
      ]),
      rgba(colour(0.8), 0.08 + audio.level * 0.4),
      Math.max(1, u * 0.003),
    );
    for (let i = 0; i < 16; i++) {
      const value = sample(audio.bands, i / 15);
      glow(
        c,
        w * (0.06 + (i / 15) * 0.88),
        h * 0.9,
        u * 0.035,
        colour(i / 15),
        value * 0.35,
      );
    }
  } else if (id === "eq-reactor") {
    const cx = w / 2,
      cy = h / 2,
      r = u * (0.12 + audio.bass * 0.07),
      rotation = Math.sin(phase * TAU) * audio.bass;
    glow(c, cx, cy, u * 0.45, color, audio.bass * 0.25);
    for (let ring = 0; ring < 3; ring++)
      for (let i = 0; i < 48; i++) {
        const p = i / 48,
          a = p * TAU + (ring % 2 ? -1 : 1) * rotation * 0.25,
          value = sample(audio.bands, (p + ring / 3) % 1),
          radius = u * (0.25 + ring * 0.065);
        c.beginPath();
        c.arc(cx, cy, radius, a, a + (TAU / 48) * 0.66);
        c.strokeStyle = rgba(colour(p), 0.07 + value * 0.8);
        c.lineWidth = u * (0.008 + value * 0.012);
        c.stroke();
      }
    const corners = Array.from({ length: 6 }, (_, i) => [
      cx + Math.cos((i / 6) * TAU + rotation) * r,
      cy + Math.sin((i / 6) * TAU + rotation) * r,
    ]);
    for (let i = 0; i < 6; i++)
      polygon(
        c,
        [[cx, cy], corners[i], corners[(i + 1) % 6]],
        rgba(colour(i / 6, 0.28 + i * 0.06), 0.2 + audio.bass * 0.8),
      );
    line(
      c,
      [...corners, corners[0]],
      rgba(color, 0.25 + audio.bass * 0.75),
      u * 0.005,
    );
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + rotation;
      line(
        c,
        [
          [cx + Math.cos(a) * r, cy + Math.sin(a) * r],
          [cx + Math.cos(a) * u * 0.235, cy + Math.sin(a) * u * 0.235],
        ],
        rgba(colour(i / 6), audio.beat * 0.7),
        u * 0.003,
      );
    }
    glow(c, cx, cy, u * 0.08, color, audio.beat * 0.7);
  } else {
    const n = Math.max(10, Math.min(40, Math.round(24 / Math.max(0.5, scale)))),
      step = (w * 0.85) / n,
      bw = step * 0.66,
      depth = Math.min(step * 0.35, h * 0.045),
      base = h * 0.8;
    for (let i = 0; i < n; i++) {
      const p = i / (n - 1),
        v = sample(audio.bands, p),
        x = w * 0.065 + i * step,
        top = base - h * (0.015 + v * 0.64),
        ink = colour(p);
      const front = c.createLinearGradient(x, top, x, base);
      front.addColorStop(0, rgba(ink, 0.3 + v * 0.7));
      front.addColorStop(1, rgba(ink, 0.1 + v * 0.3));
      c.fillStyle = front;
      c.fillRect(x, top, bw, base - top);
      polygon(
        c,
        [
          [x, top],
          [x + depth, top - depth],
          [x + bw + depth, top - depth],
          [x + bw, top],
        ],
        rgba(ink, 0.25 + v * 0.75),
      );
      polygon(
        c,
        [
          [x + bw, top],
          [x + bw + depth, top - depth],
          [x + bw + depth, base - depth],
          [x + bw, base],
        ],
        rgba(ink, 0.1 + v * 0.35),
      );
      line(
        c,
        [
          [x, base],
          [x, top],
          [x + bw, top],
        ],
        rgba("#e7ffff", v * 0.6),
        Math.max(0.6, u * 0.002),
      );
      c.fillStyle = rgba("#efffff", v * 0.4);
      for (let y = top + u * 0.02; y < base; y += u * 0.034)
        c.fillRect(x + bw * 0.2, y, bw * 0.6, u * 0.004);
      const reflection = c.createLinearGradient(0, base + 2, 0, h);
      reflection.addColorStop(0, rgba(ink, v * 0.2));
      reflection.addColorStop(1, rgba(ink, 0));
      c.fillStyle = reflection;
      c.fillRect(x, base + 2, bw, (base - top) * 0.23);
      if (v > 0.4) glow(c, x + bw * 0.5, top, u * 0.055, ink, v * 0.2);
    }
    line(
      c,
      [
        [w * 0.04, base],
        [w * 0.97, base],
      ],
      rgba(color, 0.18),
      u * 0.003,
    );
  }
  c.restore();
}
export const musicPainters = Object.fromEntries(
  musicIds.map((id) => [
    id,
    ((c, t, _w, _h, color, seed, scale = 1) =>
      drawMusicEffect(
        c,
        id,
        t,
        demoAudio(t),
        color,
        seed,
        scale,
      )) satisfies Painter,
  ]),
) as Record<MusicEffectId, Painter>;
