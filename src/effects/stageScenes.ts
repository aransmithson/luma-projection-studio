import type { EffectId } from "../types";
import {
  background,
  glow,
  hslHex,
  hue,
  line,
  mod,
  oval,
  random,
  rgba,
  smooth,
  TAU,
  type Painter,
} from "./common";
import { depthPhase, face, paint, transform, type LitFace } from "./depthArt";
import { rotate3, type Vec3 } from "./spatial";
import { stageStructurePainters } from "./stageStructures";

// Small, bounded lamp atlas: colour cycling must not grow a canvas cache forever.
const lamps = new Map<string, HTMLCanvasElement>();
function lampSprite(color: string) {
  let sprite = lamps.get(color);
  if (sprite) return sprite;
  sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  const c = sprite.getContext("2d")!;
  glow(c, 32, 32, 31, color, 0.65);
  const g = c.createRadialGradient(30, 29, 1, 32, 32, 9);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.24, "#fffaf1");
  g.addColorStop(0.55, color);
  g.addColorStop(1, rgba(color, 0.15));
  oval(c, 32, 32, 9, 9, "#ffffff");
  c.fillStyle = g;
  c.fill();
  if (lamps.size >= 96) lamps.delete(lamps.keys().next().value!);
  lamps.set(color, sprite);
  return sprite;
}
function lamp(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  power: number,
) {
  c.globalAlpha = Math.max(0, Math.min(1, power));
  c.drawImage(
    lampSprite(color),
    x - r * 3.56,
    y - r * 3.56,
    r * 7.12,
    r * 7.12,
  );
  c.globalAlpha = 1;
}
function flare(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  power: number,
) {
  c.save();
  c.globalCompositeOperation = "lighter";
  glow(c, x, y, r, color, power * 0.6);
  const g = c.createLinearGradient(x - r, y, x + r, y);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(0.49, rgba(color, power * 0.45));
  g.addColorStop(0.5, rgba("#ffffff", power));
  g.addColorStop(0.51, rgba(color, power * 0.45));
  g.addColorStop(1, rgba(color, 0));
  c.fillStyle = g;
  c.fillRect(x - r, y - r * 0.012, r * 2, Math.max(0.6, r * 0.024));
  c.translate(x, y);
  c.rotate(Math.PI / 2);
  c.translate(-x, -y);
  c.fillRect(x - r, y - r * 0.008, r * 2, Math.max(0.5, r * 0.016));
  c.restore();
}
const marquee: Painter = (c, t, w, h, color, seed) => {
  const a = depthPhase(t) * TAU,
    phase = random(1, seed) * TAU;
  background(c, w, h, "#030509", "#111721");
  const rows = 6,
    step = h / 7,
    cols = Math.max(4, Math.ceil(w / step));
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const x = ((col + 0.5) * w) / cols,
        y = (row + 1) * step,
        r = step * 0.23;
      const chase = Math.pow(
        0.5 + 0.5 * Math.cos(col * 0.72 - row * 0.9 - a * 3 + phase),
        5,
      );
      const pulse = 0.5 + 0.5 * Math.sin(a * 2 + row * 0.8 + phase);
      const power = 0.07 + chase * 0.8 + pulse * 0.13;
      oval(c, x, y + 2, r * 1.35, r * 1.35, "#010205");
      const rim = c.createLinearGradient(x - r, y - r, x + r, y + r);
      rim.addColorStop(0, "#607080");
      rim.addColorStop(0.34, "#18222d");
      rim.addColorStop(0.75, "#020508");
      rim.addColorStop(1, "#35434e");
      c.fillStyle = rim;
      c.beginPath();
      c.arc(x, y, r * 1.2, 0, TAU);
      c.fill();
      oval(c, x, y, r, r, "#12151b");
      lamp(c, x, y, r * 0.9, color, power);
      c.strokeStyle = rgba("#ffffff", 0.08 + power * 0.22);
      c.lineWidth = Math.max(0.6, h * 0.001);
      c.beginPath();
      c.arc(x, y, r * 0.82, 3.4, 5.3);
      c.stroke();
      if (power > 0.75) flare(c, x, y, step * 0.8, color, (power - 0.75) * 2);
    }
};

const ledPattern =
  (prism: boolean): Painter =>
  (c, t, w, h, color, seed) => {
    const a = depthPhase(t) * TAU,
      phase = random(0, seed) * TAU,
      base = hue(color);
    background(c, w, h, "#01030a");
    const rows = 38,
      step = h / (rows - 1),
      cols = Math.ceil(w / step);
    const palette = Array.from({ length: 16 }, (_, i) =>
      hslHex(base + i * 9, 0.83, 0.57),
    );
    for (let row = 0; row < rows; row++)
      for (let col = 0; col <= cols; col++) {
        const x = col * step,
          y = row * step,
          nx = (x - w / 2) / h,
          ny = (y - h / 2) / h;
        const r = Math.hypot(nx, ny),
          theta = Math.atan2(ny, nx);
        const v = prism
          ? 0.62 *
              Math.cos((Math.abs(nx) + Math.abs(ny)) * 18 - a * 3 + phase) +
            0.38 * Math.sin(theta * 4 + a * 2 + r * 9)
          : 0.58 * Math.sin(r * 24 - a * 3 + phase) +
            0.42 * Math.sin((nx - ny) * 15 + a * 2);
        const power = 0.025 + 0.95 * Math.pow(Math.max(0, v), 1.6);
        const index = Math.floor(
          (0.5 + 0.5 * Math.sin(theta * 2 - r * 7 + a + phase)) * 15,
        );
        lamp(c, x, y, step * 0.24, palette[index], power);
      }
    for (let i = 0; i < 5; i++) {
      const theta = a + (i / 5) * TAU + phase;
      const r = h * (0.2 + 0.12 * Math.sin(a * 2 + i));
      flare(
        c,
        w / 2 + Math.cos(theta) * r * 1.5,
        h / 2 + Math.sin(theta) * r,
        h * 0.16,
        color,
        0.35 + 0.25 * Math.sin(a * 3 + i),
      );
    }
  };

const cascade: Painter = (c, t, w, h, color, seed) => {
  const p = depthPhase(t),
    a = p * TAU;
  background(c, w, h, "#02020a", "#100c22");
  glow(c, w * 0.5, h * 0.82, h * 0.9, color, 0.13);
  for (let i = 0; i < 58; i++) {
    const x = random(i, seed) * w,
      depth = random(i, seed + 1),
      count = 7 + Math.floor(depth * 12);
    const rate = 1 + (i % 3),
      offset = random(i, seed + 2);
    for (let j = 0; j < count; j++) {
      const q = mod(p * rate + offset + j / count, 1),
        y = (q * 1.3 - 0.15) * h;
      const opacity = Math.pow(Math.sin(q * Math.PI), 2) * (0.15 + depth * 0.7);
      const xx = x + Math.sin(a + j * 0.12 + i) * h * (0.002 + depth * 0.008);
      lamp(c, xx, y, h * (0.0007 + depth * 0.0024), color, opacity);
    }
  }
  for (let i = 0; i < 28; i++) {
    const q = mod(p + random(i, seed + 9), 1),
      r = h * (0.006 + random(i, seed + 8) * 0.016);
    const x = random(i, seed + 3) * w + Math.sin(a + i) * h * 0.025,
      y = (q * 1.3 - 0.15) * h;
    const power = Math.pow(Math.sin(q * Math.PI), 2) * 0.5;
    glow(c, x, y, r * 4, color, power * 0.4);
    oval(c, x, y, r, r, rgba(color, power * 0.24));
    if (i % 7 === 0) flare(c, x, y, r * 7, color, power);
  }
};

const hexRelief: Painter = (c, t, w, h, color, seed) => {
  const a = depthPhase(t) * TAU,
    phase = random(0, seed) * TAU,
    faces: LitFace[] = [];
  background(c, w, h, "#02050c", "#182538");
  glow(c, w / 2, h / 2, h * 0.9, color, 0.3);
  const radius = 0.19,
    cols = Math.ceil((w / h) * 7) + 3,
    rows = 9;
  const world = (v: Vec3) => rotate3(v, -0.08, 0.12);
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const x = (col - (cols - 1) / 2) * radius * 1.5;
      const y =
        (row - (rows - 1) / 2 + (col % 2) * 0.5) * radius * Math.sqrt(3);
      const wave = 0.5 + 0.5 * Math.sin(Math.hypot(x, y) * 6 - a * 2 + phase);
      const z = -0.35 + wave * 0.58;
      const move = transform([x, y, 0], [0, 0, 0], world);
      const ring = (r: number, z: number): Vec3[] =>
        Array.from({ length: 6 }, (_, j) => [
          Math.cos((j * TAU) / 6) * r,
          Math.sin((j * TAU) / 6) * r,
          z,
        ]);
      const top = ring(radius * 0.88, z),
        rim = ring(radius * 0.96, z - 0.025),
        back = ring(radius * 0.96, -0.55);
      face(faces, top, { color, finish: "enamel" }, move);
      for (let j = 0; j < 6; j++) {
        const k = (j + 1) % 6;
        face(
          faces,
          [top[k], top[j], rim[j], rim[k]],
          { color, finish: "metal" },
          move,
        );
        face(
          faces,
          [rim[k], rim[j], back[j], back[k]],
          {
            color: hslHex(hue(color) + 20, 0.5, 0.18 + wave * 0.12),
            finish: "enamel",
          },
          move,
        );
      }
    }
  paint(c, faces, w, h);
};

const runway: Painter = (c, t, w, h, color, seed) => {
  const p = depthPhase(t),
    a = p * TAU,
    phase = random(0, seed) * TAU;
  background(c, w, h, "#01020a");
  const cx = w * (0.5 + Math.sin(a) * 0.025),
    cy = h * (0.48 + Math.cos(a) * 0.025);
  glow(c, cx, cy, h * 0.4, color, 0.32);
  const n = 20;
  // Draw far-to-near. New frames fade in at the vanishing point, then leave
  // beyond the mapped canvas so each recycled frame is visually continuous.
  const rings = Array.from({ length: n }, (_, i) => mod(i / n + p * 2, 1)).sort(
    (x, y) => x - y,
  );
  for (const q of rings) {
    const scale = 0.025 + Math.pow(q, 2.5) * 2.7;
    const rx = w * scale,
      ry = h * scale * 0.8,
      cut = Math.min(rx, ry) * 0.26;
    const pts = [
      [cx - rx + cut, cy - ry],
      [cx + rx - cut, cy - ry],
      [cx + rx, cy - ry + cut],
      [cx + rx, cy + ry - cut],
      [cx + rx - cut, cy + ry],
      [cx - rx + cut, cy + ry],
      [cx - rx, cy + ry - cut],
      [cx - rx, cy - ry + cut],
    ];
    const intensity = smooth(q * 7) * (1 - smooth((q - 0.88) / 0.12));
    const tint = hslHex(
      hue(color) + Math.sin(q * TAU * 2 + phase) * 35,
      0.85,
      0.57,
    );
    line(
      c,
      pts,
      rgba(tint, intensity * 0.13),
      Math.max(1, h * scale * 0.08),
      true,
    );
    line(
      c,
      pts,
      rgba(tint, intensity * 0.85),
      Math.max(0.6, h * scale * 0.013),
      true,
    );
    line(
      c,
      pts,
      rgba("#edf7ff", intensity * 0.85),
      Math.max(0.35, h * scale * 0.0025),
      true,
    );
  }
  for (const [x, y] of [
    [-w * 0.6, -h],
    [w * 1.6, -h],
    [-w * 0.6, h * 2],
    [w * 1.6, h * 2],
  ])
    line(
      c,
      [
        [cx, cy],
        [x, y],
      ],
      rgba(color, 0.32),
      Math.max(0.6, h * 0.0015),
    );
  flare(c, cx, cy, h * 0.3, color, 0.4 + Math.sin(a * 2 + phase) * 0.15);
};

const ledStage: Painter = (c, t, w, h, color, seed) => {
  const a = depthPhase(t) * TAU,
    phase = random(1, seed) * TAU,
    base = hue(color);
  background(c, w, h, "#02030a", "#0c0920");
  glow(c, w * 0.5, h * 0.45, h * 0.45, color, 0.15);
  const palette = Array.from({ length: 16 }, (_, i) =>
    hslHex(base + i * 8, 0.85, 0.57),
  );
  for (const side of [-1, 1])
    for (let wing = 0; wing < 3; wing++) {
      const centre = w / 2 + side * w * (0.26 + wing * 0.115),
        width = w * 0.078,
        top = h * (0.14 - wing * 0.045),
        bottom = h * 0.78;
      for (let row = 0; row < 28; row++)
        for (let col = 0; col < 9; col++) {
          const u = col / 8,
            v = row / 27;
          const x = centre + (u - 0.5) * width,
            y =
              top +
              (bottom - top) * v +
              Math.cos((u - 0.5) * Math.PI) * h * 0.03;
          const pattern =
            0.5 + 0.5 * Math.sin(v * 13 + u * 2 - a * 3 + wing + phase);
          const shade = Math.sin(u * Math.PI) * 0.65 + 0.35;
          const tint =
            palette[Math.floor((0.5 + 0.5 * Math.sin(v * 7 + a + wing)) * 15)];
          const r = Math.min(width / 10, h * 0.008) * 0.55,
            power = (0.08 + pattern * 0.86) * shade;
          lamp(c, x, y, r, tint, power);
          const reflected = h * 1.6 - y;
          if (reflected < h)
            lamp(
              c,
              x,
              reflected,
              r,
              tint,
              power * 0.15 * (1 - (reflected - h * 0.8) / (h * 0.2)),
            );
        }
    }
  // A recessed ring screen and moving shafts leave room for a mapped doorway.
  for (let ring = 0; ring < 9; ring++) {
    const r = h * (0.09 + ring * 0.023);
    const pts = Array.from({ length: 7 }, (_, i) => {
      const q = (i * TAU) / 6;
      return [w / 2 + Math.cos(q) * r, h * 0.44 + Math.sin(q) * r];
    });
    line(
      c,
      pts,
      rgba(
        color,
        0.06 +
          Math.pow(0.5 + 0.5 * Math.sin(a * 3 - ring * 0.65 + phase), 4) * 0.55,
      ),
      h * 0.002,
    );
  }
  for (const side of [-1, 1]) {
    const x = w * (0.5 + side * 0.17),
      y = h * 0.79;
    const aim = w * (0.5 + side * (0.1 + Math.sin(a + phase) * 0.24));
    const g = c.createLinearGradient(x, y, aim, 0);
    g.addColorStop(0, rgba(color, 0.25));
    g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - h * 0.008, y);
    c.lineTo(aim - w * 0.045, 0);
    c.lineTo(aim + w * 0.045, 0);
    c.lineTo(x + h * 0.008, y);
    c.fill();
    flare(c, x, y, h * 0.1, color, 0.7);
  }
};

type StageLayout = "cylinders" | "arch" | "ribbons" | "canopy" | "orb";
const sculptedLED =
  (layout: StageLayout): Painter =>
  (c, t, w, h, color, seed) => {
    const a = depthPhase(t) * TAU,
      phase = random(1, seed) * TAU;
    background(c, w, h, "#01030b", "#0b1020");
    glow(c, w * 0.5, h * 0.45, h * 0.75, color, 0.12);
    const palette = Array.from({ length: 16 }, (_, i) =>
      hslHex(hue(color) + i * 8, 0.85, 0.58),
    );
    const dot = (
      x: number,
      y: number,
      r: number,
      u: number,
      v: number,
      shade = 1,
      reflect = false,
    ) => {
      const value = 0.5 + 0.5 * Math.sin(u * 12 + v * 9 - a * 3 + phase);
      const index = Math.floor(
        (0.5 + 0.5 * Math.sin(u * 5 - v * 6 + a + phase)) * 15,
      );
      const power = (0.07 + Math.pow(value, 1.7) * 0.93) * shade,
        tint = palette[index];
      lamp(c, x, y, r, tint, power);
      if (reflect) {
        const yy = h * 1.62 - y;
        if (yy < h)
          lamp(
            c,
            x,
            yy,
            r,
            tint,
            power * 0.2 * Math.max(0, (h - yy) / (h * 0.19)),
          );
      }
    };
    if (layout === "cylinders") {
      for (let tower = 0; tower < 4; tower++)
        for (let row = 0; row < 29; row++)
          for (let col = 0; col < 17; col++) {
            const theta = (col / 16 - 0.5) * Math.PI,
              u = col / 16,
              v = row / 28;
            const radius = w * 0.07,
              centre = w * (0.13 + tower * 0.245);
            const x = centre + Math.sin(theta) * radius,
              y = h * (0.15 + v * 0.62) + Math.cos(theta) * h * 0.025;
            dot(
              x,
              y,
              h * 0.0048 * Math.max(0.3, Math.cos(theta)),
              u + Math.sin(a) * 0.18,
              v + tower * 0.2,
              0.3 + 0.7 * Math.cos(theta),
              true,
            );
          }
    } else if (layout === "arch") {
      for (let ring = 0; ring < 10; ring++)
        for (let col = 0; col < 81; col++) {
          const theta = Math.PI + (col / 80) * Math.PI,
            rx = w * (0.33 + ring * 0.012),
            ry = h * (0.37 + ring * 0.016);
          dot(
            w / 2 + Math.cos(theta) * rx,
            h * 0.64 + Math.sin(theta) * ry,
            h * 0.0048,
            col / 80,
            ring / 12,
          );
        }
      for (const side of [-1, 1])
        for (let row = 0; row < 15; row++)
          for (let col = 0; col < 10; col++)
            dot(
              w / 2 + side * w * (0.33 + col * 0.012),
              h * (0.64 + row * 0.012),
              h * 0.0048,
              col / 12,
              row / 15 + side,
              1,
              true,
            );
    } else if (layout === "ribbons") {
      for (let band = 0; band < 3; band++)
        for (let col = 0; col < 85; col++)
          for (let row = 0; row < 8; row++) {
            const u = col / 84,
              v = row / 7 - 0.5,
              roll = u * TAU + a + band * 1.4;
            const x = w * (u * 1.15 - 0.075),
              y =
                h *
                (0.23 +
                  band * 0.27 +
                  Math.sin(roll) * 0.13 +
                  v * 0.1 * Math.cos(roll));
            dot(
              x,
              y,
              h * 0.0045,
              u,
              v + band * 0.4,
              0.4 + 0.6 * Math.abs(Math.cos(roll)),
            );
          }
    } else if (layout === "canopy") {
      for (let row = 0; row < 30; row++)
        for (let col = 0; col < 65; col++) {
          const u = (col / 64) * 2 - 1,
            v = row / 29;
          const perspective = 0.1 + v * v * 1.5;
          const x = w / 2 + u * w * perspective,
            y =
              h * 0.67 -
              h * perspective * (0.25 + 0.35 * (1 - u * u)) +
              Math.sin(a + u * 3 + v * 4) * h * 0.035 * v;
          dot(x, y, h * (0.0014 + v * 0.005), u, v, 0.35 + v * 0.65);
        }
      line(
        c,
        [
          [0, h * 0.7],
          [w, h * 0.7],
        ],
        rgba(color, 0.25),
        1,
      );
    } else {
      const dots: {
        x: number;
        y: number;
        r: number;
        u: number;
        v: number;
        shade: number;
        z: number;
      }[] = [];
      for (let row = 1; row < 29; row++)
        for (let col = 0; col < 60; col++) {
          const lat = (row / 29) * Math.PI,
            lon = (col / 60) * TAU;
          const q = rotate3(
            [
              Math.sin(lat) * Math.cos(lon),
              Math.cos(lat),
              Math.sin(lat) * Math.sin(lon),
            ],
            0.16,
            a,
          );
          if (q[2] < 0) continue;
          const k = 1 + q[2] * 0.12;
          dots.push({
            x: w / 2 + q[0] * h * 0.33 * k,
            y: h * 0.42 + q[1] * h * 0.33 * k,
            r: h * 0.005 * k,
            u: col / 60,
            v: row / 29,
            shade: 0.25 + q[2] * 0.75,
            z: q[2],
          });
        }
      dots.sort((x, y) => x.z - y.z);
      for (const d of dots) dot(d.x, d.y, d.r, d.u, d.v, d.shade, true);
    }
    flare(
      c,
      w / 2 + Math.sin(a + phase) * w * 0.15,
      h * 0.83,
      h * 0.15,
      color,
      0.3,
    );
  };

// Analytic height-field shading keeps the fold highlights moving continuously.
// Reuse one colour-independent scratch buffer for both cloth scenes and all
// surfaces; no frame history, network assets or ever-growing texture caches.
let clothCanvas: HTMLCanvasElement | undefined;
let clothPixels: ImageData | undefined;
const silk =
  (pearl: boolean): Painter =>
  (c, t, w, h, color, seed) => {
    clothCanvas ??= document.createElement("canvas");
    const cw = Math.max(32, Math.min(320, Math.round(w))),
      ch = Math.max(32, Math.min(224, Math.round((cw * h) / w)));
    if (clothCanvas.width !== cw || clothCanvas.height !== ch) {
      clothCanvas.width = cw;
      clothCanvas.height = ch;
      clothPixels = undefined;
    }
    const ctx = clothCanvas.getContext("2d")!;
    clothPixels ??= ctx.createImageData(cw, ch);
    const data = clothPixels.data,
      a = depthPhase(t) * TAU,
      phase = random(0, seed) * TAU;
    const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    const freq = pearl ? 1 : 1.35;
    // Hoist row/column terms out of the inner loop. The work is bounded
    // independently of projector resolution and the two scenes share a buffer.
    const columns = Array.from({ length: cw }, (_, col) => {
      const x = ((col / cw) * freq * w) / h;
      return {
        x,
        sin5: Math.sin(x * 5),
        cos5: Math.cos(x * 5),
        cos4: Math.cos(x * 4 - a + phase),
        sin4: Math.sin(x * 4 - a + phase),
      };
    });
    for (let row = 0; row < ch; row++) {
      const y = (row / ch) * freq,
        sin7 = Math.sin(y * 7 + a + phase),
        cos7 = Math.cos(y * 7 + a + phase),
        sin6 = Math.sin(y * 6 + a),
        vy = 11 + 3.6 * Math.cos(y * 6 + a),
        sin3 = Math.sin(y * 3 + a * 2),
        cos3 = Math.cos(y * 3 + a * 2);
      for (let col = 0; col < cw; col++) {
        const column = columns[col],
          crossSin = column.sin5 * cos3 - column.cos5 * sin3,
          crossCos = column.cos5 * cos3 + column.sin5 * sin3;
        const u = column.x * 9 + y * 2 + 1.8 * sin7 + 0.7 * crossCos,
          v = y * 11 - column.x * 2 + 1.4 * column.cos4 + 0.6 * sin6,
          ux = 9 - 3.5 * crossSin,
          uy = 2 + 12.6 * cos7 + 2.1 * crossSin,
          vx = -2 - 5.6 * column.sin4;
        const f = u + 1.3 * Math.sin(v + a),
          g = v + 0.7 * Math.cos(u - a),
          cosF = Math.cos(f),
          cosG = Math.cos(g);
        const fu = cosF - 0.252 * cosG * Math.sin(u - a),
          fv = 1.3 * cosF * Math.cos(v + a) + 0.36 * cosG;
        const nx = -(fu * ux + fv * vx) * 0.12,
          ny = -(fu * uy + fv * vy) * 0.12,
          nz = 1 / Math.sqrt(nx * nx + ny * ny + 1);
        const diffuse = Math.max(0, (nx * -0.4 + ny * -0.45 + 0.8) * nz);
        const spec = Math.pow(
          Math.max(0, (nx * -0.24 + ny * -0.28 + 0.93) * nz),
          pearl ? 18 : 32,
        );
        const fold = Math.sin(f) + 0.36 * Math.sin(g),
          occlusion = 0.65 + (0.35 * (fold + 1.36)) / 2.72;
        const light =
          (pearl ? 0.17 : 0.06) + diffuse * (pearl ? 0.8 : 0.84) * occlusion;
        const thread =
          0.997 + 0.003 * Math.sin(row * 2.3 + col * 0.4 + fold * 2);
        const i = (row * cw + col) * 4;
        for (let channel = 0; channel < 3; channel++)
          data[i + channel] = Math.min(
            255,
            rgb[channel] * light * thread + spec * (pearl ? 85 : 135),
          );
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(clothPixels, 0, 0);
    background(c, w, h, pearl ? "#2b3542" : "#19040a");
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(clothCanvas, 0, 0, w, h);
  };

// Hand-authored 5 x 7 lamp arrangements, independent of fonts and stock art.
const glyphs = [
  "01110/10001/10001/11111/10001/10001/10001", // A
  "11110/10001/10001/11110/10001/10001/11110",
  "01111/10000/10000/10000/10000/10000/01111",
  "11110/10001/10001/10001/10001/10001/11110",
  "11111/10000/10000/11110/10000/10000/11111",
  "11111/10000/10000/11110/10000/10000/10000",
  "01111/10000/10000/10111/10001/10001/01111",
  "10001/10001/10001/11111/10001/10001/10001",
  "11111/00100/00100/00100/00100/00100/11111",
  "00111/00010/00010/00010/10010/10010/01100",
  "10001/10010/10100/11000/10100/10010/10001",
  "10000/10000/10000/10000/10000/10000/11111",
  "10001/11011/10101/10101/10001/10001/10001",
  "10001/11001/11001/10101/10011/10011/10001",
  "01110/10001/10001/10001/10001/10001/01110",
  "11110/10001/10001/11110/10000/10000/10000",
  "01110/10001/10001/10001/10101/10010/01101",
  "11110/10001/10001/11110/10100/10010/10001",
  "01111/10000/10000/01110/00001/00001/11110",
  "11111/00100/00100/00100/00100/00100/00100",
  "10001/10001/10001/10001/10001/10001/01110",
  "10001/10001/10001/10001/10001/01010/00100",
  "10001/10001/10001/10101/10101/11011/10001",
  "10001/10001/01010/00100/01010/10001/10001",
  "10001/10001/01010/00100/00100/00100/00100",
  "11111/00001/00010/00100/01000/10000/11111", // Z
  "01110/10001/10011/10101/11001/10001/01110", // 0
  "00100/01100/00100/00100/00100/00100/01110",
  "01110/10001/00001/00010/00100/01000/11111",
  "11110/00001/00001/01110/00001/00001/11110",
  "00010/00110/01010/10010/11111/00010/00010",
  "11111/10000/10000/11110/00001/00001/11110",
  "01110/10000/10000/11110/10001/10001/01110",
  "11111/00001/00010/00100/01000/01000/01000",
  "01110/10001/10001/01110/10001/10001/01110",
  "01110/10001/10001/01111/00001/00001/01110",
].map((s) => s.split("/").join(""));
const alphabet: Painter = (c, t, w, h, color, seed) => {
  const time = Math.round(mod(t, 36) * 1e6) / 1e6,
    step = Math.floor(time),
    q = mod(time, 1),
    offset = Math.floor(random(0, seed) * 36);
  const current = glyphs[mod(step + offset, 36)],
    next = glyphs[mod(step + offset + 1, 36)],
    mix = smooth((q - 0.76) / 0.24);
  background(c, w, h, "#020309");
  const cell = Math.min(w / 7, h / 9),
    x0 = w / 2 - cell * 2,
    y0 = h / 2 - cell * 3;
  glow(c, w / 2, h / 2, h * 0.65, color, 0.08);
  for (let row = 0; row < 7; row++)
    for (let col = 0; col < 5; col++) {
      const i = row * 5 + col,
        x = x0 + col * cell,
        y = y0 + row * cell;
      const power = Number(current[i]) * (1 - mix) + Number(next[i]) * mix;
      oval(c, x, y, cell * 0.31, cell * 0.31, "#111720");
      lamp(
        c,
        x,
        y,
        cell * 0.25,
        color,
        power * (0.87 + 0.13 * Math.sin(time * TAU + row * 0.4 + col * 0.3)),
      );
      if (power > 0.7 && i % 9 === 0)
        flare(c, x, y, cell * 0.9, color, power * 0.4);
    }
};

export const stagePainters: Partial<Record<EffectId, Painter>> = {
  ...stageStructurePainters,
  "marquee-wall": marquee,
  "led-prism": ledPattern(true),
  "stardust-cascade": cascade,
  "hex-relief": hexRelief,
  "photon-runway": runway,
  "led-stage": ledStage,
  "spectrum-dots": ledPattern(false),
  "pearl-silk": silk(true),
  "marquee-alphabet": alphabet,
  "crimson-silk": silk(false),
  "led-cylinder-hall": sculptedLED("cylinders"),
  "led-proscenium": sculptedLED("arch"),
  "ribbon-light-stage": sculptedLED("ribbons"),
  "light-canopy": sculptedLED("canopy"),
  "led-orb-chamber": sculptedLED("orb"),
};
