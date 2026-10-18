import type { EffectId } from "../types";
import {
  glow,
  hslHex,
  hue,
  mod,
  random,
  smooth,
  TAU,
  type Painter,
} from "./common";
import { project3, rotate3, type Vec3 } from "./spatial";
import {
  box,
  chamber,
  crystal,
  depthPhase,
  face,
  paint,
  shadow,
  sparkles,
  torus,
  transform,
  type LitFace,
  type Material,
  type Transform,
} from "./depthArt";

const masonry =
  (collapse: boolean): Painter =>
  (c, t, w, h, color, seed) => {
    const p = depthPhase(t),
      a = p * TAU,
      faces: LitFace[] = [],
      aspect = w / h;
    chamber(c, w, h, color, seed);
    const cols = Math.max(5, Math.min(12, Math.round(aspect * 5))),
      rows = 7;
    const bw = (2.9 * aspect) / cols,
      bh = 0.285;
    const world: Transform = (v) => rotate3(v, -0.055, Math.sin(a) * 0.055);
    shadow(c, [0, 0, 0], w, h, aspect * 0.48, 0.85);
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col,
          rx = random(i, seed),
          ry = random(i, seed + 2);
        const target: Vec3 = [
          (col - (cols - 1) / 2 + (row % 2 ? 0.23 : -0.23)) * bw,
          (row - 3) * bh,
          0,
        ];
        let centre: Vec3, angles: Vec3;
        if (collapse) {
          const delay = (6 - row) * 0.023 + rx * 0.025;
          const fall =
            smooth((p - 0.12 - delay) / 0.25) *
            (1 - smooth((p - 0.69 - delay * 0.3) / 0.25));
          const impact =
            fall < 0.75 ? 0 : Math.sin(((fall - 0.75) / 0.25) * Math.PI) * 0.1;
          centre = [
            target[0] + (rx - 0.5) * fall * 0.9,
            target[1] * (1 - fall) + fall * (0.92 - ry * 0.12) - impact,
            fall * (0.1 + ry * 0.75),
          ];
          angles = [
            fall * (rx - 0.5) * 5,
            fall * (ry - 0.5) * 4,
            fall * (random(i, seed + 5) - 0.5) * 3,
          ];
        } else {
          const delay = (6 - row) * 0.023 + rx * 0.065;
          const settled =
            smooth((p - 0.03 - delay) / 0.21) *
            (1 - smooth((p - 0.75 - delay * 0.3) / 0.2));
          const fly = 1 - settled;
          centre = [
            target[0] + fly * (rx < 0.5 ? -1 : 1) * (2.7 + rx * 2),
            target[1] + fly * ((ry - 0.5) * 4 - 1),
            -fly * (1 + ry * 5),
          ];
          angles = [
            fly * (rx - 0.5) * 7,
            fly * (ry - 0.5) * 8,
            fly * (rx - 0.5) * 4,
          ];
          if (settled > 0.2 && settled < 0.98) {
            const q = project3(world(centre), w, h);
            glow(
              c,
              q[0],
              q[1],
              h * 0.11,
              color,
              0.12 * Math.sin(settled * Math.PI),
            );
          }
        }
        const shade = hslHex(
          hue(color) + (rx - 0.5) * 14,
          0.32,
          0.43 + ry * 0.17,
        );
        box(
          faces,
          [bw * 0.475, bh * 0.46, 0.105],
          { color: shade, finish: "stone" },
          transform(centre, angles, world),
          0.026,
        );
      }
    paint(c, faces, w, h);
    if (collapse) {
      const dust = smooth((p - 0.3) / 0.13) * (1 - smooth((p - 0.68) / 0.18));
      for (let i = 0; i < 24; i++) {
        const x = (random(i, seed) * 1.3 - 0.15) * w,
          y = h * (0.8 - random(i, seed + 8) * 0.14 * dust);
        glow(c, x, y, h * (0.04 + random(i, 2) * 0.11), "#c5aa8b", dust * 0.11);
      }
    }
  };

const iris: Painter = (c, t, w, h, color, seed) => {
  const p = depthPhase(t),
    a = p * TAU,
    open = 0.5 - 0.5 * Math.cos(a),
    faces: LitFace[] = [];
  chamber(c, w, h, color, seed, false);
  glow(c, w / 2, h / 2, h * 0.4, "#64ddff", 0.8);
  const world: Transform = (v) =>
    rotate3(v, 0.12 * Math.sin(a), 0.18 * Math.cos(a));
  torus(faces, 0.96, 0.105, { color, finish: "metal" }, world);
  torus(faces, 1.15, 0.035, { color: "#879fac", finish: "metal" }, world);
  torus(
    faces,
    0.79,
    0.026,
    { color: "#72d8ef", finish: "enamel", emission: 1 },
    world,
  );
  for (let i = 0; i < 12; i++) {
    const theta = (i / 12) * TAU + random(1, seed) * 0.3,
      r = 0.37 + open * 0.45;
    box(
      faces,
      [0.24, 0.29, 0.055],
      { color, finish: "metal" },
      transform(
        [Math.cos(theta) * r, Math.sin(theta) * r, 0.06],
        [0, 0, theta + 0.5 + open * 0.4],
        world,
      ),
    );
    const b = theta + a;
    box(
      faces,
      [0.052, 0.04, 0.05],
      { color: "#c4d6dc", finish: "metal" },
      transform(
        [Math.cos(b) * 1.14, Math.sin(b) * 1.14, 0.04],
        [0, 0, b],
        world,
      ),
      0.012,
    );
  }
  paint(c, faces, w, h, 0.36);
  sparkles(c, w, h, p, seed, "#86eaff", 16);
};
const geode: Painter = (c, t, w, h, color, seed) => {
  const p = depthPhase(t),
    a = p * TAU,
    faces: LitFace[] = [];
  chamber(c, w, h, color, seed, false);
  glow(c, w / 2, h * 0.53, h * 0.48, color, 0.48);
  const world: Transform = (v) =>
    rotate3(v, 0.22, 0.17 * Math.sin(a), 0.06 * Math.cos(a));
  for (let i = 0; i < 24; i++) {
    const theta = (i / 24) * TAU,
      r = 0.84 + random(i, seed) * 0.15;
    const centre: Vec3 = [Math.cos(theta) * r, Math.sin(theta) * r, 0.02];
    box(
      faces,
      [0.16, 0.23, 0.16],
      { color: "#625a73", finish: "stone" },
      transform(centre, [0.15 * Math.sin(theta), 0.1, theta], world),
      0.045,
    );
  }
  for (let i = 0; i < 43; i++) {
    const theta = random(i, seed) * TAU,
      r = 0.38 + random(i, seed + 1) * 0.44;
    const growth = 0.72 + 0.28 * Math.sin(a + theta);
    const colour = hslHex(
      hue(color) + (random(i, seed + 8) - 0.5) * 66,
      0.6,
      0.56 + random(i, seed + 3) * 0.17,
    );
    crystal(
      faces,
      0.045 + random(i, seed + 2) * 0.05,
      (0.3 + random(i, seed + 3) * 0.4) * growth,
      { color: colour, finish: "crystal", emission: 0.15 },
      transform(
        [Math.cos(theta) * r, Math.sin(theta) * r, 0.12],
        [0.7, 0, theta - Math.PI / 2],
        world,
      ),
    );
  }
  shadow(c, [0, 0, 0], w, h, 0.5);
  paint(c, faces, w, h, 0.42);
  sparkles(c, w, h, p, seed, "#efe2ff", 40);
};
const folding: Painter = (c, t, w, h, color, seed) => {
  const p = depthPhase(t),
    a = p * TAU,
    faces: LitFace[] = [],
    cols = Math.max(5, Math.round((w / h) * 4)),
    rows = 6,
    step = 0.36;
  chamber(c, w, h, color, seed, false);
  const world: Transform = (v) => rotate3(v, -0.08, 0.13 * Math.sin(a));
  box(
    faces,
    [cols * step * 0.5, rows * step * 0.5, 0.04],
    { color: "#253e55", finish: "enamel" },
    transform([0, 0, -0.2], undefined, world),
  );
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const k = 0.5 + 0.5 * Math.sin(a - x * 0.43 - y * 0.6),
        angle = smooth(k) * 1.35;
      const center: Vec3 = [
        (x - (cols - 1) / 2) * step,
        (y - (rows - 1) / 2) * step,
        0,
      ];
      const hinge: Transform = (v) =>
        world([
          v[0] + center[0],
          Math.cos(angle) * (v[1] + step * 0.45) + center[1] - step * 0.45,
          Math.sin(angle) * (v[1] + step * 0.45),
        ]);
      box(
        faces,
        [step * 0.47, step * 0.47, 0.024],
        {
          color: random(y * cols + x, seed) > 0.35 ? color : "#dabb83",
          finish: "metal",
        },
        hinge,
        0.012,
      );
      const q = project3(world([center[0], center[1], -0.12]), w, h);
      glow(c, q[0], q[1], h * 0.065, color, k * 0.2);
    }
  paint(c, faces, w, h);
};
const pistons: Painter = (c, t, w, h, color, seed) => {
  const p = depthPhase(t),
    a = p * TAU,
    faces: LitFace[] = [];
  chamber(c, w, h, color, seed);
  shadow(c, [0, 0, 0], w, h, 0.7, 0.8);
  const world: Transform = (v) => rotate3(v, -0.52, 0.5 + 0.12 * Math.sin(a));
  box(
    faces,
    [1.12, 0.08, 1.12],
    { color: "#33465c", finish: "metal" },
    transform([0, 0.6, 0], undefined, world),
  );
  for (let z = 0; z < 7; z++)
    for (let x = 0; x < 7; x++) {
      const wave =
        (Math.sin(x * 0.7 + a) + Math.cos(z * 0.75 - a)) * 0.25 + 0.5;
      const height = 0.18 + wave * 0.72;
      const centre: Vec3 = [(x - 3) * 0.3, 0.52 - height / 2, (z - 3) * 0.3];
      box(
        faces,
        [0.126, height / 2, 0.126],
        { color, finish: "metal" },
        transform(centre, [0, 0, 0], world),
        0.018,
      );
      box(
        faces,
        [0.116, 0.024, 0.116],
        {
          color: hslHex(
            hue(color) + wave * 95 + random(x + z * 7, seed) * 25,
            0.65,
            0.59,
          ),
          finish: "enamel",
          emission: 0.3,
        },
        transform(
          [centre[0], 0.5 - height, centre[2]],
          [-Math.PI / 2, 0, 0],
          world,
        ),
        0.009,
      );
    }
  paint(c, faces, w, h, 0.39);
};
const gyroscope: Painter = (c, t, w, h, color, seed) => {
  const p = depthPhase(t),
    a = p * TAU,
    faces: LitFace[] = [];
  chamber(c, w, h, color, seed, false);
  glow(c, w / 2, h / 2, h * 0.5, "#61c9ff", 0.18);
  shadow(c, [0, 0, 0], w, h, 0.5);
  for (let i = 0; i < 3; i++) {
    const move: Transform = (v) =>
      rotate3(v, a * (i % 2 ? 1 : -1) + i * 0.7, a + i * 0.8, 0.3);
    torus(
      faces,
      1.05 - i * 0.22,
      0.035 + i * 0.005,
      { color: i === 1 ? "#96bdc8" : color, finish: "metal" },
      move,
      64,
      8,
    );
    for (let j = 0; j < 10; j++) {
      const b = (j / 10) * TAU,
        r = 1.05 - i * 0.22;
      box(
        faces,
        [0.028, 0.055, 0.028],
        { color: "#a5f3f4", finish: "enamel", emission: 0.8 },
        transform([Math.cos(b) * r, Math.sin(b) * r, 0], [0, 0, b], move),
        0.009,
      );
    }
  }
  const core: Transform = (v) => rotate3(v, a, a * 0.0 + 0.3);
  crystal(
    faces,
    0.24,
    0.58,
    { color: "#8cddf4", finish: "crystal", emission: 0.3 },
    transform([0, 0.3, 0], undefined, core),
  );
  paint(c, faces, w, h, 0.39);
  sparkles(c, w, h, p, seed, color, 18);
};
const arcade: Painter = (c, t, w, h, color, seed) => {
  const p = depthPhase(t),
    faces: LitFace[] = [];
  chamber(c, w, h, color, seed);
  glow(c, w / 2, h * 0.46, h * 0.4, "#ffd99d", 0.45);
  for (let arch = 0; arch < 9; arch++) {
    const z = 3.3 - mod(arch - p * 9, 9) * 1.45;
    for (let j = 0; j < 14; j++) {
      const a = Math.PI + (j / 14) * Math.PI,
        b = Math.PI + ((j + 1) / 14) * Math.PI;
      const vertices = (r: number, depth: number): Vec3[] => [
        [Math.cos(a) * r, 0.15 + Math.sin(a) * r, depth],
        [Math.cos(b) * r, 0.15 + Math.sin(b) * r, depth],
      ];
      const inner = vertices(1.15, z + 0.1),
        outer = vertices(1.38, z + 0.1),
        back = vertices(1.15, z - 0.16);
      const m: Material = {
        color: hslHex(hue(color), 0.2, 0.56 + random(j, seed) * 0.13),
        finish: "stone",
      };
      face(faces, [inner[0], inner[1], outer[1], outer[0]], m, undefined, true);
      face(faces, [inner[1], inner[0], back[0], back[1]], m, undefined, true);
    }
    for (const side of [-1, 1]) {
      box(
        faces,
        [0.12, 0.62, 0.15],
        { color, finish: "stone" },
        transform([side * 1.27, 0.76, z]),
      );
      box(
        faces,
        [0.19, 0.06, 0.2],
        { color, finish: "stone" },
        transform([side * 1.27, 0.16, z]),
      );
      box(
        faces,
        [0.19, 0.065, 0.2],
        { color: "#a28b73", finish: "stone" },
        transform([side * 1.27, 1.35, z]),
      );
      box(
        faces,
        [0.035, 0.025, 0.08],
        { color: "#ffe0a2", finish: "enamel", emission: 1 },
        transform([side * 1.04, 1.3, z + 0.3]),
      );
    }
  }
  paint(c, faces, w, h, 0.42);
};
const citadel: Painter = (c, t, w, h, color, seed) => {
  const p = depthPhase(t),
    a = p * TAU,
    faces: LitFace[] = [];
  chamber(c, w, h, color, seed, false);
  shadow(c, [0, 0, 0], w, h, 0.67, 0.8);
  const world: Transform = (v) =>
    rotate3(rotate3(v, 0, a), -0.46, 0, 0.06 * Math.sin(a));
  const buildings: Vec3[] = [];
  for (let i = 0; i < 5; i++) {
    const theta = (i / 5) * TAU,
      r = i === 0 ? 0 : 0.83;
    const x = Math.cos(theta) * r,
      z = Math.sin(theta) * r,
      y = 0.45 + Math.sin(a + theta) * 0.07;
    box(
      faces,
      [0.39, 0.16, 0.39],
      { color: "#53667f", finish: "stone" },
      transform([x, y, z], undefined, world),
      0.07,
    );
    box(
      faces,
      [0.4, 0.027, 0.4],
      { color, finish: "metal" },
      transform([x, y - 0.18, z], undefined, world),
    );
    for (let j = 0; j < 4; j++)
      buildings.push([
        x + ((j % 2) - 0.5) * 0.31,
        y - 0.2,
        z + (Math.floor(j / 2) - 0.5) * 0.31,
      ]);
    if (i > 0)
      box(
        faces,
        [0.46, 0.025, 0.07],
        { color: "#8097a9", finish: "metal" },
        transform([x * 0.5, y - 0.12, z * 0.5], [0, -theta, 0], world),
      );
  }
  buildings.forEach(([x, y, z], i) => {
    const height = 0.2 + random(i, seed) * 0.52,
      center: Vec3 = [x, y - height * 0.5, z];
    box(
      faces,
      [0.1, height * 0.5, 0.1],
      { color: i % 3 ? color : "#d1c6a5", finish: "metal" },
      transform(center, undefined, world),
      0.014,
    );
    for (let floor = 0; floor < 4; floor++) {
      const fy = y - 0.08 - floor * height * 0.21;
      box(
        faces,
        [0.063, 0.013, 0.003],
        { color: "#ffe4ac", finish: "enamel", emission: 0.9 },
        transform([x, fy, z + 0.103], undefined, world),
        0.001,
      );
      box(
        faces,
        [0.003, 0.013, 0.063],
        { color: "#a8eaff", finish: "enamel", emission: 0.7 },
        transform([x + 0.103, fy, z], undefined, world),
        0.001,
      );
    }
  });
  paint(c, faces, w, h, 0.37);
  sparkles(c, w, h, p, seed, "#7ec9ff", 18);
};
const ribbons: Painter = (c, t, w, h, color, seed) => {
  const p = depthPhase(t),
    a = p * TAU,
    faces: LitFace[] = [];
  chamber(c, w, h, color, seed, false);
  shadow(c, [0, 0, 0], w, h, 0.5);
  const tilt: Transform = (v) => rotate3(v, 0.1, 0.28 * Math.sin(a), -0.25);
  for (let strand = 0; strand < 3; strand++)
    for (let i = 0; i < 100; i++) {
      const at = (u: number, side: number): Vec3 => {
        const theta = u * TAU * 1.4 + a + (strand * TAU) / 3;
        const width = 0.16 * Math.sin(Math.PI * u) + 0.025;
        const twist = theta * 1.5 + random(strand, seed);
        return tilt([
          Math.cos(theta) * 0.65 + side * width * Math.cos(twist),
          (u - 0.5) * 2.3 + side * width * Math.sin(twist),
          Math.sin(theta) * 0.65,
        ]);
      };
      const u = i / 100,
        v = (i + 1) / 100;
      face(
        faces,
        [at(u, -1), at(v, -1), at(v, 1), at(u, 1)],
        {
          color: hslHex(hue(color) + strand * 38, 0.45, 0.67),
          finish: "metal",
        },
        undefined,
        true,
      );
    }
  paint(c, faces, w, h, 0.38);
  sparkles(c, w, h, p, seed, color, 18);
};
const rift: Painter = (c, t, w, h, color, seed) => {
  const p = depthPhase(t),
    a = p * TAU,
    open = 0.5 - 0.5 * Math.cos(a),
    faces: LitFace[] = [],
    aspect = w / h;
  chamber(c, w, h, color, seed, false);
  glow(c, w / 2, h / 2, h * 0.8, color, 0.65);
  for (let row = 0; row < 7; row++)
    for (const side of [-1, 1]) {
      const y = (row - 3) * 0.31,
        edge = (random(row, seed) - 0.5) * 0.3 + side * (0.02 + open * 0.24);
      const next =
        (random(row + 1, seed) - 0.5) * 0.3 + side * (0.02 + open * 0.24);
      const outer = side * aspect * 1.6;
      const vertices: Vec3[] = [
        [edge, y - 0.145, 0.1],
        [outer, y - 0.145 + (random(row, seed + 7) - 0.5) * 0.18, 0.1],
        [outer, y + 0.145 + (random(row + 1, seed + 7) - 0.5) * 0.18, 0.1],
        [next, y + 0.145, 0.1],
      ];
      const move: Transform = (v) =>
        rotate3(
          v,
          open * (random(row, seed + 1) - 0.5) * 0.045,
          -side * open * 0.1,
        );
      const material: Material = {
        color: hslHex(215, 0.08, 0.36 + random(row + side, seed) * 0.12),
        finish: "stone",
      };
      face(faces, vertices, material, move, true);
      for (let j = 0; j < 4; j++) {
        const n = (j + 1) % 4;
        face(
          faces,
          [
            vertices[j],
            vertices[n],
            [vertices[n][0], vertices[n][1], -0.27],
            [vertices[j][0], vertices[j][1], -0.27],
          ],
          material,
          move,
          true,
        );
      }
      const q = project3([edge, y, 0.1], w, h);
      glow(c, q[0], q[1], h * 0.11, color, 0.18 + open * 0.2);
    }
  paint(c, faces, w, h);
  for (let i = 0; i < 36; i++) {
    const q = mod(p * 2 + random(i, seed + 4), 1),
      alpha = Math.sin(q * Math.PI) * open;
    const x = w / 2 + (random(i, seed) - 0.5) * h * 0.19,
      y = h * (0.88 - q * 0.8);
    glow(c, x, y, h * 0.012, color, alpha * 0.7);
  }
};
const staircase: Painter = (c, t, w, h, color, seed) => {
  const p = depthPhase(t),
    a = p * TAU,
    faces: LitFace[] = [];
  chamber(c, w, h, color, seed, false);
  glow(c, w / 2, h * 0.5, h * 0.48, "#7972ef", 0.28);
  const world: Transform = (v) => rotate3(v, -0.27, 0.1, 0);
  for (let strand = 0; strand < 2; strand++)
    for (let i = 0; i < 26; i++) {
      const u = i / 25,
        theta = u * TAU * 1.1 + a + strand * Math.PI,
        r = 0.6 + 0.06 * Math.sin(u * TAU * 2 + a);
      const centre: Vec3 = [
        Math.cos(theta) * r,
        (u - 0.5) * 2.25,
        Math.sin(theta) * r,
      ];
      box(
        faces,
        [0.26, 0.036, 0.125],
        { color: strand ? "#bdacd9" : color, finish: "stone" },
        transform(centre, [0, -theta, 0.02 * Math.sin(a + i)], world),
        0.018,
      );
      box(
        faces,
        [0.22, 0.006, 0.005],
        { color: "#c8f3ff", finish: "enamel", emission: 0.9 },
        transform(
          [centre[0], centre[1] - 0.041, centre[2]],
          [0, -theta, 0],
          world,
        ),
        0.002,
      );
    }
  paint(c, faces, w, h, 0.36);
  sparkles(c, w, h, p, seed, color, 30);
};

export const depthPainters: Partial<Record<EffectId, Painter>> = {
  "flying-bricks": masonry(false),
  "tumbling-wall": masonry(true),
  "vault-iris": iris,
  "crystal-geode": geode,
  "folding-facade": folding,
  "piston-wave": pistons,
  "orbital-gyroscope": gyroscope,
  "infinite-arcade": arcade,
  "floating-citadel": citadel,
  "ribbon-vortex": ribbons,
  "tectonic-rift": rift,
  "gravity-staircase": staircase,
};
