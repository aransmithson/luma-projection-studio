import type { ChaseEffectId, ChaseStack, EffectId } from "../types";
import { drawChaseCharacter, type ChaseCharacter } from "./chaseArt";
import { chaseLayout } from "./chaseMotion";
import { chaseIds, chaseRoles } from "../chaseConfig";
import { actorCopies, routeActors, type ChaseRoute } from "../chaseRoute";
import {
  glow,
  hslHex,
  hue,
  mod,
  oval,
  random,
  rgba,
  TAU,
  type Painter,
} from "./common";

type Theme = "house" | "woodland" | "magic" | "space" | "winter";

function scenery(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  phase: number,
  color: string,
  seed: number,
  theme: Theme,
) {
  // Keep most of the surface black so characters project cleanly onto buildings.
  c.fillStyle = "#020408";
  c.fillRect(0, 0, w, h);
  const floor = c.createLinearGradient(0, h * 0.8, 0, h * 0.96);
  floor.addColorStop(0, rgba(color, 0));
  floor.addColorStop(0.2, rgba(color, 0.07));
  floor.addColorStop(1, rgba(color, 0));
  c.fillStyle = floor;
  c.fillRect(0, h * 0.8, w, h * 0.2);
  for (let i = 0; i < 30; i++) {
    const r = random(i + 12, seed),
      x = mod(random(i, seed) + Math.sin(phase * TAU + i) * 0.025, 1) * w,
      y =
        mod(
          random(i + 60, seed) +
            phase * (theme === "winter" ? 1 : theme === "woodland" ? 1 : 0),
          1,
        ) * h,
      alpha = 0.1 + (0.5 + Math.sin(phase * TAU * 2 + i) * 0.5) * 0.22,
      size = Math.min(w, h) * (0.0015 + r * 0.0025);
    if (theme === "woodland" && i < 12) {
      // Fade falling leaves and snow before wrapping their centres.
      c.globalAlpha = alpha * Math.sin((y / h) * Math.PI) ** 2;
      oval(
        c,
        x,
        y,
        size * 2.5,
        size,
        i % 2 ? "#dfa25b" : color,
        phase * TAU * 2 + i,
      );
      c.globalAlpha = 1;
    } else if (theme !== "house") {
      const edgeFade =
        theme === "winter" ? Math.sin((y / h) * Math.PI) ** 2 : 1;
      oval(
        c,
        x,
        y,
        size,
        size,
        rgba(theme === "winter" ? "#e2f0ff" : color, alpha * edgeFade),
      );
    }
  }
}

function drawRunner(
  c: CanvasRenderingContext2D,
  kind: ChaseCharacter,
  x: number,
  following: boolean,
  phase: number,
  unit: number,
  floor: number,
  color: string,
  seed: number,
  theme: Theme,
  facing = 1,
) {
  const angle = phase * TAU;
  const stride = angle * 20 + (following ? 1.2 : 0) + random(40, seed) * TAU,
    floating = kind === "ghost",
    hop = floating
      ? 0.25 + Math.sin(angle * 4) * 0.13
      : kind === "rabbit"
        ? 0.035 + (1 + Math.cos(stride * 2)) * 0.095
        : 0.015 + (1 + Math.cos(stride * 2)) * 0.035,
    glance = following
      ? 0.65
      : 0.5 - Math.max(0, Math.sin(angle * 3 + 0.4)) ** 6 * 1.5,
    blink =
      1 -
      Math.max(0, Math.cos(angle * 3 + (following ? 2.3 : 0.4))) ** 80 * 0.95;
  c.save();
  c.translate(x, floor);
  c.scale(unit * facing, unit);
  oval(
    c,
    0,
    0.1,
    floating ? 0.58 : 0.7 - hop * 0.3,
    0.075,
    rgba(color, floating ? 0.08 : 0.12),
  );
  if (floating) glow(c, 0, 0.05, 0.7, color, 0.06);
  // Footfall puffs are part of the actor, so all trailing pixels also leave
  // the viewport before the position wraps. They fade smoothly each stride.
  for (let i = 0; i < 3; i++) {
    const p = mod(stride / TAU + i / 3, 1),
      a = Math.sin(p * Math.PI) ** 2 * 0.13;
    oval(
      c,
      -0.5 - p * 1.3,
      -0.06 - p * 0.1,
      0.04 + p * 0.095,
      0.025 + p * 0.04,
      rgba(theme === "winter" ? "#e4f2ff" : color, a),
    );
  }
  c.translate(0, -hop);
  c.rotate(
    kind === "penguin"
      ? Math.sin(stride) * 0.08
      : floating
        ? Math.sin(angle * 4) * 0.035
        : 0.06,
  );
  drawChaseCharacter(
    c,
    kind,
    stride,
    glance,
    blink,
    following ? color : hslHex(hue(color) + 38, 0.68, 0.68),
  );
  c.restore();
}

const chase =
  (id: ChaseEffectId): Painter =>
  (c, time, w, h, color, seed, scale = 1, side = "left") => {
    const layout = chaseLayout(time, w, h, seed, scale),
      { phase, unit, floor } = layout,
      pair = chaseRoles(id, side);
    scenery(c, w, h, phase, color, seed, pair.theme);
    drawRunner(
      c,
      pair.chaser,
      layout.chaserX,
      true,
      phase,
      unit,
      floor,
      color,
      seed,
      pair.theme,
    );
    drawRunner(
      c,
      pair.leader,
      layout.leaderX,
      false,
      phase,
      unit,
      floor,
      color,
      seed,
      pair.theme,
    );
  };

export const chasePainters: Partial<Record<EffectId, Painter>> =
  Object.fromEntries(chaseIds.map((id) => [id, chase(id)]));

export function drawLinkedChase(
  c: CanvasRenderingContext2D,
  time: number,
  stack: ChaseStack,
  route: ChaseRoute,
  surfaceId: string,
) {
  const segment = route.segments.find((s) => s.id === surfaceId);
  if (!segment) return;
  const { width: w, height: h } = c.canvas,
    { phase, actors } = routeActors(time, stack, route),
    pair = chaseRoles(stack.effectId, stack.direction);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";
  scenery(c, w, h, phase, stack.color, stack.seed, pair.theme);
  c.save();
  c.scale(w / segment.width, h / segment.height);
  for (const actor of actors)
    for (const x of actorCopies(actor.x, route, segment))
      drawRunner(
        c,
        actor.kind,
        x,
        actor.following,
        phase,
        route.unit,
        segment.height * 0.83,
        stack.color,
        stack.seed,
        pair.theme,
        stack.direction === "right" ? -1 : 1,
      );
  c.restore();
}
