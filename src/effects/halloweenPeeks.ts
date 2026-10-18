import { glow, hslHex, line, mod, oval, random, star, TAU } from "./common";
import { velvet, shaped } from "./characterArt";
import { tint } from "./materials";

export type HalloweenPeek = "skeleton" | "witch";

function bone(
  c: CanvasRenderingContext2D,
  points: number[][],
  color: string,
  width = 0.1,
) {
  line(c, points, tint(color, 0.42), width * 1.45);
  line(c, points, color, width);
  const [x, y] = points[0],
    [endX, endY] = points[points.length - 1];
  velvet(c, x, y, width * 0.65, width * 0.62, color);
  velvet(c, endX, endY, width * 0.65, width * 0.62, color);
}
function drawSkeleton(
  c: CanvasRenderingContext2D,
  color: string,
  t: number,
  seed: number,
) {
  const a = (t / 18 + random(1, seed) * 0.08) * TAU,
    look = Math.sin(a * 2) * 0.06,
    jaw = 0.025 + 0.055 * (1 + Math.sin(a * 3));
  c.save();
  c.rotate(Math.sin(a) * 0.035);
  // Visible spaces between ribs are projection black, with a solid sternum and spine.
  for (let i = 0; i < 8; i++)
    velvet(c, 0, 0.77 + i * 0.16, 0.115, 0.075, tint(color, 0.83));
  for (const side of [-1, 1]) {
    bone(
      c,
      [
        [0, 0.78],
        [side * 0.52, 0.88],
        [side * 0.62, 1.3],
        [side * 0.36, 1.65],
      ],
      tint(color, 0.85),
      0.09,
    );
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(side * 0.07, 0.89 + i * 0.17);
      c.bezierCurveTo(
        side * 0.78,
        0.78 + i * 0.15,
        side * 0.62,
        1.22 + i * 0.15,
        side * 0.13,
        1.08 + i * 0.16,
      );
      c.strokeStyle = tint(color, 0.45);
      c.lineWidth = 0.105;
      c.stroke();
      c.strokeStyle = color;
      c.lineWidth = 0.064;
      c.stroke();
    }
  }
  c.restore();
  c.save();
  c.rotate(Math.sin(a * 2 + 0.2) * 0.1);
  shaped(c, color, () => {
    c.moveTo(-0.65, 0.37);
    c.bezierCurveTo(-1.03, 0.04, -0.91, -0.8, -0.41, -0.91);
    c.bezierCurveTo(0.12, -1.08, 0.92, -0.85, 0.9, -0.25);
    c.bezierCurveTo(0.96, 0.13, 0.76, 0.28, 0.65, 0.38);
    c.lineTo(0.46, 0.63);
    c.lineTo(-0.43, 0.63);
  });
  for (const side of [-1, 1]) {
    velvet(c, side * 0.39, -0.12, 0.33, 0.35, "#28202f");
    velvet(c, side * 0.39, -0.09, 0.26, 0.28, "#06090e");
    const px = side * 0.39 + look;
    const eyeColor = hslHex(115 + random(481, seed) * 110, 0.86, 0.82);
    glow(c, px, -0.08, 0.18, eyeColor, 0.42);
    oval(c, px, -0.08, 0.058, 0.081, eyeColor);
    oval(c, px - 0.018, -0.112, 0.017, 0.023, "#ffffff");
    velvet(c, side * 0.64, 0.3, 0.17, 0.13, tint(color, 0.89));
    line(
      c,
      [
        [side * 0.17, -0.49],
        [side * 0.42, -0.55],
        [side * 0.67, -0.4],
      ],
      tint(color, 0.61),
      0.028,
    );
  }
  shaped(c, "#292329", () => {
    c.moveTo(-0.105, 0.29);
    c.quadraticCurveTo(0, -0.02, 0.105, 0.29);
    c.lineTo(0, 0.23);
  });
  oval(c, 0, 0.55, 0.43, 0.15, "#101018");
  for (let i = 0; i < 7; i++)
    velvet(c, (i - 3) * 0.101, 0.495, 0.045, 0.087, tint(color, 1.06));
  c.save();
  c.translate(0, jaw);
  shaped(c, tint(color, 0.91), () => {
    c.moveTo(-0.46, 0.54);
    c.quadraticCurveTo(-0.43, 0.87, 0, 0.88);
    c.quadraticCurveTo(0.43, 0.87, 0.46, 0.54);
    c.lineTo(0.33, 0.64);
    c.quadraticCurveTo(0, 0.75, -0.33, 0.64);
  });
  for (let i = 0; i < 7; i++)
    velvet(c, (i - 3) * 0.095, 0.65, 0.041, 0.065, color);
  c.restore();
  line(
    c,
    [
      [-0.18, -0.86],
      [-0.22, -0.67],
      [-0.12, -0.59],
      [-0.15, -0.44],
    ],
    tint(color, 0.52),
    0.016,
  );
  line(
    c,
    [
      [-0.22, -0.67],
      [-0.38, -0.7],
    ],
    tint(color, 0.58),
    0.012,
  );
  c.restore();
}

function drawWitch(
  c: CanvasRenderingContext2D,
  skin: string,
  t: number,
  seed: number,
) {
  const a = (t * TAU) / 18,
    look = Math.sin(a * 2) * 0.065,
    blink = 1 - Math.exp(-(((mod(t - 8 + 9, 18) - 9) / 0.13) ** 2));
  c.save();
  c.rotate(Math.sin(a) * 0.04);
  shaped(c, "#43245c", () => {
    c.moveTo(-0.45, 0.55);
    c.quadraticCurveTo(-0.8, 1.2, -0.88, 2.1);
    c.quadraticCurveTo(0, 1.87, 0.77, 2.1);
    c.quadraticCurveTo(0.57, 1.1, 0.38, 0.55);
  });
  shaped(c, "#7e458d", () => {
    c.moveTo(-0.4, 0.6);
    c.lineTo(0.1, 1.5);
    c.lineTo(0.5, 0.65);
    c.quadraticCurveTo(0, 0.96, -0.4, 0.6);
  });
  for (let i = 0; i < 3; i++)
    velvet(c, 0.08, 1.27 + i * 0.26, 0.045, 0.045, "#dcb86d");
  c.restore();
  c.save();
  c.rotate(Math.sin(a * 2 + 0.6) * 0.065);
  // Individual copper hair locks and a curled chin silhouette distinguish the witch.
  for (const side of [-1, 1])
    for (let i = 0; i < 5; i++) {
      const x = side * (0.55 + i * 0.065),
        sway = Math.sin(a * 2 + i) * 0.035;
      c.beginPath();
      c.moveTo(x, -0.65);
      c.bezierCurveTo(
        x + side * 0.3,
        -0.15,
        x - side * 0.15 + sway,
        0.35,
        x + side * 0.1 + sway,
        0.96,
      );
      c.strokeStyle = i % 2 ? "#ac643c" : "#5c2c2e";
      c.lineWidth = 0.15;
      c.lineCap = "round";
      c.stroke();
      c.strokeStyle = "#e7ad6345";
      c.lineWidth = 0.02;
      c.stroke();
    }
  velvet(c, 0, 0.02, 0.72, 0.81, skin);
  shaped(c, tint(skin, 0.94), () => {
    c.moveTo(-0.45, 0.45);
    c.quadraticCurveTo(0.13, 1.07, 0.47, 0.55);
    c.quadraticCurveTo(0.3, 0.94, 0.02, 1.01);
    c.quadraticCurveTo(-0.55, 0.83, -0.45, 0.45);
  });
  for (const side of [-1, 1]) {
    c.save();
    c.translate(side * 0.3, -0.08);
    c.scale(1, Math.max(0.035, blink));
    velvet(c, 0, 0, 0.225, 0.25, "#24302d");
    velvet(c, 0, 0, 0.19, 0.205, "#e7efcc");
    velvet(c, look, 0.01, 0.105, 0.15, "#bb7c28");
    oval(c, look, 0.01, 0.047, 0.115, "#0b1220");
    oval(c, look - 0.031, -0.055, 0.032, 0.044, "#ffffff");
    c.restore();
    c.strokeStyle = "#30412f";
    c.lineWidth = 0.045;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(side * 0.12, -0.4);
    c.quadraticCurveTo(side * 0.32, -0.56, side * 0.53, -0.38);
    c.stroke();
    oval(c, side * 0.49, 0.31, 0.13, 0.075, "#d2996830");
  }
  shaped(c, tint(skin, 1.06), () => {
    c.moveTo(-0.07, -0.08);
    c.quadraticCurveTo(0.1, 0.12, 0.2, 0.33);
    c.quadraticCurveTo(0.28, 0.55, 0.06, 0.56);
    c.quadraticCurveTo(-0.15, 0.55, -0.14, 0.37);
    c.quadraticCurveTo(0.02, 0.23, -0.07, -0.08);
  });
  oval(c, 0.102, 0.46, 0.043, 0.023, tint(skin, 0.3));
  velvet(c, -0.14, 0.28, 0.042, 0.045, tint(skin, 0.69));
  c.strokeStyle = "#405233";
  c.lineWidth = 0.025;
  c.beginPath();
  c.moveTo(-0.25, 0.6);
  c.quadraticCurveTo(0.07, 0.81, 0.37, 0.56);
  c.stroke();
  // A bent cone, broad brim, satin band, buckle and swinging moon charm.
  c.save();
  c.rotate(Math.sin(a * 2) * 0.035);
  shaped(c, "#382253", () => {
    c.moveTo(-0.77, -0.63);
    c.quadraticCurveTo(-0.45, -1.35, -0.18, -2.05);
    c.quadraticCurveTo(0.18, -2.12, 0.6, -1.75);
    c.quadraticCurveTo(0.2, -1.83, 0.19, -1.54);
    c.quadraticCurveTo(0.36, -0.98, 0.71, -0.61);
  });
  shaped(c, "#915ba7", () => {
    c.moveTo(-0.65, -0.92);
    c.quadraticCurveTo(0, -0.76, 0.56, -0.9);
    c.lineTo(0.7, -0.63);
    c.quadraticCurveTo(0, -0.46, -0.77, -0.63);
  });
  velvet(c, 0, -0.6, 1.08, 0.16, "#372044");
  c.save();
  c.rotate(-0.08);
  c.strokeStyle = "#eac77a";
  c.lineWidth = 0.05;
  c.strokeRect(-0.16, -0.91, 0.32, 0.26);
  line(
    c,
    [
      [0, -0.9],
      [0, -0.64],
    ],
    "#eac77a",
    0.025,
  );
  c.restore();
  const charmX = 0.87 + Math.sin(a * 2) * 0.055;
  line(
    c,
    [
      [0.85, -0.6],
      [charmX, -0.24],
    ],
    "#d2ac62",
    0.013,
  );
  c.fillStyle = "#f0d78b";
  c.beginPath();
  c.arc(charmX, -0.15, 0.105, 0.45, TAU - 0.45);
  c.quadraticCurveTo(charmX - 0.03, -0.15, charmX + 0.095, -0.105);
  c.fill();
  c.restore();
  c.restore();
  for (let i = 0; i < 5; i++) {
    const phase = mod(t / 18 + random(i, seed), 1),
      x = 0.9 + Math.sin(phase * TAU + i) * 0.15,
      y = 0.7 - phase * 1.7;
    c.save();
    c.globalAlpha = Math.sin(phase * Math.PI) ** 2 * 0.65;
    star(c, x, y, 0.025, "#c4ed9a", a + i);
    c.restore();
  }
}

export function drawHalloweenPeek(
  c: CanvasRenderingContext2D,
  character: HalloweenPeek,
  color: string,
  t: number,
  seed: number,
) {
  if (character === "skeleton") drawSkeleton(c, color, t, seed);
  else drawWitch(c, color, t, seed);
}
export function halloweenGrip(
  c: CanvasRenderingContext2D,
  character: HalloweenPeek,
  color: string,
) {
  if (character === "skeleton") {
    velvet(c, -0.05, -0.02, 0.15, 0.13, color);
    for (let i = 0; i < 4; i++)
      bone(
        c,
        [
          [-0.12 + i * 0.065, -0.05],
          [-0.11 + i * 0.065, 0.055],
          [-0.14 + i * 0.065, 0.17],
        ],
        color,
        0.042,
      );
  } else {
    velvet(c, -0.03, -0.02, 0.19, 0.13, color);
    for (let i = 0; i < 4; i++) {
      velvet(c, -0.13 + i * 0.075, 0.06, 0.042, 0.13, tint(color, 0.97));
      shaped(c, "#49304e", () => {
        const x = -0.13 + i * 0.075;
        c.moveTo(x - 0.037, 0.1);
        c.lineTo(x + 0.033, 0.1);
        c.quadraticCurveTo(x + 0.03, 0.22, x - 0.02, 0.24);
      });
    }
  }
}
