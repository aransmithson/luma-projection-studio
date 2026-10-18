import type { EffectId } from "../types";
import {
  background,
  glow,
  hslHex,
  hue,
  random,
  TAU,
  type Painter,
} from "./common";
import {
  box,
  depthPhase,
  face,
  paint,
  transform,
  type LitFace,
} from "./depthArt";
import { rotate3, type Vec3 } from "./spatial";

type Structure =
  "diamonds" | "cubes" | "tiles" | "triangles" | "rings" | "maze";
const structure =
  (kind: Structure): Painter =>
  (c, t, w, h, color, seed) => {
    const a = depthPhase(t) * TAU,
      phase = random(1, seed) * TAU,
      aspect = w / h,
      faces: LitFace[] = [];
    background(c, w, h, "#020509", "#132132");
    glow(c, w * 0.5, h * 0.5, h * 0.8, color, 0.15);
    const world = (v: Vec3) => rotate3(v, -0.07, 0.12);
    const pale = { color, finish: "enamel" as const },
      dark = {
        color: hslHex(hue(color), 0.25, 0.24),
        finish: "stone" as const,
      };
    if (kind === "rings") {
      for (let ring = 0; ring < 8; ring++) {
        const inner = 0.14 + ring * 0.15,
          outer = inner + 0.125;
        const z = -0.4 + Math.sin(ring * 0.65 - a * 2 + phase) * 0.24;
        const spin = (ring % 2 ? 1 : -1) * a * 0.2;
        // A fivefold segmented band repeats after 24s despite its slow rotation.
        const move = transform([0, 0, z], [0, 0, spin], world);
        for (let section = 0; section < 5; section++)
          for (let j = 0; j < 9; j++) {
            const theta = (section * TAU) / 5 + (j * TAU) / 50;
            const theta1 = theta + TAU / 50;
            const points: Vec3[] = [
              [Math.cos(theta) * inner, Math.sin(theta) * inner, 0.08],
              [Math.cos(theta) * outer, Math.sin(theta) * outer, 0.08],
              [Math.cos(theta1) * outer, Math.sin(theta1) * outer, 0.08],
              [Math.cos(theta1) * inner, Math.sin(theta1) * inner, 0.08],
            ];
            face(faces, points, pale, move, true);
            for (const edge of [0, 1, 2, 3]) {
              if ((edge === 0 && j > 0) || (edge === 2 && j < 8)) continue;
              const next = (edge + 1) % 4,
                p = points[edge],
                q = points[next];
              face(
                faces,
                [p, q, [q[0], q[1], -0.3], [p[0], p[1], -0.3]],
                dark,
                move,
                true,
              );
            }
          }
      }
    } else {
      const cell = kind === "diamonds" ? 0.54 : kind === "maze" ? 0.37 : 0.28;
      const cols = Math.ceil((aspect * 2.6) / cell) + 2,
        rows = Math.ceil(2.5 / cell) + 1;
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
          const x = (col - (cols - 1) / 2) * cell,
            y = (row - (rows - 1) / 2) * cell;
          const wave = Math.sin(x * 3 - y * 4 - a * 2 + phase);
          const z = -0.35 + wave * 0.25;
          if (kind === "cubes") {
            box(
              faces,
              [cell * 0.46, cell * 0.46, 0.16 + wave * 0.07],
              pale,
              transform([x, y, z], [0, 0, 0], world),
              0.016,
            );
          } else if (kind === "tiles") {
            const tilt = Math.sin(a + row * 0.5 + col * 0.22 + phase) * 2.7;
            box(
              faces,
              [cell * 0.46, cell * 0.46, 0.025],
              pale,
              transform([x, y, -0.3], [tilt, 0.05 * Math.sin(a), 0], world),
              0.012,
            );
          } else if (kind === "diamonds") {
            const move = transform(
              [x + (row % 2) * cell * 0.5, y, z],
              [0, 0, Math.PI / 4],
              world,
            );
            const s = cell * 0.31,
              b = cell * 0.055;
            box(
              faces,
              [s, b, 0.15],
              pale,
              transform([0, -s, 0], [0, 0, 0], move),
              0.012,
            );
            box(
              faces,
              [s, b, 0.15],
              pale,
              transform([0, s, 0], [0, 0, 0], move),
              0.012,
            );
            box(
              faces,
              [b, s, 0.15],
              pale,
              transform([-s, 0, 0], [0, 0, 0], move),
              0.012,
            );
            box(
              faces,
              [b, s, 0.15],
              pale,
              transform([s, 0, 0], [0, 0, 0], move),
              0.012,
            );
          } else if (kind === "triangles") {
            const move = transform([x, y, -0.3], [0, 0, 0], world),
              s = cell * 0.49;
            const vertices: Vec3[] = [
              [-s, -s, 0],
              [s, -s, 0],
              [s, s, 0],
              [-s, s, 0],
            ];
            const tip: Vec3 = [
              Math.sin(a + row) * s * 0.12,
              Math.cos(a + col) * s * 0.12,
              0.05 + (wave + 1) * 0.2,
            ];
            for (let edge = 0; edge < 4; edge++)
              face(
                faces,
                [vertices[edge], vertices[(edge + 1) % 4], tip],
                pale,
                move,
                true,
              );
          } else {
            const slide =
              Math.sin(a * 2 + row * 0.6 + phase) *
              cell *
              0.3 *
              (row % 2 ? 1 : -1);
            const vertical = (row + col) % 2 === 0;
            box(
              faces,
              vertical
                ? [cell * 0.13, cell * 0.45, 0.13]
                : [cell * 0.45, cell * 0.13, 0.13],
              pale,
              transform(
                [x + (vertical ? 0 : slide), y + (vertical ? slide : 0), z],
                [0, 0, 0],
                world,
              ),
              0.018,
            );
          }
        }
    }
    paint(c, faces, w, h);
  };

export const stageStructurePainters: Partial<Record<EffectId, Painter>> = {
  "diamond-recess": structure("diamonds"),
  "cubic-tide": structure("cubes"),
  "rotating-tile-wall": structure("tiles"),
  "prism-skin": structure("triangles"),
  "relief-rings": structure("rings"),
  "sliding-relief": structure("maze"),
};
