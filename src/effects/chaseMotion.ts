import { mod, random, TAU } from "./common";

export const CHASE_LOOP = 12;

// All movement derives from the shared playback time, never from frame deltas.
// Quantising the phase removes floating point drift at equivalent loop times.
export function chasePhase(time: number) {
  return (
    mod(Math.round(mod(time, CHASE_LOOP) * 1e6), CHASE_LOOP * 1e6) /
    (CHASE_LOOP * 1e6)
  );
}

export function chaseLayout(
  time: number,
  width: number,
  height: number,
  seed: number,
  scale = 1,
) {
  const phase = chasePhase(time),
    size = Math.max(0.25, Math.min(3, scale)),
    unit = Math.min(
      height * 0.245 * size,
      width * 0.12 * size,
      height * 0.275,
      width * 0.17,
    ),
    // This exceeds every silhouette, scarf, tail, shadow and trailing puff.
    // The centre wraps only while the entire actor is outside the viewport.
    margin = unit * 2.6,
    circuit = width + margin * 2,
    offset = 0.35 + random(31, seed) * 0.12,
    gap = circuit * (0.29 + 0.018 * Math.sin(phase * TAU)),
    lead = (phase + offset) * circuit;
  return {
    phase,
    unit,
    margin,
    circuit,
    gap,
    floor: height * 0.83,
    leaderX: mod(lead, circuit) - margin,
    chaserX: mod(lead - gap, circuit) - margin,
  };
}
