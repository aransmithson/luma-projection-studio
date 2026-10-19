import type { EffectId, StoryEffectId, StoryStack } from "../types";
import type { ChaseRoute } from "../chaseRoute";
import { storyIds } from "../storyCatalog";
import { storyCopies, storyMotion, storyVisit } from "../storyMotion";
import { gear, storyActor } from "./storyArt";
import { velvet } from "./characterArt";
import {
  glow,
  line,
  mod,
  oval,
  random,
  rgba,
  star,
  TAU,
  type Painter,
} from "./common";

type C = CanvasRenderingContext2D;

function scenery(
  c: C,
  w: number,
  h: number,
  u: number,
  phase: number,
  stack: StoryStack,
  index: number,
) {
  const { effectId: id, color } = stack,
    a = phase * TAU,
    seed = stack.seed + index * 37;
  const ocean = id === "story-reef-relay",
    garden = id === "story-firefly-garden";
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, ocean ? "#020b1b" : "#02040c");
  g.addColorStop(0.75, ocean ? "#07313e" : garden ? "#10252a" : "#121328");
  g.addColorStop(1, "#02050b");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 36; i++) {
    const x = random(i, seed) * w,
      y = random(i + 70, seed) * h * 0.8;
    const alpha = 0.17 + (1 + Math.sin(a * 2 + i)) * 0.12;
    if (ocean) {
      const by = mod(y / h - phase * (1 + (i % 2)), 1) * h;
      c.beginPath();
      c.arc(
        x + Math.sin(a * 2 + i) * u * 0.12,
        by,
        u * (0.025 + random(i + 8, seed) * 0.06),
        0,
        TAU,
      );
      c.strokeStyle = rgba(color, alpha * Math.sin((by / h) * Math.PI) ** 2);
      c.lineWidth = u * 0.009;
      c.stroke();
    } else if (i % 9 === 0) star(c, x, y, u * 0.06, rgba(color, alpha), 0);
    else oval(c, x, y, u * 0.012, u * 0.012, rgba("#e2ebff", alpha));
  }
  if (
    [
      "story-ghost-train",
      "story-dragon-lanterns",
      "story-firefly-garden",
    ].includes(id)
  ) {
    const mx = w * 0.82,
      my = h * 0.19;
    glow(c, mx, my, u * 1.1, "#b6c5ff", 0.13);
    velvet(c, mx, my, u * 0.45, u * 0.45, "#afb9cf");
    for (let i = 0; i < 6; i++)
      oval(
        c,
        mx + (random(i, seed) - 0.5) * u * 0.5,
        my + (random(i + 20, seed) - 0.5) * u * 0.5,
        u * 0.05,
        u * 0.07,
        "#8f9bbf66",
      );
    for (let ridge = 0; ridge < 2; ridge++) {
      c.beginPath();
      c.moveTo(0, h);
      for (let j = 0; j <= 24; j++)
        c.lineTo(
          (j / 24) * w,
          h * (0.7 + ridge * 0.12) + Math.sin(j * 0.4 + index) * h * 0.07,
        );
      c.lineTo(w, h);
      c.closePath();
      c.fillStyle = ridge ? "#07111b" : "#11172a";
      c.fill();
    }
  }
  if (id === "story-ghost-train" || id === "story-clockwork-marble") {
    const y =
      id === "story-ghost-train" ? h * 0.76 + u * 0.05 : h * 0.64 + u * 0.61;
    for (let x = 0; x < w; x += u * 0.45)
      line(
        c,
        [
          [x, y - u * 0.03],
          [x + u * 0.2, y + u * 0.16],
        ],
        "#566578",
        u * 0.05,
      );
    line(
      c,
      [
        [0, y],
        [w, y],
      ],
      "#c2c7d2",
      u * 0.033,
    );
    line(
      c,
      [
        [0, y + u * 0.14],
        [w, y + u * 0.14],
      ],
      "#66798e",
      u * 0.025,
    );
  }
  if (ocean || garden) {
    for (let i = 0; i < 14; i++) {
      const x = ((i + 0.4) / 14) * w,
        rise = u * (0.35 + random(i + 36, seed) * 0.75);
      const sway = Math.sin(a * 2 + i) * u * 0.11;
      c.beginPath();
      c.moveTo(x, h);
      c.bezierCurveTo(
        x - u * 0.15,
        h - rise * 0.5,
        x + sway,
        h - rise,
        x + sway,
        h - rise,
      );
      c.strokeStyle = i % 3 ? "#24594f" : "#417b68";
      c.lineWidth = u * (ocean ? 0.035 : 0.02);
      c.lineCap = "round";
      c.stroke();
      if (ocean && i % 3 === 0) {
        for (let j = 1; j < 4; j++)
          line(
            c,
            [
              [x, h - (rise * j) / 4],
              [x + Math.sin(i + j) * u * 0.26, h - (rise * j) / 4 - u * 0.2],
            ],
            "#a964a0",
            u * 0.035,
          );
      }
    }
  }
  if (ocean) {
    // Soft surface caustics and a jellyfish that pulses on the shared cycle.
    c.save();
    c.globalAlpha = 0.08;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo((w * i) / 4, 0);
      c.lineTo((w * i) / 4 + u * (1.7 + Math.sin(a * 2 + i)), h);
      c.lineTo((w * i) / 4 + u * 0.3, h);
      c.closePath();
      c.fillStyle = color;
      c.fill();
    }
    c.restore();
    const x = w * 0.17,
      y = h * 0.22 + Math.sin(a * 2 + index) * u * 0.13;
    glow(c, x, y, u * 0.65, "#ab9cff", 0.18);
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(x + (i - 2) * u * 0.1, y);
      c.bezierCurveTo(
        x + u * Math.sin(a * 4 + i) * 0.24,
        y + u * 0.3,
        x + u * Math.cos(a * 4 + i) * 0.3,
        y + u * 0.6,
        x + (i - 2) * u * 0.12,
        y + u * 0.72,
      );
      c.strokeStyle = "#c5c2ff70";
      c.lineWidth = u * 0.017;
      c.stroke();
    }
    oval(c, x, y, u * (0.36 + Math.sin(a * 4) * 0.035), u * 0.22, "#acb8edaa");
  }
}

function station(
  c: C,
  w: number,
  h: number,
  u: number,
  phase: number,
  stack: StoryStack,
  reaction: ReturnType<typeof storyVisit>,
  index: number,
) {
  const x = w * 0.52,
    a = phase * TAU,
    { glow: power, bloom } = reaction,
    color = stack.color;
  const id = stack.effectId;
  c.save();
  if (id === "story-cosmic-courier") {
    const y = h * 0.81;
    // A small illuminated planet and its brass orbital receiver.
    glow(c, x, y, u * 1.6, color, 0.08 + power * 0.3);
    velvet(c, x, y, u * 0.81, u * 0.55, index % 2 ? "#5c5cb6" : "#347d9d");
    c.beginPath();
    c.ellipse(x, y, u * 1.13, u * 0.18, -0.22, 0, TAU);
    c.strokeStyle = "#92bbc9";
    c.lineWidth = u * 0.035;
    c.stroke();
    for (let ring = 0; ring < 4; ring++) {
      const p = mod(phase * 4 + ring / 4, 1);
      c.beginPath();
      c.ellipse(
        x,
        y - u * (0.6 + p * 1.3),
        u * (0.3 + p * 0.6),
        u * 0.09,
        0,
        0,
        TAU,
      );
      c.strokeStyle = rgba(color, power * (1 - p) * 0.8);
      c.lineWidth = u * 0.018;
      c.stroke();
    }
    star(
      c,
      x,
      y - u * 0.71,
      u * (0.1 + power * 0.18),
      rgba("#fff6c8", 0.2 + power * 0.8),
      a * 2,
    );
  } else if (id === "story-ghost-train") {
    const y = h * 0.77;
    line(
      c,
      [
        [x, y],
        [x, y - u * 2.0],
        [x + u * 0.4, y - u * 2.15],
      ],
      "#68829c",
      u * 0.07,
    );
    glow(c, x + u * 0.4, y - u * 1.85, u * 1.1, color, 0.12 + power * 0.55);
    velvet(
      c,
      x + u * 0.4,
      y - u * 1.9,
      u * 0.17,
      u * 0.29,
      power > 0.1 ? "#e5dbff" : "#687da6",
    );
    line(
      c,
      [
        [x + u * 0.13, y - u * 2.16],
        [x + u * 0.67, y - u * 2.16],
      ],
      "#b1bed3",
      u * 0.05,
    );
  } else if (id === "story-dragon-lanterns") {
    const y = h * 0.84;
    c.fillStyle = "#273544";
    c.fillRect(x - u * 0.44, y - u * 0.84, u * 0.88, u * 1.2);
    for (let row = 0; row < 4; row++) {
      line(
        c,
        [
          [x - u * 0.44, y - row * u * 0.22],
          [x + u * 0.44, y - row * u * 0.22],
        ],
        "#465563",
        u * 0.019,
      );
      line(
        c,
        [
          [x + (row % 2 ? -0.15 : 0.17) * u, y - row * u * 0.22],
          [x + (row % 2 ? -0.15 : 0.17) * u, y - (row + 1) * u * 0.22],
        ],
        "#465563",
        u * 0.018,
      );
    }
    line(
      c,
      [
        [x - u * 0.59, y - u * 0.85],
        [x + u * 0.59, y - u * 0.85],
      ],
      "#7c8790",
      u * 0.08,
    );
    const ly = y - u * 1.35;
    glow(c, x, ly, u * 1.5, color, 0.06 + power * 0.66);
    velvet(c, x, ly, u * 0.32, u * 0.43, "#9f6a38");
    oval(c, x, ly, u * 0.24, u * 0.35, rgba(color, 0.2 + power * 0.8));
    for (const dx of [-0.27, 0, 0.27])
      line(
        c,
        [
          [x + dx * u, ly - u * 0.37],
          [x + dx * u, ly + u * 0.37],
        ],
        "#d8ad6c",
        u * 0.025,
      );
    line(
      c,
      [
        [x, ly - u * 0.44],
        [x, ly - u * 0.62],
      ],
      "#9a895e",
      u * 0.035,
    );
  } else if (id === "story-reef-relay") {
    const y = h * 0.85;
    glow(c, x, y, u * 1.1, color, 0.08 + power * 0.38);
    velvet(c, x, y, u * 0.7, u * 0.18, "#bb92b7");
    const opening = 0.18 + bloom * 0.7;
    c.save();
    c.translate(x, y);
    c.scale(1, opening);
    velvet(c, 0, -u * 0.42, u * 0.67, u * 0.61, "#8f7db0");
    for (let i = -3; i <= 3; i++)
      line(
        c,
        [
          [0, 0],
          [
            Math.sin(i * 0.3) * u * 0.62,
            -u * 0.42 - Math.cos(i * 0.3) * u * 0.53,
          ],
        ],
        "#d0afd2",
        u * 0.023,
      );
    c.restore();
    for (let i = 0; i < 7; i++) {
      const p = mod(phase * 4 + i / 7, 1);
      star(
        c,
        x + Math.sin(i * 2) * p * u,
        y - p * u * 1.6,
        u * 0.035,
        rgba(color, power * Math.sin(p * Math.PI)),
        a,
      );
    }
  } else if (id === "story-clockwork-marble") {
    for (let i = 0; i < 3; i++)
      gear(
        c,
        w * (0.19 + i * 0.3),
        h * 0.86,
        u * (i === 1 ? 0.62 : 0.48),
        a * (i % 2 ? -6 : 8),
        "#ad8552",
      );
    const y = h * 0.64 + u * 0.61;
    for (const dx of [-0.68, 0.68]) {
      c.fillStyle = "#6d7278";
      c.fillRect(x + dx * u - u * 0.07, y - u * 1.85, u * 0.14, u * 1.85);
      line(
        c,
        [
          [x + dx * u, y],
          [x + dx * u, y - u * 1.85],
        ],
        "#b4c7cc",
        u * 0.025,
      );
    }
    line(
      c,
      [
        [x - u * 0.8, y - u * 1.86],
        [x + u * 0.8, y - u * 1.86],
      ],
      "#d5b884",
      u * 0.15,
    );
    for (let i = 0; i < 5; i++)
      oval(
        c,
        x + (i - 2) * u * 0.23,
        y - u * 1.86,
        u * 0.05,
        u * 0.05,
        rgba(color, 0.12 + power * 0.88),
      );
    glow(c, x, y - u * 0.9, u * 1.25, color, power * 0.19);
  } else {
    for (let i = 0; i < 3; i++) {
      const fx = x + (i - 1) * u * 0.88,
        fy = h * 0.86 - (i % 2) * u * 0.3;
      line(
        c,
        [
          [fx, h],
          [fx + Math.sin(a * 2 + i) * u * 0.09, fy],
        ],
        "#5a9a71",
        u * 0.035,
      );
      const size = u * (0.13 + bloom * 0.35);
      glow(c, fx, fy, u * 0.8, color, bloom * 0.2);
      for (let petal = 0; petal < 7; petal++) {
        const angle = (petal * TAU) / 7 + Math.sin(a * 2) * 0.08;
        velvet(
          c,
          fx + Math.cos(angle) * size * 0.58,
          fy + Math.sin(angle) * size * 0.58,
          size * 0.49,
          size * 0.49,
          i % 2 ? "#a08bea" : "#e798ba",
        );
      }
      velvet(c, fx, fy, size * 0.27, size * 0.27, color);
    }
  }
  c.restore();
}

export function drawLinkedStory(
  c: C,
  time: number,
  stack: StoryStack,
  route: ChaseRoute,
  surfaceId: string,
) {
  const index = route.segments.findIndex((s) => s.id === surfaceId);
  if (index < 0 || route.width <= 0) return;
  const tile = route.segments[index],
    { width: w, height: h } = tile;
  const motion = storyMotion(time, stack, route),
    reaction = storyVisit(motion.phase, route, index, stack.direction);
  const u = route.unit,
    id = stack.effectId;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";
  c.save();
  c.scale(c.canvas.width / w, c.canvas.height / h);
  scenery(c, w, h, u, motion.phase, stack, index);
  station(c, w, h, u, motion.phase, stack, reaction, index);
  const floor =
    id === "story-ghost-train"
      ? h * 0.76
      : id === "story-clockwork-marble"
        ? h * 0.64
        : h * 0.46;
  const bob =
    id === "story-ghost-train" || id === "story-clockwork-marble"
      ? 0
      : Math.sin(motion.phase * TAU * 6) * u * 0.1;
  for (const x of storyCopies(motion.x, route, index)) {
    c.save();
    c.translate(x, floor + bob);
    // The train has three linked vehicles; fit its full length into one preview.
    const actorScale = id === "story-ghost-train" ? 0.72 : 1;
    c.scale(u * actorScale * motion.facing, u * actorScale);
    storyActor(c, id, motion.phase, stack.color);
    c.restore();
  }
  c.restore();
}

const preview =
  (id: StoryEffectId): Painter =>
  (c, time, w, h, color, seed, scale = 1, direction = "left") => {
    const stack: StoryStack = {
      id: "preview",
      name: "Story",
      kind: "story",
      effectId: id,
      surfaceIds: ["preview"],
      color,
      seed,
      scale,
      direction,
      duration: 12,
      links: false,
    };
    const route: ChaseRoute = {
      width: w,
      unit: Math.min(h * 0.245, w * 0.17) * scale,
      key: "preview",
      segments: [{ id: "preview", start: 0, width: w, height: h }],
    };
    drawLinkedStory(c, time, stack, route, "preview");
  };
export const storyPainters: Partial<Record<EffectId, Painter>> =
  Object.fromEntries(storyIds.map((id) => [id, preview(id)]));
