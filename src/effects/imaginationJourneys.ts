import type { ChaseRoute } from "../chaseRoute";
import type { StoryStack } from "../types";
import { storyCopies, type storyMotion, type storyVisit } from "../storyMotion";
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
} from "./common";
import { velvet } from "./characterArt";
import { polygon, ring, rounded, type ArtContext as C } from "./imaginationArt";

function ant(c: C, a: number, color: string, leaf: boolean) {
  for (let i = 0; i < 3; i++)
    for (const side of [-1, 1]) {
      const x = (i - 1) * 0.2,
        stride = Math.sin(a * 24 + i * 2 + side) * 0.12;
      line(
        c,
        [
          [x, 0],
          [x + side * 0.18 + stride, side * 0.28],
          [x + side * 0.3 + stride, side * 0.42],
        ],
        "#111924",
        0.045,
      );
      line(
        c,
        [
          [x, 0],
          [x + side * 0.18 + stride, side * 0.28],
        ],
        "#8d6243",
        0.018,
      );
    }
  velvet(c, -0.36, 0, 0.31, 0.22, "#644b3c");
  velvet(c, 0.03, 0, 0.18, 0.14, "#8a6343");
  velvet(c, 0.34, -0.03, 0.22, 0.2, "#ad7c4f");
  for (const side of [-1, 1])
    line(
      c,
      [
        [0.45, side * 0.11],
        [0.67, side * 0.21],
        [0.77, side * 0.18],
      ],
      "#d1b37c",
      0.025,
    );
  oval(c, 0.43, -0.1, 0.045, 0.05, "#f5e6bf");
  oval(c, 0.45, -0.1, 0.018, 0.025, "#121828");
  if (leaf) {
    c.save();
    c.translate(-0.08, -0.22);
    c.rotate(-0.45 + Math.sin(a * 12) * 0.08);
    polygon(
      c,
      [
        [0, 0],
        [-0.52, -0.22],
        [-0.56, -0.63],
        [-0.14, -0.78],
        [0.29, -0.52],
        [0.18, -0.15],
      ],
      color,
      "#2f6647",
      0.025,
    );
    line(
      c,
      [
        [0, 0],
        [-0.18, -0.62],
      ],
      "#e5efab",
      0.02,
    );
    for (let i = 1; i < 4; i++)
      line(
        c,
        [
          [-0.05 * i, -0.15 * i],
          [-0.28 - i * 0.04, -0.15 * i - 0.12],
        ],
        "#e5efab99",
        0.012,
      );
    c.restore();
  }
}

function antCity(
  c: C,
  w: number,
  h: number,
  u: number,
  a: number,
  seed: number,
  color: string,
  power: number,
) {
  background(c, w, h, "#41323b", "#181c2a");
  for (let band = 0; band < 5; band++) {
    const y = h * (0.12 + band * 0.19);
    line(
      c,
      Array.from({ length: 25 }, (_, i) => [
        (i * w) / 24,
        y + Math.sin(i * 0.5 + band) * h * 0.025,
      ]),
      ["#745646", "#886443", "#635047", "#795947", "#4f4140"][band],
      h * 0.18,
    );
  }
  for (let i = 0; i < 180; i++)
    oval(
      c,
      random(i, seed) * w,
      random(i + 400, seed) * h,
      u * (0.01 + random(i + 5, seed) * 0.025),
      u * 0.012,
      i % 2 ? "#efc79b25" : "#050f253a",
    );
  const chambers = [
    [0.22, 0.25, 0.17, 0.15],
    [0.67, 0.22, 0.2, 0.15],
    [0.36, 0.82, 0.22, 0.13],
    [0.83, 0.8, 0.12, 0.12],
  ];
  for (const [x, y, rx, ry] of chambers) {
    c.beginPath();
    c.moveTo(w * x, h * 0.55);
    c.bezierCurveTo(
      w * (x - 0.06),
      h * 0.5,
      w * (x + 0.09),
      h * y,
      w * x,
      h * y,
    );
    c.strokeStyle = "#ac8561";
    c.lineWidth = h * 0.12;
    c.stroke();
    c.strokeStyle = "#302c31";
    c.lineWidth = h * 0.092;
    c.stroke();
    oval(c, w * x, h * y, w * rx, h * ry, "#ae8561");
    oval(c, w * x, h * y, w * rx - h * 0.012, h * ry - h * 0.012, "#24272d");
    glow(c, w * x, h * y, Math.max(w * rx, h * ry), color, 0.09 + power * 0.1);
    for (let egg = 0; egg < 5; egg++)
      velvet(
        c,
        w * x + (egg - 2) * Math.min(u * 0.23, w * rx * 0.33),
        h * y + h * ry * 0.3,
        u * 0.09,
        u * 0.14,
        egg % 2 ? "#d9d5aa" : "#b8c5ae",
      );
    c.save();
    c.translate(
      w * x + Math.sin(a * 2 + x * 8) * w * rx * 0.55,
      h * y - h * ry * 0.25,
    );
    c.scale(u * 0.4, u * 0.4);
    ant(c, a, color, false);
    c.restore();
  }
  line(
    c,
    [
      [0, h * 0.55],
      [w, h * 0.55],
    ],
    "#a98562",
    h * 0.155,
  );
  line(
    c,
    [
      [0, h * 0.55],
      [w, h * 0.55],
    ],
    "#202832",
    h * 0.119,
  );
  line(
    c,
    [
      [0, h * 0.55 + h * 0.056],
      [w, h * 0.55 + h * 0.056],
    ],
    "#c59b6d77",
    h * 0.007,
  );
  for (let i = 0; i < 11; i++)
    oval(
      c,
      (i * w) / 10,
      h * 0.55 - h * 0.061,
      u * 0.025,
      u * 0.018,
      rgba(color, 0.25 + power * 0.65),
    );
}

function parcelStation(
  c: C,
  w: number,
  h: number,
  u: number,
  a: number,
  seed: number,
  color: string,
  power: number,
) {
  background(c, w, h, "#101b30", "#263c50");
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 5; col++) {
      const x = (col * w) / 5,
        y = (row * h) / 3;
      rounded(
        c,
        x + 3,
        y + 3,
        w / 5 - 6,
        h / 3 - 6,
        4,
        "#1a2a3b",
        "#395063",
        1,
      );
      for (const dx of [0.06, 0.94])
        oval(c, x + (w / 5) * dx, y + (h / 3) * 0.07, 1.5, 1.5, "#9aaeb766");
    }
  const py = h * 0.5,
    ph = Math.max(h * 0.22, u * 0.85),
    x = w * 0.52;
  const tube = c.createLinearGradient(0, py - ph / 2, 0, py + ph / 2);
  tube.addColorStop(0, "#adc8d955");
  tube.addColorStop(0.12, "#bdf5ff40");
  tube.addColorStop(0.4, "#051528");
  tube.addColorStop(0.76, "#0c293d");
  tube.addColorStop(1, "#a4daed77");
  rounded(c, -5, py - ph / 2, w + 10, ph, 0, tube, "#648d9f", h * 0.008);
  for (let i = 0; i < 5; i++) {
    const tx = (w * (i + 0.5)) / 5;
    rounded(
      c,
      tx - u * 0.06,
      py - ph * 0.57,
      u * 0.12,
      ph * 1.14,
      3,
      "#577786",
      "#aec5cc",
      1,
    );
    line(
      c,
      [
        [tx + u * 0.025, py - ph * 0.53],
        [tx + u * 0.025, py + ph * 0.53],
      ],
      "#1b3345",
      2,
    );
  }
  // The robot follows the capsule's shared arrival pulse, never a local timer.
  c.save();
  c.translate(x, h * 0.82);
  c.scale(u * 0.75, u * 0.75);
  rounded(c, -0.48, -0.27, 0.96, 0.62, 0.13, "#7295a5", "#bddbe1", 0.025);
  rounded(c, -0.39, -0.76, 0.78, 0.53, 0.14, "#becfd3", "#4e6d82", 0.03);
  rounded(c, -0.3, -0.65, 0.6, 0.24, 0.08, "#172d43");
  for (const side of [-1, 1]) oval(c, side * 0.15, -0.53, 0.055, 0.05, color);
  for (const side of [-1, 1]) {
    const reach = -0.65 - power * 0.27;
    line(
      c,
      [
        [side * 0.43, -0.16],
        [side * 0.7, -0.28],
        [side * 0.6, reach],
      ],
      "#83a5b7",
      0.12,
    );
    ring(c, side * 0.6, reach, 0.11, 0.11, color, 0.05);
    rounded(c, side * 0.24 - 0.14, 0.26, 0.28, 0.18, 0.06, "#304b61");
  }
  oval(c, 0, 0.04, 0.08, 0.08, rgba(color, 0.4 + power * 0.6));
  c.restore();
  for (let i = 0; i < 4; i++) {
    const lx = w * (0.12 + i * 0.25),
      ly = h * 0.14;
    rounded(c, lx - u * 0.17, ly - u * 0.06, u * 0.34, u * 0.12, 3, "#0a172b");
    oval(
      c,
      lx,
      ly,
      u * 0.04,
      u * 0.04,
      rgba(
        color,
        0.2 + 0.65 * (0.5 + 0.5 * Math.sin(a * 2 + i + random(4, seed))),
      ),
    );
  }
  c.save();
  c.globalAlpha = power * 0.18;
  polygon(
    c,
    [
      [x - u * 0.38, h * 0.66],
      [x + u * 0.38, h * 0.66],
      [x + u * 0.64, py - ph * 0.4],
      [x - u * 0.64, py - ph * 0.4],
    ],
    color,
  );
  c.restore();
  glow(c, x, py, u * 1.6, color, power * 0.16);
}

function capsule(c: C, a: number, color: string) {
  const metal = c.createLinearGradient(0, -0.36, 0, 0.36);
  metal.addColorStop(0, "#d8eff2");
  metal.addColorStop(0.2, "#688d9f");
  metal.addColorStop(0.6, "#172e43");
  metal.addColorStop(1, "#93bbc9");
  rounded(c, -0.87, -0.36, 1.74, 0.72, 0.3, metal, "#9cd9e7", 0.025);
  rounded(c, -0.58, -0.27, 1.12, 0.54, 0.12, "#102b40", "#b8edfa66", 0.018);
  rounded(c, -0.25, -0.19, 0.51, 0.38, 0.04, color, "#e4fbf4", 0.017);
  line(
    c,
    [
      [-0.03, -0.18],
      [-0.03, 0.18],
    ],
    "#f9ecc8",
    0.08,
  );
  for (const side of [-1, 1])
    rounded(c, side * 0.68 - 0.06, -0.36, 0.12, 0.72, 0.035, "#b8d7df");
  line(
    c,
    [
      [-0.52, -0.2],
      [0.41, -0.2],
    ],
    "#ffffff88",
    0.026,
  );
  for (let i = 0; i < 6; i++) {
    const f = mod((a / TAU) * 8 + i / 6, 1);
    oval(
      c,
      -1 - f * 0.8,
      Math.sin(i * 4) * 0.15,
      0.025,
      0.018,
      rgba(color, Math.sin(f * Math.PI) * 0.8),
    );
  }
}

function treasureMap(
  c: C,
  w: number,
  h: number,
  u: number,
  a: number,
  seed: number,
  color: string,
  power: number,
) {
  background(c, w, h, "#e5c889", "#ac8055");
  for (let i = 0; i < 170; i++) {
    const x = random(i, seed) * w,
      y = random(i + 100, seed) * h;
    oval(
      c,
      x,
      y,
      u * (0.008 + random(i + 3, seed) * 0.025),
      u * 0.008,
      i % 2 ? "#674b3122" : "#fff3b72a",
    );
  }
  const ink = 0.45 + 0.55 * (0.5 - 0.5 * Math.cos(a));
  c.save();
  c.globalAlpha = ink;
  for (const [cx, cy, rx, ry] of [
    [0.23, 0.23, 0.18, 0.16],
    [0.76, 0.78, 0.19, 0.15],
    [0.81, 0.2, 0.1, 0.12],
  ]) {
    const points = Array.from({ length: 36 }, (_, i) => {
      const angle = (i * TAU) / 36,
        r = 0.82 + random(i + Math.floor(cx * 400), seed) * 0.23;
      return [
        (cx + Math.cos(angle) * rx * r) * w,
        (cy + Math.sin(angle) * ry * r) * h,
      ];
    });
    polygon(c, points, "#b6b176", "#645944", h * 0.004);
    for (let j = 0; j < 4; j++) {
      const x = (cx + (j - 1.5) * rx * 0.35) * w,
        y = cy * h;
      polygon(
        c,
        [
          [x - u * 0.15, y + u * 0.12],
          [x, y - u * 0.16],
          [x + u * 0.17, y + u * 0.12],
        ],
        "#7a8060",
        "#6b6248",
        1,
      );
      polygon(
        c,
        [
          [x - u * 0.035, y - u * 0.08],
          [x, y - u * 0.16],
          [x + u * 0.055, y - u * 0.06],
        ],
        "#e2d4a3",
      );
    }
  }
  c.restore();
  const river: number[][] = [];
  for (let i = 0; i <= 48; i++) {
    const x = (i * w) / 48;
    river.push([
      x,
      h * 0.52 - h * 0.115 + Math.sin((i / 48) * TAU * 2) * h * 0.016,
    ]);
  }
  for (let i = 48; i >= 0; i--) {
    const x = (i * w) / 48;
    river.push([
      x,
      h * 0.52 + h * 0.115 + Math.sin((i / 48) * TAU * 2 + 1) * h * 0.016,
    ]);
  }
  polygon(c, river, "#65949a", "#426b74", h * 0.006);
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 10; i++) {
      const f = mod(i / 10 + (a / TAU) * (row % 2 ? 1 : -1), 1),
        x = f * w;
      line(
        c,
        [
          [x, h * (0.45 + row * 0.07)],
          [x + u * 0.15, h * (0.45 + row * 0.07) - u * 0.025],
          [x + u * 0.3, h * (0.45 + row * 0.07)],
        ],
        "#d0e3c35c",
        h * 0.003,
      );
    }
  // Compass rose and chart marks remain crisp when mapped to a physical prop.
  const cx = w * 0.1,
    cy = h * 0.82,
    cr = Math.min(w * 0.07, h * 0.1);
  ring(c, cx, cy, cr, cr, "#785d43", h * 0.003);
  for (let i = 0; i < 8; i++) {
    const angle = (i * TAU) / 8 + Math.sin(a) * 0.04;
    polygon(
      c,
      [
        [cx, cy],
        [
          cx + Math.cos(angle - 0.13) * cr * 0.4,
          cy + Math.sin(angle - 0.13) * cr * 0.4,
        ],
        [cx + Math.cos(angle) * cr, cy + Math.sin(angle) * cr],
      ],
      i % 2 ? "#6f543b" : "#f0d294",
    );
  }
  const tx = w * 0.52,
    ty = h * 0.23;
  c.save();
  c.translate(tx, ty);
  c.scale(u * 0.7, u * 0.7);
  glow(c, 0, 0, 1.1, "#ffe7a0", power * 0.45);
  rounded(c, -0.48, -0.03, 0.96, 0.48, 0.06, "#795338", "#e7be76", 0.035);
  rounded(
    c,
    -0.47,
    -0.24 - power * 0.27,
    0.94,
    0.25,
    0.1,
    "#a77a48",
    "#e9cd89",
    0.035,
  );
  for (const x of [-0.3, 0.3])
    rounded(c, x - 0.035, -0.04, 0.07, 0.47, 0.01, "#d6b36c");
  rounded(c, -0.06, 0.1, 0.12, 0.15, 0.02, "#e4c37b");
  for (let i = 0; i < 7; i++) {
    const t = mod((a / TAU) * 4 + i / 7, 1);
    star(
      c,
      (random(i, seed) - 0.5) * 1.3,
      -0.25 - t * 0.9,
      0.045,
      rgba("#ffe5a1", power * Math.sin(t * Math.PI)),
      a + i,
    );
  }
  c.restore();
  line(
    c,
    [
      [tx - u * 0.18, ty + u * 0.8],
      [tx + u * 0.18, ty + u * 1.08],
    ],
    rgba(color, 0.9),
    u * 0.045,
  );
  line(
    c,
    [
      [tx + u * 0.18, ty + u * 0.8],
      [tx - u * 0.18, ty + u * 1.08],
    ],
    rgba(color, 0.9),
    u * 0.045,
  );
}

function ship(c: C, a: number, color: string) {
  c.save();
  c.rotate(Math.sin(a * 6) * 0.04);
  polygon(
    c,
    [
      [-0.79, 0.04],
      [0.8, 0.04],
      [0.48, 0.39],
      [-0.47, 0.39],
    ],
    "#73513a",
    "#3c4d4c",
    0.035,
  );
  line(
    c,
    [
      [-0.7, 0.13],
      [0.63, 0.13],
    ],
    "#e5c48a",
    0.04,
  );
  line(
    c,
    [
      [0, 0.02],
      [0, -1.04],
    ],
    "#554738",
    0.045,
  );
  polygon(
    c,
    [
      [0.04, -0.96],
      [0.7, -0.12],
      [0.04, -0.12],
    ],
    "#f1dfb0",
    "#806b48",
    0.018,
  );
  polygon(
    c,
    [
      [-0.05, -0.78],
      [-0.54, -0.12],
      [-0.05, -0.12],
    ],
    "#d4c38f",
    "#806b48",
    0.018,
  );
  polygon(
    c,
    [
      [0.01, -1.04],
      [0.42, -1.01 + Math.sin(a * 8) * 0.055],
      [0.02, -0.84],
    ],
    color,
  );
  for (let i = 0; i < 4; i++)
    oval(c, -0.4 + i * 0.25, 0.22, 0.035, 0.045, "#233e48");
  for (let i = 0; i < 5; i++) {
    const t = mod((a / TAU) * 6 + i / 5, 1);
    line(
      c,
      [
        [-0.6 - t * 0.9, 0.35 - t * 0.13],
        [-0.85 - t * 0.9, 0.4],
        [-0.65 - t * 0.9, 0.45 + t * 0.08],
      ],
      rgba("#e6efd0", Math.sin(t * Math.PI) * 0.6),
      0.018,
    );
  }
  c.restore();
}

export function drawImaginationJourney(
  c: C,
  stack: StoryStack,
  route: ChaseRoute,
  index: number,
  motion: ReturnType<typeof storyMotion>,
  visit: ReturnType<typeof storyVisit>,
) {
  const id = stack.effectId;
  if (
    !["story-ant-city", "story-parcel-network", "story-treasure-map"].includes(
      id,
    )
  )
    return false;
  const tile = route.segments[index],
    w = tile.width,
    h = tile.height,
    u = route.unit;
  const a = motion.phase * TAU,
    seed = stack.seed + index * 37,
    color = stack.color;
  if (id === "story-ant-city") antCity(c, w, h, u, a, seed, color, visit.glow);
  else if (id === "story-parcel-network")
    parcelStation(c, w, h, u, a, seed, color, visit.glow);
  else treasureMap(c, w, h, u, a, seed, color, visit.bloom);
  for (const x of storyCopies(motion.x, route, index)) {
    c.save();
    c.translate(
      x,
      h *
        (id === "story-ant-city"
          ? 0.55
          : id === "story-parcel-network"
            ? 0.5
            : 0.52),
    );
    c.scale(u * motion.facing, u);
    if (id === "story-ant-city") {
      for (let i = 0; i < 3; i++) {
        c.save();
        c.translate(-i * 1.35, Math.sin(a * 12 + i) * 0.025);
        ant(c, a + i * 0.4, color, i % 2 === 0);
        c.restore();
      }
    } else if (id === "story-parcel-network") capsule(c, a, color);
    else ship(c, a, color);
    c.restore();
  }
  if (id === "story-parcel-network") {
    const py = h * 0.5,
      ph = Math.max(h * 0.22, u * 0.85);
    line(
      c,
      [
        [0, py - ph * 0.32],
        [w, py - ph * 0.32],
      ],
      "#e2ffff38",
      h * 0.008,
    );
  }
  return true;
}
