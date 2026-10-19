import { glow, line, random, rgba, TAU, type Painter } from "./common";
import { dreamPhase, fractureLife } from "./dreamMotion";

type XY = [number, number];
type Fracture = "glass" | "stone" | "frost";
type Branch = { points: XY[]; delay: number; weight: number };

function fractures(kind: Fracture, seed: number): Branch[] {
  const branches: Branch[] = [],
    rays = kind === "stone" ? 7 : kind === "frost" ? 9 : 13;
  const origin: XY = [
    0.39 + random(2, seed) * 0.18,
    0.38 + random(3, seed) * 0.19,
  ];
  for (let ray = 0; ray < rays; ray++) {
    const angle = (ray / rays) * TAU + random(ray + 9, seed) * 0.24;
    const points: XY[] = [origin];
    for (let step = 1; step <= 14; step++) {
      const theta =
        angle +
        (random(ray * 31 + step, seed) - 0.5) *
          (kind === "stone" ? 1.05 : 0.55);
      const length = 0.035 + random(ray * 41 + step, seed + 3) * 0.031;
      const prev = points[points.length - 1];
      points.push([
        prev[0] + Math.cos(theta) * length,
        prev[1] + Math.sin(theta) * length,
      ]);
    }
    branches.push({ points, delay: 0, weight: kind === "stone" ? 2.6 : 1 });
    for (let twig = 2; twig < 12; twig += kind === "frost" ? 1 : 2) {
      const side = twig % 2 ? 1 : -1,
        start = points[twig],
        path: XY[] = [start];
      const theta =
        angle +
        side *
          (kind === "frost" ? 0.95 : 0.48 + random(twig + ray, seed) * 0.65);
      for (let j = 1; j < 5; j++) {
        const prev = path[path.length - 1],
          b = theta + (random(ray * 111 + twig * 8 + j, seed) - 0.5) * 0.4;
        path.push([
          prev[0] + Math.cos(b) * 0.027,
          prev[1] + Math.sin(b) * 0.027,
        ]);
      }
      branches.push({
        points: path,
        delay: twig / 17,
        weight: kind === "stone" ? 1.25 : 0.55,
      });
      if (kind === "frost")
        for (let feather = 1; feather < 4; feather++)
          for (const sign of [-1, 1]) {
            const b = theta + sign * 0.75,
              q = path[feather];
            branches.push({
              points: [
                q,
                [q[0] + Math.cos(b) * 0.018, q[1] + Math.sin(b) * 0.018],
              ],
              delay: twig / 17 + feather * 0.024,
              weight: 0.32,
            });
          }
    }
  }
  if (kind === "glass")
    for (let ring = 1; ring <= 3; ring++) {
      const r = 0.017 + ring * 0.036,
        points: XY[] = [];
      for (let i = 0; i <= rays; i++) {
        const a = ((i % rays) / rays) * TAU,
          rr = r * (0.88 + random((i % rays) + ring * 90, seed) * 0.22);
        points.push([
          origin[0] + Math.cos(a) * rr,
          origin[1] + Math.sin(a) * rr,
        ]);
      }
      branches.push({ points, delay: ring * 0.07, weight: 0.5 });
    }
  return branches;
}

// Keep just the most recent geometry for each style. Shader/card seeds may differ;
// a cache miss is harmless and memory stays bounded throughout long sessions.
const cache = new Map<Fracture, { seed: number; branches: Branch[] }>();
const cracks =
  (kind: Fracture): Painter =>
  (c, t, w, h, color, seed) => {
    const p = dreamPhase(t, 16),
      life = fractureLife(p),
      unit = Math.min(w, h);
    let geometry = cache.get(kind);
    if (!geometry || geometry.seed !== seed) {
      geometry = { seed, branches: fractures(kind, seed) };
      cache.set(kind, geometry);
    }
    if (life.opacity <= 0) return;
    c.save();
    c.globalAlpha = life.opacity;
    for (const branch of geometry.branches) {
      const progress = Math.max(
        0,
        Math.min(1, (life.reach - branch.delay) / (0.84 - branch.delay * 0.55)),
      );
      const count = progress * (branch.points.length - 1);
      if (count <= 0) continue;
      const full = Math.floor(count),
        points: XY[] = branch.points
          .slice(0, full + 1)
          .map(([x, y]) => [x * w, y * h]);
      if (full < branch.points.length - 1) {
        const a = branch.points[full],
          b = branch.points[full + 1],
          f = count - full;
        points.push([
          (a[0] + (b[0] - a[0]) * f) * w,
          (a[1] + (b[1] - a[1]) * f) * h,
        ]);
      }
      const width = Math.max(0.5, unit * 0.0022 * branch.weight);
      // Only the crack strokes carry alpha. No tinted pane or filled background.
      if (kind === "stone") {
        line(c, points, rgba("#05070c", 0.85), width * 2.25);
        line(
          c,
          points.map(([x, y]) => [x + width * 0.8, y - width * 0.6]),
          rgba(color, 0.85),
          width * 0.75,
        );
        line(c, points, rgba("#201b23", 0.98), width);
      } else {
        line(
          c,
          points,
          rgba(
            kind === "frost" ? color : "#19374e",
            kind === "frost" ? 0.18 : 0.42,
          ),
          width * 3.4,
        );
        line(c, points, rgba(color, 0.9), width);
        line(
          c,
          points.map(([x, y]) => [x + width * 0.7, y - width * 0.6]),
          rgba("#ffffff", 0.7),
          Math.max(0.35, width * 0.32),
        );
      }
      if (progress < 0.98 && branch.weight >= 1) {
        const tip = points[points.length - 1];
        glow(
          c,
          ...tip,
          unit * 0.012,
          color,
          0.4 * Math.sin(progress * Math.PI),
        );
      }
    }
    c.restore();
  };

export const crackPainters = {
  "cracks-glass": cracks("glass"),
  "cracks-stone": cracks("stone"),
  "cracks-frost": cracks("frost"),
};
