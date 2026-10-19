import { glow, line, mod, oval, rgba, star, TAU } from "./common";
import { shaped, velvet } from "./characterArt";
import type { StoryEffectId } from "../types";

type C = CanvasRenderingContext2D;

function eyes(c: C, x: number, y: number, phase: number, distance = 0.19) {
  const blink = 1 - Math.max(0, Math.cos(phase * TAU * 3)) ** 80 * 0.92;
  for (const dx of [-distance, distance]) {
    oval(c, x + dx, y, 0.095, 0.13 * blink, "#091726");
    oval(c, x + dx + 0.025, y - 0.035 * blink, 0.026, 0.035 * blink, "#ffffff");
  }
}

export function gear(
  c: C,
  x: number,
  y: number,
  r: number,
  angle: number,
  color: string,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.beginPath();
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * TAU,
      radius = r * (i % 4 < 2 ? 1 : 0.84);
    if (i) c.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    else c.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  c.closePath();
  const g = c.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, "#fff0bf");
  g.addColorStop(0.32, color);
  g.addColorStop(1, "#674629");
  c.fillStyle = g;
  c.fill();
  oval(c, 0, 0, r * 0.7, r * 0.7, "#16212a");
  for (let i = 0; i < 5; i++) {
    c.rotate(TAU / 5);
    line(
      c,
      [
        [r * 0.16, 0],
        [r * 0.7, 0],
      ],
      color,
      r * 0.13,
    );
  }
  velvet(c, 0, 0, r * 0.2, r * 0.2, color);
  oval(c, 0, 0, r * 0.065, r * 0.065, "#0d1720");
  c.restore();
}

function rocket(c: C, a: number, color: string) {
  const flame = 0.8 + Math.sin(a * 24) * 0.13;
  glow(c, -1.3, 0.12, 1.15, color, 0.55);
  for (let i = 0; i < 3; i++) {
    shaped(c, [color, "#d9fcff", "#ffffff"][i], () => {
      c.moveTo(-0.78, -0.16 + i * 0.09);
      c.quadraticCurveTo(-1.3, -0.3, -1.05 - flame * (1 - i * 0.23), 0.12);
      c.quadraticCurveTo(-1.3, 0.42, -0.78, 0.35 - i * 0.09);
    });
  }
  shaped(c, "#7255c9", () => {
    c.moveTo(-0.62, -0.24);
    c.lineTo(-0.92, -0.82);
    c.lineTo(-0.06, -0.4);
    c.lineTo(0.1, 0.47);
    c.lineTo(-0.83, 0.82);
    c.lineTo(-0.64, 0.28);
  });
  velvet(c, 0, 0, 1.08, 0.48, "#d6e5ec");
  shaped(c, color, () => {
    c.moveTo(0.53, -0.4);
    c.quadraticCurveTo(1.02, -0.24, 1.29, 0);
    c.quadraticCurveTo(1.02, 0.24, 0.53, 0.4);
  });
  velvet(c, -0.12, -0.1, 0.39, 0.38, "#4c657f");
  velvet(c, -0.12, -0.12, 0.31, 0.31, "#123b66");
  glow(c, -0.12, -0.12, 0.31, color, 0.7);
  star(c, -0.12, -0.12, 0.21, "#fff4b2", a * 2);
  oval(c, -0.24, -0.26, 0.13, 0.06, "#e6ffffb0", -0.45);
  for (let i = 0; i < 4; i++)
    oval(c, -0.62 + i * 0.22, 0.28, 0.023, 0.023, "#4c6076");
  line(
    c,
    [
      [-0.64, 0.1],
      [-0.82, 0.1],
    ],
    "#edf9ff",
    0.12,
  );
}

function ghost(c: C, x: number, y: number, a: number, color: string) {
  c.save();
  c.translate(x, y + Math.sin(a * 4 + x) * 0.065);
  shaped(c, "#dcefff", () => {
    c.moveTo(-0.27, 0.16);
    c.bezierCurveTo(-0.38, -0.65, 0.37, -0.65, 0.28, 0.15);
    for (let i = 0; i < 5; i++) c.lineTo(0.28 - i * 0.14, i % 2 ? 0.04 : 0.2);
  });
  eyes(c, 0.01, -0.16, a / TAU, 0.12);
  oval(c, 0.02, 0.03, 0.043, 0.06, color);
  c.restore();
}

function train(c: C, a: number, color: string) {
  for (let i = 0; i < 7; i++) {
    const p = mod((a / TAU) * 12 + i / 7, 1);
    glow(
      c,
      -0.5 - p * 1.25,
      -1.46 - p * 0.92,
      0.1 + p * 0.35,
      color,
      Math.sin(p * Math.PI) ** 2 * 0.28,
    );
  }
  for (let car = 2; car >= 0; car--) {
    c.save();
    c.translate(-car * 1.85, 0);
    if (car) {
      line(
        c,
        [
          [0.8, -0.26],
          [1.14, -0.26],
        ],
        "#9facce",
        0.06,
      );
      c.fillStyle = "#292142";
      c.fillRect(-0.79, -1.28, 1.53, 1.01);
      c.strokeStyle = color;
      c.lineWidth = 0.035;
      c.strokeRect(-0.79, -1.28, 1.53, 1.01);
      for (const x of [-0.4, 0.34]) {
        c.fillStyle = "#0a1426";
        c.fillRect(x - 0.29, -1.1, 0.58, 0.61);
        glow(c, x, -0.8, 0.47, color, 0.19);
        ghost(c, x, -0.7, a + car, color);
      }
      line(
        c,
        [
          [-0.89, -1.35],
          [0.84, -1.35],
        ],
        "#bea3e9",
        0.12,
      );
    } else {
      velvet(c, 0.06, -0.66, 0.83, 0.43, "#644c8e");
      c.fillStyle = "#314157";
      c.fillRect(-0.92, -1.31, 0.57, 1.02);
      c.strokeStyle = color;
      c.lineWidth = 0.04;
      c.strokeRect(-0.92, -1.31, 0.57, 1.02);
      ghost(c, -0.65, -0.82, a, color);
      line(
        c,
        [
          [-1.02, -1.4],
          [-0.23, -1.4],
        ],
        "#c0b5ec",
        0.12,
      );
      c.fillStyle = "#59718a";
      c.fillRect(0.28, -1.39, 0.21, 0.54);
      velvet(c, 0.39, -1.4, 0.19, 0.08, "#a7bacc");
      for (let i = 0; i < 4; i++)
        line(
          c,
          [
            [i * 0.19 - 0.25, -0.99],
            [i * 0.19 - 0.25, -0.37],
          ],
          "#b5a1cb",
          0.025,
        );
      glow(c, 0.93, -0.71, 0.62, "#ffe7ac", 0.5);
      velvet(c, 0.91, -0.7, 0.12, 0.18, "#fff0bc");
      line(
        c,
        [
          [0.73, -0.24],
          [1.15, -0.07],
          [0.64, -0.07],
        ],
        "#9aadc0",
        0.05,
      );
    }
    for (const x of [-0.55, 0.48]) {
      velvet(c, x, -0.16, 0.25, 0.25, "#7d8ba6");
      oval(c, x, -0.16, 0.19, 0.19, "#131c30");
      for (let spoke = 0; spoke < 6; spoke++) {
        const angle = a * 18 + (spoke * TAU) / 6;
        line(
          c,
          [
            [x, -0.16],
            [x + Math.cos(angle) * 0.18, -0.16 + Math.sin(angle) * 0.18],
          ],
          color,
          0.024,
        );
      }
    }
    const dx = Math.cos(a * 18) * 0.13,
      dy = Math.sin(a * 18) * 0.13;
    line(
      c,
      [
        [-0.55 + dx, -0.16 + dy],
        [0.48 + dx, -0.16 + dy],
      ],
      "#e1d4eb",
      0.065,
    );
    c.restore();
  }
}

function dragon(c: C, a: number, color: string) {
  shaped(c, "#359b85", () => {
    c.moveTo(-0.3, 0.17);
    c.bezierCurveTo(
      -1.1,
      0.8,
      -1.35,
      -0.53,
      -2.03,
      0.03 + Math.sin(a * 6) * 0.16,
    );
    c.bezierCurveTo(-1.4, -0.07, -1.05, 1.0, 0.1, 0.4);
  });
  c.save();
  c.translate(-0.2, -0.08);
  c.rotate(Math.sin(a * 12) * 0.39);
  shaped(c, "#5588bb", () => {
    c.moveTo(0, 0.2);
    c.quadraticCurveTo(-0.45, -0.81, -1.27, -1.24);
    c.lineTo(-1.14, -0.47);
    c.quadraticCurveTo(-0.7, -0.57, -0.66, -0.05);
    c.quadraticCurveTo(-0.29, -0.28, 0, 0.2);
  });
  line(
    c,
    [
      [0, 0.2],
      [-1.27, -1.24],
      [-0.66, -0.05],
    ],
    "#a0e3d2",
    0.025,
  );
  c.restore();
  velvet(c, 0, 0.13, 0.68, 0.43, "#51b79b");
  velvet(c, 0.22, 0.29, 0.39, 0.21, "#d3d69c");
  for (let i = 0; i < 5; i++) {
    const x = -0.7 + i * 0.23;
    shaped(c, color, () => {
      c.moveTo(x, -0.19);
      c.lineTo(x + 0.06, -0.39);
      c.lineTo(x + 0.16, -0.22);
    });
  }
  velvet(c, 0.61, -0.28, 0.4, 0.43, "#75d5a8");
  velvet(c, 0.94, -0.11, 0.35, 0.23, "#91dfab");
  shaped(c, "#f4d6b3", () => {
    c.moveTo(0.4, -0.59);
    c.lineTo(0.36, -0.93);
    c.lineTo(0.6, -0.6);
  });
  eyes(c, 0.7, -0.32, a / TAU, 0.12);
  oval(c, 1.13, -0.18, 0.032, 0.04, "#244c48");
  line(
    c,
    [
      [0.8, 0.07],
      [1.12, 0.07],
    ],
    "#2b6556",
    0.026,
  );
  for (const x of [-0.28, 0.34])
    velvet(c, x, 0.49 + Math.sin(a * 12 + x) * 0.05, 0.2, 0.1, "#60b48f");
  glow(c, 1.55, -0.03, 0.62, color, 0.6);
  for (let i = 0; i < 9; i++) {
    const p = mod((a / TAU) * 6 + i / 9, 1);
    oval(
      c,
      1.23 + p * 0.9,
      -0.03 + Math.sin(p * TAU + i) * p * 0.2,
      0.035 * (1 - p),
      0.035 * (1 - p),
      rgba(color, Math.sin(p * Math.PI)),
    );
  }
}

function turtle(c: C, a: number, color: string) {
  for (const x of [-0.55, 0.45]) {
    c.save();
    c.translate(x, 0.17);
    c.rotate(Math.sin(a * 8 + x) * 0.3);
    velvet(c, -0.15, 0.31, 0.39, 0.13, "#6bbda1");
    c.restore();
  }
  velvet(c, -0.08, 0, 0.88, 0.49, "#307e79");
  c.save();
  c.beginPath();
  c.ellipse(-0.08, 0, 0.8, 0.42, 0, 0, TAU);
  c.clip();
  for (let row = -1; row <= 1; row++)
    for (let col = -2; col <= 2; col++) {
      const x = col * 0.33 + (row % 2) * 0.16 - 0.05,
        y = row * 0.28;
      const points = Array.from({ length: 7 }, (_, i) => [
        x + Math.cos((i * TAU) / 6) * 0.19,
        y + Math.sin((i * TAU) / 6) * 0.19,
      ]);
      line(c, points, "#8dd9a5", 0.027);
    }
  c.restore();
  velvet(c, 0.84, -0.02, 0.37, 0.3, "#9ed9ac");
  eyes(c, 0.95, -0.05, a / TAU, 0.11);
  line(
    c,
    [
      [0.95, 0.13],
      [1.12, 0.1],
    ],
    "#336c62",
    0.025,
  );
  shaped(c, "#8ec89c", () => {
    c.moveTo(-0.85, 0.02);
    c.lineTo(-1.14, 0.09);
    c.lineTo(-0.83, 0.19);
  });
  glow(c, 1.55, -0.08, 0.74, color, 0.54);
  velvet(c, 1.55, -0.08, 0.24, 0.24, "#d9f8e8");
  oval(c, 1.46, -0.17, 0.07, 0.05, "#ffffff");
  for (let i = 0; i < 5; i++) {
    const p = mod((a / TAU) * 4 + i / 5, 1);
    c.strokeStyle = rgba(color, Math.sin(p * Math.PI) * 0.4);
    c.lineWidth = 0.015;
    c.beginPath();
    c.arc(-0.9 - p * 0.8, -p * 1.1, 0.04 + p * 0.07, 0, TAU);
    c.stroke();
  }
}

function marble(c: C, a: number, color: string) {
  glow(c, 0, -0.05, 0.95, color, 0.22);
  velvet(c, 0, 0, 0.6, 0.6, "#829ba9");
  c.save();
  c.beginPath();
  c.arc(0, 0, 0.57, 0, TAU);
  c.clip();
  c.rotate(a * 24);
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.ellipse(0, 0, 0.58, 0.13 + i * 0.08, (i * Math.PI) / 3, 0, TAU);
    c.strokeStyle = i % 2 ? "#142735" : color;
    c.lineWidth = 0.075;
    c.stroke();
  }
  c.restore();
  oval(c, -0.2, -0.25, 0.2, 0.1, "#e8ffffbf", -0.5);
  oval(c, 0.2, 0.31, 0.13, 0.05, "#ffffff55", -0.5);
}

function firefly(c: C, a: number, color: string) {
  for (let side = -1; side <= 1; side += 2) {
    c.save();
    c.translate(-0.08, -0.12);
    c.rotate(side * (0.65 + Math.sin(a * 36) * 0.4));
    oval(c, -0.05, -0.43, 0.22, 0.54, "#c4edff77");
    line(
      c,
      [
        [0, 0],
        [0.02, -0.85],
      ],
      "#e5ffffa0",
      0.018,
    );
    c.restore();
  }
  glow(c, -0.3, 0.13, 1.22, color, 0.48 + Math.sin(a * 4) * 0.12);
  velvet(c, -0.27, 0.13, 0.41, 0.3, color);
  velvet(c, 0.19, 0.05, 0.32, 0.27, "#434960");
  velvet(c, 0.52, -0.1, 0.29, 0.28, "#c9c992");
  eyes(c, 0.57, -0.1, a / TAU, 0.105);
  for (const y of [-0.21, -0.42])
    line(
      c,
      [
        [0.57, -0.31],
        [0.79, y - 0.18],
        [0.94, y - 0.22],
      ],
      color,
      0.025,
    );
  for (let i = 0; i < 16; i++) {
    const p = mod((a / TAU) * 4 + i / 16, 1);
    star(
      c,
      -0.65 - p * 1.9,
      Math.sin(p * TAU + i) * p * 0.27,
      0.018 + Math.sin(p * Math.PI) * 0.035,
      rgba(color, Math.sin(p * Math.PI) * 0.7),
      a + i,
    );
  }
}

export function storyActor(
  c: C,
  id: StoryEffectId,
  phase: number,
  color: string,
) {
  const a = phase * TAU;
  if (id === "story-cosmic-courier") rocket(c, a, color);
  else if (id === "story-ghost-train") train(c, a, color);
  else if (id === "story-dragon-lanterns") dragon(c, a, color);
  else if (id === "story-reef-relay") turtle(c, a, color);
  else if (id === "story-clockwork-marble") marble(c, a, color);
  else firefly(c, a, color);
}
