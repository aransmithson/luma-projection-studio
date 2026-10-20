import type { PsychedelicEffectId } from "../types";
import {
  glow,
  hslHex,
  line,
  mod,
  oval,
  random,
  smooth,
  star,
  TAU,
  type Painter,
} from "./common";
import {
  beginVision,
  gem,
  petal,
  pigment,
  polygon,
  type XY,
} from "./psychedelicArt";

const sanctuary: Painter = (c, t, w, h, color, seed) => {
  const { a, tone, variant } = beginVision(c, t, w, h, color, seed);
  c.rotate(variant + a);
  // Recursive, mirrored branches form a detailed filigree rather than a flat spiral.
  const branch = (length: number, depth: number, phase: number) => {
    const bend = 0.18 * Math.sin(a + phase);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(length * 0.5, length * bend, length, 0);
    c.strokeStyle = pigment(tone + depth * 28, 0.55 + depth * 0.035, 0.8);
    c.lineWidth = 0.7 + depth * 0.5;
    c.stroke();
    if (depth === 0) {
      gem(c, length, 0, 3, tone + 150);
      return;
    }
    c.save();
    c.translate(length, 0);
    for (const direction of [-1, 1]) {
      c.save();
      c.rotate(direction * (0.57 + 0.15 * Math.sin(a + phase)));
      branch(length * 0.65, depth - 1, phase + 0.7);
      c.restore();
    }
    c.restore();
  };
  for (let spoke = 0; spoke < 12; spoke++) {
    c.save();
    c.rotate((spoke * TAU) / 12);
    c.translate(162, 0);
    branch(95, 4, variant);
    c.restore();
  }
  for (let ring = 5; ring >= 0; ring--) {
    const radius = 54 + ring * 54 + 8 * Math.sin(a + ring * 0.8);
    c.save();
    c.rotate((ring % 2 ? -1 : 1) * a * 2 + ring * 0.19);
    const count = 12 + ring * 6;
    const nodes: XY[] = Array.from({ length: count }, (_, i) => [
      radius * Math.cos((i * TAU) / count),
      radius * Math.sin((i * TAU) / count),
    ]);
    line(c, nodes, pigment(tone + ring * 36, 0.52, 0.45), 1, true);
    for (let i = 0; i < count; i++) {
      c.save();
      c.rotate((i * TAU) / count);
      if (ring < 3)
        petal(
          c,
          radius * 0.73,
          radius + 19,
          12 + ring * 3,
          tone + ring * 40,
          Math.sin(a + ring) * 8,
        );
      else
        line(
          c,
          [
            [radius - 14, -8],
            [radius + 13, 0],
            [radius - 14, 8],
          ],
          pigment(tone + 90, 0.72, 0.65),
          1,
        );
      gem(c, radius, 0, ring < 3 ? 5 : 4, tone + ring * 37);
      c.restore();
    }
    c.restore();
  }
  glow(c, 0, 0, 62, color, 0.65);
  gem(c, 0, 0, 30 + Math.sin(a) * 3, tone + 130, -a);
};

const hyperspace: Painter = (c, t, w, h, color, seed) => {
  const { p, a, tone, variant, width, height } = beginVision(
    c,
    t,
    w,
    h,
    color,
    seed,
  );
  const extent = Math.hypot(width, height) * 0.7;
  c.rotate(variant);
  // Ring identities are intentionally absent: the geometry is a periodic field
  // in depth. New rings fade in at the centre and leave beyond the viewport.
  const rings = Array.from({ length: 21 }, (_, i) => mod(i + p * 21, 21)).sort(
    (x, y) => y - x,
  );
  const point = (z: number, theta: number): XY => {
    const r = 9 + Math.pow(z / 20, 2.2) * extent;
    const turn = theta + 0.65 * Math.sin(z * 0.21 + a) + a;
    return [Math.cos(turn) * r, Math.sin(turn) * r];
  };
  for (const z of rings) {
    c.globalAlpha = smooth(z / 2) * smooth((21 - z) / 0.9);
    for (let sector = 0; sector < 24; sector++) {
      const theta = (sector * TAU) / 24;
      const corners = [
        point(z, theta),
        point(z + 1.03, theta),
        point(z + 1.03, theta + TAU / 24),
        point(z, theta + TAU / 24),
      ];
      const center: XY = [
        corners.reduce((sum, v) => sum + v[0], 0) / 4,
        corners.reduce((sum, v) => sum + v[1], 0) / 4,
      ];
      const shade = tone + sector * 15 + z * 15 + 45 * Math.sin(a);
      for (let face = 0; face < 4; face++) {
        polygon(c, [center, corners[face], corners[(face + 1) % 4]]);
        c.fillStyle = pigment(shade + face * 8, [0.48, 0.19, 0.36, 0.67][face]);
        c.fill();
      }
      line(c, corners, pigment(shade + 25, 0.79, 0.8), 0.8, true);
      if (sector % 3 === 0)
        line(
          c,
          [corners[0], center, corners[2]],
          pigment(shade + 90, 0.83, 0.65),
          1,
        );
    }
  }
  c.globalAlpha = 1;
  glow(c, 0, 0, 42, color, 0.7);
};

const lotus: Painter = (c, t, w, h, color, seed) => {
  const { a, tone, variant } = beginVision(c, t, w, h, color, seed);
  c.rotate(variant);
  for (let ring = 0; ring < 6; ring++) {
    const r = 130 + ring * 62;
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.strokeStyle = pigment(tone + ring * 30, 0.65, 0.16);
    c.lineWidth = 1;
    c.stroke();
  }
  for (let layer = 6; layer >= 0; layer--) {
    c.save();
    c.rotate(a * (layer % 2 ? -1 : 1) + layer * 0.26);
    const breath = 1 + 0.095 * Math.sin(a + layer * 0.5),
      count = 12 + layer * 2;
    const radius = (76 + layer * 52) * breath;
    for (let i = 0; i < count; i++) {
      c.save();
      c.rotate((i * TAU) / count);
      petal(
        c,
        radius * 0.27,
        radius,
        radius * (0.16 + 0.025 * Math.sin(a + layer)),
        tone + layer * 36 + 22 * Math.sin(a),
        radius * 0.05 * Math.sin(a + layer),
      );
      gem(c, radius * 0.84, 0, 2.8 + layer * 0.4, tone + layer * 36 + 80);
      c.restore();
    }
    c.restore();
  }
  const pearl = c.createRadialGradient(-7, -9, 0, 0, 0, 28);
  pearl.addColorStop(0, "#fffce6");
  pearl.addColorStop(0.3, pigment(tone + 90, 0.83));
  pearl.addColorStop(0.72, pigment(tone, 0.45));
  pearl.addColorStop(1, "#130b38");
  c.fillStyle = pearl;
  c.beginPath();
  c.arc(0, 0, 28, 0, TAU);
  c.fill();
  glow(c, 0, 0, 52, color, 0.24);
};

const astralEye: Painter = (c, t, w, h, color, seed) => {
  const { a, tone, variant, width } = beginVision(c, t, w, h, color, seed);
  const gaze = Math.sin(a + variant) * 23;
  for (let ring = 0; ring < 30; ring++) {
    const points: XY[] = [];
    for (let k = 0; k <= 160; k++) {
      const angle = (k * TAU) / 160;
      const r = 210 + ring * 12 + 7 * Math.sin(angle * 10 + a * 2 + ring * 0.4);
      points.push([
        Math.cos(angle) * r * 1.36,
        Math.sin(angle) * r * (0.66 + ring * 0.011),
      ]);
    }
    line(
      c,
      points,
      pigment(tone + ring * 11 + 30 * Math.sin(a), 0.52, 0.65),
      ring % 4 === 0 ? 2.4 : 0.8,
      true,
    );
  }
  for (let i = 0; i < 48; i++) {
    const angle = (i * TAU) / 48 + a + variant;
    const x = Math.cos(angle) * 385,
      y = Math.sin(angle) * 277;
    line(
      c,
      [
        [x * 1.03, y * 1.03],
        [x * 1.22, y * 1.22],
      ],
      pigment(tone + 130, 0.7, 0.6),
      1.4,
    );
    gem(c, x, y, 5 + 2 * Math.sin(a + i), tone + i * 8, angle);
  }
  const openness = 0.12 + 0.88 * (0.5 + 0.5 * Math.cos(a));
  c.save();
  c.scale(Math.min(1, width / 680), openness);
  const eyePath = () => {
    c.beginPath();
    c.moveTo(-300, 0);
    c.bezierCurveTo(-150, -235, 150, -235, 300, 0);
    c.bezierCurveTo(150, 235, -150, 235, -300, 0);
    c.closePath();
  };
  eyePath();
  const white = c.createRadialGradient(0, 0, 20, 0, 0, 300);
  white.addColorStop(0, pigment(tone, 0.84));
  white.addColorStop(0.5, pigment(tone + 65, 0.37));
  white.addColorStop(1, "#130d2c");
  c.fillStyle = white;
  c.fill();
  c.save();
  c.clip();
  c.translate(gaze, Math.cos(a + variant) * 9);
  oval(c, 0, 0, 153, 153, "#080e29");
  for (let i = 0; i < 192; i++) {
    const angle = (i * TAU) / 192 + variant;
    const points: XY[] = [];
    for (let j = 0; j <= 16; j++) {
      const r = 39 + j * 6.8;
      const theta = angle + 0.065 * Math.sin(j * 0.8 + a * 2 + i * 0.6);
      points.push([Math.cos(theta) * r, Math.sin(theta) * r]);
    }
    line(
      c,
      points,
      pigment(
        tone + i * 1.875 + 40 * Math.sin(a),
        0.38 + random(i, seed) * 0.35,
      ),
      i % 3 ? 1.8 : 3,
    );
  }
  oval(c, 0, 0, 42 + Math.sin(a) * 8, 42 + Math.sin(a) * 8, "#03040e");
  oval(c, -32, -53, 18, 10, "#eaffff", -0.5);
  oval(c, 47, 44, 6, 6, "#a7edff");
  c.restore();
  eyePath();
  c.strokeStyle = pigment(tone + 110, 0.78);
  c.lineWidth = 5;
  c.stroke();
  c.restore();
};

const mycelium: Painter = (c, t, w, h, color, seed) => {
  const { a, tone, variant, width, height } = beginVision(
    c,
    t,
    w,
    h,
    color,
    seed,
  );
  for (let i = 0; i < 100; i++) {
    const x = (random(i * 3, seed) - 0.5) * width + 19 * Math.sin(a + i);
    const y =
      (random(i * 3 + 1, seed) - 0.5) * height + 35 * Math.cos(a + i * 0.7);
    oval(
      c,
      x,
      y,
      0.8 + random(i * 3 + 2, seed) * 2,
      1.5,
      pigment(tone + i, 0.8, 0.2 + 0.35 * (1 + Math.sin(a + i))),
    );
  }
  const stem = (length: number, depth: number, key: number) => {
    const sway = Math.sin(a + key * 0.13 + variant) * length * 0.13;
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(sway, -length * 0.3, -sway, -length * 0.65, sway, -length);
    c.strokeStyle = pigment(tone + depth * 26, 0.2);
    c.lineWidth = 2 + depth * 1.9;
    c.stroke();
    c.strokeStyle = pigment(tone + depth * 26 + 30, 0.67, 0.75);
    c.lineWidth = 0.7 + depth * 0.5;
    c.stroke();
    c.save();
    c.translate(sway, -length);
    if (depth > 0) {
      const spread = 0.38 + random(key, seed) * 0.36;
      for (const side of [-1, 1]) {
        c.save();
        c.rotate(side * spread + 0.07 * Math.sin(a + key));
        stem(
          length * (0.66 + random(key + side, seed) * 0.07),
          depth - 1,
          key * 2 + (side > 0 ? 1 : 0),
        );
        c.restore();
      }
    } else {
      const cap = 9 + random(key, seed) * 12,
        shade = tone + (key % 160);
      const g = c.createLinearGradient(0, -cap * 0.7, 0, cap * 0.18);
      g.addColorStop(0, pigment(shade, 0.85));
      g.addColorStop(0.4, pigment(shade + 35, 0.45));
      g.addColorStop(1, pigment(shade + 75, 0.16));
      c.beginPath();
      c.moveTo(-cap, 0);
      c.bezierCurveTo(-cap * 0.6, -cap * 1.15, cap * 0.6, -cap * 1.15, cap, 0);
      c.quadraticCurveTo(0, cap * 0.3, -cap, 0);
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = pigment(shade, 0.86, 0.8);
      c.lineWidth = 0.8;
      c.stroke();
      for (let rib = -2; rib <= 2; rib++)
        line(
          c,
          [
            [0, cap * 0.08],
            [rib * cap * 0.36, -cap * 0.12],
          ],
          pigment(shade + 40, 0.8, 0.55),
          0.65,
        );
      if (key % 4 === 0)
        glow(c, 0, -cap * 0.35, cap * 1.8, hslHex(shade), 0.18);
    }
    c.restore();
  };
  for (let tree = 0; tree < 7; tree++) {
    c.save();
    c.translate(((tree - 3) * width) / 6.5, height * 0.51 + (tree % 2) * 70);
    c.rotate(Math.sin(a + tree + variant) * 0.04);
    stem(150 + random(tree + 17, seed) * 38, 5, tree + 7);
    c.restore();
  }
  glow(c, 0, height * 0.48, width * 0.65, hslHex(tone + 110), 0.2);
};

const mosaic: Painter = (c, t, w, h, color, seed) => {
  const { a, tone, variant, width, height } = beginVision(
    c,
    t,
    w,
    h,
    color,
    seed,
  );
  const radius = 63,
    dy = Math.sqrt(3) * radius;
  const warp = (x: number, y: number): XY => [
    x + 17 * Math.sin(y / 100 + a + variant),
    y + 17 * Math.sin(x / 130 - a + variant),
  ];
  for (
    let col = -Math.ceil(width / (radius * 3)) - 1;
    col <= Math.ceil(width / (radius * 3)) + 1;
    col++
  ) {
    for (
      let row = -Math.ceil(height / (dy * 2)) - 1;
      row <= Math.ceil(height / (dy * 2)) + 1;
      row++
    ) {
      const x = col * radius * 1.5,
        y = (row + mod(col, 2) * 0.5) * dy;
      const center = warp(x, y),
        shade =
          tone +
          col * 23 +
          row * 36 +
          55 * Math.sin(a + col * 0.23 + row * 0.31);
      const corners: XY[] = Array.from({ length: 6 }, (_, i) =>
        warp(
          x + Math.cos((i * TAU) / 6) * radius,
          y + Math.sin((i * TAU) / 6) * radius,
        ),
      );
      for (let inset = 0; inset < 7; inset++) {
        const s = 0.97 - inset * 0.12;
        const points: XY[] = corners.map(([px, py]) => [
          center[0] + (px - center[0]) * s,
          center[1] + (py - center[1]) * s,
        ]);
        c.beginPath();
        const midpoint = (i: number): XY => [
          (points[i][0] + points[(i + 1) % 6][0]) / 2,
          (points[i][1] + points[(i + 1) % 6][1]) / 2,
        ];
        c.moveTo(...midpoint(5));
        for (let i = 0; i < 6; i++)
          c.quadraticCurveTo(...points[i], ...midpoint(i));
        c.closePath();
        const g = c.createLinearGradient(
          center[0] - 40,
          center[1] - 50,
          center[0] + 35,
          center[1] + 50,
        );
        g.addColorStop(0, pigment(shade + inset * 17, inset % 2 ? 0.64 : 0.38));
        g.addColorStop(
          1,
          pigment(shade + inset * 17 + 40, inset % 2 ? 0.3 : 0.12),
        );
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = pigment(shade + 65, 0.8, inset === 0 ? 0.85 : 0.5);
        c.lineWidth = inset === 0 ? 1.4 : 0.7;
        c.stroke();
      }
      oval(
        c,
        center[0] - 7,
        center[1] - 11,
        5,
        2,
        pigment(shade + 85, 0.9, 0.8),
        -0.5,
      );
    }
  }
};

const serpents: Painter = (c, t, w, h, color, seed) => {
  const { a, tone, variant, width, height } = beginVision(
    c,
    t,
    w,
    h,
    color,
    seed,
  );
  const sample = (u: number, strand: number) => {
    const wave = u * TAU * 1.4 + (strand * TAU) / 5 + a + variant;
    const dx = width * 0.66;
    const dy =
      Math.cos(wave) * TAU * 1.4 * height * 0.25 +
      Math.cos(u * TAU - a) * TAU * height * 0.065;
    const length = Math.hypot(dx, dy);
    return {
      x: u * width * 0.66,
      y:
        Math.sin(wave) * height * 0.25 + Math.sin(u * TAU - a) * height * 0.065,
      z: Math.cos(wave),
      nx: -dy / length,
      ny: dx / length,
      shade: tone + strand * 69 + u * 60,
    };
  };
  const pieces = Array.from({ length: 5 * 128 }, (_, i) => {
    const strand = Math.floor(i / 128),
      u = (i % 128) / 64 - 1;
    return { ...sample(u, strand), strand, u };
  }).sort((x, y) => x.z - y.z);
  for (const part of pieces) {
    const next = sample(part.u + 1 / 64 + 0.0002, part.strand);
    const radius = 22 + 8 * (part.z + 1),
      nextRadius = 22 + 8 * (next.z + 1),
      light = (part.z + 1) * 0.1;
    const left: XY = [part.x + part.nx * radius, part.y + part.ny * radius],
      right: XY = [part.x - part.nx * radius, part.y - part.ny * radius];
    // Shared endpoint tangents keep adjacent pieces smooth at tight turns.
    polygon(c, [
      left,
      [next.x + next.nx * nextRadius, next.y + next.ny * nextRadius],
      [next.x - next.nx * nextRadius, next.y - next.ny * nextRadius],
      right,
    ]);
    const g = c.createLinearGradient(...left, ...right);
    g.addColorStop(0, pigment(part.shade + 30, 0.12));
    g.addColorStop(0.25, pigment(part.shade, 0.4 + light));
    g.addColorStop(0.45, pigment(part.shade + 80, 0.68 + light));
    g.addColorStop(0.7, pigment(part.shade + 30, 0.3 + light));
    g.addColorStop(1, pigment(part.shade, 0.1));
    c.fillStyle = g;
    c.fill();
    // A transverse chevron makes the moving ribbons read as overlapping scales.
    line(
      c,
      [left, [next.x, next.y], right],
      pigment(part.shade + 80, 0.8, 0.6),
      0.9,
    );
    if (Math.round((part.u + 1) * 64) % 5 === 0)
      gem(c, part.x, part.y, 3.5, part.shade + 100);
  }
};

type V4 = [number, number, number, number];
const latticeVertices: V4[] = Array.from({ length: 16 }, (_, i) => [
  i & 1 ? 1 : -1,
  i & 2 ? 1 : -1,
  i & 4 ? 1 : -1,
  i & 8 ? 1 : -1,
]);
const latticeFaces = Array.from({ length: 4 }, (_, axis) =>
  Array.from({ length: 3 - axis }, (_, n) => {
    const other = axis + n + 1;
    return Array.from({ length: 16 }, (_, base) => base)
      .filter((base) => !(base & (1 << axis)) && !(base & (1 << other)))
      .map((base) => [
        base,
        base | (1 << axis),
        base | (1 << axis) | (1 << other),
        base | (1 << other),
      ]);
  }).flat(),
).flat();
const lattice: Painter = (c, t, w, h, color, seed) => {
  const { a, tone, variant, width, height } = beginVision(
    c,
    t,
    w,
    h,
    color,
    seed,
  );
  for (let i = 0; i < 80; i++) {
    const x = (random(i * 2, seed) - 0.5) * width,
      y = (random(i * 2 + 1, seed) - 0.5) * height;
    star(
      c,
      x,
      y,
      1.5 + 1.2 * Math.sin(a + i),
      pigment(tone + i, 0.7, 0.65),
      variant,
    );
  }
  const faces: { points: XY[]; z: number; shade: number; layer: number }[] = [];
  const vertices: { x: number; y: number; z: number; layer: number }[] = [];
  for (let layer = 0; layer < 3; layer++) {
    const projected = latticeVertices.map((original) => {
      const v = [...original];
      const rotate = (i: number, j: number, angle: number) => {
        const x = v[i],
          y = v[j];
        v[i] = x * Math.cos(angle) - y * Math.sin(angle);
        v[j] = x * Math.sin(angle) + y * Math.cos(angle);
      };
      rotate(0, 3, a + variant + layer * 0.35);
      rotate(1, 2, -a + layer * 0.55);
      rotate(0, 2, a * 2 + variant * 0.5);
      rotate(1, 3, a - layer * 0.25);
      const distance4 = 3.8 / (3.8 - v[3]);
      const distance3 = 5 / (5 - v[2] * distance4);
      const size = 158 - layer * 43;
      return {
        x: v[0] * distance4 * distance3 * size,
        y: v[1] * distance4 * distance3 * size,
        z: v[2] * distance4,
        layer,
      };
    });
    vertices.push(...projected);
    latticeFaces.forEach((face, i) =>
      faces.push({
        points: face.map((index) => [projected[index].x, projected[index].y]),
        z: face.reduce((sum, index) => sum + projected[index].z, 0) / 4,
        shade: tone + i * 17 + layer * 43,
        layer,
      }),
    );
  }
  faces.sort((x, y) => x.z - y.z);
  for (const face of faces) {
    polygon(c, face.points);
    const g = c.createLinearGradient(...face.points[0], ...face.points[2]);
    g.addColorStop(0, pigment(face.shade, 0.55, 0.09));
    g.addColorStop(1, pigment(face.shade + 60, 0.4, 0.24));
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = pigment(face.shade + 25, 0.65, 0.3 + (face.z + 3) * 0.07);
    c.lineWidth = face.layer ? 1 : 1.8;
    c.stroke();
  }
  vertices
    .sort((x, y) => x.z - y.z)
    .forEach((v) =>
      gem(c, v.x, v.y, 3.5 + (v.z + 3) * 0.45, tone + v.layer * 70 + 80, a),
    );
  glow(c, 0, 0, 72, color, 0.22);
};

export const psychedelicPainters: Record<PsychedelicEffectId, Painter> = {
  "psy-fractal-sanctuary": sanctuary,
  "psy-jewel-hyperspace": hyperspace,
  "psy-lotus-awakening": lotus,
  "psy-astral-eye": astralEye,
  "psy-neon-mycelium": mycelium,
  "psy-liquid-mosaic": mosaic,
  "psy-serpent-ribbons": serpents,
  "psy-dimensional-lattice": lattice,
};
