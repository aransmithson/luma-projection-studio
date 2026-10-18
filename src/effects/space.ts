import {
  background,
  glow,
  line,
  mod,
  oval,
  random,
  rgba,
  star,
  TAU,
  type Painter,
} from "./common";

function stars(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  color: string,
  seed: number,
  count: number,
) {
  for (let i = 0; i < count; i++) {
    const depth = random(i + 250, seed),
      x = mod(random(i, seed) * w - t * w * (0.001 + depth * 0.002), w),
      y = mod(random(i + 500, seed) * h + t * h * 0.0005, h),
      alpha = 0.3 + depth * (0.5 + Math.sin(t * 0.7 + i) * 0.15),
      r = 0.35 + depth * Math.min(w, h) * 0.0025;
    oval(ctx, x, y, r, r, rgba(i % 7 ? "#e3ecff" : color, alpha));
    if (depth > 0.97) star(ctx, x, y, r * 2.5, rgba(color, alpha * 0.65));
  }
}
const galaxy: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#030714", "#100a25");
  for (let i = 0; i < 7; i++)
    glow(
      ctx,
      w * (i / 6),
      h * (0.72 - i / 12) + Math.sin(t * 0.07 + i) * h * 0.035,
      u * 0.36,
      i % 2 ? color : "#d276ad",
      0.14,
    );
  stars(ctx, t, w, h, color, seed, 220);
  const p = mod(t, 9) / 9;
  if (p < 0.13) {
    const x = w * (0.8 - p * 4),
      y = h * (0.12 + p * 2),
      g = ctx.createLinearGradient(x, y, x + u * 0.25, y - u * 0.12);
    g.addColorStop(0, "#ffffffcc");
    g.addColorStop(1, "#cce5ff00");
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(1, u * 0.003);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + u * 0.25, y - u * 0.12);
    ctx.stroke();
  }
};

// Stylised geographic outlines in longitude/latitude, projected onto a rotating sphere.
const continents = [
  [
    [-168, 70],
    [-140, 72],
    [-125, 55],
    [-110, 50],
    [-83, 48],
    [-55, 54],
    [-60, 42],
    [-79, 25],
    [-88, 18],
    [-101, 23],
    [-113, 32],
    [-130, 48],
    [-155, 58],
  ],
  [
    [-81, 11],
    [-66, 12],
    [-48, -1],
    [-35, -10],
    [-48, -28],
    [-57, -40],
    [-69, -55],
    [-76, -33],
    [-80, -10],
  ],
  [
    [-17, 34],
    [10, 37],
    [34, 30],
    [48, 12],
    [42, -10],
    [28, -34],
    [16, -35],
    [9, -10],
    [-9, 5],
    [-17, 16],
  ],
  [
    [-10, 36],
    [-10, 57],
    [4, 61],
    [15, 71],
    [40, 68],
    [68, 72],
    [105, 76],
    [153, 61],
    [178, 66],
    [161, 49],
    [138, 34],
    [120, 24],
    [112, 5],
    [99, 10],
    [83, 23],
    [77, 7],
    [62, 26],
    [44, 14],
    [34, 31],
    [26, 41],
    [8, 44],
  ],
  [
    [112, -12],
    [134, -10],
    [153, -26],
    [145, -39],
    [126, -35],
    [113, -24],
  ],
  [
    [-52, 60],
    [-43, 60],
    [-20, 79],
    [-46, 83],
    [-62, 75],
  ],
];
const spaceship: Painter = (ctx, t, w, h, color, seed) => {
  const u = Math.min(w, h);
  background(ctx, w, h, "#020611");
  stars(ctx, t * 0.4, w, h, color, seed, 170);
  const cx = w * 0.52 + Math.sin(t * 0.07) * u * 0.025,
    cy = h * 0.51,
    radius = u * 0.32;
  glow(ctx, cx, cy, radius * 1.14, color, 0.5);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.clip();
  const ocean = ctx.createRadialGradient(
    cx - radius * 0.4,
    cy - radius * 0.4,
    0,
    cx,
    cy,
    radius,
  );
  ocean.addColorStop(0, "#4899c5");
  ocean.addColorStop(0.6, "#175786");
  ocean.addColorStop(1, "#08172e");
  ctx.fillStyle = ocean;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  const rotation = -0.15 + t * 0.035;
  for (const outline of continents) {
    const vertices = outline.map(([lon, lat]) => {
      const a = (lon * Math.PI) / 180 + rotation,
        b = (lat * Math.PI) / 180;
      return {
        x: Math.cos(b) * Math.sin(a),
        y: -Math.sin(b),
        z: Math.cos(b) * Math.cos(a),
      };
    });
    const front: typeof vertices = [];
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i],
        b = vertices[(i + 1) % vertices.length];
      if (a.z >= 0) front.push(a);
      if (a.z >= 0 !== b.z >= 0) {
        const s = a.z / (a.z - b.z);
        front.push({
          x: a.x + (b.x - a.x) * s,
          y: a.y + (b.y - a.y) * s,
          z: 0,
        });
      }
    }
    if (front.length < 3) continue;
    ctx.fillStyle = "#699777";
    ctx.beginPath();
    front.forEach((p, i) => {
      if (!i) ctx.moveTo(cx + p.x * radius, cy + p.y * radius);
      else ctx.lineTo(cx + p.x * radius, cy + p.y * radius);
    });
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#a3b59166";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (let i = 0; i < 15; i++) {
    const latitude = -0.8 + (i / 14) * 1.6,
      cloudW = Math.sqrt(1 - latitude * latitude) * radius;
    ctx.strokeStyle = "#f5faff66";
    ctx.lineWidth = radius * (0.014 + random(i, seed) * 0.025);
    ctx.beginPath();
    ctx.ellipse(
      cx + Math.sin(t * 0.045 + i) * radius * 0.08,
      cy + latitude * radius,
      cloudW,
      radius * 0.08,
      -0.2,
      0.1 + random(i + 40, seed) * 2,
      1.8 + random(i + 80, seed) * 2,
    );
    ctx.stroke();
  }
  const night = ctx.createLinearGradient(
    cx - radius * 0.5,
    cy,
    cx + radius,
    cy,
  );
  night.addColorStop(0, "#00000a00");
  night.addColorStop(0.6, "#02071566");
  night.addColorStop(1, "#01040ef5");
  ctx.fillStyle = night;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
  ctx.strokeStyle = rgba(color, 0.75);
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.008, Math.PI * 0.65, Math.PI * 1.75);
  ctx.stroke();
  const rim = u * 0.055,
    corners = [
      [rim, rim * 2],
      [rim * 2, rim],
      [w - rim * 2, rim],
      [w - rim, rim * 2],
      [w - rim, h - rim * 2],
      [w - rim * 2, h - rim],
      [rim * 2, h - rim],
      [rim, h - rim * 2],
    ];
  line(ctx, corners, "#101923", rim * 1.45, true);
  line(ctx, corners, "#415363", rim * 0.64, true);
  line(ctx, corners, "#90b8cc55", Math.max(1, rim * 0.08), true);
  for (const x of [rim * 2, w / 2, w - rim * 2])
    for (const y of [rim, h - rim])
      oval(ctx, x, y, rim * 0.12, rim * 0.12, "#121d2b");
  for (let i = 0; i < 3; i++) {
    const x = w * 0.46 + i * u * 0.035;
    glow(ctx, x, h - rim, u * 0.014, i === 2 ? "#f5bd73" : color, 0.5);
    oval(ctx, x, h - rim, u * 0.004, u * 0.004, i === 2 ? "#f5bd73" : color);
  }
};
export const spacePainters = { spaceship, galaxy };
