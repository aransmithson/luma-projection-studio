import type { Point } from "../types";
import { createTrainTrack } from "../trainTrack";
import { edgeTrackPoint, type EdgeTrack } from "../edgeTrack";
import {
  TAU,
  mod,
  random,
  rgba,
  line,
  oval,
  glow,
  hslHex,
  hue,
} from "./common";
import { panel, gradient, disk } from "./sceneArt";

const cache = new WeakMap<
  CanvasRenderingContext2D,
  {
    outline: Point[];
    w: number;
    h: number;
    scale: number;
    fit: boolean;
    track: EdgeTrack;
  }
>();
export const trainPreviewShape: Point[] = Array.from({ length: 64 }, (_, i) => {
  const corner = Math.floor(i / 16),
    a = -Math.PI / 2 + (corner * Math.PI) / 2 + (((i % 16) / 15) * Math.PI) / 2;
  const cx = [0.8, 0.8, 0.2, 0.2][corner],
    cy = [0.25, 0.75, 0.75, 0.25][corner];
  return { x: cx + Math.cos(a) * 0.1, y: cy + Math.sin(a) * 0.13 };
});
export function drawToyTrain(
  c: CanvasRenderingContext2D,
  outline: Point[],
  time: number,
  color: string,
  seed = 1,
  scale = 1,
  fit = true,
) {
  const w = c.canvas.width,
    h = c.canvas.height,
    u = Math.min(w, h),
    s = u * 0.004 * Math.min(1.7, Math.max(0.5, scale));
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";
  c.fillStyle = "#091b20";
  c.fillRect(0, 0, w, h);
  let entry = cache.get(c);
  if (
    !entry ||
    entry.outline !== outline ||
    entry.w !== w ||
    entry.h !== h ||
    entry.scale !== scale ||
    entry.fit !== fit
  ) {
    entry = {
      outline,
      w,
      h,
      scale,
      fit,
      track: createTrainTrack(
        outline,
        w,
        h,
        u * 0.065 * Math.min(1.5, Math.max(0.6, scale)),
        fit,
      ),
    };
    cache.set(c, entry);
  }
  const track = entry.track;
  if (track.length <= 0) return;
  const progress = mod(time, 20) / 20 + random(17, seed),
    points = track.points.map((p) => [p.x, p.y]);
  const pose = (p: number) => {
    const point = edgeTrackPoint(track, p),
      next = edgeTrackPoint(
        track,
        p + Math.max(0.0001, (s * 2) / track.length),
      );
    return { ...point, angle: Math.atan2(next.y - point.y, next.x - point.x) };
  };
  line(c, points, "#1b3033", s * 19, true);
  const ties = Math.min(260, Math.max(20, Math.floor(track.length / (s * 10))));
  for (let i = 0; i < ties; i++) {
    const p = pose(i / ties);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.angle);
    line(
      c,
      [
        [0, -s * 9],
        [0, s * 9],
      ],
      "#8d7458",
      s * 2.3,
    );
    c.restore();
  }
  line(c, points, "#a8b7b6", s * 12, true);
  line(c, points, "#20343a", s * 9.6, true);
  for (let i = 0; i < 18; i++) {
    const q = mod(progress * 2 + i / 18, 1),
      p = pose(progress - q * 0.09);
    oval(
      c,
      p.x + Math.sin(q * TAU + i) * s * 5,
      p.y - s * (6 + q * 18),
      s * (3 + q * 10),
      s * (3 + q * 7),
      rgba("#d3e4df", Math.sin(q * Math.PI) ** 2 * 0.16),
    );
  }
  for (let i = 4; i >= 0; i--) {
    const p = pose(progress - (i * s * 31) / track.length),
      col =
        i === 0
          ? color
          : hslHex(hue(color) + i * 43 + random(i, seed) * 20, 0.55, 0.52);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.angle);
    c.scale(s, s);
    line(
      c,
      [
        [-19, 0],
        [18, 0],
      ],
      "#b3a77e",
      2,
    );
    for (const x of [-8, 8])
      for (const y of [-9, 9]) {
        panel(c, x - 4, y - 1.5, 8, 3, "#0a0e17", 1);
        disk(c, x + Math.sin(progress * TAU * 16) * 2, y, 1, "#b5c9c8");
      }
    panel(
      c,
      -13,
      -8,
      26,
      16,
      gradient(c, 0, -8, 0, 8, ["#ffffffb0", col, "#243a47"]),
      3,
    );
    if (i === 0) {
      panel(c, -12, -9, 11, 18, col, 2);
      panel(c, -10, -6, 7, 12, "#19333c", 2);
      disk(c, 7, 0, 5, "#263039");
      disk(c, 7, 0, 3, "#e9c889");
      panel(c, 13, -5, 3, 10, "#c5a474", 1);
      glow(c, 19, 0, 15, "#ffe8a8", 0.6);
      oval(c, 15, 0, 2, 3, "#fff5d4");
    } else
      for (let j = 0; j < 3; j++) {
        panel(c, -10 + j * 8, -6, 6, 12, "#112b36", 1);
        line(
          c,
          [
            [-9 + j * 8, -4],
            [-5 + j * 8, -4],
          ],
          "#d6e8db",
          1,
        );
      }
    c.restore();
  }
  for (const position of [0.15, 0.65]) {
    const p = pose(position);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.angle);
    c.scale(s, s);
    panel(c, -24, -16, 48, 32, "#11181e", 12);
    panel(
      c,
      -20,
      -20,
      40,
      40,
      gradient(c, 0, -20, 0, 20, ["#7a8580", "#3d5354", "#24373e"]),
      12,
    );
    for (const x of [-20, 20]) {
      line(
        c,
        [
          [x, -12],
          [x, 12],
        ],
        "#c3c1a5",
        3,
      );
    }
    for (let j = 0; j < 4; j++)
      line(
        c,
        [
          [-15 + j * 9, -16],
          [-13 + j * 9, 16],
        ],
        "#1d303b70",
        1.5,
      );
    c.restore();
  }
}
