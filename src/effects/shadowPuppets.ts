import type { EffectId } from "../types";
import {
  TAU,
  mod,
  random,
  rgba,
  glow,
  oval,
  line,
  star,
  type Painter,
} from "./common";
import { stage, panel, polygon, gradient, disk, leaf } from "./sceneArt";

const ink = "#161322",
  paper = "#e8c998";
type Theme = "woodland" | "dragon" | "ocean" | "ballet" | "spooky" | "winter";
function joint(c: CanvasRenderingContext2D, points: number[][], width = 12) {
  line(c, points, ink, width);
  for (const [x, y] of points.slice(1, -1)) disk(c, x, y, 2.2, paper);
}
function pine(c: CanvasRenderingContext2D, x: number, y: number, size: number) {
  panel(c, x - size * 0.035, y - size * 0.8, size * 0.07, size * 0.8, ink, 0);
  for (let j = 0; j < 4; j++)
    polygon(
      c,
      [
        [x, y - size + j * size * 0.16],
        [x - size * (0.17 + j * 0.045), y - size * 0.54 + j * size * 0.16],
        [x + size * (0.17 + j * 0.045), y - size * 0.54 + j * size * 0.16],
      ],
      ink,
    );
}
function rabbit(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  a: number,
) {
  c.save();
  c.translate(x, y - Math.max(0, Math.sin(a * 2)) * 15);
  c.scale(s, s);
  oval(c, 0, -33, 36, 43, ink);
  oval(c, 13, -82, 27, 26, ink);
  oval(c, 9, -121, 9, 33, ink, -0.2 + Math.sin(a) * 0.12);
  oval(c, 31, -118, 8, 31, ink, 0.2);
  oval(c, 35, -79, 17, 11, ink);
  oval(c, -31, -24, 13, 14, ink);
  disk(c, 23, -88, 3, paper);
  joint(
    c,
    [
      [-16, -14],
      [-28, -1],
      [-6, 0],
    ],
    13,
  );
  joint(
    c,
    [
      [19, -17],
      [36, -2],
      [53, -2],
    ],
    12,
  );
  joint(
    c,
    [
      [16, -54],
      [33, -37],
      [44, -49 + Math.sin(a) * 8],
    ],
    8,
  );
  line(
    c,
    [
      [44, -49],
      [53, 110],
    ],
    "#29203495",
    2,
  );
  c.restore();
}
function fox(c: CanvasRenderingContext2D, x: number, y: number, a: number) {
  c.save();
  c.translate(x, y);
  c.rotate(Math.sin(a) * 0.025);
  c.beginPath();
  c.moveTo(-42, -48);
  c.bezierCurveTo(-114, -40, -113, -111, -159, -112);
  c.bezierCurveTo(-153, -25, -91, 1, -38, -16);
  c.closePath();
  c.fillStyle = ink;
  c.fill();
  oval(c, 0, -43, 57, 29, ink);
  oval(c, 49, -77, 26, 30, ink, -0.3);
  polygon(
    c,
    [
      [31, -93],
      [29, -129],
      [53, -102],
      [66, -128],
      [73, -90],
      [102, -76],
      [67, -62],
    ],
    ink,
  );
  disk(c, 63, -88, 3, paper);
  line(
    c,
    [
      [78, -72],
      [98, -77],
    ],
    paper,
    1.6,
  );
  for (const side of [-1, 1]) {
    const stride = Math.sin(a * 2 + side) * 13;
    joint(
      c,
      [
        [side * 33, -30],
        [side * 37 + stride, -13],
        [side * 39 + stride * 1.3, 1],
      ],
      10,
    );
  }
  line(
    c,
    [
      [0, -45],
      [0, 120],
    ],
    "#29203495",
    2,
  );
  c.restore();
}
function dancer(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  a: number,
  mirror: number,
) {
  c.save();
  c.translate(x, y);
  c.scale(mirror, 1);
  c.rotate(Math.sin(a) * 0.08);
  oval(c, 0, -162, 15, 21, ink);
  disk(c, -11, -181, 9, ink);
  line(
    c,
    [
      [0, -143],
      [0, -129],
    ],
    ink,
    9,
  );
  polygon(
    c,
    [
      [-17, -134],
      [15, -134],
      [8, -94],
      [21, -78],
      [-21, -78],
      [-8, -94],
    ],
    ink,
  );
  joint(
    c,
    [
      [-14, -126],
      [-42, -151 + Math.sin(a) * 13],
      [-30, -193 + Math.sin(a) * 16],
    ],
    8,
  );
  joint(
    c,
    [
      [14, -126],
      [49, -116 + Math.cos(a) * 25],
      [78, -143 + Math.cos(a) * 33],
    ],
    8,
  );
  joint(
    c,
    [
      [-7, -77],
      [-10, -39],
      [-6, -3],
      [4, 0],
    ],
    11,
  );
  joint(
    c,
    [
      [8, -77],
      [49, -65 + Math.sin(a) * 25],
      [92, -88 + Math.sin(a) * 40],
      [104, -90 + Math.sin(a) * 40],
    ],
    10,
  );
  polygon(
    c,
    [
      [-16, -92],
      [-65, -62],
      [-36, -56],
      [0, -59],
      [38, -54],
      [64, -64],
      [17, -92],
    ],
    ink,
  );
  for (let i = -2; i <= 2; i++)
    line(
      c,
      [
        [i * 6, -87],
        [i * 19, -62],
      ],
      paper,
      1,
    );
  line(
    c,
    [
      [78, -140],
      [127, 110],
    ],
    "#29203475",
    1.5,
  );
  c.restore();
}
function skeleton(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  a: number,
) {
  c.save();
  c.translate(x, y);
  oval(c, 0, -163, 26, 30, ink);
  panel(c, -17, -145, 34, 18, ink, 4);
  oval(c, -10, -168, 7, 9, paper);
  oval(c, 10, -168, 7, 9, paper);
  polygon(
    c,
    [
      [0, -158],
      [-4, -150],
      [4, -150],
    ],
    paper,
  );
  for (let i = -2; i <= 2; i++)
    line(
      c,
      [
        [i * 5, -140],
        [i * 5, -130],
      ],
      paper,
      1.5,
    );
  line(
    c,
    [
      [0, -126],
      [0, -60],
    ],
    ink,
    7,
  );
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.ellipse(0, -113 + i * 11, 29 - i * 3, 8, 0, 0, TAU);
    c.strokeStyle = ink;
    c.lineWidth = 5;
    c.stroke();
  }
  joint(
    c,
    [
      [-28, -116],
      [-56, -95 + Math.sin(a) * 25],
      [-76, -130 + Math.sin(a) * 35],
    ],
    7,
  );
  joint(
    c,
    [
      [28, -116],
      [53, -110 + Math.cos(a) * 24],
      [79, -145 + Math.cos(a) * 30],
    ],
    7,
  );
  oval(c, 0, -55, 20, 11, ink);
  for (const side of [-1, 1]) {
    const step = Math.sin(a * 2 + side) * 16;
    joint(
      c,
      [
        [side * 12, -55],
        [side * 28 + step, -29],
        [side * 24 + step, 0],
        [side * 40 + step, 0],
      ],
      8,
    );
  }
  line(
    c,
    [
      [0, -60],
      [5, 110],
    ],
    "#29203495",
    2,
  );
  c.restore();
}
function bat(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  a: number,
) {
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side, 1);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(20, -20 - Math.sin(a) * 10, 49, -19 - Math.sin(a) * 20);
    c.quadraticCurveTo(35, -2, 41, 13);
    c.quadraticCurveTo(20, 4, 23, 23);
    c.quadraticCurveTo(11, 8, 0, 13);
    c.closePath();
    c.fillStyle = ink;
    c.fill();
    c.restore();
  }
  oval(c, 0, 4, 8, 17, ink);
  polygon(
    c,
    [
      [-7, -9],
      [-8, -20],
      [0, -13],
      [8, -20],
      [7, -9],
    ],
    ink,
  );
  c.restore();
}
function reindeer(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  a: number,
) {
  c.save();
  c.translate(x, y);
  oval(c, 0, -30, 43, 21, ink);
  polygon(
    c,
    [
      [21, -35],
      [37, -78],
      [56, -89],
      [70, -77],
      [58, -66],
      [51, -29],
    ],
    ink,
  );
  oval(c, 61, -78, 20, 9, ink);
  for (let j = 0; j < 2; j++) {
    line(
      c,
      [
        [42 + j * 12, -87],
        [37 + j * 14, -110],
        [30 + j * 15, -131],
      ],
      ink,
      4,
    );
    line(
      c,
      [
        [37 + j * 14, -110],
        [22 + j * 14, -111],
        [18 + j * 13, -124],
      ],
      ink,
      3,
    );
    line(
      c,
      [
        [33 + j * 15, -121],
        [46 + j * 15, -130],
      ],
      ink,
      3,
    );
  }
  for (let j = 0; j < 4; j++) {
    const x = -27 + j * 17,
      step = Math.sin(a + j) * 22;
    joint(
      c,
      [
        [x, -21],
        [x + step, -4],
        [x + step * 1.5, 16],
        [x + step * 1.5 + 10, 16],
      ],
      5,
    );
  }
  line(
    c,
    [
      [-36, -34],
      [-52, -44],
    ],
    ink,
    7,
  );
  disk(c, 63, -81, 2, paper);
  c.restore();
}

const makePuppet =
  (theme: Theme): Painter =>
  (c, t, w, h, color, seed) => {
    stage(c, w, h, "#24172b", "#18121e");
    const a = (mod(t, 20) / 20) * TAU,
      phase = a + random(6, seed) * TAU;
    panel(
      c,
      27,
      25,
      946,
      550,
      gradient(c, 0, 25, 0, 575, ["#b68a72", paper, "#b78d78"]),
      18,
    );
    glow(c, 500 + Math.sin(a) * 40, 280, 510, color, 0.34);
    // Fine woven screen lines, stationary in the projector frame.
    for (let y = 32; y < 570; y += 5)
      line(
        c,
        [
          [31, y],
          [969, y],
        ],
        "#5c36520a",
        0.7,
      );
    c.save();
    panel(c, 31, 29, 938, 542, "#00000000", 14);
    c.clip();
    if (theme === "woodland") {
      c.save();
      c.globalAlpha = 0.25;
      for (let i = 0; i < 8; i++)
        pine(c, 40 + i * 138, 512, 220 + random(i, seed) * 160);
      c.restore();
      disk(c, 730, 125, 55, "#f9e9c7a0");
      fox(c, 330 + Math.sin(phase) * 55, 489, phase);
      rabbit(c, 660 + Math.sin(phase + 2) * 32, 489, 1.05, phase);
      line(
        c,
        [
          [750, 303],
          [937, 291],
        ],
        ink,
        12,
      );
      c.save();
      c.translate(833, 267);
      c.rotate(Math.sin(phase) * 0.2);
      oval(c, 0, 0, 30, 43, ink);
      polygon(
        c,
        [
          [-29, -14],
          [-32, -48],
          [-7, -32],
          [24, -44],
          [28, -10],
        ],
        ink,
      );
      oval(c, -12, -15, 10, 12, paper);
      oval(c, 12, -15, 10, 12, paper);
      disk(c, -12 + Math.sin(a) * 3, -15, 4, ink);
      disk(c, 12 + Math.sin(a) * 3, -15, 4, ink);
      polygon(
        c,
        [
          [0, -8],
          [-5, 2],
          [5, 2],
        ],
        paper,
      );
      c.restore();
      for (let i = 0; i < 12; i++)
        leaf(c, 70 + i * 79, 520, 33, -1.7 + Math.sin(a + i) * 0.1, ink);
    } else if (theme === "dragon") {
      c.save();
      c.globalAlpha = 0.35;
      for (let i = 0; i < 5; i++) {
        const x = 90 + i * 180,
          y = 305 + random(i, seed) * 80;
        panel(c, x, y, 95, 220, ink, 0);
        polygon(
          c,
          [
            [x - 13, y],
            [x + 48, y - 70],
            [x + 108, y],
          ],
          ink,
        );
        panel(c, x + 30, y + 35, 32, 52, paper, 16);
      }
      c.restore();
      disk(c, 768, 125, 58, "#f9e9c7a0");
      c.save();
      c.translate(495 + Math.sin(phase) * 115, 280 + Math.cos(phase) * 35);
      c.beginPath();
      c.moveTo(-52, 21);
      c.bezierCurveTo(-145, 95, -185, -44, -217, 16);
      c.bezierCurveTo(-180, -96, -119, 45, -53, -14);
      c.closePath();
      c.fillStyle = ink;
      c.fill();
      oval(c, 0, 0, 76, 35, ink);
      polygon(
        c,
        [
          [46, -13],
          [70, -74],
          [106, -85],
          [140, -62],
          [109, -48],
          [77, 21],
        ],
        ink,
      );
      polygon(
        c,
        [
          [79, -73],
          [74, -104],
          [94, -84],
          [107, -104],
          [111, -77],
        ],
        ink,
      );
      for (const side of [-1, 1]) {
        c.save();
        c.scale(side, 1);
        const flap = Math.sin(phase * 3) * 35;
        polygon(
          c,
          [
            [0, -12],
            [45, -110 - flap],
            [155, -150 - flap],
            [114, -64],
            [87, -68],
            [59, -25],
            [32, -34],
          ],
          ink,
        );
        line(
          c,
          [
            [15, -19],
            [51, -100 - flap],
            [125, -131 - flap],
          ],
          paper,
          1.3,
        );
        c.restore();
      }
      disk(c, 107, -69, 3, paper);
      joint(
        c,
        [
          [-35, 20],
          [-23, 59],
          [-1, 65],
        ],
        9,
      );
      joint(
        c,
        [
          [39, 19],
          [52, 50],
          [74, 48],
        ],
        9,
      );
      for (let i = 0; i < 5; i++)
        polygon(
          c,
          [
            [-53 + i * 28, -23],
            [-43 + i * 28, -45],
            [-32 + i * 28, -25],
          ],
          ink,
        );
      line(
        c,
        [
          [0, 0],
          [0, 340],
        ],
        "#29203485",
        2,
      );
      c.restore();
    } else if (theme === "ocean") {
      c.save();
      c.globalAlpha = 0.3;
      for (let i = 0; i < 18; i++) {
        const x = 25 + i * 59;
        line(
          c,
          [
            [x, 545],
            [x + Math.sin(phase + i) * 20, 480],
            [x + Math.sin(phase + i + 1) * 32, 425 - random(i, seed) * 80],
          ],
          ink,
          10,
        );
      }
      c.restore();
      c.save();
      c.translate(435 + Math.sin(phase) * 140, 265 + Math.sin(phase * 2) * 23);
      c.rotate(Math.cos(phase) * 0.08);
      oval(c, 0, 0, 145, 73, ink);
      polygon(
        c,
        [
          [111, -17],
          [173, -30],
          [195, -75],
          [191, -13],
          [228, 20],
          [174, 8],
          [119, 29],
        ],
        ink,
      );
      leaf(c, -3, 37, 80, 1.5 + Math.sin(phase) * 0.3, ink);
      disk(c, -92, -10, 5, paper);
      c.beginPath();
      c.moveTo(-138, 13);
      c.quadraticCurveTo(-84, 50, -36, 30);
      c.strokeStyle = paper;
      c.lineWidth = 2;
      c.stroke();
      for (let i = 0; i < 5; i++)
        line(
          c,
          [
            [-99 + i * 13, 31],
            [-87 + i * 13, 53],
          ],
          paper,
          1,
        );
      c.restore();
      for (let i = 0; i < 7; i++) {
        const x = 180 + i * 102 + Math.sin(phase + i) * 28,
          y = 395 + Math.sin(phase * 2 + i) * 30;
        oval(c, x, y, 22, 11, ink);
        polygon(
          c,
          [
            [x + 19, y],
            [x + 40, y - 15],
            [x + 40, y + 15],
          ],
          ink,
        );
        disk(c, x - 12, y - 2, 2, paper);
      }
      c.save();
      c.translate(820 + Math.sin(phase) * 22, 170 + Math.cos(phase) * 25);
      c.beginPath();
      c.arc(0, 0, 40, Math.PI, TAU);
      c.quadraticCurveTo(0, 19, -40, 0);
      c.fillStyle = ink;
      c.fill();
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        c.moveTo(-28 + i * 11, 4);
        c.bezierCurveTo(
          -50 + i * 14,
          38,
          8 + i * 8 + Math.sin(phase) * 20,
          63,
          -25 + i * 10,
          90,
        );
        c.strokeStyle = ink;
        c.lineWidth = 4;
        c.stroke();
      }
      c.restore();
      for (let i = 0; i < 18; i++) {
        const q = mod(a / TAU + random(i + 40, seed), 1);
        c.beginPath();
        c.arc(
          90 + random(i, seed) * 820,
          550 - q * 500,
          3 + random(i + 10, seed) * 5,
          0,
          TAU,
        );
        c.strokeStyle = rgba(ink, Math.sin(q * Math.PI) * 0.3);
        c.lineWidth = 2;
        c.stroke();
      }
    } else if (theme === "ballet") {
      disk(c, 500, 191, 112, "#f7e7c2b0");
      for (let i = 0; i < 30; i++)
        star(
          c,
          80 + random(i, seed) * 840,
          60 + random(i + 50, seed) * 240,
          2 + random(i + 70, seed) * 4,
          rgba(ink, 0.15 + 0.12 * Math.sin(a + i)),
        );
      dancer(c, 337 + Math.sin(phase) * 40, 492, phase, 1);
      dancer(c, 663 - Math.sin(phase) * 40, 492, phase + Math.PI, -1);
      c.save();
      c.globalAlpha = 0.25;
      for (let side = 0; side < 2; side++) {
        panel(c, 84 + side * 780, 100, 48, 420, ink, 4);
        panel(c, 66 + side * 780, 91, 84, 15, ink, 4);
        panel(c, 66 + side * 780, 513, 84, 15, ink, 4);
      }
      c.restore();
    } else if (theme === "spooky") {
      disk(c, 735, 138, 80, "#f5dcaca0");
      c.save();
      c.globalAlpha = 0.28;
      polygon(
        c,
        [
          [50, 525],
          [50, 364],
          [90, 325],
          [104, 270],
          [120, 327],
          [200, 358],
          [210, 525],
        ],
        ink,
      );
      for (let i = 0; i < 6; i++) {
        panel(c, 90 + i * 143, 475, 28, 70, ink, 12);
      }
      c.restore();
      skeleton(c, 389 + Math.sin(phase) * 38, 498, phase);
      skeleton(c, 610 + Math.sin(phase + 2) * 34, 498, phase + 1.6);
      c.save();
      c.translate(430 + Math.sin(phase) * 190, 177 + Math.cos(phase) * 30);
      c.rotate(Math.sin(phase) * 0.09);
      line(
        c,
        [
          [-100, 53],
          [124, 53],
        ],
        ink,
        6,
      );
      polygon(
        c,
        [
          [-88, 40],
          [-136, 26],
          [-132, 72],
          [-88, 63],
        ],
        ink,
      );
      polygon(
        c,
        [
          [-35, 39],
          [-13, -21],
          [14, -24],
          [39, 41],
        ],
        ink,
      );
      oval(c, 7, -44, 19, 23, ink);
      polygon(
        c,
        [
          [-30, -57],
          [3, -114],
          [23, -63],
          [44, -58],
        ],
        ink,
      );
      polygon(
        c,
        [
          [18, -45],
          [38, -37],
          [20, -30],
        ],
        ink,
      );
      joint(
        c,
        [
          [12, -15],
          [39, 19],
          [65, 48],
        ],
        8,
      );
      joint(
        c,
        [
          [-5, 35],
          [27, 63],
          [23, 91],
          [43, 91],
        ],
        9,
      );
      c.restore();
      for (let i = 0; i < 4; i++)
        bat(
          c,
          130 + i * 232 + Math.sin(phase + i) * 24,
          130 + Math.cos(phase + i) * 45,
          0.55,
          phase * 6 + i,
        );
    } else {
      c.save();
      c.globalAlpha = 0.3;
      for (let i = 0; i < 7; i++)
        pine(c, 30 + i * 170, 527, 170 + random(i, seed) * 125);
      c.restore();
      disk(c, 736, 135, 67, "#f6eacfa0");
      const bob = Math.sin(phase * 3) * 9;
      reindeer(c, 640 + Math.sin(phase) * 20, 335 + bob, phase * 3);
      reindeer(c, 812 + Math.sin(phase) * 20, 320 + bob, phase * 3 + 0.7);
      c.save();
      c.translate(333 + Math.sin(phase) * 20, 359 + bob);
      c.beginPath();
      c.moveTo(-105, -2);
      c.quadraticCurveTo(-135, 48, -70, 56);
      c.lineTo(75, 56);
      c.quadraticCurveTo(115, 44, 100, 7);
      c.lineTo(80, 4);
      c.lineTo(57, 28);
      c.lineTo(-73, 28);
      c.closePath();
      c.fillStyle = ink;
      c.fill();
      line(
        c,
        [
          [-119, 72],
          [76, 72],
          [109, 61],
          [120, 41],
        ],
        ink,
        7,
      );
      line(
        c,
        [
          [-66, 54],
          [-74, 72],
        ],
        ink,
        5,
      );
      line(
        c,
        [
          [62, 54],
          [70, 72],
        ],
        ink,
        5,
      );
      oval(c, 21, -8, 33, 40, ink);
      oval(c, 33, -58, 19, 22, ink);
      polygon(
        c,
        [
          [13, -73],
          [25, -109],
          [52, -78],
        ],
        ink,
      );
      disk(c, 25, -109, 7, ink);
      oval(c, -60, -11, 35, 42, ink);
      joint(
        c,
        [
          [42, -25],
          [69, -7],
          [90, -16],
        ],
        10,
      );
      line(
        c,
        [
          [90, -16],
          [316, -55],
          [484, -71],
        ],
        ink,
        2,
      );
      c.restore();
      for (let i = 0; i < 55; i++) {
        const q = mod(a / TAU + random(i, seed), 1);
        oval(
          c,
          30 + random(i + 85, seed) * 940 + Math.sin(a + i) * 12,
          35 + q * 520,
          2,
          2,
          rgba(ink, Math.sin(q * Math.PI) ** 2 * 0.45),
        );
      }
    }
    // Foreground floor and scalloped velvet wings frame every puppet performance.
    c.fillStyle = ink;
    c.beginPath();
    c.moveTo(0, 535);
    for (let x = 0; x <= 1000; x += 25)
      c.lineTo(x, 528 + Math.sin(x * 0.009) * 10);
    c.lineTo(1000, 600);
    c.lineTo(0, 600);
    c.fill();
    for (const side of [-1, 1]) {
      c.save();
      c.translate(side === 1 ? 0 : 1000, 0);
      c.scale(side, 1);
      polygon(
        c,
        [
          [0, 0],
          [103, 0],
          [97, 150],
          [69, 315],
          [44, 544],
          [0, 600],
        ],
        "#332033",
      );
      for (let i = 0; i < 4; i++)
        line(
          c,
          [
            [i * 23, 0],
            [i * 18, 190],
            [i * 10, 530],
          ],
          "#8e566333",
          5,
        );
      c.restore();
    }
    for (let i = 0; i < 10; i++) oval(c, 50 + i * 100, 22, 68, 33, "#332033");
    c.restore();
    c.restore();
  };

export const puppetPainters: Partial<Record<EffectId, Painter>> = {
  "puppet-woodland": makePuppet("woodland"),
  "puppet-dragon": makePuppet("dragon"),
  "puppet-ocean": makePuppet("ocean"),
  "puppet-ballet": makePuppet("ballet"),
  "puppet-spooky": makePuppet("spooky"),
  "puppet-winter": makePuppet("winter"),
};
