import { bounds, inverseQuadMap } from "../geometry";
import { cubicPoint, hasCurves, surfaceOutline } from "../curves";
import { stackFlow } from "../stackFlow";
import type {
  AnimationStack,
  LiquidStyle,
  Point,
  Project,
  Surface,
} from "../types";
import { background, glow, line, mod, oval, random, rgba, TAU } from "./common";

export function drawLiquid(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  color: string,
  seed: number,
  level = 0.6,
  incoming = 0,
  outgoing = 0,
  style: LiquidStyle = "water",
) {
  const u = Math.min(w, h),
    bottom = h * 0.96,
    top = bottom - Math.max(0, level) * h * 0.88;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  const hot = style === "lava",
    magic = style === "potion",
    frozen = style === "ice";
  const highlight = hot ? "#ffdf98" : magic ? "#dcffb5" : "#d4fbff";
  background(
    ctx,
    w,
    h,
    hot ? "#1c0805" : magic ? "#130b24" : "#091a27",
    hot ? "#34100a" : magic ? "#211032" : "#102a39",
  );
  const glass = ctx.createLinearGradient(0, 0, w, 0);
  glass.addColorStop(0, "#c2edff20");
  glass.addColorStop(0.1, "#c2edff00");
  glass.addColorStop(0.9, "#c2edff00");
  glass.addColorStop(1, "#c2edff20");
  ctx.fillStyle = glass;
  ctx.fillRect(0, 0, w, h);
  if (level > 0.0001) {
    const points: number[][] = [];
    for (let i = 0; i <= 64; i++) {
      const x = (i / 64) * w,
        wave =
          (Math.sin((i / 64) * 9 + t * 2.2) +
            0.45 * Math.sin((i / 64) * 19 - t * 1.3)) *
          h *
          0.012 *
          Math.min(1, level * 10);
      points.push([x, top + wave]);
    }
    const liquid = ctx.createLinearGradient(0, top, 0, bottom);
    liquid.addColorStop(0, rgba(color, 0.95));
    liquid.addColorStop(0.18, rgba(color, 0.65));
    liquid.addColorStop(
      1,
      hot ? "#9c1607" : magic ? "#244b37" : frozen ? "#27678c" : "#104b70",
    );
    ctx.fillStyle = liquid;
    ctx.beginPath();
    ctx.moveTo(...(points[0] as [number, number]));
    points.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(w, bottom);
    ctx.lineTo(0, bottom);
    ctx.closePath();
    ctx.fill();
    if (style !== "water") {
      ctx.save();
      ctx.clip();
      if (hot) {
        // Dark floating crust breaks up the bright molten body. Gaps form
        // moving, glowing fissures rather than a flat orange colour wash.
        for (let i = 0; i < 34; i++) {
          const x =
            mod(random(i + 80, seed) + Math.sin(t * 0.24 + i) * 0.055, 1) * w;
          const y = bottom - mod(random(i + 130, seed) + t * 0.018, 1) * h;
          const r = u * (0.04 + random(i + 160, seed) * 0.065);
          glow(ctx, x, y, r * 1.45, "#ffad39", 0.35);
          ctx.beginPath();
          for (let j = 0; j < 7; j++) {
            const angle = (j / 7) * TAU + i,
              radius = r * (0.7 + random(i * 7 + j, seed) * 0.3);
            const px = x + Math.cos(angle) * radius,
              py = y + Math.sin(angle) * radius * 0.65;
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = "#3b170f";
          ctx.fill();
          ctx.strokeStyle = "#ffbf6a80";
          ctx.lineWidth = Math.max(1, u * 0.004);
          ctx.stroke();
        }
      } else if (magic) {
        for (let i = 0; i < 7; i++) {
          const ribbon = Array.from({ length: 65 }, (_, j) => {
            const x = (j / 64) * w;
            return [
              x,
              bottom -
                mod(i / 7 + t * 0.025, 1) * h +
                Math.sin((j / 64) * TAU * 1.5 + t * 1.2 + i) * h * 0.065,
            ];
          });
          line(
            ctx,
            ribbon,
            rgba(i % 2 ? "#e0b4ff" : highlight, 0.23),
            Math.max(2, u * 0.016),
          );
        }
        for (let i = 0; i < 15; i++) {
          const y =
            bottom -
            mod(
              random(i + 90, seed) + t * (0.04 + random(i, seed) * 0.025),
              1,
            ) *
              h;
          const x =
            w *
            (random(i + 120, seed) * 0.9 +
              0.05 +
              Math.sin(t * 1.3 + i) * 0.025);
          const r = u * (0.012 + random(i + 50, seed) * 0.025);
          glow(ctx, x, y, r * 2.5, color, 0.22);
          oval(ctx, x, y, r, r, "#dcffb51a");
          ctx.strokeStyle = "#e6ffc380";
          ctx.lineWidth = Math.max(1, u * 0.003);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.stroke();
          oval(ctx, x - r * 0.3, y - r * 0.35, r * 0.22, r * 0.16, "#ffffffb0");
        }
      } else {
        for (let i = 0; i < 16; i++) {
          const x =
            mod(random(i + 40, seed) + Math.sin(t * 0.3 + i) * 0.04, 1) * w;
          const y = bottom - mod(random(i + 80, seed) + t * 0.022, 1) * h;
          const r = u * (0.025 + random(i, seed) * 0.04),
            a = t * 0.16 + i;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(a);
          const facets = [
            [0, -r],
            [r * 0.7, 0],
            [0, r],
            [-r * 0.7, 0],
            [0, -r],
          ];
          ctx.beginPath();
          facets.forEach(([px, py], j) =>
            j ? ctx.lineTo(px, py) : ctx.moveTo(px, py),
          );
          ctx.fillStyle = "#c7f0ff4d";
          ctx.fill();
          line(ctx, facets, "#edffffaa", Math.max(1, u * 0.003));
          line(
            ctx,
            [
              [0, -r],
              [0, r],
            ],
            "#ffffff80",
            Math.max(1, u * 0.002),
          );
          line(
            ctx,
            [
              [-r * 0.7, 0],
              [r * 0.7, 0],
            ],
            "#ffffff60",
            Math.max(1, u * 0.002),
          );
          ctx.restore();
          const sparkle = Math.max(0, Math.sin(t * 1.5 + i * 2)) ** 8;
          glow(ctx, x, y, r * 1.5, "#ffffff", sparkle * 0.45);
        }
      }
      ctx.restore();
    }
    line(ctx, points, rgba(highlight, 0.8), Math.max(1, h * 0.008));
    for (let i = 0; i < 18; i++) {
      const y = bottom - mod(random(i, seed) + t * 0.1, 1) * (bottom - top),
        x = random(i + 30, seed) * w;
      ctx.strokeStyle = rgba(hot || magic ? highlight : "#d3fbff", 0.18);
      ctx.lineWidth = Math.max(0.5, u * 0.002);
      ctx.beginPath();
      ctx.arc(x, y, u * (0.004 + random(i + 60, seed) * 0.01), 0, TAU);
      ctx.stroke();
    }
  }
  if (incoming > 0.02) {
    const x = w / 2,
      g = ctx.createLinearGradient(x, 0, x, top);
    g.addColorStop(0, rgba(color, incoming));
    g.addColorStop(
      1,
      rgba(hot || magic ? highlight : "#d3faff", incoming * 0.6),
    );
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(2, w * 0.025 * incoming);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + Math.sin(t * 8) * w * 0.01, top / 2, x, top);
    ctx.stroke();
    glow(ctx, x, top, u * 0.1, color, incoming * 0.5);
  }
  if (outgoing > 0.02) glow(ctx, w / 2, h, u * 0.11, color, outgoing * 0.6);
  line(
    ctx,
    [
      [w * 0.015, h * 0.04],
      [w * 0.015, bottom],
      [w * 0.985, bottom],
      [w * 0.985, h * 0.04],
    ],
    "#b6e7f36b",
    Math.max(1, u * 0.005),
  );
  for (let i = 1; i <= 5; i++)
    line(
      ctx,
      [
        [w * 0.035, h * (0.13 + i * 0.13)],
        [w * 0.065, h * (0.13 + i * 0.13)],
      ],
      "#b6e7f350",
      Math.max(0.6, u * 0.003),
    );
}
function port(surface: Surface, bottom: boolean): Point {
  if (surface.kind === "quad" && !hasCurves(surface)) {
    // Match the rendered inlet/outlet after perspective or rotation.
    const m = inverseQuadMap(surface.points),
      u = 0.5,
      v = bottom ? 1 : 0;
    const a = m[0] - u * m[2],
      b = m[3] - u * m[5],
      c = u * m[8] - m[6];
    const d = m[1] - v * m[2],
      e = m[4] - v * m[5],
      f = v * m[8] - m[7],
      det = a * e - b * d;
    if (Math.abs(det) > 1e-8)
      return { x: (c * e - b * f) / det, y: (a * f - c * d) / det };
  }
  const outline = surfaceOutline(surface),
    b = bounds(outline),
    x = b.x + b.width / 2,
    ys: number[] = [];
  outline.forEach((a, i) => {
    const c = outline[(i + 1) % outline.length];
    if (
      ((a.x <= x && c.x >= x) || (c.x <= x && a.x >= x)) &&
      Math.abs(c.x - a.x) > 1e-8
    )
      ys.push(a.y + ((c.y - a.y) * (x - a.x)) / (c.x - a.x));
  });
  return {
    x,
    y: ys.length
      ? bottom
        ? Math.max(...ys)
        : Math.min(...ys)
      : b.y + (bottom ? b.height : 0),
  };
}
export function connectionPoints(
  project: Project,
  stack: AnimationStack,
  index: number,
): Point[] {
  const surfaces = stack.surfaceIds.map((id) =>
    project.surfaces.find((s) => s.id === id)!,
  );
  const start = port(surfaces[index], true),
    end = port(surfaces[(index + 1) % surfaces.length], false);
  if (index < surfaces.length - 1)
    return Array.from({ length: 41 }, (_, i) =>
      cubicPoint(
        start,
        {
          control1: { x: start.x, y: (start.y + end.y) / 2 },
          control2: { x: end.x, y: (start.y + end.y) / 2 },
        },
        end,
        i / 40,
      ),
    );
  const rail = Math.max(
      0.015,
      Math.min(...surfaces.map((s) => bounds(surfaceOutline(s)).x)) - 0.07,
    ),
    middle = { x: rail, y: (start.y + end.y) / 2 };
  return [
    ...Array.from({ length: 31 }, (_, i) =>
      cubicPoint(
        start,
        {
          control1: { x: rail, y: start.y },
          control2: { x: rail, y: start.y },
        },
        middle,
        i / 30,
      ),
    ),
    ...Array.from({ length: 30 }, (_, i) =>
      cubicPoint(
        middle,
        { control1: { x: rail, y: end.y }, control2: { x: rail, y: end.y } },
        end,
        (i + 1) / 30,
      ),
    ),
  ];
}
export function drawStackLinks(
  ctx: CanvasRenderingContext2D,
  project: Project,
  stack: AnimationStack,
  time: number,
  w: number,
  h: number,
) {
  background(ctx, w, h, "#000000");
  const flow = stackFlow(time, stack.duration, stack.surfaceIds.length),
    u = Math.min(w, h);
  for (let index = 0; index < stack.surfaceIds.length; index++) {
    const a = project.surfaces.find((s) => s.id === stack.surfaceIds[index]),
      b = project.surfaces.find(
        (s) => s.id === stack.surfaceIds[(index + 1) % stack.surfaceIds.length],
      );
    if (!a?.visible || !b?.visible || a.opacity <= 0 || b.opacity <= 0)
      continue;
    const opacity = Math.min(a.opacity, b.opacity);
    const points = connectionPoints(project, stack, index).map((p) => [
      p.x * w,
      p.y * h,
    ]);
    line(
      ctx,
      points,
      rgba(stack.color, 0.13 * opacity),
      Math.max(1, u * 0.006),
    );
    if (flow.from !== index || flow.stream < 0.01) continue;
    line(
      ctx,
      points,
      rgba(stack.color, flow.stream * 0.65 * opacity),
      Math.max(1, u * 0.009),
    );
    for (let drop = 0; drop < 12; drop++) {
      const phase = mod(time * 0.7 + drop / 12, 1) * (points.length - 1),
        i = Math.floor(phase),
        p = points[i],
        q = points[Math.min(i + 1, points.length - 1)],
        x = p[0] + (q[0] - p[0]) * (phase - i),
        y = p[1] + (q[1] - p[1]) * (phase - i);
      glow(ctx, x, y, u * 0.009, stack.color, flow.stream * 0.55 * opacity);
      oval(
        ctx,
        x,
        y,
        u * 0.0035,
        u * 0.0035,
        rgba("#d5fcff", flow.stream * 0.8 * opacity),
      );
    }
  }
}
