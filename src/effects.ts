import type { EffectId } from "./types";
import { extendedPainters } from "./effects/extended";
import { hslHex, hue } from "./effects/common";
import { drawLiquid } from "./effects/stacked";
import { drawEdgeRunner, edgePreviewShape } from "./effects/edgeRunner";
import { drawToyTrain, trainPreviewShape } from "./effects/toyTrain";
import { effectById } from "./catalog";

const random = (i: number, seed: number) => {
  const n = Math.sin(i * 127.1 + seed * 31.7) * 43758.5453;
  return n - Math.floor(n);
};
const rgba = (hex: string, alpha: number) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, alpha))})`;
const mod = (n: number, d: number) => ((n % d) + d) % d;

function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 1,
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, radius));
  gradient.addColorStop(0, rgba(color, alpha));
  gradient.addColorStop(0.35, rgba(color, alpha * 0.35));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function star(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
) {
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const r = i % 2 === 0 ? size : size * 0.22;
    const px = x + Math.cos(angle) * r,
      py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawEffect(
  ctx: CanvasRenderingContext2D,
  id: EffectId,
  time: number,
  color: string,
  seed = 1,
  scale = 1,
  colorCycle = false,
  side: "left" | "right" = "left",
) {
  if (effectById[id].still) time = 0;
  if (colorCycle) color = hslHex(hue(color) + time * 24);
  const w = ctx.canvas.width,
    h = ctx.canvas.height,
    unit = Math.min(w, h);
  const t = time;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#03050b";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  if (
    ["Creatures", "Chase scenes"].includes(effectById[id].category) &&
    side === "right"
  ) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.translate(w / 2, h / 2);
  const patternScale =
    id === "edge-runner" ||
    id === "toy-train" ||
    effectById[id].category === "Linked stories" ||
    effectById[id].audioReactive ||
    effectById[id].category === "Chase scenes" ||
    effectById[id].category === "Creatures"
      ? 1
      : scale;
  ctx.scale(patternScale, patternScale);
  ctx.translate(-w / 2, -h / 2);
  // The oversized fill keeps the surface opaque even when the pattern is zoomed out.
  ctx.fillStyle = id === "candy" ? "#f3e6d3" : "#03050b";
  ctx.fillRect(-w * 4, -h * 4, w * 9, h * 9);

  const extended = extendedPainters[id];
  if (id === "edge-runner")
    drawEdgeRunner(ctx, edgePreviewShape, time, color, seed, scale, false);
  else if (id === "toy-train")
    drawToyTrain(ctx, trainPreviewShape, time, color, seed, scale, false);
  else if (id === "stacked-liquid")
    drawLiquid(ctx, time, w, h, color, seed, 0.55 + Math.sin(time * 0.4) * 0.2);
  else if (extended) extended(ctx, time, w, h, color, seed, scale, side);
  else if (id === "aurora" || id === "ocean" || id === "plasma") {
    const base = ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, id === "ocean" ? "#031a36" : "#10102e");
    base.addColorStop(1, "#040610");
    ctx.fillStyle = base;
    ctx.fillRect(-w, -h, w * 3, h * 3);
    const colors =
      id === "ocean"
        ? ["#135a9a", color, "#1b859f", "#3259a1"]
        : id === "plasma"
          ? [color, "#6468ff", "#eb8768", "#bd3aac"]
          : [color, "#4bdcc5", "#6294e8", "#9e63c8"];
    for (let i = 0; i < 8; i++) {
      const y = h * (0.05 + i * 0.13) + Math.sin(t * 0.3 + i * 1.5) * h * 0.15;
      const gradient = ctx.createLinearGradient(
        0,
        y - h * 0.15,
        0,
        y + h * 0.4,
      );
      gradient.addColorStop(0, rgba(colors[i % 4], 0));
      gradient.addColorStop(0.35, rgba(colors[i % 4], 0.65));
      gradient.addColorStop(1, rgba(colors[i % 4], 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-w, y);
      for (let x = -w; x <= w * 2; x += w / 32) {
        ctx.lineTo(
          x,
          y +
            Math.sin((x / w) * 3.8 + t * 0.35 + i * 0.55) * h * 0.25 +
            Math.sin((x / w) * 7 - t * 0.22) * h * 0.08,
        );
      }
      ctx.lineTo(w * 2, y + h);
      ctx.lineTo(-w, y + h);
      ctx.closePath();
      ctx.fill();
    }
    if (id === "plasma")
      for (let i = 0; i < 6; i++)
        glow(
          ctx,
          w * (0.5 + Math.sin(t * 0.2 + i) * 0.55),
          h * (0.5 + Math.cos(t * 0.15 + i * 2) * 0.6),
          unit * 0.7,
          colors[i % 4],
          0.5,
        );
  } else if (id === "starfield") {
    glow(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.65, "#303165", 0.65);
    for (let i = 0; i < 110; i++) {
      const angle = random(i, seed) * Math.PI * 2,
        phase = mod(random(i + 120, seed) + t * 0.035, 1),
        radius = phase * phase * Math.max(w, h) * 0.8;
      const x = w / 2 + Math.cos(angle) * radius,
        y = h / 2 + Math.sin(angle) * radius;
      ctx.strokeStyle = rgba(color, phase);
      ctx.lineWidth = 0.4 + phase * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(angle) * phase * 8,
        y + Math.sin(angle) * phase * 8,
      );
      ctx.stroke();
    }
  } else if (id === "rings") {
    glow(ctx, w / 2, h / 2, unit * 0.8, color, 0.25);
    for (let i = 0; i < 14; i++) {
      const phase = mod(i / 14 + t * 0.07, 1),
        r = phase * Math.max(w, h);
      ctx.strokeStyle = rgba(color, (1 - phase) * 0.9);
      ctx.lineWidth = Math.max(1, unit * 0.007 * (1 - phase));
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, r, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (id === "grid") {
    const gap = unit * 0.15;
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = rgba(color, 0.25);
    for (let x = -w; x < w * 2; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, -h);
      ctx.lineTo(x, h * 2);
      ctx.stroke();
    }
    for (let y = -h; y < h * 2; y += gap) {
      ctx.beginPath();
      ctx.moveTo(-w, y);
      ctx.lineTo(w * 2, y);
      ctx.stroke();
    }
    for (let i = 0; i < 20; i++) {
      const x = Math.round((random(i, seed) * w) / gap) * gap,
        y = Math.round((random(i + 60, seed) * h) / gap) * gap;
      const alpha = Math.max(0, Math.sin(t * 1.3 + i * 0.9));
      ctx.fillStyle = rgba(color, alpha * 0.55);
      ctx.fillRect(x + 2, y + 2, gap - 4, gap - 4);
    }
  } else if (id === "prism" || id === "candy") {
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 4);
    const gap = unit * (id === "candy" ? 0.16 : 0.24),
      offset = mod(t * unit * 0.06, gap * 2);
    const colors =
      id === "candy"
        ? [color, "#f3e6d3"]
        : [color, "#7353e0", "#3ba4bf", "#f9ae75"];
    for (let i = -50; i < 50; i++) {
      ctx.fillStyle = colors[mod(i, colors.length)];
      ctx.fillRect(i * gap + offset, -w - h, gap + 1, (w + h) * 2);
      if (id === "candy" && mod(i, 2) === 1) {
        ctx.fillStyle = rgba(color, 0.8);
        ctx.fillRect(
          i * gap + offset + gap * 0.2,
          -w - h,
          gap * 0.08,
          (w + h) * 2,
        );
      }
    }
    ctx.rotate(Math.PI / 4);
    ctx.translate(-w / 2, -h / 2);
    const shade = ctx.createLinearGradient(0, 0, w, h);
    shade.addColorStop(0, "#ffffff22");
    shade.addColorStop(0.5, "#ffffff00");
    shade.addColorStop(1, "#00000044");
    ctx.fillStyle = shade;
    ctx.fillRect(-w, -h, w * 3, h * 3);
  } else if (id === "embers") {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#090209");
    bg.addColorStop(1, "#671305");
    ctx.fillStyle = bg;
    ctx.fillRect(-w, -h, w * 3, h * 3);
    for (let i = 0; i < 18; i++) {
      const x = w * (i / 17),
        flicker = 0.65 + Math.sin(t * 1.8 + i * 2.5) * 0.16;
      glow(
        ctx,
        x + Math.sin(t + i) * unit * 0.03,
        h * flicker,
        unit * (0.28 + random(i, seed) * 0.2),
        i % 3 === 0 ? "#ffce59" : color,
        0.55,
      );
    }
    for (let i = 0; i < 70; i++) {
      const phase = mod(
        random(i, seed) + t * (0.05 + random(i + 70, seed) * 0.1),
        1,
      );
      const x =
          random(i + 150, seed) * w + Math.sin(phase * 8 + i) * unit * 0.05,
        y = h * (1 - phase);
      ctx.fillStyle = rgba(
        i % 4 ? color : "#ffe7a1",
        Math.sin(phase * Math.PI),
      );
      ctx.beginPath();
      ctx.arc(x, y, 0.7 + random(i + 250, seed) * unit * 0.009, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === "fog") {
    for (let i = 0; i < 16; i++) {
      const x =
        mod(random(i, seed) * w + t * w * (0.015 + (i % 3) * 0.01), w * 1.6) -
        w * 0.3;
      const y = random(i + 30, seed) * h + Math.sin(t * 0.3 + i) * h * 0.15;
      glow(
        ctx,
        x,
        y,
        unit * (0.35 + random(i + 60, seed) * 0.6),
        i % 3 ? color : "#41675b",
        0.25,
      );
    }
  } else if (id === "eyes") {
    glow(ctx, w / 2, h * 0.6, unit, "#1b2930", 0.25);
    for (let i = 0; i < 5; i++) {
      const x = (0.2 + random(i, seed) * 0.55) * w,
        y = (0.2 + random(i + 10, seed) * 0.6) * h;
      const size = unit * (0.04 + random(i + 20, seed) * 0.045),
        blink = Math.pow(Math.max(0, Math.sin(t * 0.7 + i * 2.4)), 0.12);
      for (const side of [-1, 1]) {
        const ex = x + side * size * 1.25;
        glow(ctx, ex, y, size * 2.7, color, blink * 0.4);
        ctx.fillStyle = rgba(color, blink);
        ctx.beginPath();
        ctx.ellipse(
          ex,
          y,
          size,
          Math.max(0.1, size * 0.45 * blink),
          side * -0.18,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.fillStyle = "#030509";
        ctx.beginPath();
        ctx.ellipse(
          ex + Math.sin(t * 0.3) * size * 0.3,
          y,
          size * 0.18,
          size * 0.47,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  } else if (id === "bats") {
    glow(ctx, w * 0.65, h * 0.35, unit * 0.65, color, 0.7);
    ctx.fillStyle = "#dfc4e9";
    ctx.beginPath();
    ctx.arc(w * 0.65, h * 0.35, unit * 0.18, 0, Math.PI * 2);
    ctx.fill();
    glow(ctx, w * 0.65, h * 0.35, unit * 0.23, "#fff2d4", 0.6);
    for (let i = 0; i < 14; i++) {
      const x =
        mod(
          random(i, seed) * w + t * w * (0.035 + random(i + 50, seed) * 0.04),
          w * 1.3,
        ) -
        w * 0.15;
      const y = random(i + 20, seed) * h + Math.sin(t * 1.4 + i) * h * 0.09,
        size = unit * (0.025 + random(i + 40, seed) * 0.035),
        flap = Math.sin(t * 7 + i) * size;
      ctx.fillStyle = "#05030c";
      ctx.beginPath();
      ctx.moveTo(x, y + size * 0.5);
      ctx.quadraticCurveTo(x - size, y - size, x - size * 2.5, y - flap);
      ctx.quadraticCurveTo(x - size * 1.3, y + size * 0.2, x - size, y + size);
      ctx.quadraticCurveTo(x - size * 0.4, y + size * 0.3, x, y + size * 0.7);
      ctx.quadraticCurveTo(x + size * 0.4, y + size * 0.3, x + size, y + size);
      ctx.quadraticCurveTo(
        x + size * 1.3,
        y + size * 0.2,
        x + size * 2.5,
        y - flap,
      );
      ctx.quadraticCurveTo(x + size, y - size, x, y + size * 0.5);
      ctx.fill();
    }
  } else if (id === "snow") {
    const bg = ctx.createLinearGradient(0, 0, w * 0.5, h);
    bg.addColorStop(0, "#0a132e");
    bg.addColorStop(0.6, "#163454");
    bg.addColorStop(1, "#24405a");
    ctx.fillStyle = bg;
    ctx.fillRect(-w, -h, w * 3, h * 3);
    glow(ctx, w * 0.15, h * 0.05, unit * 0.8, color, 0.22);
    for (let i = 0; i < 120; i++) {
      const depth = random(i + 120, seed),
        x = mod(
          random(i, seed) * w +
            Math.sin(t * 0.4 + i) * unit * 0.03 +
            t * unit * 0.012,
          w,
        ),
        y = mod(random(i + 240, seed) * h + t * h * (0.025 + depth * 0.08), h);
      ctx.fillStyle = rgba(color, 0.3 + depth * 0.7);
      ctx.beginPath();
      ctx.arc(x, y, 0.5 + depth * unit * 0.009, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === "lights") {
    ctx.fillStyle = "#07130f";
    ctx.fillRect(-w, -h, w * 3, h * 3);
    const colors = [color, "#fc777c", "#68c497", "#8cafff"];
    for (let row = 0; row < 4; row++) {
      ctx.strokeStyle = "#354336";
      ctx.lineWidth = Math.max(1, unit * 0.006);
      ctx.beginPath();
      ctx.moveTo(-w * 0.1, row * h * 0.25);
      ctx.quadraticCurveTo(
        w * 0.5,
        row * h * 0.25 + h * 0.18,
        w * 1.1,
        row * h * 0.25,
      );
      ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const x = ((i + 0.5) / 10) * w,
          y = row * h * 0.25 + Math.sin(((i + 0.5) / 10) * Math.PI) * h * 0.065;
        const c = colors[(i + row) % 4],
          alpha = 0.5 + Math.sin(t * 1.3 + i + row * 2) * 0.35;
        glow(ctx, x, y + unit * 0.025, unit * 0.12, c, alpha);
        ctx.fillStyle = rgba(c, 0.75 + alpha * 0.25);
        ctx.beginPath();
        ctx.ellipse(
          x,
          y + unit * 0.025,
          unit * 0.017,
          unit * 0.027,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y + unit * 0.02, unit * 0.006, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (id === "twinkle") {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#211628");
    bg.addColorStop(0.5, "#1f1823");
    bg.addColorStop(1, "#3e2922");
    ctx.fillStyle = bg;
    ctx.fillRect(-w, -h, w * 3, h * 3);
    for (let i = 0; i < 55; i++) {
      const x = random(i, seed) * w,
        y = mod(random(i + 70, seed) * h - t * h * 0.012, h),
        alpha = 0.2 + Math.pow((Math.sin(t * 1.3 + i * 2.3) + 1) / 2, 3) * 0.8,
        size = unit * (0.008 + random(i + 120, seed) * 0.025);
      glow(ctx, x, y, size * 3, color, alpha * 0.35);
      star(ctx, x, y, size, color, alpha);
    }
  }
  ctx.restore();
}
