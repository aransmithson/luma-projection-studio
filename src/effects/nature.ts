import {
  background,
  glow,
  line,
  mod,
  oval,
  random,
  rgba,
  TAU,
  type Painter,
} from "./common";

const fire: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#060308", "#341008");
  glow(ctx, w / 2, h * 1.05, Math.max(w, h) * 0.9, "#ff4917", 0.4);
  for (let layer = 0; layer < 3; layer++)
    for (let i = 0; i < 15; i++) {
      const x = w * (i / 14),
        span = w * (0.065 + 0.025 * random(i, seed)),
        height = h * (0.3 + random(i + 20, seed) * 0.55) * (1 - layer * 0.22);
      const sway = Math.sin(t * (1.4 + random(i, seed)) + i * 2) * span,
        tip = h - height * (0.88 + Math.sin(t * 3 + i) * 0.12);
      const g = ctx.createLinearGradient(0, tip, 0, h);
      g.addColorStop(0, layer === 0 ? rgba(color, 0.05) : "#fff7b144");
      g.addColorStop(
        0.4,
        layer === 0
          ? rgba(color, 0.85)
          : layer === 1
            ? "#ffb42ee0"
            : "#fff1a9df",
      );
      g.addColorStop(1, layer === 0 ? "#c62e10" : "#ffc45c");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - span, h * 1.05);
      ctx.bezierCurveTo(
        x - span * 1.3,
        h - height * 0.35,
        x + sway * 1.7,
        tip + height * 0.4,
        x + sway,
        tip,
      );
      ctx.bezierCurveTo(
        x + span * 0.8 + sway,
        tip + height * 0.38,
        x + span,
        h - height * 0.18,
        x + span,
        h * 1.05,
      );
      ctx.closePath();
      ctx.fill();
    }
  for (let i = 0; i < 44; i++) {
    const p = mod(random(i, seed) + t * (0.08 + random(i + 90, seed) * 0.1), 1),
      x = random(i + 45, seed) * w + Math.sin(p * 8 + i) * u * 0.04;
    oval(
      ctx,
      x,
      h * (1 - p),
      u * 0.0025,
      u * 0.005,
      rgba("#ffd17c", Math.sin(p * Math.PI)),
    );
  }
};

const underwater: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#123f62", "#02141e");
  for (let i = 0; i < 6; i++) {
    const x = w * (i / 5) + Math.sin(t * 0.23 + i) * u * 0.06;
    const ray = ctx.createLinearGradient(x, 0, x + w * 0.2, h);
    ray.addColorStop(0, "#9cf6e830");
    ray.addColorStop(1, "#9cf6e800");
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + u * 0.04, 0);
    ctx.lineTo(x + w * 0.3, h);
    ctx.lineTo(x + w * 0.1, h);
    ctx.fill();
  }
  glow(ctx, w * 0.5, 0, u * 0.8, color, 0.3);
  for (let i = 0; i < 18; i++) {
    const x = (w * i) / 17,
      kelp = h * (0.12 + random(i, seed) * 0.27),
      sway = Math.sin(t * 0.9 + i * 0.8) * u * 0.045;
    ctx.strokeStyle = i % 2 ? "#176c63" : "#238d79";
    ctx.lineWidth = u * (0.007 + random(i + 30, seed) * 0.009);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.bezierCurveTo(
      x - sway,
      h - kelp * 0.3,
      x + sway * 1.3,
      h - kelp * 0.7,
      x + sway,
      h - kelp,
    );
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const direction = i % 2 ? 1 : -1,
      x =
        mod(
          random(i, seed) * w +
            t * w * (0.025 + random(i + 30, seed) * 0.025) * direction,
          w * 1.3,
        ) -
        w * 0.15,
      y =
        h * (0.2 + random(i + 20, seed) * 0.5) +
        Math.sin(t * 0.8 + i) * u * 0.02,
      size = u * (0.025 + random(i + 40, seed) * 0.035);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(direction, 1);
    ctx.fillStyle = i % 3 ? color : "#ffc56d";
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(-size * 1.8, -size * (0.5 + Math.sin(t * 8 + i) * 0.2));
    ctx.lineTo(-size * 1.8, size * 0.6);
    ctx.closePath();
    ctx.fill();
    oval(ctx, 0, 0, size * 1.35, size * 0.55, i % 3 ? color : "#ffc56d");
    oval(ctx, size * 0.7, -size * 0.1, size * 0.09, size * 0.09, "#09232e");
    ctx.restore();
  }
  for (let i = 0; i < 25; i++) {
    const y = h * (1 - mod(random(i, seed) + t * 0.04, 1)),
      x = random(i + 60, seed) * w + Math.sin(t + i) * u * 0.015,
      r = u * (0.003 + random(i + 90, seed) * 0.009);
    ctx.strokeStyle = "#bdf8f147";
    ctx.lineWidth = Math.max(0.5, u * 0.0015);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
  }
};

const waves: Painter = (ctx, t, w, h, color) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#101d39", "#235475");
  glow(ctx, w * 0.73, h * 0.2, u * 0.25, "#bfdcff", 0.2);
  oval(ctx, w * 0.73, h * 0.18, u * 0.065, u * 0.065, "#d7e5eb");
  for (let layer = 0; layer < 7; layer++) {
    const base = h * (0.36 + layer * 0.11),
      amp = h * (0.018 + layer * 0.006),
      points: number[][] = [];
    for (let i = -2; i <= 66; i++) {
      const x = (w * i) / 64,
        y =
          base +
          Math.sin((i / 64) * 8 - t * (0.55 + layer * 0.07) + layer) * amp +
          Math.sin((i / 64) * 17 + t * 0.35) * amp * 0.35;
      points.push([x, y]);
    }
    const g = ctx.createLinearGradient(0, base - amp, 0, base + h * 0.3);
    g.addColorStop(0, rgba(color, 0.15 + layer * 0.07));
    g.addColorStop(1, "#071b33");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(w * 1.1, h * 1.2);
    ctx.lineTo(-w * 0.1, h * 1.2);
    ctx.fill();
    line(
      ctx,
      points,
      rgba("#c1f4ff", 0.14 + layer * 0.04),
      Math.max(0.6, u * 0.003),
    );
    for (let k = 0; k < 10; k++) {
      const x =
        w * (0.73 + Math.sin(k * 3 + layer) * 0.08 * (1 + layer * 0.15));
      line(
        ctx,
        [
          [x, base + amp * 0.5 + k * 2],
          [x + u * 0.02, base + amp * 0.5 + k * 2],
        ],
        "#d5f3ff16",
        1,
      );
    }
  }
};

function falling(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  color: string,
  seed: number,
  petals: boolean,
) {
  const u = Math.min(w, h);
  background(
    ctx,
    w,
    h,
    petals ? "#211a30" : "#181720",
    petals ? "#473044" : "#33241c",
  );
  glow(ctx, w * 0.6, h * 0.2, u * 0.8, color, 0.2);
  const palette = petals
    ? [color, "#ffe0e9", "#ef82b2", "#f4c4dc"]
    : [color, "#d56537", "#b64436", "#e5c265"];
  for (let i = 0; i < 48; i++) {
    const depth = 0.4 + random(i + 40, seed) * 0.6,
      x =
        mod(
          random(i, seed) * w +
            Math.sin(t * 0.5 + i) * u * 0.08 +
            t * u * 0.025,
          w * 1.2,
        ) -
        w * 0.1,
      y =
        mod(random(i + 80, seed) * h + t * h * 0.05 * depth, h * 1.2) - h * 0.1,
      size = u * (petals ? 0.022 : 0.034) * depth;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * (0.4 + depth) + i);
    ctx.scale(0.35 + 0.65 * Math.abs(Math.sin(t * 0.7 + i)), 1);
    ctx.fillStyle = palette[i % palette.length];
    ctx.beginPath();
    ctx.moveTo(0, -size);
    if (petals) {
      ctx.bezierCurveTo(size, -size * 1.4, size * 1.1, size * 0.6, 0, size);
      ctx.bezierCurveTo(-size, size * 0.5, -size, -size, 0, -size);
    } else if (i % 2) {
      ctx.lineTo(size * 0.35, -size * 0.4);
      ctx.lineTo(size, -size * 0.3);
      ctx.lineTo(size * 0.5, size * 0.15);
      ctx.lineTo(size * 0.75, size * 0.65);
      ctx.lineTo(size * 0.15, size * 0.5);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.15, size * 0.5);
      ctx.lineTo(-size * 0.75, size * 0.65);
      ctx.lineTo(-size * 0.5, size * 0.15);
      ctx.lineTo(-size, -size * 0.3);
      ctx.lineTo(-size * 0.35, -size * 0.4);
    } else {
      ctx.bezierCurveTo(size, -size * 0.7, size, size * 0.7, 0, size);
      ctx.bezierCurveTo(-size, size * 0.7, -size, -size * 0.7, 0, -size);
    }
    ctx.closePath();
    ctx.fill();
    if (!petals)
      line(
        ctx,
        [
          [0, -size * 0.8],
          [0, size * 1.2],
        ],
        "#48261e99",
        Math.max(0.5, size * 0.065),
      );
    ctx.restore();
  }
}
const leaves: Painter = (ctx, t, w, h, color, seed) =>
  falling(ctx, t, w, h, color, seed, false);
const petals: Painter = (ctx, t, w, h, color, seed) =>
  falling(ctx, t, w, h, color, seed, true);

const rain: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#071420", "#172a38");
  for (let i = 0; i < 15; i++)
    glow(
      ctx,
      random(i, seed) * w,
      h * (0.25 + random(i + 20, seed) * 0.65),
      u * (0.04 + random(i + 50, seed) * 0.09),
      i % 3 ? color : "#ffc181",
      0.24,
    );
  for (let i = 0; i < 95; i++) {
    const depth = random(i + 100, seed),
      x = random(i, seed) * w,
      y =
        mod(
          random(i + 200, seed) * h + t * h * (0.15 + depth * 0.25),
          h * 1.2,
        ) -
        h * 0.1,
      length = u * (0.02 + depth * 0.07);
    const g = ctx.createLinearGradient(x, y - length, x + 1, y);
    g.addColorStop(0, "#d4efff00");
    g.addColorStop(1, rgba(color, 0.18 + depth * 0.45));
    ctx.strokeStyle = g;
    ctx.lineWidth = 0.6 + depth * u * 0.003;
    ctx.beginPath();
    ctx.moveTo(x - length * 0.07, y - length);
    ctx.quadraticCurveTo(x + Math.sin(i + t) * 2, y - length * 0.3, x, y);
    ctx.stroke();
    oval(ctx, x, y, 0.8 + depth * 1.2, 1 + depth * 2, "#d5f1ff55");
  }
};
const bubbles: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#0a1024", "#183247");
  for (let i = 0; i < 30; i++) {
    const r = u * (0.02 + random(i + 70, seed) * 0.08),
      x = random(i, seed) * w + Math.sin(t * 0.6 + i) * u * 0.04,
      y =
        h * 1.15 -
        mod(
          random(i + 40, seed) * h * 1.3 +
            t * u * (0.03 + random(i + 90, seed) * 0.05),
          h * 1.3,
        );
    const g = ctx.createRadialGradient(
      x - r * 0.3,
      y - r * 0.4,
      r * 0.05,
      x,
      y,
      r,
    );
    g.addColorStop(0, "#ffffff25");
    g.addColorStop(0.7, rgba(color, 0.02));
    g.addColorStop(0.93, rgba(color, 0.2));
    g.addColorStop(1, "#f2c4ff70");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#bcecff88";
    ctx.lineWidth = Math.max(0.7, u * 0.002);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.85, Math.PI * 1.08, Math.PI * 1.6);
    ctx.stroke();
    oval(ctx, x - r * 0.3, y - r * 0.5, r * 0.13, r * 0.07, "#ffffffaa", -0.5);
  }
};
const clouds: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#27508b", color);
  glow(ctx, w * 0.76, h * 0.22, u * 0.3, "#fff2c9", 0.65);
  for (let layer = 0; layer < 3; layer++)
    for (let i = 0; i < 7; i++) {
      const x =
          mod(
            random(i + layer * 10, seed) * w * 1.5 +
              t * w * (0.008 + layer * 0.007),
            w * 1.5,
          ) -
          w * 0.25,
        y = h * (0.18 + layer * 0.26) + random(i + 30, seed) * h * 0.18,
        size = u * (0.08 + layer * 0.03);
      for (let puff = 0; puff < 5; puff++) {
        const cx = x + (puff - 2) * size * 0.55,
          cy = y - Math.sin((puff / 4) * Math.PI) * size * 0.35;
        glow(ctx, cx, cy, size * 1.15, "#f5f7ff", 0.3 + layer * 0.08);
        oval(ctx, cx, cy, size * 0.7, size * 0.45, "#f4f4ff22");
      }
    }
};
const ripples: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#09232d", "#0b111e");
  glow(ctx, w * 0.4, h * 0.3, u * 0.7, color, 0.22);
  for (let i = 0; i < 12; i++) {
    const p = mod(t * 0.15 + random(i, seed), 1),
      x = random(i + 20, seed) * w,
      y = random(i + 40, seed) * h;
    for (let ring = 0; ring < 3; ring++) {
      const r = (p + ring * 0.08) * u * 0.38;
      ctx.strokeStyle = rgba(
        color,
        Math.sin(p * Math.PI) * (1 - p) * (1 - ring * 0.25),
      );
      ctx.lineWidth = Math.max(0.7, u * 0.003);
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.43, -0.1, 0, TAU);
      ctx.stroke();
    }
  }
};
// Analytic flock motion keeps seeking, pause and separate output canvases identical.
// A shared travelling ribbon supplies cohesion; seeded offsets avoid a rigid lattice.
function murmuration(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, seed: number) {
  const u = Math.min(w, h);
  ctx.save();
  for (let i = 0; i < 144; i++) {
    const phase = random(i + 400, seed) * TAU;
    const radius = Math.sqrt(random(i + 600, seed));
    const lane = (random(i + 800, seed) - 0.5) * 2;
    const depth = 0.5 + 0.5 * Math.sin(phase + t * 0.27);
    // Neighbours follow the same curling flow with a small delay through the flock.
    const flow = t * 0.32 + lane * 0.65;
    const curl = phase + t * 0.38;
    const x = w * (0.5 + 0.23 * Math.sin(flow * 0.63)
      + lane * 0.14 * Math.cos(flow) + Math.cos(curl) * radius * 0.065);
    const y = h * (0.245 + 0.065 * Math.sin(flow * 0.91)
      + lane * 0.065 * Math.sin(flow) + Math.sin(curl) * radius * 0.055);
    const dx = w * (0.23 * 0.63 * 0.32 * Math.cos(flow * 0.63)
      - lane * 0.14 * 0.32 * Math.sin(flow) - Math.sin(curl) * radius * 0.065 * 0.38);
    const dy = h * (0.065 * 0.91 * 0.32 * Math.cos(flow * 0.91)
      + lane * 0.065 * 0.32 * Math.cos(flow) + Math.cos(curl) * radius * 0.055 * 0.38);
    const size = u * (0.0021 + depth * 0.0025) * (0.8 + random(i + 1000, seed) * 0.4);
    const flap = Math.sin(t * (7.5 + random(i + 1200, seed) * 3) + phase * 3);
    const glide = 0.5 + 0.5 * Math.sin(t * 0.7 + phase);
    const wing = (flap * (0.25 + 0.75 * glide) - 0.15) * size;
    ctx.save();
    ctx.translate(x, y);
    // Keep wings across the direction of travel, with a gentle banking variation.
    ctx.rotate(Math.atan2(dy, dx) + Math.PI / 2);
    ctx.fillStyle = rgba("#242d46", 0.48 + depth * 0.42);
    ctx.beginPath();
    ctx.moveTo(-size * 1.5, wing);
    ctx.quadraticCurveTo(-size * 0.7, -size * 0.45, 0, -size * 0.22);
    ctx.quadraticCurveTo(size * 0.7, -size * 0.45, size * 1.5, wing);
    ctx.lineTo(size * 0.55, wing * 0.45 + size * 0.22);
    ctx.lineTo(0, size * 0.65);
    ctx.lineTo(-size * 0.55, wing * 0.45 + size * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

const sunrise: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h),
    lift = 0.5 + 0.5 * Math.sin(t * 0.1 - 0.6);
  background(ctx, w, h, "#312854", "#e4a77f");
  glow(ctx, w * 0.57, h * (0.52 - lift * 0.16), u * 0.6, color, 0.75);
  oval(ctx, w * 0.57, h * (0.52 - lift * 0.16), u * 0.13, u * 0.13, "#ffe6ae");
  murmuration(ctx, t, w, h, seed);
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = ["#64526f", "#423d59", "#242d46"][layer];
    ctx.beginPath();
    ctx.moveTo(-w * 0.1, h);
    for (let i = -1; i <= 21; i++)
      ctx.lineTo(
        (i * w) / 20,
        h * (0.51 + layer * 0.09) -
          random(i + layer * 30, seed) * h * 0.17 +
          Math.sin(t * 0.04 + i) * h * 0.003,
      );
    ctx.lineTo(w * 1.1, h);
    ctx.fill();
  }
  const lake = ctx.createLinearGradient(0, h * 0.75, 0, h);
  lake.addColorStop(0, "#6b6279");
  lake.addColorStop(1, "#16253b");
  ctx.fillStyle = lake;
  ctx.fillRect(0, h * 0.76, w, h * 0.3);
  for (let i = 0; i < 30; i++) {
    const y = h * (0.77 + i * 0.009),
      length = u * (0.05 + i * 0.007) * (0.7 + Math.sin(t + i) * 0.2),
      x = w * 0.57 + Math.sin(i * 6 + t * 0.5) * u * 0.04;
    line(
      ctx,
      [
        [x - length, y],
        [x + length, y],
      ],
      rgba(color, 0.16 + 0.1 * Math.sin(i + t)),
      Math.max(0.8, u * 0.003),
    );
  }
};

export const naturePainters = {
  fire,
  underwater,
  waves,
  leaves,
  rain,
  bubbles,
  clouds,
  ripples,
  petals,
  sunrise,
};
