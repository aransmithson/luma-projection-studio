import {
  glow,
  line,
  mod,
  oval,
  random,
  rgba,
  smooth,
  TAU,
  type Painter,
} from "./common";
import { noise, orbitPhase, planet, starBackdrop } from "./cosmicArt";
import { gradient, panel, polygon, stage } from "./sceneArt";

const warp: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#01030a");
  const phase = orbitPhase(t);
  const cx = 500 + Math.sin(phase) * 35,
    cy = 300 + Math.cos(phase) * 18;
  glow(c, cx, cy, 360, color, 0.15);
  for (let i = 0; i < 430; i++) {
    const p = mod((phase / TAU) * 6 + random(i * 3, seed), 1),
      a = random(i * 3 + 1, seed) * TAU;
    const r = 8 + p ** 2.3 * 730,
      tail = Math.max(5, r - p ** 3 * 155);
    const opacity = smooth(p * 8) * smooth((1 - p) * 8);
    const x = cx + Math.cos(a) * r,
      y = cy + Math.sin(a) * r * 0.75;
    c.strokeStyle = rgba(i % 6 ? color : "#fff4dd", opacity * (0.3 + p * 0.7));
    c.lineWidth = 0.4 + p * 1.7;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * tail, cy + Math.sin(a) * tail * 0.75);
    c.lineTo(x, y);
    c.stroke();
    if (p > 0.7) {
      c.fillStyle = rgba("#edf8ff", opacity);
      c.fillRect(x, y, 1.6, 1.6);
    }
  }
  c.restore();
};

const moon: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#01030b");
  const phase = orbitPhase(t);
  starBackdrop(c, phase, seed);
  glow(c, 510, 300, 245, color, 0.11);
  c.save();
  c.translate(510, 300 + Math.sin(phase) * 9);
  c.rotate(-0.12);
  planet(c, "moon", 0, 0, 224, phase, seed);
  c.restore();
  c.restore();
};

const jupiter: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#02030a");
  const phase = orbitPhase(t);
  starBackdrop(c, phase, seed);
  glow(c, 500, 300, 260, color, 0.1);
  c.save();
  c.translate(500, 300);
  c.rotate(0.11);
  planet(c, "jupiter", 0, 0, 230, phase, seed);
  c.restore();
  // A small companion adds a second depth cue without obscuring the cloud belts.
  const a = phase + 1.2,
    x = 500 + Math.cos(a) * 335,
    y = 300 + Math.sin(a) * 88;
  if (Math.sin(a) > 0 || Math.abs(x - 500) > 230) {
    glow(c, x, y, 12, "#d0c8b1", 0.2);
    oval(c, x, y, 4, 4, "#d7ceb8");
  }
  c.restore();
};

const saturn: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#020309");
  const phase = orbitPhase(t);
  starBackdrop(c, phase, seed);
  c.translate(500, 300);
  c.rotate(-0.27 + Math.sin(phase) * 0.065);
  const ringHalf = (front: boolean) => {
    for (let i = 0; i < 85; i++) {
      const r = 210 + i * 1.65;
      if ((i > 44 && i < 49) || (i > 68 && i < 71)) continue;
      const alpha = 0.26 + random(i, seed) * 0.49;
      c.strokeStyle = rgba(
        i % 3 ? color : "#fff0ce",
        front ? alpha : alpha * 0.63,
      );
      c.lineWidth = 1.35;
      c.beginPath();
      c.ellipse(
        0,
        0,
        r,
        r * 0.31,
        0,
        front ? 0 : Math.PI,
        front ? Math.PI : TAU,
      );
      c.stroke();
    }
  };
  ringHalf(false);
  planet(c, "saturn", 0, 0, 151, phase, seed);
  ringHalf(true);
  c.restore();
};

function earthHorizon(
  c: CanvasRenderingContext2D,
  phase: number,
  seed: number,
) {
  c.save();
  c.beginPath();
  c.arc(500, 1390, 1080, 0, TAU);
  c.clip();
  c.fillStyle = gradient(c, 0, 310, 0, 660, [
    "#78d7fa",
    "#19678e",
    "#0a365c",
    "#061729",
  ]);
  c.fillRect(0, 300, 1000, 350);
  c.drawImage(
    cloudTexture("earth", seed),
    -120 + Math.sin(phase) * 40,
    300,
    1240,
    380,
  );
  c.fillStyle = gradient(c, 0, 308, 0, 600, [
    "#9be7ff88",
    "#2a95d533",
    "#07162988",
  ]);
  c.fillRect(0, 300, 1000, 350);
  c.restore();
  c.beginPath();
  c.arc(500, 1390, 1080, Math.PI * 1.3, Math.PI * 1.7);
  c.strokeStyle = "#84ddff88";
  c.lineWidth = 4;
  c.stroke();
  c.strokeStyle = "#c8f5ff55";
  c.lineWidth = 1.3;
  c.stroke();
}

const iss: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#010611");
  const phase = orbitPhase(t);
  starBackdrop(c, phase, seed, 180);
  earthHorizon(c, phase, seed);
  c.save();
  c.translate(500 + Math.sin(phase) * 34, 274 + Math.cos(phase) * 25);
  c.rotate(-0.22 + Math.sin(phase) * 0.12);
  c.scale(0.94 + Math.sin(phase) * 0.025, 0.94);
  // Eight main wings, visible individual cells, paired along the integrated truss.
  for (const x of [-290, -206, 206, 290])
    for (const sign of [-1, 1]) {
      const y = sign < 0 ? -172 : 25;
      panel(
        c,
        x - 31,
        y,
        62,
        146,
        gradient(c, x, y, x + 65, y + 145, [
          "#83582c",
          "#253957",
          "#121e35",
          "#8a6d3e",
        ]),
        1,
      );
      c.strokeStyle = "#d6b36a";
      c.lineWidth = 2;
      c.strokeRect(x - 31, y, 62, 146);
      c.lineWidth = 0.8;
      c.strokeStyle = "#caa96688";
      for (let j = 1; j < 14; j++) {
        c.beginPath();
        c.moveTo(x - 30, y + j * 10.4);
        c.lineTo(x + 30, y + j * 10.4);
        c.stroke();
      }
      for (let j = 1; j < 4; j++) {
        c.beginPath();
        c.moveTo(x - 31 + j * 15.5, y);
        c.lineTo(x - 31 + j * 15.5, y + 146);
        c.stroke();
      }
      line(
        c,
        [
          [x, sign * 27],
          [x, 0],
        ],
        "#d7dbe0",
        5,
      );
    }
  panel(
    c,
    -330,
    -8,
    660,
    16,
    gradient(c, 0, -8, 0, 8, ["#f0eee8", "#65727f", "#202d3a"]),
    1,
  );
  for (let x = -325; x < 320; x += 22)
    line(
      c,
      [
        [x, -7],
        [x + 11, 7],
        [x + 22, -7],
      ],
      "#3b4858",
      1,
    );
  for (const x of [-124, 80]) {
    panel(c, x, -61, 45, 48, "#dae4e5", 1);
    for (let j = 0; j < 5; j++)
      line(
        c,
        [
          [x + j * 9, -61],
          [x + j * 9, -13],
        ],
        "#8d9cab",
        1.1,
      );
  }
  const module = (x: number, y: number, width: number, height: number) => {
    panel(
      c,
      x,
      y,
      width,
      height,
      gradient(c, x, y, x + width, y, [
        "#465262",
        "#e4e7e7",
        "#f8f6df",
        "#758595",
        "#2e3b4a",
      ]),
      Math.min(width, height) / 3,
    );
    c.strokeStyle = "#c5d1db99";
    c.lineWidth = 1;
    c.strokeRect(x + 4, y + 8, width - 8, height - 16);
  };
  module(-18, -98, 36, 189);
  module(-70, 24, 140, 28);
  module(-14, 83, 28, 47);
  module(17, -65, 47, 27);
  oval(c, 0, 50, 11, 7, "#152837");
  oval(c, -3, 48, 5, 3, color);
  line(
    c,
    [
      [22, 15],
      [60, 0],
      [95, 32],
      [114, 7],
    ],
    "#f3ebd9",
    3.8,
  );
  for (const x of [-27, 27]) {
    line(
      c,
      [
        [x, 108],
        [x * 2, 131],
      ],
      "#b0c5d4",
      2,
    );
    oval(c, x * 2, 131, 9, 4, "#e5dfce", x < 0 ? -0.5 : 0.5);
  }
  c.restore();
  c.restore();
};

type CloudKind = "nebula" | "galaxy" | "sun" | "earth";
const cloudCache = new Map<string, HTMLCanvasElement>();
function cloudTexture(kind: CloudKind, seed: number) {
  const key = `${kind}:${seed}`,
    existing = cloudCache.get(key);
  if (existing) return existing;
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 400;
  const c = canvas.getContext("2d")!,
    im = c.createImageData(640, 400);
  for (let y = 0; y < 400; y++)
    for (let x = 0; x < 640; x++) {
      const nx = (x - 320) / 320,
        ny = (y - 200) / 200;
      const n =
        noise(x / 100, y / 100, seed) * 0.53 +
        noise(x / 43, y / 43, seed + 12) * 0.29 +
        noise(x / 13, y / 13, seed + 5) * 0.13 +
        noise(x / 4, y / 4, seed + 9) * 0.05;
      const r = Math.hypot(nx, ny),
        a = Math.atan2(ny, nx);
      let density: number, rgb: number[];
      if (kind === "earth") {
        const land =
          noise(x / 70, y / 70, seed + 53) * 0.75 +
          noise(x / 20, y / 20, seed + 44) * 0.25;
        const cloud = Math.min(0.94, Math.max(0, (n - 0.48) * 4.2));
        const ground =
          land > 0.56
            ? [52 + land * 50, 85 + land * 45, 61 + land * 22]
            : [9, 56 + land * 38, 95 + land * 44];
        rgb = ground.map(
          (v, i) => v * (1 - cloud) + [235, 245, 249][i] * cloud,
        );
        density = 1;
      } else if (kind === "galaxy") {
        const arm = (0.5 + 0.5 * Math.cos(a * 4 - r * 14 + n * 3)) ** 4;
        density = (arm * 0.7 + 0.14) * Math.max(0, 1 - r) * n * 2;
        rgb = [124 + n * 90, 111 + n * 100, 190 + n * 65];
      } else if (kind === "sun") {
        density = Math.min(1, Math.max(0, (1 - r) * 12));
        const granules = noise(x / 3, y / 3, seed + 31);
        rgb = [255, 72 + n * 130 + granules * 40, 14 + n * 36];
      } else {
        const ridge = Math.max(0, 1 - Math.abs(n - 0.49) * 8);
        density = ridge ** 1.8 * Math.max(0, 1 - r * 0.82) * 0.85;
        rgb =
          n > 0.49
            ? [211, 80 + ridge * 45, 168 + ridge * 70]
            : [53, 138 + ridge * 80, 190 + ridge * 65];
      }
      const i = (y * 640 + x) * 4;
      im.data[i] = rgb[0];
      im.data[i + 1] = rgb[1];
      im.data[i + 2] = rgb[2];
      im.data[i + 3] = Math.min(1, density) * 255;
    }
  c.putImageData(im, 0, 0);
  // Each nebula has three layers; keep a full 32-surface scene and its previews warm.
  if (cloudCache.size >= 112) cloudCache.delete(cloudCache.keys().next().value!);
  cloudCache.set(key, canvas);
  return canvas;
}

const spiral: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#02030d");
  const phase = orbitPhase(t);
  starBackdrop(c, phase, seed, 140);
  c.save();
  c.translate(500, 300);
  c.rotate(-0.3);
  c.scale(1, 0.69);
  c.rotate(phase);
  c.globalCompositeOperation = "screen";
  c.drawImage(cloudTexture("galaxy", seed), -465, -465, 930, 930);
  for (let i = 0; i < 1700; i++) {
    const p = random(i * 4, seed),
      r = Math.sqrt(p) * 420;
    const a =
      ((i % 4) * TAU) / 4 +
      r / 120 +
      (random(i * 4 + 1, seed) - 0.5) * (0.4 + p);
    const x = Math.cos(a) * r,
      y = Math.sin(a) * r;
    c.fillStyle = rgba(
      i % 7 ? color : "#fff1ca",
      (0.25 + random(i * 4 + 2, seed) * 0.65) * (1 - p * 0.65),
    );
    const size = 0.4 + random(i * 4 + 3, seed) ** 3 * 1.7;
    c.fillRect(x, y, size, size);
  }
  glow(c, 0, 0, 155, "#ffcf8e", 0.8);
  glow(c, 0, 0, 60, "#fff8db", 1);
  c.restore();
  c.restore();
};

const nebula: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#020414");
  const phase = orbitPhase(t);
  c.globalCompositeOperation = "screen";
  for (let i = 0; i < 3; i++) {
    c.save();
    c.translate(
      500 + Math.sin(phase + i * 2) * 35,
      300 + Math.cos(phase + i * 2) * 22,
    );
    c.rotate(Math.sin(phase + i) * 0.08 + i * 0.8);
    c.globalAlpha = i ? 0.48 : 1;
    c.drawImage(cloudTexture("nebula", seed + i), -610, -380, 1220, 760);
    c.restore();
  }
  glow(c, 660, 290, 220, color, 0.2 + Math.sin(phase) * 0.06);
  starBackdrop(c, phase, seed, 220);
  for (let i = 0; i < 9; i++) {
    const x = 140 + random(i * 2, seed) * 720,
      y = 80 + random(i * 2 + 1, seed) * 440;
    const a = 0.6 + Math.sin(phase * 2 + i) * 0.25;
    glow(c, x, y, 22, "#b8edff", a);
    line(
      c,
      [
        [x - 9, y],
        [x + 9, y],
      ],
      rgba("#dcf5ff", a),
      1,
    );
    line(
      c,
      [
        [x, y - 9],
        [x, y + 9],
      ],
      rgba("#dcf5ff", a),
      1,
    );
  }
  c.restore();
};

const solar: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#080204");
  const phase = orbitPhase(t);
  starBackdrop(c, phase, seed, 85);
  glow(c, 500, 300, 320, "#ed450b", 0.65);
  glow(c, 500, 300, 270, color, 0.45);
  c.save();
  c.translate(500, 300);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + random(i, seed) * 0.1;
    const reach = 20 + (0.5 + 0.5 * Math.sin(phase * 2 + i * 1.8)) ** 2 * 86;
    c.save();
    c.rotate(a);
    c.beginPath();
    c.moveTo(191, -18);
    c.bezierCurveTo(200 + reach, -60, 210 + reach, 62, 194, 29);
    c.strokeStyle = "#ff430b44";
    c.lineWidth = 9;
    c.stroke();
    c.strokeStyle = rgba(color, 0.5);
    c.lineWidth = 2.8;
    c.stroke();
    c.strokeStyle = "#fff0a077";
    c.lineWidth = 0.9;
    c.stroke();
    c.restore();
  }
  c.rotate(phase);
  c.drawImage(cloudTexture("sun", seed), -202, -202, 404, 404);
  c.restore();
  for (let i = 0; i < 65; i++) {
    const p = mod((phase / TAU) * 2 + random(i, seed), 1),
      a = random(i + 100, seed) * TAU;
    glow(
      c,
      500 + Math.cos(a) * (195 + p * 90),
      300 + Math.sin(a) * (195 + p * 90),
      2 + p * 2,
      color,
      Math.sin(p * Math.PI) * 0.7,
    );
  }
  c.restore();
};

const comet: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#020512");
  const phase = orbitPhase(t);
  starBackdrop(c, phase, seed, 240);
  const p = phase / TAU,
    a = smooth(p * 6) * smooth((1 - p) * 6);
  c.save();
  c.globalAlpha = a;
  c.translate(-100 + p * 1250, 340 - Math.sin(p * Math.PI) * 110);
  c.rotate(-0.2 + p * 0.35);
  for (let i = 0; i < 65; i++) {
    const spread = random(i, seed) - 0.5,
      length = 190 + random(i + 71, seed) * 260;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-length * 0.45, spread * 55, -length, spread * 165 + 65);
    c.strokeStyle = rgba("#f5d49f", 0.02 + random(i + 12, seed) * 0.055);
    c.lineWidth = 1 + random(i + 27, seed) * 12;
    c.stroke();
  }
  const g = gradient(c, -500, -30, 0, 0, [
    "#79ccff00",
    rgba(color, 0.1),
    rgba(color, 0.65),
  ]);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(-510, -43);
  c.quadraticCurveTo(-250, -40, 0, 0);
  c.fillStyle = g;
  c.fill();
  glow(c, -10, 0, 53, color, 0.75);
  glow(c, 0, 0, 18, "#e7faff", 1);
  oval(c, 0, 0, 4, 3.5, "#ffffff");
  for (let i = 0; i < 32; i++) {
    const q = mod(p * 5 + random(i, seed), 1);
    c.fillStyle = rgba(color, (1 - q) * 0.6);
    c.fillRect(-q * 310, (random(i + 12, seed) - 0.5) * q * 45, 1.2, 1.2);
  }
  c.restore();
  c.restore();
};

function asteroid(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  seed: number,
  color: string,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  const points = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * TAU,
      r = size * (0.7 + random(i, seed) * 0.3);
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  polygon(c, points, color);
  c.save();
  c.clip();
  c.fillStyle = gradient(c, -size, -size, size, size, [
    "#fff0cf55",
    "#4d3d3011",
    "#050710ee",
  ]);
  c.fillRect(-size, -size, size * 2, size * 2);
  for (let i = 0; i < 7; i++) {
    const px = (random(i + 21, seed) - 0.5) * size * 1.4,
      py = (random(i + 42, seed) - 0.5) * size * 1.4,
      r = size * (0.04 + random(i + 73, seed) * 0.12);
    oval(c, px, py, r, r * 0.7, "#15120f66");
    c.beginPath();
    c.ellipse(px, py, r, r * 0.7, 0, 0.2, Math.PI);
    c.strokeStyle = "#ead7b144";
    c.lineWidth = 0.7;
    c.stroke();
  }
  c.restore();
  c.restore();
}
const asteroids: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#02040b");
  const phase = orbitPhase(t);
  starBackdrop(c, phase, seed, 180);
  glow(c, 500, 290, 260, "#697cad", 0.12);
  const rocks = Array.from({ length: 125 }, (_, i) => {
    const a = phase + random(i * 3, seed) * TAU,
      radius = 240 + random(i * 3 + 1, seed) * 205;
    return {
      i,
      a,
      x: 500 + Math.cos(a) * radius,
      y: 300 + Math.sin(a) * radius * 0.48,
      depth: Math.sin(a),
      size:
        (4 + random(i * 3 + 2, seed) ** 3 * 28) * (1.2 + Math.sin(a) * 0.35),
    };
  }).sort((a, b) => a.depth - b.depth);
  for (const rock of rocks)
    asteroid(
      c,
      rock.x,
      rock.y,
      rock.size,
      phase * (rock.i % 2 ? 2 : -1) + rock.i,
      seed + rock.i,
      color,
    );
  c.restore();
};

export const cosmicPainters = {
  "warp-speed": warp,
  "lunar-orbit": moon,
  "saturn-rings": saturn,
  "jupiter-storms": jupiter,
  "iss-orbit": iss,
  "spiral-galaxy": spiral,
  "stellar-nebula": nebula,
  "solar-prominences": solar,
  "comet-flyby": comet,
  "asteroid-belt": asteroids,
};
