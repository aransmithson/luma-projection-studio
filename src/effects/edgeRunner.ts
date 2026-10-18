import { bounds } from "../geometry";
import {
  createEdgeTrack,
  edgeTrackPoint,
  edgeTrackSection,
  type EdgeTrack,
} from "../edgeTrack";
import type { Point } from "../types";
import { glow, line, mod, oval, random, rgba } from "./common";

const tracks = new WeakMap<
  CanvasRenderingContext2D,
  {
    points: Point[];
    width: number;
    height: number;
    fit: boolean;
    track: EdgeTrack;
  }
>();
export const edgePreviewShape: Point[] = [
  { x: 0.15, y: 0.13 },
  { x: 0.73, y: 0.13 },
  { x: 0.9, y: 0.5 },
  { x: 0.73, y: 0.87 },
  { x: 0.15, y: 0.87 },
  { x: 0.28, y: 0.5 },
];

export function drawEdgeRunner(
  ctx: CanvasRenderingContext2D,
  outline: Point[],
  time: number,
  color: string,
  seed = 1,
  scale = 1,
  fit = true,
) {
  const w = ctx.canvas.width,
    h = ctx.canvas.height,
    u = Math.min(w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000000";
  ctx.fillRect(-w * 4, -h * 4, w * 9, h * 9);
  let entry = tracks.get(ctx);
  if (
    !entry ||
    entry.points !== outline ||
    entry.width !== w ||
    entry.height !== h ||
    entry.fit !== fit
  ) {
    const b = fit ? bounds(outline) : { x: 0, y: 0, width: 1, height: 1 };
    const points = outline.map((p) => ({
      x: (p.x - b.x) / Math.max(b.width, 1e-8),
      y: (p.y - b.y) / Math.max(b.height, 1e-8),
    }));
    entry = {
      points: outline,
      width: w,
      height: h,
      fit,
      track: createEdgeTrack(points, w, h),
    };
    tracks.set(ctx, entry);
  }
  const { track } = entry;
  if (track.length <= 0) return;
  const progress = mod(time / 6 + random(5, seed), 1),
    width = Math.max(1, u * 0.013 * scale),
    trail = 0.23;
  line(
    ctx,
    track.points.map((p) => [p.x, p.y]),
    rgba(color, 0.085),
    Math.max(0.5, width * 0.35),
    true,
  );
  const samples = 56;
  for (const [thickness, strength] of [
    [5.5, 0.065],
    [2.6, 0.16],
    [1, 0.85],
  ]) {
    for (let i = 0; i < samples; i++) {
      const a = progress - trail + (i / samples) * trail,
        b = progress - trail + ((i + 1) / samples) * trail;
      const section = edgeTrackSection(track, a, b).map((p) => [p.x, p.y]);
      line(
        ctx,
        section,
        rgba(color, ((i + 1) / samples) ** 2 * strength),
        width * thickness,
      );
    }
  }
  const head = edgeTrackPoint(track, progress);
  glow(ctx, head.x, head.y, width * 6, color, 0.9);
  oval(ctx, head.x, head.y, width * 0.8, width * 0.8, "#ffffff");
}
