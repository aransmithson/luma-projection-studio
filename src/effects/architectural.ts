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
import {
  addBox,
  makeFace,
  paintFaces,
  project3,
  rotate3,
  type Face,
  type Vec3,
} from "./spatial";

// Every pose is a function of shared playback time: seeking and pausing need no simulation state.
export const ARCHITECTURAL_LOOP = 15;
export const architecturalPhase = (time: number) =>
  mod(time, ARCHITECTURAL_LOOP) / ARCHITECTURAL_LOOP;
export function collapseAmount(time: number) {
  const p = architecturalPhase(time);
  return p < 0.6 ? smooth((p - 0.17) / 0.38) : 1 - smooth((p - 0.64) / 0.3);
}

const relief: Painter = (ctx, time, w, h, color, seed) => {
  const phase = architecturalPhase(time) * TAU,
    aspect = w / h;
  background(ctx, w, h, "#030810", "#101d2c");
  const rows = 5,
    cols = Math.max(4, Math.min(14, Math.round(aspect * rows))),
    cell = 2.35 / rows;
  const faces: Face[] = [];
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const x = (col - (cols - 1) / 2) * cell,
        y = (row - (rows - 1) / 2) * cell;
      const wave = phase + col * 0.65 + row * 0.8 + random(4, seed) * TAU;
      const depth = 0.04 + 0.29 * (0.5 + 0.5 * Math.sin(wave));
      const ax = Math.sin(wave + 0.7) * 0.24,
        ay = Math.cos(wave) * 0.26;
      const corners = [
        [-0.48, -0.48],
        [0.48, -0.48],
        [0.48, 0.48],
        [-0.48, 0.48],
      ].map(([a, b]) =>
        project3(
          [x + a * cell + depth * 0.16, y + b * cell + depth * 0.27, -0.2],
          w,
          h,
        ),
      );
      ctx.fillStyle = "#000000a0";
      ctx.beginPath();
      corners.forEach(([px, py], i) =>
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py),
      );
      ctx.closePath();
      ctx.fill();
      addBox(faces, [0, 0, 0], [cell * 0.43, cell * 0.43, depth], (p) => {
        const q = rotate3(p, ax, ay, Math.sin(phase + row) * 0.045);
        return [q[0] + x, q[1] + y, q[2] + depth - 0.18];
      });
    }
  paintFaces(ctx, faces, w, h, color, true);
};

const shatter: Painter = (ctx, time, w, h, color, seed) => {
  const p = architecturalPhase(time),
    amount = collapseAmount(time),
    u = Math.min(w, h),
    aspect = w / h;
  background(ctx, w, h, "#02050b", "#08111b");
  // The recessed frame remains visible behind the falling wall.
  for (let i = 0; i < 5; i++) {
    const inset = 0.05 + i * 0.065;
    line(
      ctx,
      [
        [w * inset, h * inset],
        [w * (1 - inset), h * inset],
        [w * (1 - inset), h * (1 - inset)],
        [w * inset, h * (1 - inset)],
      ],
      rgba(color, 0.035 + 0.025 * amount),
      Math.max(0.6, u * 0.001),
      true,
    );
  }
  glow(ctx, w * 0.5, h, u * 0.8, color, 0.2 * amount);
  const rows = 5,
    cols = Math.max(5, Math.min(14, Math.round(aspect * 6)));
  const node = (col: number, row: number): Vec3 => [
    ((col +
      (col > 0 && col < cols
        ? (random(col + row * 91, seed) - 0.5) * 0.7
        : 0)) /
      cols -
      0.5) *
      aspect *
      2.36,
    ((row +
      (row > 0 && row < rows
        ? (random(col + row * 37 + 500, seed) - 0.5) * 0.7
        : 0)) /
      rows -
      0.5) *
      2.36,
    0,
  ];
  const faces: Face[] = [];
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const a = node(col, row),
        b = node(col + 1, row),
        c = node(col + 1, row + 1),
        d = node(col, row + 1);
      for (const [triangle, half] of [
        [[a, b, c], 0],
        [[a, c, d], 1],
      ] as [Vec3[], number][]) {
        const id = (row * cols + col) * 2 + half;
        const delay = random(id + 12, seed) * 0.17 + (row / rows) * 0.08;
        const fall = smooth((amount - delay) / (1 - delay));
        const centre = [0, 1, 2].map(
          (i) => triangle.reduce((sum, v) => sum + v[i], 0) / 3,
        ) as Vec3;
        const vertices = triangle.map((vertex) => {
          const relative = vertex.map((v, i) => v - centre[i]) as Vec3;
          const q = rotate3(
            relative,
            fall * (random(id + 44, seed) - 0.5) * 5,
            fall * (random(id + 72, seed) - 0.5) * 4,
            fall * (random(id + 22, seed) - 0.5) * 3,
          );
          return [
            q[0] + centre[0] + (random(id, seed) - 0.5) * fall * 1.8,
            q[1] + centre[1] + fall * fall * 3.8,
            q[2] + fall * (random(id + 9, seed) * 1.3 - 0.2),
          ] as Vec3;
        });
        const opacity = 1 - smooth((fall - 0.7) / 0.3);
        // Glass is visible from either side as each shard tumbles.
        const face =
          makeFace(vertices, opacity) ||
          makeFace([...vertices].reverse(), opacity);
        if (face && opacity > 0.001) faces.push(face);
      }
    }
  paintFaces(ctx, faces, w, h, color, true);
  const cracks = smooth((p - 0.07) / 0.1) * (1 - smooth((p - 0.9) / 0.08));
  if (amount < 0.02 && cracks > 0) {
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++)
        line(
          ctx,
          [node(col, row), node(col + 1, row + 1), node(col + 1, row)].map(
            (v) => project3(v, w, h),
          ),
          rgba("#e4faff", cracks * 0.55),
          Math.max(0.5, u * 0.0013),
        );
  }
  for (let i = 0; i < 36; i++) {
    const alpha = Math.sin(amount * Math.PI) * 0.35;
    oval(
      ctx,
      random(i, seed) * w + Math.sin(p * TAU + i) * u * 0.04,
      h * (0.55 + random(i + 70, seed) * 0.5) -
        Math.sin(p * TAU * 2 + i) * u * 0.05,
      u * (0.004 + random(i + 80, seed) * 0.009),
      u * 0.003,
      rgba(color, alpha),
    );
  }
};

type FieldBuffer = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  image: ImageData;
  noise: Float32Array;
  seed: number;
  density: Float32Array;
};
const fields = new WeakMap<CanvasRenderingContext2D, FieldBuffer>();
function fieldFor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
) {
  const width = 224,
    height = Math.max(96, Math.min(288, Math.round((width * h) / w)));
  let buffer = fields.get(ctx);
  if (!buffer || buffer.canvas.height !== height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false })!;
    buffer = {
      canvas,
      context,
      image: context.createImageData(width, height),
      noise: new Float32Array(128 * 128),
      seed: NaN,
      density: new Float32Array(width * height),
    };
    fields.set(ctx, buffer);
  }
  if (buffer.seed !== seed) {
    buffer.noise.forEach((_, i) => {
      buffer!.noise[i] = random(i, seed);
    });
    buffer.seed = seed;
  }
  return buffer;
}
function sampleNoise(noise: Float32Array, x: number, y: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = smooth(x - ix),
    fy = smooth(y - iy);
  const a = noise[(iy & 127) * 128 + (ix & 127)],
    b = noise[(iy & 127) * 128 + ((ix + 1) & 127)],
    c = noise[((iy + 1) & 127) * 128 + (ix & 127)],
    d = noise[((iy + 1) & 127) * 128 + ((ix + 1) & 127)];
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

const drapery: Painter = (ctx, time, w, h, color, seed) => {
  background(ctx, w, h, "#07141e");
  const field = fieldFor(ctx, w, h, seed),
    rw = field.canvas.width,
    rh = field.canvas.height;
  const phase = architecturalPhase(time) * TAU,
    shift = random(0, seed) * TAU;
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  for (let y = 0; y < rh; y++)
    for (let x = 0; x < rw; x++) {
      const a = (x / rw) * TAU,
        v = y / rh;
      const f =
        a * 5 +
        0.75 * Math.sin(v * 7 - phase) +
        0.3 * Math.sin(a * 2 + phase * 2) +
        phase +
        shift;
      const ripple = Math.sin(a * 3 + v * 18 - phase * 2);
      const nx =
        Math.cos(f) * 0.8 + Math.cos(a * 3 + v * 18 - phase * 2) * 0.16;
      const ny = Math.cos(f) * Math.cos(v * 7 - phase) * 0.3 + ripple * 0.18;
      const diffuse = Math.max(0, 0.66 - nx * 0.48 - ny * 0.27);
      const sheen = Math.pow(Math.max(0, 1 - Math.abs(nx + 0.3)), 14);
      const foldShadow = 0.58 + 0.42 * Math.sin(f);
      const light = 0.13 + diffuse * 0.48 + foldShadow * 0.16,
        pixel = (y * rw + x) * 4;
      for (let c = 0; c < 3; c++)
        field.image.data[pixel + c] = Math.min(
          255,
          rgb[c] * light + sheen * 190 + ripple * 6,
        );
      field.image.data[pixel + 3] = 255;
    }
  field.context.putImageData(field.image, 0, 0);
  ctx.drawImage(field.canvas, 0, 0, w, h);
};

const lattice: Painter = (ctx, time, w, h, color, seed) => {
  const phase = architecturalPhase(time) * TAU,
    u = Math.min(w, h),
    base = hue(color),
    shift = random(2, seed) * TAU;
  background(ctx, w, h, "#040813", "#0c1327");
  for (let x = -w; x <= w * 2; x += u * 0.12)
    line(
      ctx,
      [
        [x, 0],
        [x, h],
      ],
      "#7eb5dd0b",
      0.6,
    );
  for (let y = 0; y <= h; y += u * 0.12)
    line(
      ctx,
      [
        [0, y],
        [w, y],
      ],
      "#7eb5dd0b",
      0.6,
    );
  glow(ctx, w / 2, h / 2, u * 0.65, color, 0.1);
  const point = (a: number, b: number): Vec3 => {
    const radius = 0.78 + 0.1 * Math.sin(3 * a + phase + shift),
      tube = 0.25 + 0.05 * Math.sin(2 * a - phase);
    return rotate3(
      [
        (radius + tube * Math.cos(b)) * Math.cos(a),
        (radius + tube * Math.cos(b)) * Math.sin(a),
        tube * Math.sin(b) + 0.13 * Math.sin(3 * a + phase),
      ],
      0.65 + 0.3 * Math.sin(phase),
      phase,
      0.22 * Math.sin(phase),
    );
  };
  const major = 48,
    minor = 16;
  const points = Array.from({ length: major }, (_, a) =>
    Array.from({ length: minor }, (_, b) =>
      point((a / major) * TAU, (b / minor) * TAU),
    ),
  );
  const edges: { a: Vec3; b: Vec3; hue: number; depth: number }[] = [];
  for (let a = 0; a < major; a++)
    for (let b = 0; b < minor; b++)
      for (const end of [
        points[(a + 1) % major][b],
        points[a][(b + 1) % minor],
      ])
        edges.push({
          a: points[a][b],
          b: end,
          hue: base + (a / major) * 250 + b * 2,
          depth: (points[a][b][2] + end[2]) / 2,
        });
  edges.sort((a, b) => a.depth - b.depth);
  for (const edge of edges)
    line(
      ctx,
      [project3(edge.a, w, h), project3(edge.b, w, h)],
      rgba(hslHex(edge.hue), 0.22 + ((edge.depth + 1.2) / 2.4) * 0.65),
      Math.max(0.55, u * 0.0022),
    );
  for (let i = 0; i < 8; i++) {
    const p = project3(point((i * TAU) / 8 + phase, phase * 2 + i), w, h);
    glow(ctx, p[0], p[1], u * 0.025, hslHex(base + i * 35), 0.7);
  }
};

export function lightningStrength(time: number) {
  const p = architecturalPhase(time);
  return (
    Math.exp(-(((p - 0.285) / 0.012) ** 2)) +
    0.8 * Math.exp(-(((p - 0.715) / 0.016) ** 2))
  );
}
const storm: Painter = (ctx, time, w, h, color, seed) => {
  background(ctx, w, h, "#050b17");
  const p = architecturalPhase(time),
    phase = p * TAU,
    flash = lightningStrength(time);
  const field = fieldFor(ctx, w, h, seed),
    rw = field.canvas.width,
    rh = field.canvas.height,
    u = Math.min(w, h);
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  for (let y = 0; y < rh; y++)
    for (let x = 0; x < rw; x++) {
      const xx = (x / rw) * 7,
        yy = (y / rh) * 4;
      let n = 0;
      for (let octave = 0; octave < 4; octave++) {
        const f = 2 ** octave;
        n +=
          (sampleNoise(
            field.noise,
            xx * f + p * 128,
            yy * f + Math.sin(phase) * (octave + 1),
          ) *
            0.54) /
          f;
      }
      const banks =
        0.12 * Math.cos((y / rh) * TAU) +
        0.06 * Math.sin((x / rw) * TAU + phase);
      field.density[y * rw + x] = smooth((n + banks - 0.28) * 2.8);
    }
  for (let y = 0; y < rh; y++)
    for (let x = 0; x < rw; x++) {
      const index = y * rw + x,
        d = field.density[index],
        neighbour = field.density[Math.max(0, y - 2) * rw + Math.max(0, x - 2)];
      const edge = Math.max(0, d - neighbour) * 1.3,
        lighting = 0.035 + d * 0.32 + edge * 0.6 + flash * (0.25 + d * 0.5);
      const horizon = Math.exp(-(((y / rh - 0.6) / 0.3) ** 2)) * 0.035;
      for (let c = 0; c < 3; c++)
        field.image.data[index * 4 + c] = Math.min(
          255,
          [4, 9, 19][c] + rgb[c] * (lighting + horizon) + flash * edge * 100,
        );
      field.image.data[index * 4 + 3] = 255;
    }
  field.context.putImageData(field.image, 0, 0);
  ctx.drawImage(field.canvas, 0, 0, w, h);
  if (flash > 0.008) {
    const strike = p < 0.5 ? 0 : 1,
      root = w * (0.3 + random(strike + 101, seed) * 0.4);
    const bolt = Array.from({ length: 14 }, (_, i) => [
      root +
        (random(i + strike * 40, seed) - 0.5) *
          w *
          0.13 *
          Math.sin(((i / 13) * Math.PI) / 2),
      h * (0.18 + (i / 13) * 0.7),
    ]);
    line(ctx, bolt, rgba(color, flash * 0.15), u * 0.035);
    line(ctx, bolt, rgba(color, flash * 0.75), Math.max(1, u * 0.009));
    line(ctx, bolt, rgba("#f2f8ff", flash), Math.max(0.65, u * 0.003));
    for (const at of [4, 7, 9]) {
      const origin = bolt[at],
        direction = at % 2 ? 1 : -1;
      const branch = Array.from({ length: 6 }, (_, i) => [
        origin[0] +
          direction * w * i * 0.018 +
          ((random(i + at * 40, seed) - 0.5) * w * 0.025 * i) / 5,
        origin[1] + h * i * 0.025,
      ]);
      line(
        ctx,
        branch,
        rgba("#d4eaff", flash * 0.75),
        Math.max(0.5, u * 0.0018),
      );
    }
    glow(ctx, root, h * 0.2, u * 0.45, color, flash * 0.6);
  }
};

const portal: Painter = (ctx, time, w, h, color, seed) => {
  const p = architecturalPhase(time),
    phase = p * TAU,
    u = Math.min(w, h),
    base = hue(color),
    shift = random(3, seed) * TAU;
  background(ctx, w, h, "#070419", "#0d0a25");
  glow(ctx, w / 2, h / 2, u * 0.56, color, 0.3);
  const rings = Array.from({ length: 14 }, (_, i) => ({
    index: i,
    depth: mod(i / 14 + p, 1),
  })).sort((a, b) => b.depth - a.depth);
  for (const ring of rings) {
    const radius = u * (0.025 + ring.depth ** 2 * 0.8),
      angle = phase + ring.index * 0.19 + shift;
    const alpha = smooth(ring.depth / 0.12) * smooth((1 - ring.depth) / 0.14);
    const points = Array.from({ length: 8 }, (_, i) => [
      w / 2 + Math.cos((i / 8) * TAU + angle) * radius,
      h / 2 + Math.sin((i / 8) * TAU + angle) * radius,
    ]);
    const tint = hslHex(base + ring.index * 23);
    line(
      ctx,
      points,
      rgba(tint, alpha * 0.13),
      Math.max(1, u * 0.016 * ring.depth),
      true,
    );
    line(
      ctx,
      points,
      rgba(tint, alpha),
      Math.max(0.7, u * 0.004 * ring.depth),
      true,
    );
    line(
      ctx,
      points,
      rgba("#f6eaff", alpha * 0.6),
      Math.max(0.4, u * 0.001 * ring.depth),
      true,
    );
    points.forEach((point, i) => {
      if (ring.index % 3 === 0) {
        const next = points[(i + 3) % points.length];
        line(
          ctx,
          [point, next],
          rgba(tint, alpha * 0.17),
          Math.max(0.5, u * 0.001),
        );
      }
    });
  }
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * TAU - phase,
      radius = u * (0.39 + 0.035 * Math.sin(phase * 2 + i));
    const x = w / 2 + Math.cos(angle) * radius,
      y = h / 2 + Math.sin(angle) * radius,
      size = u * 0.025;
    const points = [
      [x + Math.cos(angle) * size * 2, y + Math.sin(angle) * size * 2],
      [
        x + Math.cos(angle + Math.PI / 2) * size,
        y + Math.sin(angle + Math.PI / 2) * size,
      ],
      [x - Math.cos(angle) * size * 2, y - Math.sin(angle) * size * 2],
      [
        x - Math.cos(angle + Math.PI / 2) * size,
        y - Math.sin(angle + Math.PI / 2) * size,
      ],
    ];
    line(
      ctx,
      points,
      rgba(hslHex(base + i * 25), 0.85),
      Math.max(0.6, u * 0.002),
      true,
    );
  }
  glow(ctx, w / 2, h / 2, u * 0.085, "#e8e3ff", 0.8);
};

function sponge(
  centre: Vec3,
  size: number,
  depth: number,
): { centre: Vec3; size: number }[] {
  if (depth === 0) return [{ centre, size }];
  const cubes: { centre: Vec3; size: number }[] = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (Number(x === 0) + Number(y === 0) + Number(z === 0) > 1) continue;
        cubes.push(
          ...sponge(
            [
              centre[0] + (x * size) / 3,
              centre[1] + (y * size) / 3,
              centre[2] + (z * size) / 3,
            ],
            size / 3,
            depth - 1,
          ),
        );
      }
  return cubes;
}
const fractalCubes = sponge([0, 0, 0], 1.6, 2);
const chrome: Painter = (ctx, time, w, h, color, seed) => {
  const phase = architecturalPhase(time) * TAU,
    u = Math.min(w, h),
    shift = random(1, seed) * TAU;
  background(ctx, w, h, "#030710", "#111a26");
  glow(ctx, w / 2, h * 0.54, u * 0.7, color, 0.16);
  const faces: Face[] = [],
    breathe = 1 + 0.09 * Math.sin(phase * 2);
  for (const cube of fractalCubes) {
    const half = cube.size * (0.44 + 0.035 * Math.sin(phase + shift));
    addBox(
      faces,
      cube.centre.map((v) => v * breathe) as Vec3,
      [half, half, half],
      (p) =>
        rotate3(
          p,
          0.48 + 0.22 * Math.sin(phase),
          phase + shift,
          0.2 + 0.16 * Math.cos(phase),
        ),
    );
  }
  paintFaces(ctx, faces, w, h, color, true, 0.36);
};

export const architecturalPainters = {
  "prismatic-relief": relief,
  "shatter-rebuild": shatter,
  "liquid-drapery": drapery,
  "spectrum-lattice": lattice,
  stormfront: storm,
  "prism-gateway": portal,
  "chrome-recursion": chrome,
};
