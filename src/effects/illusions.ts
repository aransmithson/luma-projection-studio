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
  type Painter,
} from "./common";
import { stage, panel, polygon, gradient, disk } from "./sceneArt";
import { tint } from "./materials";
import { velvet } from "./characterArt";
import { createEdgeTrack, edgeTrackPoint } from "../edgeTrack";

const clockwork: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#100e16", "#241c20");
  const a = (mod(t, 20) / 20) * TAU,
    phase = random(1, seed) * TAU;
  glow(c, 510, 280, 540, color, 0.25);
  for (let i = 0; i < 7; i++) {
    const x = 55 + i * 148,
      y = 490 + Math.sin(a * 2 + i + phase) * 36;
    panel(c, x, 410, 47, 165, "#0a0e15", 8);
    panel(
      c,
      x + 18,
      435,
      11,
      135,
      gradient(c, x, 0, x + 42, 0, ["#342b25", "#cbb68a", "#3e3639"]),
      1,
    );
    panel(
      c,
      x + 4,
      y,
      39,
      29,
      gradient(c, 0, y, 0, y + 29, ["#e0c39a", "#695248", "#281e24"]),
      3,
    );
  }
  const gears = [
    [120, 160, 100, 16, 1],
    [314, 182, 98, 16, -1],
    [497, 120, 92, 16, 1],
    [696, 187, 111, 20, -1],
    [890, 124, 91, 16, 1],
    [860, 350, 130, 24, -1],
    [220, 380, 124, 24, 1],
    [490, 344, 148, 24, -1],
  ];
  for (const [x, y, r, teeth, direction] of gears) {
    c.save();
    c.translate(x, y);
    c.rotate(a * direction + phase);
    const points = Array.from({ length: teeth * 4 }, (_, i) => {
      const angle = (i / (teeth * 4)) * TAU,
        radius = r * (i % 4 < 2 ? 1 : 0.9);
      return [Math.cos(angle) * radius, Math.sin(angle) * radius];
    });
    c.shadowColor = "#00000090";
    c.shadowBlur = 10;
    c.shadowOffsetY = 6;
    polygon(c, points, tint(color, 0.65));
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;
    c.strokeStyle = "#ffe9b878";
    c.lineWidth = 2;
    c.stroke();
    disk(
      c,
      0,
      0,
      r * 0.77,
      gradient(c, -r, -r, r, r, ["#f2d6a0", color, "#51404a"]),
    );
    disk(c, 0, 0, r * 0.62, "#12151d");
    for (let j = 0; j < 6; j++) {
      c.save();
      c.rotate((j * TAU) / 6);
      panel(
        c,
        -r * 0.065,
        -r * 0.67,
        r * 0.13,
        r * 0.67,
        gradient(c, -r * 0.07, 0, r * 0.07, 0, ["#4a3532", color, "#f6dfb2"]),
        3,
      );
      c.restore();
    }
    velvet(c, 0, 0, r * 0.23, r * 0.23, color);
    disk(c, 0, 0, r * 0.065, "#25252e");
    c.restore();
  }
  // A floating clock dial and two independently geared hands.
  const x = 490,
    y = 344,
    r = 116;
  for (let i = 0; i < 60; i++) {
    const angle = (i * TAU) / 60;
    line(
      c,
      [
        [
          x + Math.sin(angle) * (r - (i % 5 ? 5 : 13)),
          y - Math.cos(angle) * (r - (i % 5 ? 5 : 13)),
        ],
        [x + Math.sin(angle) * r, y - Math.cos(angle) * r],
      ],
      "#fce1ae",
      i % 5 ? 1 : 3,
    );
  }
  for (const [angle, length, width] of [
    [a + phase, 81, 5],
    [a * 4 + phase, 104, 3],
  ])
    line(
      c,
      [
        [x - Math.sin(angle) * 17, y + Math.cos(angle) * 17],
        [x + Math.sin(angle) * length, y - Math.cos(angle) * length],
      ],
      "#fff0cd",
      width,
    );
  disk(c, x, y, 8, "#eed3a1");
  c.restore();
};

const bookshelf: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#140f24", "#22112e");
  const p = mod(t, 20) / 20,
    a = p * TAU;
  glow(c, 500, 230, 460, color, 0.24);
  for (let row = 0; row < 3; row++) {
    const y = 55 + row * 166;
    panel(c, 33, y, 934, 137, "#080a16", 5);
    for (let i = 0; i < 20; i++) {
      const n = row * 20 + i,
        bh = 90 + random(n, seed) * 35,
        lift = Math.max(0, Math.sin(a + random(n + 80, seed) * TAU)) ** 8 * 24;
      const x = 48 + i * 45,
        by = y + 133 - bh - lift,
        col = hslHex(hue(color) + random(n + 140, seed) * 200, 0.42, 0.31);
      panel(c, x + 3, by + 3, 35, bh, "#00000090", 3);
      panel(
        c,
        x,
        by,
        34,
        bh,
        gradient(c, x, 0, x + 34, 0, [
          tint(col, 0.6),
          col,
          tint(col, 1.2),
          tint(col, 0.6),
        ]),
        3,
      );
      for (const yy of [by + 9, by + 16, by + bh - 14])
        line(
          c,
          [
            [x + 4, yy],
            [x + 29, yy],
          ],
          "#d5b47c",
          1.6,
        );
      panel(c, x + 12, by + bh * 0.36, 10, bh * 0.25, "#e6c18c65", 2);
    }
    panel(
      c,
      22,
      y + 137,
      956,
      20,
      gradient(c, 0, y + 137, 0, y + 157, ["#916049", "#382130"]),
      3,
    );
  }
  // The open spellbook is animated as two curved paper fans.
  c.save();
  c.translate(500, 403 + Math.sin(a) * 9);
  c.rotate(Math.sin(a) * 0.035);
  oval(c, 0, 124, 230, 22, "#00000070");
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side, 1);
    polygon(
      c,
      [
        [0, 17],
        [190, -4],
        [214, 107],
        [0, 131],
      ],
      "#6c365c",
    );
    for (let i = 6; i >= 0; i--) {
      const curl = Math.sin(a * 2 + i * 0.2) * 9;
      c.beginPath();
      c.moveTo(0, 18 + i * 2);
      c.bezierCurveTo(60, -35 + curl, 135, -23, 185, 4 + i * 2);
      c.lineTo(201, 103 + i * 2);
      c.bezierCurveTo(120, 77, 59, 88, 0, 123 + i);
      c.closePath();
      c.fillStyle = i === 0 ? "#f9e7c1" : "#bba57e";
      c.fill();
    }
    for (let j = 0; j < 6; j++)
      line(
        c,
        [
          [29, 33 + j * 11],
          [170, 28 + j * 12],
        ],
        "#6d5f7860",
        2,
      );
    c.restore();
  }
  c.restore();
  for (let i = 0; i < 8; i++) {
    const q = mod(p + i / 8 + random(i + 9, seed) * 0.12, 1),
      x = 500 + Math.sin(q * TAU + i) * 180,
      y = 390 - q * 370;
    c.save();
    c.globalAlpha = Math.sin(q * Math.PI) ** 2;
    c.translate(x, y);
    c.rotate(Math.sin(q * TAU + i) * 0.6);
    polygon(
      c,
      [
        [-18, -24],
        [17, -20 + Math.sin(a + i) * 7],
        [22, 23],
        [-15, 27],
      ],
      "#f4dfb8",
    );
    for (let j = 0; j < 4; j++)
      line(
        c,
        [
          [-10, -11 + j * 7],
          [12, -13 + j * 7],
        ],
        "#72647e",
        1,
      );
    c.restore();
  }
  c.restore();
};

const stained: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#081327", "#1f1731");
  const a = (mod(t, 20) / 20) * TAU;
  const arch = () => {
    c.beginPath();
    c.moveTo(165, 620);
    c.lineTo(165, 265);
    c.bezierCurveTo(165, 100, 370, 48, 500, 12);
    c.bezierCurveTo(630, 48, 835, 100, 835, 265);
    c.lineTo(835, 620);
    c.closePath();
  };
  arch();
  c.fillStyle = "#11101e";
  c.fill();
  c.strokeStyle = "#7c7a8c";
  c.lineWidth = 19;
  c.stroke();
  c.save();
  arch();
  c.clip();
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 8; col++) {
      const x = 160 + col * 85,
        y = 28 + row * 120,
        n = row * 8 + col;
      const fill = hslHex(
        hue(color) + random(n, seed) * 280,
        0.69,
        0.4 + 0.08 * Math.sin(a + n),
      );
      panel(
        c,
        x + 3,
        y + 3,
        79,
        114,
        gradient(c, x, y, x + 85, y + 120, [
          tint(fill, 1.3),
          fill,
          tint(fill, 0.55),
        ]),
        1,
      );
      polygon(
        c,
        [
          [x + 4, y + 5],
          [x + 82, y + 115],
          [x + 4, y + 115],
        ],
        "#ffffff13",
      );
      line(
        c,
        [
          [x + 5, y + 117],
          [x + 82, y + 5],
        ],
        "#151324",
        5,
      );
      for (let k = 0; k < 4; k++)
        line(
          c,
          [
            [x + random(n * 5 + k, seed) * 75, y + 8],
            [x + random(n * 5 + k, seed) * 75 + 9, y + 109],
          ],
          "#ffffff14",
          1,
        );
    }
  const cy = 198,
    r = 148;
  disk(c, 500, cy, r + 9, "#151322");
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * TAU;
    c.save();
    c.translate(500, cy);
    c.rotate(angle);
    c.beginPath();
    c.moveTo(0, 17);
    c.bezierCurveTo(-48, 48, -43, 123, 0, r);
    c.bezierCurveTo(43, 123, 48, 48, 0, 17);
    c.fillStyle = hslHex(
      hue(color) + i * 27 + random(i, seed) * 30,
      0.75,
      0.51,
    );
    c.fill();
    c.strokeStyle = "#222332";
    c.lineWidth = 5;
    c.stroke();
    c.restore();
  }
  disk(c, 500, cy, 26, "#ffe6a3");
  c.globalCompositeOperation = "screen";
  for (let i = 0; i < 5; i++) {
    const x = 100 + i * 210 + Math.sin(a) * 95;
    polygon(
      c,
      [
        [x, 0],
        [x + 55, 0],
        [x + 300 + Math.cos(a) * 80, 600],
        [x + 160, 600],
      ],
      rgba(color, 0.14),
    );
  }
  c.restore();
  glow(c, 500 + Math.sin(a) * 150, 160, 360, "#ffeac7", 0.24);
  for (let i = 0; i < 45; i++) {
    const q = mod(mod(t, 20) / 20 + random(i, seed), 1);
    oval(
      c,
      160 + random(i + 100, seed) * 680,
      600 - q * 600,
      1.7,
      1.7,
      rgba("#ffecb7", Math.sin(q * Math.PI) ** 2 * 0.7),
    );
  }
  c.restore();
};

const marblePoints = Array.from({ length: 241 }, (_, i) => {
  const a = (i / 240) * TAU;
  return { x: 0.5 + 0.42 * Math.cos(a), y: 0.5 + 0.36 * Math.sin(a * 3) };
});
const marbleTrack = createEdgeTrack(marblePoints, 1000, 600);
const marbles: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#11132c", "#2a1a37");
  const a = mod(t, 20) / 20;
  glow(c, 500, 250, 440, color, 0.22);
  for (let i = 0; i < 8; i++) {
    const p = edgeTrackPoint(marbleTrack, i / 8);
    line(
      c,
      [
        [p.x, p.y + 8],
        [p.x, 580],
      ],
      "#31324c",
      12,
    );
    line(
      c,
      [
        [p.x - 3, p.y + 8],
        [p.x - 3, 580],
      ],
      "#64667d",
      2,
    );
    oval(c, p.x, 581, 30, 5, "#070b1e");
  }
  const points = marbleTrack.points.map((p) => [p.x, p.y]);
  line(c, points, "#050919", 33, true);
  line(c, points, "#807a9d", 25, true);
  line(c, points, "#252239", 18, true);
  line(c, points, "#bfc2d8", 2, true);
  for (let i = 0; i < 7; i++) {
    const p = edgeTrackPoint(marbleTrack, a + i / 7 + random(1, seed) * 0.2),
      col = hslHex(hue(color) + i * 43 + random(3, seed) * 70, 0.8, 0.6);
    oval(c, p.x + 4, p.y + 14, 20, 8, "#00000070");
    velvet(c, p.x, p.y - 8, 20, 20, col);
    c.save();
    c.translate(p.x, p.y - 8);
    c.rotate(a * TAU * 6 + i);
    line(
      c,
      [
        [-16, -9],
        [-5, -12],
        [9, -8],
        [17, 1],
      ],
      "#ffffff65",
      3,
    );
    c.restore();
    oval(c, p.x - 7, p.y - 16, 5, 3, "#ffffffdb");
  }
  c.restore();
};

const peeling: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#21202b", "#181925");
  const a = (mod(t, 20) / 20) * TAU;
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 7; col++) {
      const i = row * 7 + col,
        x = col * 151 - 26,
        y = row * 162 - 20;
      const amount = (0.5 + 0.5 * Math.sin(a + random(i, seed) * TAU)) ** 2,
        curl = 7 + amount * 127;
      const paint = hslHex(hue(color) + random(i + 40, seed) * 75, 0.5, 0.59);
      panel(
        c,
        x,
        y,
        146,
        156,
        gradient(c, x, y, x + 146, y + 156, ["#dcad79", "#69504a"]),
        2,
      );
      for (let j = 0; j < 8; j++)
        line(
          c,
          [
            [x + 5, y + j * 20],
            [x + 139, y + j * 20 + 5],
          ],
          "#543e3745",
          2,
        );
      // Unpeeled layer and an actual rolled lip with lit paper and a dark underside.
      polygon(
        c,
        [
          [x, y],
          [x + 146, y],
          [x + 146, y + 156 - curl * 0.8],
          [x + 71, y + 156 - curl],
          [x, y + 156 - curl * 0.8],
        ],
        paint,
      );
      for (let j = 0; j < 8; j++)
        oval(
          c,
          x + random(i * 10 + j, seed) * 140,
          y + random(i * 10 + j + 100, seed) * Math.max(10, 140 - curl),
          1.3,
          1.3,
          "#ffffff35",
        );
      c.beginPath();
      c.moveTo(x, y + 156 - curl * 0.8);
      c.bezierCurveTo(
        x + 58,
        y + 160 - curl,
        x + 100,
        y + 160 - curl,
        x + 146,
        y + 156 - curl * 0.8,
      );
      c.lineTo(x + 134, y + 176 - curl * 0.7);
      c.quadraticCurveTo(
        x + 70,
        y + 193 - curl * 0.75,
        x + 9,
        y + 173 - curl * 0.7,
      );
      c.closePath();
      c.fillStyle = gradient(c, 0, y + 152 - curl, 0, y + 182 - curl * 0.7, [
        tint(paint, 0.35),
        "#fff0d4",
        tint(paint, 0.75),
      ]);
      c.fill();
      line(
        c,
        [
          [x + 12, y + 177 - curl * 0.7],
          [x + 70, y + 185 - curl * 0.75],
          [x + 133, y + 179 - curl * 0.7],
        ],
        "#00000050",
        3,
      );
    }
  c.restore();
};

const blueprints: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#031421", "#071e30");
  const a = (mod(t, 20) / 20) * TAU,
    elevation = 0.1 + 0.9 * (0.5 - 0.5 * Math.cos(a));
  for (let i = -10; i < 30; i++) {
    line(
      c,
      [
        [i * 60, 0],
        [i * 60 - 380, 600],
      ],
      "#24719438",
      1,
    );
    line(
      c,
      [
        [0, i * 35],
        [1000, i * 35],
      ],
      "#24719438",
      1,
    );
  }
  const project = (x: number, y: number, z: number) => [
    500 + (x - y) * 1.12,
    355 + (x + y) * 0.43 - z * elevation,
  ];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 4; col++) {
      const n = row * 4 + col,
        x = (col - 1.5) * 124,
        y = (row - 1) * 128,
        z = 90 + random(n, seed) * 210;
      const base = [
        project(x - 40, y - 40, 0),
        project(x + 40, y - 40, 0),
        project(x + 40, y + 40, 0),
        project(x - 40, y + 40, 0),
      ];
      const top = [
        project(x - 40, y - 40, z),
        project(x + 40, y - 40, z),
        project(x + 40, y + 40, z),
        project(x - 40, y + 40, z),
      ];
      polygon(c, [base[1], base[2], top[2], top[1]], rgba(color, 0.06));
      polygon(c, [base[2], base[3], top[3], top[2]], rgba(color, 0.11));
      line(c, base, rgba(color, 0.35), 1.5, true);
      line(c, top, color, 2, true);
      for (let i = 0; i < 4; i++)
        line(c, [base[i], top[i]], rgba(color, 0.65), 1.2);
      for (let level = 30; level < z; level += 30)
        line(
          c,
          [
            project(x - 40, y + 40, level),
            project(x + 40, y + 40, level),
            project(x + 40, y - 40, level),
          ],
          rgba(color, 0.3),
          1,
        );
      const scan = mod(a / TAU + n * 0.071, 1),
        pos = project(x, y, z * scan);
      glow(c, pos[0], pos[1], 28, color, Math.sin(scan * Math.PI) * 0.5);
      for (const p of base) {
        line(
          c,
          [
            [p[0] - 5, p[1]],
            [p[0] + 5, p[1]],
          ],
          "#ffffff8a",
          1,
        );
        line(
          c,
          [
            [p[0], p[1] - 4],
            [p[0], p[1] + 4],
          ],
          "#ffffff8a",
          1,
        );
      }
    }
  const scanY = 300 + Math.sin(a) * 270;
  const g = gradient(c, 0, scanY - 40, 0, scanY + 40, [
    rgba(color, 0),
    rgba(color, 0.2),
    rgba(color, 0),
  ]);
  panel(c, 0, scanY - 40, 1000, 80, g, 0);
  line(
    c,
    [
      [0, scanY],
      [1000, scanY],
    ],
    rgba(color, 0.7),
    1,
  );
  c.restore();
};

const portraits: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#170f23", "#291421");
  const a = (mod(t, 20) / 20) * TAU;
  for (let i = 0; i < 3; i++) {
    const x = 184 + i * 316,
      phase = a + random(i, seed) * TAU;
    for (let b = 0; b < 4; b++)
      panel(
        c,
        x - 136 + b * 7,
        56 + b * 7,
        272 - b * 14,
        449 - b * 14,
        b % 2 ? "#50312a" : "#b28b50",
        14 - b * 2,
      );
    panel(
      c,
      x - 108,
      84,
      216,
      393,
      gradient(c, x, 80, x, 477, ["#17202b", "#030913"]),
      5,
    );
    for (const xx of [-121, 121])
      for (const yy of [73, 486]) {
        disk(c, x + xx, yy, 9, "#e0b773");
        disk(c, x + xx, yy, 3, "#5c392b");
      }
    const bob = Math.sin(phase) * 3,
      look = Math.sin(phase) * 8,
      blink = 1 - 0.94 * Math.max(0, Math.cos(phase * 3)) ** 36;
    c.save();
    c.translate(x, 288 + bob);
    // Distinct portraits: a count, a spectral lady and a stern old sea captain.
    polygon(
      c,
      [
        [-94, 185],
        [-74, 112],
        [-39, 72],
        [38, 72],
        [77, 112],
        [96, 185],
      ],
      i === 1 ? "#354245" : "#2b223a",
    );
    polygon(
      c,
      [
        [-43, 72],
        [0, 126],
        [43, 72],
        [20, 45],
        [-20, 45],
      ],
      "#d3c9b3",
    );
    oval(c, 0, -15, 62, 96, i === 1 ? "#6c6b70" : "#15151e");
    velvet(c, 0, 0, 49, 75, i === 1 ? "#a2bcb2" : tint(color, 0.75, 35));
    if (i === 0)
      polygon(
        c,
        [
          [-51, -44],
          [-42, -77],
          [0, -89],
          [43, -75],
          [51, -43],
          [15, -64],
          [0, -48],
          [-15, -64],
        ],
        "#17131e",
      );
    if (i === 2) {
      panel(c, -69, -80, 138, 25, "#26323d", 10);
      polygon(
        c,
        [
          [-52, -80],
          [-38, -108],
          [42, -108],
          [57, -80],
        ],
        "#313f46",
      );
      disk(c, 0, -92, 8, "#c6aa70");
    }
    for (const side of [-1, 1]) {
      oval(c, side * 21, -15, 14, 8 * blink, "#0a131b");
      oval(
        c,
        side * 21 + look,
        -15,
        4,
        5 * blink,
        i === 1 ? "#a6ecdf" : "#edce8b",
      );
      line(
        c,
        [
          [side * 8, -32],
          [side * 32, -34 + Math.sin(phase) * 4],
        ],
        "#302832",
        4,
      );
    }
    line(
      c,
      [
        [1, -6],
        [-6, 23],
        [8, 23],
      ],
      "#67574f",
      2,
    );
    c.beginPath();
    c.moveTo(-19, 44);
    c.quadraticCurveTo(0, 44 + Math.sin(phase) * 15, 19, 44);
    c.strokeStyle = "#44323f";
    c.lineWidth = 3;
    c.stroke();
    if (i === 0) {
      polygon(
        c,
        [
          [-14, 46],
          [-7, 46],
          [-10, 57],
        ],
        "#fff3ce",
      );
      polygon(
        c,
        [
          [7, 46],
          [14, 46],
          [10, 57],
        ],
        "#fff3ce",
      );
    }
    if (i === 2) {
      line(
        c,
        [
          [-23, 35],
          [-7, 30],
          [0, 34],
          [9, 30],
          [25, 35],
        ],
        "#b9b2a8",
        7,
      );
    }
    c.restore();
    const flicker = 0.88 + 0.12 * Math.sin(a * 9 + i);
    glow(c, x, 516, 125, "#ffbd6c", 0.32 * flicker);
    panel(c, x - 9, 523, 18, 56, "#bca28e", 3);
    oval(c, x, 514, 7 * flicker, 18 * flicker, "#ffd696");
    oval(c, x, 520, 3, 8, "#fff5d7");
  }
  c.restore();
};

export const illusionPainters: Partial<Record<EffectId, Painter>> = {
  "clockwork-wall": clockwork,
  "enchanted-bookshelf": bookshelf,
  "stained-sunlight": stained,
  "marble-run": marbles,
  "peeling-paint": peeling,
  "laser-blueprints": blueprints,
  "haunted-portraits": portraits,
};
