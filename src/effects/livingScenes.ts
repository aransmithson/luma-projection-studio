import type { EffectId } from "../types";
import {
  TAU,
  mod,
  random,
  rgba,
  hslHex,
  hue,
  glow,
  oval,
  line,
  smooth,
  star,
  type Painter,
} from "./common";
import { stage, panel, polygon, gradient, disk, leaf } from "./sceneArt";
import { tint } from "./materials";
import { velvet } from "./characterArt";

const frost: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#061325", "#173145");
  const a = (mod(t, 20) / 20) * TAU;
  glow(c, 500, 300, 530, color, 0.2);
  for (let i = 0; i < 24; i++) {
    const x = random(i, seed) * 1000,
      y = random(i + 71, seed) * 600;
    const grow =
      0.15 + 0.85 * (0.5 - 0.5 * Math.cos(a + random(i + 45, seed) * TAU));
    const radius = (28 + random(i + 80, seed) * 95) * grow;
    c.save();
    c.translate(x, y);
    c.rotate(random(i + 100, seed) * TAU);
    c.globalAlpha = 0.25 + 0.75 * grow;
    for (let arm = 0; arm < 6; arm++) {
      c.save();
      c.rotate((arm * TAU) / 6);
      line(
        c,
        [
          [0, 0],
          [0, -radius],
        ],
        rgba(color, 0.88),
        2.2,
      );
      line(
        c,
        [
          [0, 0],
          [0, -radius],
        ],
        "#edfbffb0",
        0.7,
      );
      for (let j = 1; j <= 4; j++) {
        const d = (radius * j) / 5,
          branch = radius * 0.29 * (1 - j / 6);
        for (const side of [-1, 1]) {
          line(
            c,
            [
              [0, -d],
              [side * branch, -d - branch],
            ],
            rgba(color, 0.8),
            1.4,
          );
          line(
            c,
            [
              [side * branch * 0.5, -d - branch * 0.5],
              [side * branch * 0.5, -d - branch * 0.88],
            ],
            "#d6f6ffb0",
            0.8,
          );
        }
      }
      c.restore();
    }
    disk(c, 0, 0, 2, "#ffffff");
    c.restore();
    const glint = Math.max(0, Math.sin(a * 2 + i)) ** 12;
    if (glint > 0.02) {
      glow(c, x, y, 18, color, glint);
      star(c, x, y, 8 * glint, "#ffffff", a);
    }
  }
  for (let i = 0; i < 110; i++)
    oval(
      c,
      random(i + 150, seed) * 1000,
      random(i + 320, seed) * 600,
      1,
      1,
      rgba("#d0f4ff", 0.15 + 0.15 * Math.sin(a + i)),
    );
  c.restore();
};

const garden: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#071c1b", "#10291f");
  const a = (mod(t, 20) / 20) * TAU;
  glow(c, 500, 230, 440, color, 0.17);
  for (let vine = 0; vine < 8; vine++) {
    const phase = a + random(vine, seed) * 1.2,
      length = 0.24 + 0.76 * (0.5 - 0.5 * Math.cos(phase));
    const base = 55 + vine * 132,
      points: number[][] = [];
    for (let j = 0; j <= 70; j++) {
      const q = (j / 70) * length;
      points.push([
        base + Math.sin(q * 8 + vine) * 47 + Math.sin(a) * q * 14,
        605 - q * 570,
      ]);
    }
    line(c, points, "#244c32", 8);
    line(c, points, "#6d9b5e", 2.5);
    for (let j = 1; j < 12; j++) {
      const q = j / 12,
        grow = smooth((length - q) * 10);
      if (grow <= 0) continue;
      const x = base + Math.sin(q * 8 + vine) * 47 + Math.sin(a) * q * 14,
        y = 605 - q * 570;
      leaf(
        c,
        x,
        y,
        (25 + random(j + vine * 12, seed) * 22) * grow,
        j % 2 ? -0.65 : Math.PI + 0.65,
        j % 2 ? "#77a765" : "#437c50",
      );
      if (j % 3 === 0) {
        const bloom = grow * (0.8 + 0.2 * Math.sin(phase + j));
        c.save();
        c.translate(x, y);
        c.rotate(Math.sin(a + vine) * 0.12);
        const flower = hslHex(
          hue(color) + random(j + vine * 32, seed) * 90,
          0.64,
          0.68,
        );
        for (let k = 0; k < 7; k++) {
          c.save();
          c.rotate((k * TAU) / 7);
          velvet(c, 0, -14 * bloom, 9 * bloom, 18 * bloom, flower);
          c.restore();
        }
        velvet(c, 0, 0, 7 * bloom, 7 * bloom, "#eacb79");
        c.restore();
      }
    }
  }
  for (let i = 0; i < 26; i++) {
    const p = mod(a / TAU + random(i, seed), 1);
    glow(
      c,
      random(i + 90, seed) * 1000 + Math.sin(a + i) * 16,
      600 - p * 600,
      5,
      "#d5ed9a",
      Math.sin(p * Math.PI) ** 2 * 0.6,
    );
  }
  c.restore();
};

const origami: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#14213b", "#302340");
  const a = (mod(t, 20) / 20) * TAU;
  glow(c, 500, 250, 450, color, 0.18);
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 5; col++) {
      const i = row * 5 + col,
        x = 100 + col * 204 + (row % 2 ? 20 : -20),
        y = 110 + row * 195;
      const phase = a + random(i, seed) * TAU,
        opening = 0.12 + 0.88 * (0.5 - 0.5 * Math.cos(phase));
      const size = 65 + random(i + 19, seed) * 17,
        colr = hslHex(hue(color) + random(i + 40, seed) * 160, 0.66, 0.64);
      oval(c, x + 12, y + 29, size * 0.9, size * 0.5, "#03071570");
      c.save();
      c.translate(x, y);
      c.rotate(Math.sin(phase) * 0.7);
      for (let petal = 0; petal < 6; petal++) {
        c.save();
        c.rotate((petal * TAU) / 6);
        const reach = size * (0.28 + 0.72 * opening),
          spread = size * 0.45 * opening;
        polygon(
          c,
          [
            [0, 4],
            [-spread, -reach * 0.65],
            [0, -reach],
            [0, -reach * 0.35],
          ],
          tint(colr, 0.8),
        );
        polygon(
          c,
          [
            [0, 4],
            [spread, -reach * 0.65],
            [0, -reach],
            [0, -reach * 0.35],
          ],
          tint(colr, 1.18, 8),
        );
        line(
          c,
          [
            [0, 4],
            [0, -reach],
          ],
          "#ffffff60",
          1.2,
        );
        c.restore();
      }
      polygon(
        c,
        [
          [0, -13],
          [12, 0],
          [0, 13],
          [-12, 0],
        ],
        "#f5deb0",
      );
      c.restore();
    }
  c.restore();
};

const honeycomb: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#26190e", "#422812");
  const a = (mod(t, 20) / 20) * TAU,
    r = 49;
  for (let row = -1; row < 8; row++)
    for (let col = -1; col < 12; col++) {
      const x = col * r * 1.74 + (row % 2) * r * 0.87,
        y = row * r * 1.51,
        n = row * 15 + col;
      const fill =
        0.12 + 0.88 * (0.5 + 0.5 * Math.sin(a + random(n, seed) * TAU));
      const hex = Array.from({ length: 6 }, (_, i) => [
        x + Math.sin((i * TAU) / 6) * r,
        y + Math.cos((i * TAU) / 6) * r,
      ]);
      polygon(c, hex, "#a0712d");
      c.strokeStyle = "#e6bc69";
      c.lineWidth = 3;
      c.stroke();
      c.save();
      c.clip();
      panel(
        c,
        x - r,
        y - r,
        r * 2,
        r * 2,
        gradient(c, x - r, y - r, x + r, y + r, ["#6b431e", "#231709"]),
        0,
      );
      const level = y + r - fill * r * 2;
      panel(
        c,
        x - r,
        level,
        r * 2,
        r * 2,
        gradient(c, 0, level, 0, y + r, [
          tint(color, 1.2),
          "#bb7719",
          "#6f390d",
        ]),
        0,
      );
      oval(c, x, level, r, 4, "#ffe8ab85");
      line(
        c,
        [
          [x - r * 0.68, y - r * 0.42],
          [x, y - r * 0.83],
          [x + r * 0.68, y - r * 0.42],
        ],
        "#ffe4a352",
        3,
      );
      c.restore();
      line(c, hex, "#e5b453", 4, true);
    }
  for (let i = 0; i < 5; i++) {
    const phase = a + random(i + 250, seed) * TAU,
      x = 500 + Math.sin(phase) * 400,
      y = 290 + Math.sin(phase * 2 + i) * 220;
    c.save();
    c.translate(x, y);
    c.rotate(Math.cos(phase) * 0.3);
    oval(c, 0, 13, 34, 15, "#00000050");
    const wing = 0.45 + 0.55 * Math.abs(Math.sin(a * 30 + i));
    oval(c, -10, -15, 19, 16 * wing, "#e6f6ffb0", -0.55);
    oval(c, 10, -15, 19, 16 * wing, "#e6f6ffb0", 0.55);
    velvet(c, 0, 0, 24, 15, "#efbf51");
    for (const x of [-10, 2, 13]) {
      line(
        c,
        [
          [x, -11],
          [x + 3, 11],
        ],
        "#38261c",
        5,
      );
    }
    velvet(c, 24, -2, 11, 11, "#332922");
    oval(c, 28, -5, 2, 2, "#fff5c4");
    line(
      c,
      [
        [29, -9],
        [37, -19],
      ],
      "#3c2d26",
      2,
    );
    c.restore();
  }
  c.restore();
};

const mushrooms: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#051324", "#112725");
  const a = (mod(t, 20) / 20) * TAU;
  glow(c, 530, 170, 270, "#779fd6", 0.16);
  for (let i = 0; i < 9; i++) {
    const x = 55 + i * 115 + random(i, seed) * 30,
      base = 490 + random(i + 29, seed) * 95;
    const phase = a + random(i + 50, seed) * TAU,
      growth = 0.65 + 0.35 * (0.5 - 0.5 * Math.cos(phase));
    const height = (120 + random(i + 80, seed) * 210) * growth,
      cap = (45 + random(i + 12, seed) * 34) * growth;
    const col = hslHex(hue(color) + random(i + 100, seed) * 120, 0.67, 0.66),
      cy = base - height;
    glow(c, x, cy, cap * 2, col, 0.24);
    c.beginPath();
    c.moveTo(x - 13, base);
    c.bezierCurveTo(x - 20, base - 80, x - 2, cy + 50, x - 8, cy);
    c.lineTo(x + 11, cy);
    c.bezierCurveTo(x + 25, cy + 55, x + 1, base - 65, x + 18, base);
    c.closePath();
    c.fillStyle = gradient(c, x - 20, 0, x + 23, 0, [
      "#4c7c78",
      "#c4e4cd",
      "#41605d",
    ]);
    c.fill();
    oval(c, x, cy + 8, cap, cap * 0.29, tint(col, 0.55));
    for (let j = -7; j <= 7; j++)
      line(
        c,
        [
          [x + (j * cap) / 7, cy + 5],
          [x, cy + 24],
        ],
        rgba(col, 0.75),
        1.4,
      );
    c.beginPath();
    c.moveTo(x - cap, cy + 5);
    c.bezierCurveTo(
      x - cap * 0.73,
      cy - cap * 0.9,
      x + cap * 0.4,
      cy - cap * 0.9,
      x + cap,
      cy + 5,
    );
    c.quadraticCurveTo(x, cy + cap * 0.25, x - cap, cy + 5);
    c.fillStyle = gradient(c, 0, cy - cap, 0, cy + 12, [
      "#e4fff5",
      col,
      tint(col, 0.55),
    ]);
    c.fill();
    for (let j = 0; j < 6; j++) {
      const dx = (random(i * 8 + j, seed) - 0.5) * cap * 1.4;
      oval(
        c,
        x + dx,
        cy - cap * 0.25 - Math.cos(dx / cap) * cap * 0.18,
        3 + random(j, seed) * 3,
        2,
        "#eaffefaa",
      );
    }
    for (let j = 0; j < 7; j++) {
      const q = mod(a / TAU + j / 7 + random(i, seed), 1),
        sx = x + Math.sin(q * TAU + i) * 45,
        sy = cy - q * 180;
      glow(c, sx, sy, 6, col, Math.sin(q * Math.PI) ** 2 * 0.7);
    }
  }
  for (let i = 0; i < 55; i++)
    leaf(
      c,
      random(i + 900, seed) * 1000,
      600,
      25 + random(i, seed) * 45,
      -Math.PI / 2 + (random(i + 40, seed) - 0.5),
      "#183c34",
    );
  c.restore();
};

const sand: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#181321", "#34292b");
  const p = mod(t, 20) / 20,
    a = p * TAU,
    form = smooth((0.5 - 0.5 * Math.cos(a)) * 1.6 - 0.15);
  glow(c, 500, 290, 420, color, 0.15);
  oval(c, 500, 529, 270, 32, "#b78c4f30");
  for (let i = 0; i < 2300; i++) {
    const y = random(i, seed),
      angle = random(i + 7000, seed) * TAU;
    const radius =
      (45 + Math.sin(y * Math.PI) ** 2 * 126 + Math.cos(y * TAU) * 26) *
      Math.sqrt(random(i + 4000, seed));
    // A rotational vase is assembled from the same grains that disperse into the spiral.
    const targetX = 500 + Math.cos(angle) * radius,
      targetY = 130 + y * 390;
    const disperseX = 500 + Math.cos(angle + a) * (100 + y * 440),
      disperseY = 300 + Math.sin(angle + a) * (70 + y * 230);
    const x = disperseX + (targetX - disperseX) * form,
      z = disperseY + (targetY - disperseY) * form;
    const light = 0.5 + 0.5 * Math.cos(angle + 1);
    c.fillStyle = i % 7 === 0 ? "#ffe9bd" : tint(color, 0.55 + light * 0.65);
    c.fillRect(x, z, 1.2 + random(i + 9000, seed) * 1.8, 1.4);
  }
  // Rim and foot highlights fade with the assembled sculpture.
  c.globalAlpha = form * 0.7;
  oval(c, 500, 131, 71, 9, rgba(color, 0.5));
  oval(c, 500, 521, 71, 7, rgba(color, 0.55));
  c.globalAlpha = 1;
  c.restore();
};

export const livingPainters: Partial<Record<EffectId, Painter>> = {
  "frost-bloom": frost,
  "creeping-garden": garden,
  "origami-garden": origami,
  "living-honeycomb": honeycomb,
  "moonlit-mushrooms": mushrooms,
  "sand-sculptor": sand,
};
