import { mod, smooth } from "./effects/common";

// One hop has aim/fire, opening, traversal, closing and a rest. The destination
// at the end of a hop is exactly the source of the next, including the wrap.
export function portalTimeline(
  time: number,
  duration: number,
  count: number,
  direction: "left" | "right" = "left",
) {
  const cycle = mod(Math.round(mod(time / duration, 1) * 1e7), 1e7) / 1e7;
  const leg = Math.min(count - 1, Math.floor(cycle * count));
  const phase = cycle * count - leg;
  const from = mod(direction === "right" ? -leg : leg, count);
  const to = mod(from + (direction === "right" ? -1 : 1), count);
  return {
    from,
    to,
    phase,
    cycle,
    opening: smooth((phase - 0.2) / 0.14) * (1 - smooth((phase - 0.77) / 0.14)),
    shot: phase >= 0.15 && phase < 0.31 ? (phase - 0.15) / 0.16 : -1,
    travel: smooth((phase - 0.38) / 0.32),
    walking:
      phase > 0.38 && phase < 0.7
        ? Math.sin(((phase - 0.38) / 0.32) * Math.PI)
        : 0,
  };
}

export function portalPositions(
  travel: number,
  sourceWidth: number,
  destinationWidth: number,
) {
  const start = sourceWidth * 0.42,
    entry = sourceWidth * 0.86;
  const exit = destinationWidth * 0.12,
    finish = destinationWidth * 0.42;
  const distance = entry - start + finish - exit;
  return {
    entry,
    exit,
    sourceX: start + travel * distance,
    destinationX: exit + travel * distance - (entry - start),
  };
}
