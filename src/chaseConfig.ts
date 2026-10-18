import type { ChaseEffectId, EffectId } from "./types";

export const chasePairs = {
  "chase-cat-mouse": { chaser: "cat", leader: "mouse", theme: "house" },
  "chase-fox-rabbit": { chaser: "fox", leader: "rabbit", theme: "woodland" },
  "chase-ghost-pumpkin": { chaser: "ghost", leader: "pumpkin", theme: "magic" },
  "chase-robot-alien": { chaser: "robot", leader: "alien", theme: "space" },
  "chase-snowman-penguin": {
    chaser: "snowman",
    leader: "penguin",
    theme: "winter",
  },
} as const;
export const chaseIds = Object.keys(chasePairs) as [
  ChaseEffectId,
  ...ChaseEffectId[],
];
export const isChaseEffect = (id: EffectId): id is ChaseEffectId =>
  id in chasePairs;
export function chaseRoles(
  id: ChaseEffectId,
  direction: "left" | "right" = "left",
) {
  const pair = chasePairs[id];
  return direction === "right"
    ? { ...pair, chaser: pair.leader, leader: pair.chaser }
    : pair;
}
export function chaseRoleLabel(
  id: ChaseEffectId,
  direction: "left" | "right" = "left",
) {
  const pair = chaseRoles(id, direction);
  return `${pair.chaser[0].toUpperCase()}${pair.chaser.slice(1)} chases ${pair.leader}`;
}
