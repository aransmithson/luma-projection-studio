import {
  background,
  glow,
  line,
  mod,
  oval,
  random,
  rgba,
  smooth,
  star,
  TAU,
  type Painter,
} from "./common";

const cuteGhosts: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#080b20", "#20152e");
  glow(ctx, w * 0.5, h * 0.5, u * 0.75, color, 0.25);
  for (let i = 0; i < 24; i++)
    star(
      ctx,
      random(i, seed) * w,
      random(i + 40, seed) * h,
      u * (0.003 + random(i + 80, seed) * 0.004),
      rgba(color, 0.25 + 0.2 * Math.sin(t + i)),
    );
  const positions = [
    [0.23, 0.38, 0.72],
    [0.76, 0.3, 0.6],
    [0.51, 0.55, 1],
    [0.8, 0.76, 0.5],
    [0.15, 0.78, 0.42],
  ];
  positions.forEach(([x, y, size], i) => {
    ctx.save();
    ctx.translate(
      w * x + Math.sin(t * 0.45 + i * 2) * u * 0.045,
      h * y + Math.sin(t * 0.9 + i) * u * 0.045,
    );
    ctx.rotate(Math.sin(t * 0.65 + i) * 0.1);
    ctx.scale(u * 0.2 * size, u * 0.2 * size);
    glow(ctx, 0, 0.1, 1.5, color, 0.24);
    const body = ctx.createLinearGradient(-0.7, -0.8, 0.6, 1);
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.55, "#eff3ff");
    body.addColorStop(1, color);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-0.72, 0.74);
    ctx.lineTo(-0.72, -0.25);
    ctx.bezierCurveTo(-0.72, -1.15, 0.72, -1.15, 0.72, -0.25);
    ctx.lineTo(0.72, 0.74);
    for (let j = 0; j < 4; j++) {
      const px = 0.72 - j * 0.36;
      ctx.quadraticCurveTo(
        px - 0.1,
        1 + Math.sin(t * 2 + j + i) * 0.08,
        px - 0.36,
        0.74,
      );
    }
    ctx.closePath();
    ctx.fill();
    oval(
      ctx,
      -0.77,
      0.1,
      0.2,
      0.34,
      "#eef3ff",
      -0.55 + Math.sin(t * 1.8 + i) * 0.2,
    );
    oval(
      ctx,
      0.77,
      0.06,
      0.2,
      0.34,
      "#eef3ff",
      0.55 - Math.sin(t * 1.8 + i) * 0.2,
    );
    const blink = mod(t + i * 1.3, 5) > 4.82 ? 0.025 : 0.14;
    oval(ctx, -0.24, -0.16, 0.075, blink, "#262139");
    oval(ctx, 0.24, -0.16, 0.075, blink, "#262139");
    oval(ctx, -0.4, 0.06, 0.14, 0.07, "#ffadc4");
    oval(ctx, 0.4, 0.06, 0.14, 0.07, "#ffadc4");
    ctx.strokeStyle = "#45334f";
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.arc(0, 0.02, 0.13, 0.12, Math.PI - 0.12);
    ctx.stroke();
    ctx.restore();
  });
};

const scaryGhost: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#020509", "#101925");
  for (let i = 0; i < 8; i++)
    glow(
      ctx,
      mod(random(i, seed) * w + t * w * 0.015, w * 1.4) - w * 0.2,
      h * (0.3 + 0.6 * random(i + 10, seed)),
      u * 0.42,
      color,
      0.12,
    );
  ctx.save();
  ctx.translate(
    w * 0.5 + Math.sin(t * 0.37) * u * 0.07,
    h * 0.48 + Math.sin(t * 0.8) * u * 0.035,
  );
  ctx.scale(u * 0.43, u * 0.43);
  glow(ctx, 0, -0.2, 1.15, color, 0.25);
  const shroud = ctx.createLinearGradient(-0.7, -0.8, 0.5, 1.2);
  shroud.addColorStop(0, "#d4e4d9");
  shroud.addColorStop(0.35, "#9badb1");
  shroud.addColorStop(0.7, "#3a505b");
  shroud.addColorStop(1, "#0b1823");
  ctx.fillStyle = shroud;
  ctx.beginPath();
  ctx.moveTo(-0.52, -0.22);
  ctx.bezierCurveTo(-0.6, -1.18, 0.6, -1.18, 0.54, -0.22);
  ctx.bezierCurveTo(0.72, 0.1, 0.93, 0.29 + Math.sin(t) * 0.1, 1.02, 0.53);
  ctx.lineTo(0.54, 0.25);
  ctx.lineTo(0.72, 1.05);
  for (let i = 0; i < 9; i++)
    ctx.lineTo(
      0.72 - i * 0.18,
      (i % 2 ? 0.68 : 1.1) + Math.sin(t * 1.8 + i) * 0.08,
    );
  ctx.lineTo(-0.56, 0.25);
  ctx.lineTo(-1.05, 0.56);
  ctx.bezierCurveTo(-0.85, 0.12, -0.7, 0.15, -0.52, -0.22);
  ctx.closePath();
  ctx.fill();
  for (let i = -3; i <= 3; i++) {
    ctx.strokeStyle = "rgba(215,236,230,.15)";
    ctx.lineWidth = 0.016;
    ctx.beginPath();
    ctx.moveTo(i * 0.1, -0.2);
    ctx.bezierCurveTo(
      i * 0.08 + 0.06,
      0.2,
      i * 0.15 + Math.sin(t + i) * 0.06,
      0.7,
      i * 0.2,
      0.95,
    );
    ctx.stroke();
  }
  oval(ctx, 0, -0.36, 0.35, 0.43, "#ced9cc");
  oval(ctx, -0.16, -0.45, 0.105, 0.17, "#08111a", -0.22);
  oval(ctx, 0.16, -0.45, 0.105, 0.17, "#08111a", 0.22);
  glow(ctx, -0.16, -0.45, 0.065, "#baffd8", 0.9);
  glow(ctx, 0.16, -0.45, 0.065, "#baffd8", 0.9);
  oval(ctx, 0, -0.12, 0.11 + Math.sin(t * 0.7) * 0.015, 0.22, "#060a12");
  ctx.restore();
};

const skeletons: Painter = (ctx, t, w, h, color) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#090a17", "#24122c");
  for (let i = 0; i < 3; i++) {
    const beat = t * 3.2 + i * 0.65,
      size = Math.min(u * 0.55, w / 3.1),
      x = w * (0.2 + i * 0.3);
    glow(ctx, x, h * 0.82, size * 0.8, color, 0.25);
    oval(ctx, x, h * 0.87, size * 0.38, size * 0.055, "#05050d");
    ctx.save();
    ctx.translate(x, h * 0.32 + Math.abs(Math.sin(beat)) * u * 0.025);
    ctx.scale(size, size);
    ctx.rotate(Math.sin(beat) * 0.075);
    const bone = "#f3ead8",
      shade = "#c9c5c0";
    const bones = (p: number[][], width = 0.038) => {
      line(ctx, p, "#302b40", width * 2);
      line(ctx, p, bone, width);
      p.forEach(([px, py]) =>
        oval(ctx, px, py, width * 0.65, width * 0.65, bone),
      );
    };
    bones(
      [
        [0, -0.17],
        [0, 0.46],
      ],
      0.047,
    );
    bones(
      [
        [-0.17, 0],
        [0, -0.04],
        [0.17, 0],
      ],
      0.035,
    );
    for (let rib = 0; rib < 4; rib++) {
      const y = 0.04 + rib * 0.063,
        span = 0.17 - rib * 0.015;
      ctx.strokeStyle = shade;
      ctx.lineWidth = 0.024;
      ctx.beginPath();
      ctx.moveTo(-span, y);
      ctx.quadraticCurveTo(-span * 1.3, y + 0.06, 0, y + 0.065);
      ctx.quadraticCurveTo(span * 1.3, y + 0.06, span, y);
      ctx.stroke();
    }
    bones(
      [
        [-0.11, 0.41],
        [0, 0.48],
        [0.11, 0.41],
      ],
      0.05,
    );
    for (const side of [-1, 1]) {
      bones([
        [side * 0.17, 0.01],
        [
          side * (0.32 + Math.sin(beat) * 0.04),
          0.16 + Math.cos(beat + side) * 0.16,
        ],
        [
          side * (0.44 + Math.sin(beat) * 0.05),
          0.02 + Math.cos(beat + side) * 0.3,
        ],
      ]);
      const knee = [
          side * 0.13 + Math.sin(beat + side) * 0.09,
          0.66 + Math.sin(beat + side) * 0.035,
        ],
        foot = [
          side * 0.19 + Math.sin(beat + side) * 0.15,
          0.9 - Math.max(0, Math.sin(beat + side)) * 0.16,
        ];
      bones([[side * 0.1, 0.43], knee, foot]);
      bones([foot, [foot[0] + side * 0.12, foot[1] + 0.015]], 0.045);
    }
    ctx.save();
    ctx.translate(0, -0.27);
    ctx.rotate(-Math.sin(beat) * 0.12);
    oval(ctx, 0, -0.02, 0.17, 0.19, bone);
    ctx.fillStyle = bone;
    ctx.fillRect(-0.1, 0.1, 0.2, 0.12);
    oval(ctx, -0.067, -0.035, 0.045, 0.058, "#171124");
    oval(ctx, 0.067, -0.035, 0.045, 0.058, "#171124");
    ctx.fillStyle = "#352b38";
    ctx.beginPath();
    ctx.moveTo(0, 0.035);
    ctx.lineTo(-0.026, 0.085);
    ctx.lineTo(0.026, 0.085);
    ctx.fill();
    for (let tooth = -2; tooth <= 2; tooth++)
      line(
        ctx,
        [
          [tooth * 0.035, 0.14],
          [tooth * 0.035, 0.2],
        ],
        "#6c6066",
        0.012,
      );
    line(
      ctx,
      [
        [-0.09, 0.17],
        [0.09, 0.17],
      ],
      "#6c6066",
      0.012,
    );
    ctx.restore();
    ctx.restore();
  }
};

const pumpkins: Painter = (ctx, t, w, h, color) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#110918", "#2b121b");
  [
    [0.2, 0.58, 0.65],
    [0.79, 0.57, 0.67],
    [0.5, 0.58, 1],
  ].forEach(([x, y, s], i) => {
    const size = Math.min(u * 0.32, w * 0.25) * s;
    glow(ctx, w * x, h * y, size * 1.6, color, 0.2);
    ctx.save();
    ctx.translate(w * x, h * y + Math.sin(t * 1.5 + i) * u * 0.035);
    ctx.rotate(Math.sin(t + i * 2) * 0.09);
    ctx.scale(size, size);
    ctx.strokeStyle = "#557435";
    ctx.lineWidth = 0.16;
    ctx.beginPath();
    ctx.moveTo(0, -0.75);
    ctx.quadraticCurveTo(-0.05, -1.16, 0.2, -1.13);
    ctx.stroke();
    for (let rib = -2; rib <= 2; rib++) {
      const g = ctx.createRadialGradient(
        rib * 0.22 - 0.09,
        -0.25,
        0.02,
        rib * 0.22,
        0,
        0.88,
      );
      g.addColorStop(0, "#ffb951");
      g.addColorStop(0.45, color);
      g.addColorStop(1, "#7a260d");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(
        rib * 0.22,
        0,
        0.49,
        0.82 - Math.abs(rib) * 0.06,
        rib * -0.04,
        0,
        TAU,
      );
      ctx.fill();
    }
    const light = 0.65 + Math.sin(t * 5 + i) * 0.08 + Math.sin(t * 8.3) * 0.06;
    glow(ctx, 0, 0.08, 0.8, "#ffbc34", light * 0.35);
    ctx.fillStyle = `rgba(255,238,129,${light + 0.15})`;
    const blink = 0.7 + 0.3 * Math.sin(t * 1.1 + i);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 0.12, -0.17);
      ctx.lineTo(side * 0.53, -0.37 * blink);
      ctx.lineTo(side * 0.49, -0.02);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(0, -0.02);
    ctx.lineTo(-0.09, 0.15);
    ctx.lineTo(0.09, 0.15);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.57, 0.23);
    ctx.lineTo(-0.25, 0.29);
    ctx.lineTo(-0.25, 0.43);
    ctx.lineTo(-0.12, 0.43);
    ctx.lineTo(-0.12, 0.3);
    ctx.lineTo(0.2, 0.3);
    ctx.lineTo(0.2, 0.4);
    ctx.lineTo(0.32, 0.4);
    ctx.lineTo(0.32, 0.27);
    ctx.lineTo(0.57, 0.21);
    ctx.quadraticCurveTo(0.02, 0.88, -0.57, 0.23);
    ctx.fill();
    ctx.restore();
  });
};

export function curtainOpening(time: number) {
  const phase = mod(time, 16);
  return phase < 2
    ? 0
    : phase < 6
      ? smooth((phase - 2) / 4)
      : phase < 11
        ? 1
        : phase < 14
          ? 1 - smooth((phase - 11) / 3)
          : 0;
}
const curtains: Painter = (ctx, t, w, h, color) => {
  const u = Math.min(w, h),
    open = curtainOpening(t);
  background(ctx, w, h, "#040306", "#10080e");
  glow(ctx, w * 0.5, h * 0.5, u * 0.5, "#bd182f", 0.18 + open * 0.22);
  ctx.save();
  ctx.translate(w * 0.5, h * 0.51 + Math.sin(t * 0.7) * u * 0.01);
  ctx.scale(u * 0.36, u * 0.4);
  const mask = ctx.createLinearGradient(-0.5, -0.8, 0.6, 0.8);
  mask.addColorStop(0, "#aeb1a7");
  mask.addColorStop(0.45, "#777f7e");
  mask.addColorStop(1, "#29323c");
  ctx.fillStyle = mask;
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.bezierCurveTo(-0.85, -1.03, -0.78, 0.4, -0.25, 0.94);
  ctx.quadraticCurveTo(0, 1.2, 0.25, 0.94);
  ctx.bezierCurveTo(0.78, 0.4, 0.85, -1.03, 0, -1);
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 0.28, -0.27);
    ctx.rotate(side * 0.25);
    oval(ctx, 0, 0, 0.21, 0.13, "#020309");
    glow(ctx, 0, 0, 0.11, "#ff363e", 0.85);
    oval(ctx, 0, 0, 0.025, 0.055, "#ffdf99");
    ctx.restore();
  }
  oval(ctx, 0, 0.37, 0.24, 0.37 + Math.sin(t) * 0.02, "#030207");
  for (const side of [-1, 1])
    for (let tooth = -2; tooth <= 2; tooth++) {
      ctx.fillStyle = "#b9b5a4";
      ctx.beginPath();
      ctx.moveTo(tooth * 0.073 - 0.025, 0.37 + side * 0.29);
      ctx.lineTo(tooth * 0.073 + 0.025, 0.37 + side * 0.29);
      ctx.lineTo(tooth * 0.073, 0.37 + side * 0.18);
      ctx.fill();
    }
  line(
    ctx,
    [
      [-0.045, -0.1],
      [0, 0.06],
      [0.05, 0.04],
    ],
    "#3d4749",
    0.03,
  );
  ctx.restore();
  const panelWidth = w * (0.505 - open * 0.435);
  for (const side of [0, 1]) {
    ctx.save();
    if (side) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(panelWidth, 0);
    ctx.bezierCurveTo(
      panelWidth * 0.78,
      h * 0.3,
      panelWidth * 1.1,
      h * 0.72,
      panelWidth * 0.93,
      h,
    );
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.clip();
    background(ctx, panelWidth, h, color, "#310a1a");
    for (let fold = 0; fold < 9; fold++) {
      const fx = (fold / 8) * panelWidth,
        fw = panelWidth / 8;
      const g = ctx.createLinearGradient(fx, 0, fx + fw, 0);
      g.addColorStop(0, "#00000099");
      g.addColorStop(0.45, "#ffffff20");
      g.addColorStop(1, "#00000077");
      ctx.fillStyle = g;
      ctx.fillRect(fx, 0, fw, h);
    }
    ctx.restore();
  }
  ctx.fillStyle = "#59182c";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h * 0.1);
  for (let i = 7; i >= 0; i--)
    ctx.quadraticCurveTo((w * (i + 0.5)) / 8, h * 0.22, (w * i) / 8, h * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#cda25d";
  ctx.lineWidth = Math.max(1, u * 0.006);
  ctx.stroke();
};

export const halloweenPainters = {
  "cute-ghosts": cuteGhosts,
  "scary-ghost": scaryGhost,
  skeletons,
  pumpkins,
  curtains,
};
