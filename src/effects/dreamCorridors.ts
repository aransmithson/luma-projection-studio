import {
  background,
  glow,
  hslHex,
  hue,
  line,
  mod,
  oval,
  random,
  rgba,
  smooth,
  TAU,
  type Painter,
} from "./common";
import { dreamPhase } from "./dreamMotion";

type Corridor = "cathedral" | "transit" | "garden" | "prism";
type XY = [number, number];
function outline(kind: Corridor): XY[] {
  if (kind === "transit")
    return [
      [-0.6, -1],
      [0.6, -1],
      [1, -0.6],
      [1, 0.6],
      [0.6, 1],
      [-0.6, 1],
      [-1, 0.6],
      [-1, -0.6],
    ];
  if (kind === "prism")
    return [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
  const points: XY[] = [
    [-1, 1],
    [-1, -0.15],
  ];
  // Two smoothly joined pointed vault curves; the garden has a rounder crown.
  for (let j = 0; j <= 32; j++) {
    const x = -1 + j / 16;
    const y =
      kind === "cathedral"
        ? -0.15 - 1.16 * Math.pow(1 - Math.abs(x), 0.62)
        : -0.15 - Math.sqrt(Math.max(0, 1 - x * x));
    points.push([x, y]);
  }
  points.push([1, 1]);
  return points;
}
function path(
  c: CanvasRenderingContext2D,
  points: XY[],
  x: number,
  y: number,
  sx: number,
  sy: number,
) {
  c.beginPath();
  points.forEach(([px, py], i) =>
    i ? c.lineTo(x + px * sx, y + py * sy) : c.moveTo(x + px * sx, y + py * sy),
  );
  c.closePath();
}

const corridor =
  (kind: Corridor): Painter =>
  (c, t, w, h, color, seed) => {
    const p = dreamPhase(t),
      a = p * TAU,
      tone = hue(color);
    const vp: XY = [
      w * (0.5 + 0.022 * Math.sin(a)),
      h * (0.48 + 0.018 * Math.cos(a)),
    ];
    const poly = outline(kind),
      garden = kind === "garden",
      neon = kind === "transit",
      prism = kind === "prism";
    background(
      c,
      w,
      h,
      garden ? "#071e1b" : neon ? "#040c1e" : prism ? "#0c0822" : "#171522",
      "#03060e",
    );
    glow(c, ...vp, h * 0.6, color, 0.38);

    // Perspective wall panels and floor converging on the same moving vanishing point.
    for (let side = 0; side < 4; side++) {
      const corners: XY[][] = [
        [
          [0, 0],
          [w, 0],
        ],
        [
          [w, 0],
          [w, h],
        ],
        [
          [w, h],
          [0, h],
        ],
        [
          [0, h],
          [0, 0],
        ],
      ];
      const [b, d] = corners[side];
      c.beginPath();
      c.moveTo(...vp);
      c.lineTo(...b);
      c.lineTo(...d);
      c.closePath();
      const g = c.createLinearGradient(
        ...vp,
        (b[0] + d[0]) / 2,
        (b[1] + d[1]) / 2,
      );
      g.addColorStop(0, "#060b16");
      g.addColorStop(
        1,
        hslHex(
          tone + side * (prism ? 43 : 3),
          garden ? 0.27 : 0.2,
          side === 2 ? 0.13 : 0.2,
        ),
      );
      c.fillStyle = g;
      c.fill();
    }
    for (let k = -6; k <= 6; k++) {
      const x = vp[0] + k * w * 0.22;
      line(c, [vp, [x, h * 1.5]], rgba(color, 0.15), Math.max(0.5, h * 0.0014));
    }
    const rings = Array.from({ length: 14 }, (_, i) =>
      mod(i - p * 14, 14),
    ).sort((a, b) => b - a);
    for (const z of rings) {
      const s = 1 / (0.32 + z * 0.62),
        sx = w * 0.67 * s,
        sy = h * 0.69 * s;
      const alpha = smooth((14 - z) / 2) * smooth((z + 0.01) / 0.42);
      if (alpha < 0.001) continue;
      c.save();
      c.globalAlpha = alpha;
      c.translate(...vp);
      if (prism) c.rotate(Math.sin(z * 0.22 + a) * 0.12);
      const bright = 0.19 + 0.35 * Math.exp(-z * 0.12);
      // Wall thickness: a recessed dark opening, raised front edge, thin highlight.
      path(c, poly, 0, 0, sx, sy);
      c.lineJoin = "round";
      c.strokeStyle = "#020612";
      c.lineWidth = Math.max(1, sy * 0.14);
      c.stroke();
      const bevel = c.createLinearGradient(-sx, -sy, sx, sy);
      bevel.addColorStop(
        0,
        hslHex(tone + (prism ? z * 18 : 0), neon ? 0.16 : 0.23, bright + 0.16),
      );
      bevel.addColorStop(0.35, hslHex(tone, neon ? 0.2 : 0.25, bright));
      bevel.addColorStop(0.68, "#101725");
      bevel.addColorStop(
        1,
        hslHex(tone + (prism ? 65 : 0), 0.25, bright + 0.05),
      );
      c.strokeStyle = bevel;
      c.lineWidth = Math.max(1, sy * 0.095);
      c.stroke();
      c.strokeStyle = rgba(
        prism ? hslHex(tone + z * 19 + a * 30, 0.7, 0.7) : color,
        0.65,
      );
      c.lineWidth = Math.max(0.5, sy * 0.008);
      c.stroke();
      if (neon || prism) {
        path(c, poly, 0, 0, sx * 0.96, sy * 0.96);
        c.strokeStyle = neon ? "#83efff" : hslHex(tone + z * 24, 0.8, 0.7);
        c.lineWidth = Math.max(0.5, sy * 0.014);
        c.stroke();
        for (const side of [-1, 1]) {
          line(
            c,
            [
              [side * sx * 1.04, -sy * 0.32],
              [side * sx * 1.04, sy * 0.3],
            ],
            "#ee6dc5",
            Math.max(1, sy * 0.025),
          );
          for (let j = 0; j < 4; j++)
            line(
              c,
              [
                [side * sx * 0.86, sy * (0.5 + j * 0.07)],
                [side * sx * 0.94, sy * (0.5 + j * 0.07)],
              ],
              rgba(color, 0.5),
              Math.max(0.5, sy * 0.009),
            );
        }
      } else {
        // Voussoir joints, column flutes and capitals remain fixed to each arch.
        for (let j = 3; j < poly.length - 2; j += 3) {
          const [x, y] = poly[j];
          line(
            c,
            [
              [x * sx * 0.95, y * sy * 0.95],
              [x * sx * 1.05, y * sy * 1.05],
            ],
            rgba("#11131c", 0.8),
            Math.max(0.5, sy * 0.009),
          );
        }
        for (const side of [-1, 1]) {
          for (let j = -1; j <= 1; j++)
            line(
              c,
              [
                [side * sx + j * sy * 0.018, -sy * 0.12],
                [side * sx + j * sy * 0.018, sy * 0.93],
              ],
              rgba("#faf0cf", 0.24),
              Math.max(0.5, sy * 0.006),
            );
          line(
            c,
            [
              [side * sx - sy * 0.08, -sy * 0.12],
              [side * sx + sy * 0.08, -sy * 0.12],
            ],
            color,
            Math.max(1, sy * 0.04),
          );
          line(
            c,
            [
              [side * sx - sy * 0.08, sy * 0.94],
              [side * sx + sy * 0.08, sy * 0.94],
            ],
            color,
            Math.max(1, sy * 0.05),
          );
          const lx = side * sx * 0.86,
            ly = sy * 0.24;
          glow(c, lx, ly, sy * 0.22, garden ? "#c8ff9a" : "#ffd38c", 0.38);
          c.fillStyle = "#382f29";
          c.fillRect(lx - sy * 0.027, ly - sy * 0.075, sy * 0.054, sy * 0.15);
          oval(
            c,
            lx,
            ly,
            sy * 0.012,
            sy * 0.045,
            garden ? "#d6ffb7" : "#ffe4ad",
          );
          if (garden) {
            c.beginPath();
            c.moveTo(side * sx, -sy * 0.6);
            c.bezierCurveTo(
              side * sx * 0.65,
              -sy * 0.2,
              side * sx * 1.16,
              sy * 0.05,
              side * sx * 0.94,
              sy * 0.88,
            );
            c.strokeStyle = "#497b53";
            c.lineWidth = Math.max(0.6, sy * 0.017);
            c.stroke();
            for (let k = 0; k < 9; k++) {
              const ly = sy * (-0.53 + k * 0.15),
                lx = side * sx * (0.97 + 0.07 * Math.sin(k * 0.8));
              oval(
                c,
                lx,
                ly,
                sy * 0.07,
                sy * 0.025,
                hslHex(tone - 30 + random(k, seed) * 22, 0.38, 0.34),
                side * (k % 2 ? 0.6 : -0.6),
              );
              line(
                c,
                [
                  [lx - sy * 0.05, ly],
                  [lx + sy * 0.05, ly],
                ],
                "#a3b96b",
                Math.max(0.5, sy * 0.003),
              );
            }
          }
        }
      }
      // A lit floor band and its dim echo provide a strong forward-motion cue.
      line(
        c,
        [
          [-sx * 0.91, sy * 0.99],
          [sx * 0.91, sy * 0.99],
        ],
        rgba(neon ? "#62d8ff" : color, 0.48),
        Math.max(0.6, sy * 0.018),
      );
      line(
        c,
        [
          [-sx * 0.88, sy * 1.06],
          [sx * 0.88, sy * 1.06],
        ],
        rgba(color, 0.14),
        Math.max(0.6, sy * 0.04),
      );
      c.restore();
    }
    glow(
      c,
      ...vp,
      h * 0.11,
      garden ? "#c9ffc4" : neon ? "#97eaff" : "#ffe4c9",
      0.75,
    );
    // Sparse particles, with no random state accumulated between frames.
    for (let i = 0; i < 22; i++) {
      const b = random(i, seed) * TAU + a,
        d = 0.08 + random(i + 30, seed) * 0.5;
      const x = vp[0] + Math.cos(b) * w * d,
        y = vp[1] + Math.sin(random(i + 8, seed) * TAU + a) * h * d;
      glow(
        c,
        x,
        y,
        h * (garden ? 0.009 : 0.004),
        garden ? "#d8ff91" : color,
        (0.25 + 0.25 * Math.sin(a + i)) * 0.6,
      );
    }
    const vignette = c.createRadialGradient(
      ...vp,
      h * 0.16,
      ...vp,
      Math.max(w, h) * 0.8,
    );
    vignette.addColorStop(0, "#00000000");
    vignette.addColorStop(1, "#000000a8");
    c.fillStyle = vignette;
    c.fillRect(0, 0, w, h);
  };

export const corridorPainters = {
  "endless-cathedral": corridor("cathedral"),
  "neon-transit": corridor("transit"),
  "overgrown-arcade": corridor("garden"),
  "prismatic-hall": corridor("prism"),
};
