import {
  glow,
  line,
  mod,
  oval,
  random,
  smooth,
  TAU,
  type Painter,
} from "./common";
import { tint } from "./materials";
import { velvet, shaped } from "./characterArt";
import {
  drawHalloweenPeek,
  halloweenGrip,
  type HalloweenPeek,
} from "./halloweenPeeks";
import type { EffectId } from "../types";

type Animal = "fox" | "bunny" | "raccoon" | "dragon";
type Creature = Animal | HalloweenPeek;
function ear(
  c: CanvasRenderingContext2D,
  x: number,
  creature: Animal,
  coat: string,
  wiggle: number,
) {
  c.save();
  c.translate(x, -0.65);
  c.rotate(Math.sign(x) * (0.12 + wiggle));
  if (creature === "bunny") {
    velvet(c, 0, -0.62, 0.23, 0.87, coat);
    velvet(c, 0, -0.7, 0.12, 0.59, "#d88f9e");
    line(
      c,
      [
        [-0.04, -1.13],
        [-0.07, -0.52],
      ],
      "#f9d0d540",
      0.02,
    );
  } else if (creature === "fox") {
    shaped(c, coat, () => {
      c.moveTo(-0.32, 0.2);
      c.bezierCurveTo(-0.34, -0.2, -0.28, -0.67, -0.13, -0.9);
      c.bezierCurveTo(0.15, -0.7, 0.34, -0.25, 0.27, 0.22);
    });
    shaped(c, "#5c3436", () => {
      c.moveTo(-0.16, 0.03);
      c.quadraticCurveTo(-0.22, -0.5, -0.12, -0.65);
      c.quadraticCurveTo(0.14, -0.34, 0.17, 0.06);
    });
    line(
      c,
      [
        [-0.22, -0.3],
        [-0.16, -0.58],
      ],
      "#ffd39c80",
      0.025,
    );
  } else if (creature === "raccoon") {
    velvet(c, 0, -0.13, 0.34, 0.43, coat);
    velvet(c, 0, -0.15, 0.21, 0.29, "#3e414d");
  } else {
    shaped(c, "#ecd6a0", () => {
      c.moveTo(-0.2, 0.12);
      c.quadraticCurveTo(-0.32, -0.34, -0.03, -0.77);
      c.quadraticCurveTo(-0.12, -0.25, 0.22, 0.11);
    });
    for (let i = 0; i < 4; i++)
      line(
        c,
        [
          [-0.18, -0.08 - i * 0.1],
          [0.03 - i * 0.025, -0.1 - i * 0.1],
        ],
        "#9a785740",
        0.017,
      );
  }
  c.restore();
}
function eye(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  blink: number,
  look: number,
  iris: string,
  creature: Animal,
) {
  velvet(c, x, y, 0.25, 0.3, creature === "raccoon" ? "#1c2633" : "#765248");
  c.save();
  c.translate(x, y);
  c.scale(1, Math.max(0.035, blink));
  velvet(c, 0, 0, 0.222, 0.257, "#f8f0e2");
  const pupilX = look * 0.065;
  velvet(c, pupilX, 0.02, 0.16, 0.207, iris);
  oval(c, pupilX, 0.027, 0.092, 0.161, "#07121e");
  oval(c, pupilX - 0.055, -0.08, 0.052, 0.063, "#ffffff");
  oval(c, pupilX + 0.055, 0.105, 0.018, 0.026, "#b8e5ff");
  c.restore();
  if (blink < 0.2) {
    c.strokeStyle = "#352738";
    c.lineWidth = 0.027;
    c.beginPath();
    c.moveTo(x - 0.2, y);
    c.quadraticCurveTo(x, y + 0.08, x + 0.2, y);
    c.stroke();
  }
}
function drawAnimal(
  c: CanvasRenderingContext2D,
  creature: Animal,
  coat: string,
  t: number,
  seed: number,
) {
  const a = (t * TAU) / 18;
  const fur = creature !== "dragon";
  // Tail and softly lit body sit behind the oversized head.
  c.save();
  c.rotate(Math.sin(a) * 0.05);
  velvet(c, 0.05, 1.15, 0.63, 0.91, tint(coat, 0.86));
  velvet(
    c,
    0.18,
    1.18,
    0.39,
    0.68,
    creature === "fox" ? "#efdfbf" : tint(coat, 1.05, 35),
  );
  if (creature === "raccoon") {
    c.save();
    c.translate(0.48, 1.5);
    c.rotate(-0.6 + Math.sin(a * 2) * 0.1);
    velvet(c, 0.1, 0.12, 0.28, 0.84, coat);
    for (let i = 0; i < 4; i++)
      oval(c, 0.1, -0.4 + i * 0.29, 0.27, 0.09, "#374253");
    c.restore();
  }
  c.restore();
  c.save();
  c.rotate(Math.sin(a * 2 + 0.4) * 0.065);
  ear(c, -0.65, creature, coat, Math.sin(a * 3) * 0.035);
  ear(c, 0.65, creature, coat, Math.sin(a * 3 + 0.8) * 0.055);
  if (creature === "dragon")
    for (const side of [-1, 1]) {
      shaped(c, tint(coat, 0.8), () => {
        c.moveTo(side * 0.65, -0.52);
        c.lineTo(side * 1.28, -0.58);
        c.lineTo(side * 1.05, -0.24);
        c.lineTo(side * 1.38, 0.03);
        c.lineTo(side * 1.04, 0.19);
        c.lineTo(side * 1.19, 0.55);
        c.lineTo(side * 0.65, 0.48);
      });
    }
  velvet(c, 0, 0.02, 1, 0.91, coat);
  // Short individual fur strokes catch the rim light without a flat outline.
  if (fur)
    for (let i = 0; i < 150; i++) {
      const angle = random(i, seed) * TAU,
        radius = 0.76 + random(i + 200, seed) * 0.22;
      const x = Math.cos(angle) * radius,
        y = Math.sin(angle) * radius * 0.89;
      c.strokeStyle = i % 3 ? "#fff4e51c" : "#1c142817";
      c.lineWidth = 0.009;
      c.beginPath();
      c.moveTo(x * 0.94, y * 0.94);
      c.lineTo(x, y);
      c.stroke();
    }
  if (creature === "fox") {
    for (const side of [-1, 1]) {
      shaped(c, "#f3e4c8", () => {
        c.moveTo(side * 0.03, 0.36);
        c.quadraticCurveTo(side * 0.45, 0.2, side * 0.93, 0.12);
        c.quadraticCurveTo(side * 0.86, 0.79, side * 0.19, 0.8);
      });
    }
    velvet(c, 0, 0.53, 0.4, 0.31, "#faecd2");
  } else if (creature === "raccoon") {
    for (const side of [-1, 1]) {
      c.save();
      c.translate(side * 0.42, 0.03);
      c.rotate(side * 0.18);
      velvet(c, 0, 0, 0.46, 0.37, "#2d3444");
      c.restore();
    }
    velvet(c, 0, 0.44, 0.39, 0.32, "#e2e0d6");
    shaped(c, tint(coat, 1.12, 15), () => {
      c.moveTo(-0.16, -0.65);
      c.lineTo(0.16, -0.65);
      c.lineTo(0.09, 0.18);
      c.lineTo(-0.09, 0.18);
    });
  } else if (creature === "bunny") {
    velvet(c, -0.2, 0.43, 0.32, 0.3, "#f9e9e5");
    velvet(c, 0.2, 0.43, 0.32, 0.3, "#f9e9e5");
  } else {
    velvet(c, 0, 0.44, 0.62, 0.39, tint(coat, 1.08, 24));
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 5 - row; col++) {
        const x = (col - (4 - row) / 2) * 0.18,
          y = -0.7 + row * 0.15;
        c.strokeStyle = "#e9faff3a";
        c.lineWidth = 0.012;
        c.beginPath();
        c.arc(x, y, 0.085, 0.1, Math.PI - 0.1);
        c.stroke();
      }
    for (const side of [-1, 1])
      oval(c, side * 0.22, 0.39, 0.04, 0.025, tint(coat, 0.35), side * 0.25);
  }
  const blinkAt = (center: number) =>
    Math.exp(-(((mod(t - center + 9, 18) - 9) / 0.11) ** 2));
  const blink = 1 - Math.max(blinkAt(6.2), blinkAt(11.1));
  const look = Math.sin(a * 2) * 0.75 + Math.sin(a * 3) * 0.25;
  const iris =
    creature === "fox"
      ? "#9e7231"
      : creature === "bunny"
        ? "#5b657f"
        : creature === "raccoon"
          ? "#658a94"
          : "#558c9d";
  eye(c, -0.4, -0.04, blink, look, iris, creature);
  eye(c, 0.4, -0.04, blink, look, iris, creature);
  // Brows, pink cheeks, a small wet nose and a restrained smile.
  for (const side of [-1, 1]) {
    c.strokeStyle = tint(coat, 0.48);
    c.lineWidth = 0.038;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(side * 0.63, -0.39);
    c.quadraticCurveTo(
      side * 0.42,
      -0.48 - Math.sin(a) * 0.025,
      side * 0.24,
      -0.4,
    );
    c.stroke();
    oval(c, side * 0.68, 0.36, 0.14, 0.07, "#ed9b9b35");
  }
  if (creature !== "dragon") {
    velvet(
      c,
      0,
      0.42 + Math.sin(a * 8) * (creature === "bunny" ? 0.008 : 0),
      0.12,
      0.082,
      creature === "bunny" ? "#ca8791" : "#252733",
    );
    oval(c, -0.025, 0.393, 0.03, 0.013, "#ffffff8a");
  }
  c.strokeStyle = creature === "dragon" ? tint(coat, 0.4) : "#5b4344";
  c.lineWidth = 0.022;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(0, 0.49);
  c.lineTo(0, 0.59);
  c.quadraticCurveTo(0.14, 0.72, 0.27, 0.58);
  c.moveTo(0, 0.59);
  c.quadraticCurveTo(-0.1, 0.68, -0.2, 0.59);
  c.stroke();
  if (creature === "bunny" || creature === "raccoon")
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        c.strokeStyle = "#e6e7ed75";
        c.lineWidth = 0.009;
        c.beginPath();
        c.moveTo(side * 0.29, 0.48 + i * 0.08);
        c.quadraticCurveTo(
          side * 0.72,
          0.38 + i * 0.15,
          side * 1.08,
          0.32 + i * 0.18,
        );
        c.stroke();
      }
  c.restore();
}
const creaturePainter =
  (creature: Creature): Painter =>
  (ctx, t, w, h, color, seed, size = 1) => {
    t = mod(t, 18);
    const phase = mod(t, 18) / 18;
    const peek =
      smooth((phase - 0.1) / 0.16) * (1 - smooth((phase - 0.74) / 0.16));
    const r =
      Math.min(
        w * 0.31,
        h * (creature === "bunny" || creature === "witch" ? 0.235 : 0.28),
      ) * Math.max(0.45, Math.min(1.55, size));
    const edge = w * 0.22,
      cy =
        h * (creature === "bunny" || creature === "witch" ? 0.59 : 0.5) +
        Math.sin((t * TAU) / 18) * h * 0.009;
    const cx = edge - r * 1.23 + r * 2.08 * peek;
    ctx.fillStyle = "#000000";
    ctx.fillRect(-w * 4, -h * 4, w * 9, h * 9);
    glow(ctx, edge + r * 0.6, cy, r * 1.5, color, 0.045 * peek);
    ctx.save();
    ctx.beginPath();
    ctx.rect(edge, 0, w, h);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.scale(r, r);
    if (creature === "skeleton" || creature === "witch")
      drawHalloweenPeek(ctx, creature, color, t, seed);
    else drawAnimal(ctx, creature, color, t, seed);
    ctx.restore();
    // A narrow bevel supplies an architectural corner; the rest stays projection black.
    const wall = ctx.createLinearGradient(edge - w * 0.13, 0, edge, 0);
    wall.addColorStop(0, "#000000");
    wall.addColorStop(0.86, "#121923");
    wall.addColorStop(1, "#3c4653");
    ctx.fillStyle = wall;
    ctx.fillRect(-w * 4, -h * 4, edge + w * 4, h * 9);
    ctx.fillStyle = "#9aa4b333";
    ctx.fillRect(edge - 1.3, 0, 1.3, h);
    if (peek > 0.02) {
      ctx.save();
      ctx.globalAlpha = smooth(peek / 0.45);
      for (const y of [cy + r * 0.92, cy + r * 1.45]) {
        ctx.save();
        ctx.translate(edge + r * 0.035, y);
        ctx.scale(r, r);
        if (creature === "skeleton" || creature === "witch")
          halloweenGrip(ctx, creature, color);
        else {
          velvet(ctx, 0, 0, 0.19, 0.145, tint(color, 1.05, 6));
          for (let i = 0; i < 3; i++)
            line(
              ctx,
              [
                [-0.08 + i * 0.065, 0.035],
                [-0.09 + i * 0.065, 0.09],
              ],
              tint(color, 0.5),
              0.013,
            );
        }
        ctx.restore();
      }
      ctx.restore();
    }
  };
export const creaturePainters: Partial<Record<EffectId, Painter>> = {
  "corner-fox": creaturePainter("fox"),
  "corner-bunny": creaturePainter("bunny"),
  "corner-raccoon": creaturePainter("raccoon"),
  "corner-dragon": creaturePainter("dragon"),
  "corner-skeleton": creaturePainter("skeleton"),
  "corner-witch": creaturePainter("witch"),
};
