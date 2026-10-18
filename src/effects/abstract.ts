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
  TAU,
  type Painter,
} from "./common";

const lavaBuffers = new WeakMap<
  CanvasRenderingContext2D,
  {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    pixels: ImageData;
  }
>();
const lava: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#100b28", "#281132");
  glow(ctx, w * 0.5, h * 0.6, u * 0.65, color, 0.28);
  let buffer = lavaBuffers.get(ctx);
  if (!buffer) {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 150;
    const context = canvas.getContext("2d")!;
    buffer = {
      canvas,
      ctx: context,
      pixels: context.createImageData(100, 150),
    };
    lavaBuffers.set(ctx, buffer);
  }
  const blobs = Array.from({ length: 7 }, (_, i) => ({
    x: 0.5 + Math.sin(t * (0.23 + i * 0.015) + i * 2.1) * 0.24,
    y: 0.5 + Math.sin(t * (0.17 + random(i, seed) * 0.12) + i * 1.8) * 0.46,
    r: 0.1 + random(i + 10, seed) * 0.035,
  }));
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  for (let py = 0; py < 150; py++)
    for (let px = 0; px < 100; px++) {
      const x = px / 100,
        y = py / 150;
      let field = 0;
      for (const b of blobs)
        field +=
          (b.r * b.r) /
          Math.max(0.0001, (x - b.x) ** 2 * 0.7 + (y - b.y) ** 2 * 1.4);
      const a = Math.max(0, Math.min(1, (field - 1.15) * 7));
      const highlight = Math.max(0, Math.min(0.5, (field - 1.2) * 0.13));
      const p = (py * 100 + px) * 4;
      for (let c = 0; c < 3; c++)
        buffer.pixels.data[p + c] = rgb[c] + (255 - rgb[c]) * highlight;
      buffer.pixels.data[p + 3] = Math.round(a * 255);
    }
  buffer.ctx.putImageData(buffer.pixels, 0, 0);
  const lampW = Math.min(w * 0.52, h * 0.52),
    x = (w - lampW) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + lampW * 0.25, h * 0.13);
  ctx.lineTo(x + lampW * 0.75, h * 0.13);
  ctx.bezierCurveTo(
    x + lampW * 0.9,
    h * 0.5,
    x + lampW,
    h * 0.7,
    x + lampW,
    h * 0.83,
  );
  ctx.lineTo(x, h * 0.83);
  ctx.bezierCurveTo(
    x,
    h * 0.7,
    x + lampW * 0.1,
    h * 0.5,
    x + lampW * 0.25,
    h * 0.13,
  );
  ctx.closePath();
  ctx.clip();
  background(ctx, w, h, "#311d4c", "#481c46");
  ctx.drawImage(buffer.canvas, x, h * 0.1, lampW, h * 0.76);
  const reflection = ctx.createLinearGradient(x, 0, x + lampW, 0);
  reflection.addColorStop(0, "#ffffff33");
  reflection.addColorStop(0.16, "#ffffff00");
  reflection.addColorStop(0.8, "#ffffff00");
  reflection.addColorStop(1, "#ffffff20");
  ctx.fillStyle = reflection;
  ctx.fillRect(x, h * 0.1, lampW, h * 0.76);
  ctx.restore();
  const metal = ctx.createLinearGradient(x, 0, x + lampW, 0);
  metal.addColorStop(0, "#171526");
  metal.addColorStop(0.45, "#9896ac");
  metal.addColorStop(1, "#242139");
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.moveTo(x + lampW * 0.25, h * 0.13);
  ctx.lineTo(x + lampW * 0.32, h * 0.065);
  ctx.lineTo(x + lampW * 0.68, h * 0.065);
  ctx.lineTo(x + lampW * 0.75, h * 0.13);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, h * 0.83);
  ctx.lineTo(x + lampW * 0.2, h * 0.95);
  ctx.lineTo(x + lampW * 0.8, h * 0.95);
  ctx.lineTo(x + lampW, h * 0.83);
  ctx.fill();
};
const neon: Painter = (ctx, t, w, h, color) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#090716", "#1b1030");
  for (let i = 0; i < 7; i++) {
    const inset = u * (0.08 + i * 0.05),
      c = i % 2 ? "#62dce8" : color,
      points = [
        [inset, inset],
        [w - inset, inset],
        [w - inset, h - inset],
        [inset, h - inset],
      ];
    line(ctx, points, rgba(c, 0.06), u * 0.027, true);
    line(ctx, points, rgba(c, 0.18), u * 0.012, true);
    line(ctx, points, rgba(c, 0.8), Math.max(1, u * 0.004), true);
    line(ctx, points, "#ffffff77", Math.max(0.5, u * 0.001), true);
    const p = mod(t * 0.1 + i * 0.14, 1) * 4,
      edge = Math.floor(p),
      a = points[edge],
      b = points[(edge + 1) % 4];
    glow(
      ctx,
      a[0] + (b[0] - a[0]) * (p - edge),
      a[1] + (b[1] - a[1]) * (p - edge),
      u * 0.055,
      c,
      0.7,
    );
  }
};
const kaleidoscope: Painter = (ctx, t, w, h, color) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#080817");
  ctx.save();
  ctx.translate(w / 2, h / 2);
  const base = hue(color);
  for (let layer = 4; layer >= 0; layer--) {
    ctx.save();
    ctx.rotate(t * (layer % 2 ? -0.13 : 0.17) + layer * 0.2);
    const r = u * (0.13 + layer * 0.09);
    for (let i = 0; i < 12; i++) {
      ctx.save();
      ctx.rotate((i * TAU) / 12);
      const c = hslHex(base + i * 18 + layer * 22);
      ctx.fillStyle = rgba(c, 0.16);
      ctx.strokeStyle = rgba(c, 0.9);
      ctx.lineWidth = Math.max(0.7, u * 0.0025);
      ctx.beginPath();
      ctx.moveTo(r * 0.18, 0);
      ctx.quadraticCurveTo(r * 0.6, -r * 0.36, r, 0);
      ctx.quadraticCurveTo(r * 0.6, r * 0.36, r * 0.18, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  glow(ctx, 0, 0, u * 0.1, color, 0.65);
  ctx.restore();
};
const orbits: Painter = (ctx, t, w, h, color) => {
  const u = Math.min(w, h),
    base = hue(color);
  background(ctx, w, h, "#050915");
  glow(ctx, w / 2, h / 2, u * 0.5, color, 0.12);
  for (let ring = 0; ring < 7; ring++) {
    const radius = u * (0.09 + ring * 0.058),
      sides = 3 + ring,
      angle = t * (ring % 2 ? -0.26 : 0.2) + ring * 0.4,
      c = hslHex(base + ring * 38),
      points = Array.from({ length: sides }, (_, i) => [
        w / 2 + Math.cos((i / sides) * TAU + angle) * radius,
        h / 2 + Math.sin((i / sides) * TAU + angle) * radius,
      ]);
    line(ctx, points, rgba(c, 0.12), u * 0.014, true);
    line(ctx, points, rgba(c, 0.8), Math.max(0.7, u * 0.003), true);
    const phase = mod(t * 0.1 + ring / 7, 1) * sides,
      i = Math.floor(phase),
      a = points[i],
      b = points[(i + 1) % sides];
    glow(
      ctx,
      a[0] + (b[0] - a[0]) * (phase - i),
      a[1] + (b[1] - a[1]) * (phase - i),
      u * 0.022,
      "#ffffff",
      0.8,
    );
  }
};
const cubes: Painter = (ctx, t, w, h, color) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#080a19");
  glow(ctx, w / 2, h / 2, u * 0.5, color, 0.2);
  for (let layer = 2; layer >= 0; layer--) {
    const a = t * 0.36 + layer * 0.4,
      b = t * 0.23 - layer * 0.2,
      size = u * (0.14 + layer * 0.095),
      c = hslHex(hue(color) + layer * 40);
    const vertices = Array.from({ length: 8 }, (_, i) => {
      const x = i & 1 ? 1 : -1,
        y = i & 2 ? 1 : -1,
        z = i & 4 ? 1 : -1;
      const rx = x * Math.cos(a) - z * Math.sin(a),
        rz = x * Math.sin(a) + z * Math.cos(a),
        ry = y * Math.cos(b) - rz * Math.sin(b),
        depth = y * Math.sin(b) + rz * Math.cos(b),
        p = 3.5 / (3.5 + depth);
      return [w / 2 + rx * size * p, h / 2 + ry * size * p];
    });
    for (let i = 0; i < 8; i++)
      for (const bit of [1, 2, 4])
        if (!(i & bit)) {
          const edge = [vertices[i], vertices[i | bit]];
          line(ctx, edge, rgba(c, 0.09), u * 0.014);
          line(ctx, edge, rgba(c, 0.85), Math.max(0.8, u * 0.0025));
        }
    vertices.forEach(([x, y]) =>
      oval(ctx, x, y, u * 0.004, u * 0.004, "#f1eaff"),
    );
  }
};
const confetti: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#15102a", "#2c153d");
  const palette = [color, "#ffcb6a", "#73dfcd", "#b195ff", "#ff7e79"];
  for (let i = 0; i < 140; i++) {
    const speed = 0.04 + random(i + 150, seed) * 0.12,
      x = mod(
        random(i, seed) * w + Math.sin(t + i) * u * 0.025 + t * u * 0.012,
        w,
      ),
      y = mod(random(i + 300, seed) * h + t * h * speed, h * 1.1) - h * 0.05,
      size = u * (0.006 + random(i + 450, seed) * 0.008);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 1.5 + i);
    ctx.fillStyle = palette[i % 5];
    ctx.fillRect(
      -size,
      -size * 0.4,
      size * 2 * Math.sin(t * 2 + i),
      size * 0.8,
    );
    ctx.restore();
  }
};
const fireworks: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#030715", "#130d27");
  for (let burst = 0; burst < 5; burst++) {
    const phase = mod(t + burst * 1.15, 5),
      cycle = Math.floor((t + burst * 1.15) / 5),
      s = seed + burst * 13 + cycle * 17,
      x = w * (0.17 + random(1, s) * 0.66),
      y = h * (0.18 + random(2, s) * 0.36),
      c = burst % 2 ? hslHex(hue(color) + burst * 55) : color;
    if (phase < 1) {
      const ry = h - (h - y) * phase;
      line(
        ctx,
        [
          [x, ry + u * 0.12],
          [x, ry],
        ],
        rgba(c, 0.6),
        Math.max(1, u * 0.003),
      );
      glow(ctx, x, ry, u * 0.015, "#fff3ce", 0.9);
    } else {
      const age = phase - 1,
        radius = u * 0.21 * (1 - Math.exp(-age * 1.5)),
        alpha = Math.max(0, 1 - age / 3.3);
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * TAU,
          spread = 0.7 + random(i + 20, s) * 0.3,
          px = x + Math.cos(a) * radius * spread,
          py = y + Math.sin(a) * radius * spread + age * age * u * 0.018;
        line(
          ctx,
          [
            [
              px - Math.cos(a) * u * 0.025 * alpha,
              py - Math.sin(a) * u * 0.025 * alpha,
            ],
            [px, py],
          ],
          rgba(c, alpha),
          Math.max(0.6, u * 0.002),
        );
        oval(ctx, px, py, u * 0.0028, u * 0.0028, rgba("#fff2ce", alpha));
      }
    }
  }
};
const electric: Painter = (ctx, t, w, h, color) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#040916", "#101325");
  for (let strand = 0; strand < 6; strand++) {
    const points = Array.from({ length: 100 }, (_, i) => {
      const x = (i / 99) * w,
        envelope = Math.sin((i / 99) * Math.PI),
        y =
          h * (0.18 + strand * 0.13) +
          envelope *
            (Math.sin(i * 0.21 + t * 2 + strand) * u * 0.035 +
              Math.sin(i * 0.63 - t * 3) * u * 0.012);
      return [x, y];
    });
    line(ctx, points, rgba(color, 0.06), u * 0.03);
    line(ctx, points, rgba(color, 0.2), u * 0.011);
    line(ctx, points, rgba(color, 0.9), Math.max(0.7, u * 0.0025));
    const pos = Math.floor(mod(t * 0.18 + strand * 0.12, 1) * 99);
    glow(ctx, points[pos][0], points[pos][1], u * 0.032, "#dff7ff", 0.65);
  }
};
const bokeh: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#191229", "#1b2940");
  for (let i = 0; i < 35; i++) {
    const x =
        mod(random(i, seed) * w + Math.sin(t * 0.13 + i) * u * 0.12, w * 1.2) -
        w * 0.1,
      y = mod(random(i + 50, seed) * h - t * h * 0.008, h * 1.3) - h * 0.15,
      r = u * (0.025 + random(i + 100, seed) * 0.14),
      c = hslHex(hue(color) + (i % 4) * 27);
    glow(ctx, x, y, r, c, 0.26);
    oval(ctx, x, y, r * 0.65, r * 0.65, rgba(c, 0.07));
    ctx.strokeStyle = rgba(c, 0.14);
    ctx.lineWidth = Math.max(0.5, u * 0.0015);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.7, 0, TAU);
    ctx.stroke();
  }
};
export const abstractPainters = {
  lava,
  neon,
  kaleidoscope,
  orbits,
  cubes,
  confetti,
  fireworks,
  electric,
  bokeh,
};
