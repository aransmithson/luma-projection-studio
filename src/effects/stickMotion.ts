import type { StickEffectId } from "../types";
import { mod, random, smooth, TAU } from "./common";

export const STICK_LOOP = 12;
export type StickPose = {
  x: number;
  lift: number;
  crouch: number;
  lean: number;
  tilt: number;
  look: number;
  lhx: number;
  lhy: number;
  rhx: number;
  rhy: number;
  lfx: number;
  lfy: number;
  rfx: number;
  rfy: number;
};
const rest: StickPose = {
  x: 0,
  lift: 0,
  crouch: 0,
  lean: 0,
  tilt: 0,
  look: 0,
  lhx: -0.54,
  lhy: -0.25,
  rhx: 0.54,
  rhy: -0.25,
  lfx: -0.32,
  lfy: 0.95,
  rfx: 0.32,
  rfy: 0.95,
};
type Key = [number, Partial<StickPose>];
const frames: Record<StickEffectId, Key[]> = {
  "stick-glass-box": [
    [0, {}],
    [0.12, { look: -1, tilt: -0.12 }],
    [0.26, { lhx: -0.72, lhy: -1, rhx: 0.72, rhy: -1, lean: 0.1 }],
    [0.42, { lhx: -0.85, lhy: -0.55, rhx: 0.8, rhy: -1.22, look: 1 }],
    [0.58, { lhx: -0.7, lhy: -1.22, rhx: 0.85, rhy: -0.55, look: -1 }],
    [0.73, { lhx: -0.8, lhy: -0.7, rhx: 0.55, rhy: -1.7, tilt: 0.12 }],
    [0.86, { lhx: -0.7, lhy: -0.7, rhx: 0.7, rhy: -0.7, crouch: 0.2 }],
    [1, {}],
  ],
  "stick-wall-pusher": [
    [0, {}],
    [0.2, { x: 1, look: 1, lhx: 1.13, lhy: -0.8, rhx: 1.13, rhy: -1.1 }],
    [
      0.34,
      {
        x: 1,
        lean: 0.28,
        crouch: 0.35,
        lhx: 1.13,
        lhy: -0.7,
        rhx: 1.13,
        rhy: -1.05,
        lfx: -0.65,
        rfx: 0.5,
        look: 1,
      },
    ],
    [
      0.62,
      {
        x: 1,
        lean: 0.4,
        crouch: 0.5,
        lhx: 1.13,
        lhy: -0.7,
        rhx: 1.13,
        rhy: -1.05,
        lfx: -0.7,
        rfx: 0.5,
        look: 1,
      },
    ],
    [
      0.72,
      {
        x: 0.6,
        lean: -0.25,
        lhx: -0.8,
        lhy: -0.95,
        rhx: 0.8,
        rhy: -0.95,
        tilt: -0.15,
      },
    ],
    [0.87, { x: 0, crouch: 0.25, look: 1 }],
    [1, {}],
  ],
  "stick-ceiling-bonk": [
    [0, {}],
    [0.12, { look: 0, tilt: -0.18, lhx: -0.4, lhy: -0.6, rhx: 0.4, rhy: -0.6 }],
    [0.25, { crouch: 1, lhx: -0.65, lhy: 0.05, rhx: 0.65, rhy: 0.05 }],
    [
      0.35,
      {
        lift: 3,
        lhx: -0.55,
        lhy: -1.3,
        rhx: 0.55,
        rhy: -1.3,
        lfx: -0.5,
        lfy: 0.65,
        rfx: 0.5,
        rfy: 0.65,
      },
    ],
    [
      0.43,
      { lift: 2.6, tilt: 0.2, lhx: -0.75, lhy: -0.5, rhx: 0.75, rhy: -0.5 },
    ],
    [0.55, { crouch: 0.9, lhx: -0.75, lhy: 0.05, rhx: 0.75, rhy: 0.05 }],
    [0.72, { rhx: 0.15, rhy: -1.55, tilt: 0.15, look: -1 }],
    [0.87, { rhx: -0.1, rhy: -1.55, tilt: -0.12 }],
    [1, {}],
  ],
  "stick-corner-climber": [
    [0, {}],
    [0.17, { x: 1, look: 1, rhx: 1.1, rhy: -1.3, lhx: 0.95, lhy: -0.4 }],
    [
      0.3,
      {
        x: 1,
        lift: 0.9,
        rhx: 1.1,
        rhy: -0.6,
        lhx: 0.6,
        lhy: -1.7,
        rfx: 0.8,
        rfy: 0.35,
        lfx: 0.5,
        lfy: 0.85,
        look: 1,
      },
    ],
    [
      0.48,
      {
        x: 1,
        lift: 2.5,
        rhx: 0.65,
        rhy: -1.7,
        lhx: 0.9,
        lhy: -0.8,
        lfx: 0.8,
        lfy: 0.3,
        rfx: 0.55,
        rfy: 0.9,
        look: 1,
      },
    ],
    [
      0.58,
      {
        x: 0.95,
        lift: 2.5,
        rhx: 0.6,
        rhy: -1.7,
        lhx: -0.35,
        lhy: -1.7,
        rfx: 0.6,
        rfy: 0.6,
        tilt: -0.15,
      },
    ],
    [0.72, { x: 0.8, crouch: 0.9, lhx: -0.9, lhy: -1.1, rhx: 0.9, rhy: -1.1 }],
    [0.87, { x: 0.2, look: 1, tilt: 0.2 }],
    [1, {}],
  ],
  "stick-gravity-tumble": [
    [0, {}],
    [1, {}],
  ],
  "stick-box-buddies": [
    [0, { x: -0.48, look: 1 }],
    [
      0.18,
      {
        x: -0.48,
        crouch: 0.8,
        rhx: 0.7,
        rhy: -0.4,
        lhx: -0.45,
        lhy: -0.5,
        look: 1,
      },
    ],
    [
      0.42,
      {
        x: -0.48,
        crouch: 0.45,
        rhx: 0.7,
        rhy: -1.1,
        lhx: 0.6,
        lhy: -0.4,
        lean: 0.15,
        look: 1,
      },
    ],
    [
      0.57,
      {
        x: -0.48,
        crouch: 0.6,
        rhx: 0.8,
        rhy: -0.7,
        lhx: -0.7,
        lhy: -0.8,
        lean: -0.12,
      },
    ],
    [0.7, { x: -0.48, crouch: 0.7, rhx: 0.6, rhy: -0.3, lhx: -0.6, lhy: -0.3 }],
    [0.84, { x: -0.48, rhx: 0.72, rhy: -1.15, look: 1 }],
    [1, { x: -0.48, look: 1 }],
  ],
};
const buddy: Key[] = [
  [0, { x: 0.48, look: -1 }],
  [0.18, { x: 0.48, crouch: 0.5, lhx: -0.7, lhy: -0.4, look: -1 }],
  [
    0.42,
    {
      x: 0.18,
      lift: 1.25,
      lhx: -0.45,
      lhy: -1.7,
      rhx: 0.45,
      rhy: -1.7,
      lfx: -0.35,
      lfy: 0.65,
      rfx: 0.35,
      rfy: 0.65,
    },
  ],
  [
    0.57,
    {
      x: 0.25,
      lift: 1.2,
      lean: 0.3,
      tilt: 0.25,
      lhx: -0.9,
      lhy: -0.65,
      rhx: 0.9,
      rhy: -0.95,
    },
  ],
  [0.7, { x: 0.48, crouch: 0.7, lhx: -0.6, lhy: -0.3, rhx: 0.6, rhy: -0.3 }],
  [0.84, { x: 0.48, lhx: -0.72, lhy: -1.15, look: -1 }],
  [1, { x: 0.48, look: -1 }],
];
export function stickPhase(time: number, seed = 0) {
  const t = time + random(73, seed) * STICK_LOOP;
  return (
    mod(Math.round(mod(t, STICK_LOOP) * 1e6), STICK_LOOP * 1e6) /
    (STICK_LOOP * 1e6)
  );
}
export function stickPose(
  id: StickEffectId,
  phase: number,
  partner = false,
): StickPose {
  const keys = partner && id === "stick-box-buddies" ? buddy : frames[id];
  const index = keys.findIndex(([at]) => at > phase);
  const [a, av] = keys[Math.max(0, index - 1)];
  const [b, bv] = keys[index < 0 ? keys.length - 1 : index];
  const u = b > a ? smooth((phase - a) / (b - a)) : 0;
  const from = { ...rest, ...av },
    to = { ...rest, ...bv };
  const pose = Object.fromEntries(
    Object.keys(rest).map((k) => {
      const key = k as keyof StickPose;
      return [key, from[key] + (to[key] - from[key]) * u];
    }),
  ) as StickPose;
  pose.lean += Math.sin(phase * TAU * 2) * 0.025;
  if (id === "stick-wall-pusher")
    pose.lean += Math.sin(phase * TAU * 18) * 0.035 * stickEffort(phase);
  if (id === "stick-glass-box")
    pose.rhx +=
      Math.sin(phase * TAU * 8) *
      0.08 *
      smooth((phase - 0.65) * 8) *
      smooth((0.9 - phase) * 8);
  if (id === "stick-gravity-tumble") {
    pose.lfx += Math.sin(phase * TAU * 8) * 0.22;
    pose.rfx -= Math.sin(phase * TAU * 8) * 0.22;
    pose.lhx = -0.8;
    pose.lhy = -0.85 + Math.cos(phase * TAU * 4) * 0.2;
    pose.rhx = 0.8;
    pose.rhy = -0.85 - Math.cos(phase * TAU * 4) * 0.2;
  }
  return pose;
}
export const stickEffort = (p: number) =>
  smooth((p - 0.2) / 0.12) * smooth((0.7 - p) / 0.1);

// A fixed-length two-bone limb. Reach limits keep extreme aspect ratios finite.
export function stickJoint(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  length: number,
  bend: number,
) {
  const dx = bx - ax,
    dy = by - ay;
  const distance = Math.hypot(dx, dy);
  const ux = distance > 0 ? dx / distance : 1,
    uy = distance > 0 ? dy / distance : 0;
  const reach = Math.min(distance, length * 2 - 0.0001);
  const ex = ax + ux * reach,
    ey = ay + uy * reach;
  const height = Math.sqrt(Math.max(0, length * length - (reach * reach) / 4));
  return {
    x: (ax + ex) / 2 - uy * height * bend,
    y: (ay + ey) / 2 + ux * height * bend,
    endX: ex,
    endY: ey,
  };
}
