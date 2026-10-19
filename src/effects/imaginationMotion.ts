import { mod, random, smooth } from "./common";

export const IMAGINATION_LOOP = 12;
export function imaginationPhase(time: number, seed: number) {
  return (
    mod(Math.round(mod(time + random(91, seed) * 12, 12) * 1e6), 12e6) / 12e6
  );
}
export function bubbleLife(phase: number, index: number, seed: number) {
  const age = mod(phase * 2 + random(index + 24, seed), 1);
  return {
    age,
    size: smooth(age / 0.2) * (1 - smooth((age - 0.68) / 0.08)),
    burst: smooth((age - 0.69) / 0.06) * (1 - smooth((age - 0.84) / 0.16)),
    spread: smooth((age - 0.7) / 0.3),
  };
}
export const weaveHeight = (phase: number) =>
  0.08 + 0.92 * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2));

// Ball contact and room distortion use the same state, including the loop seam.
export function rubberMotion(phase: number) {
  const x = 0.5 + Math.cos(phase * Math.PI * 4) * 0.32;
  const y = 0.5 + Math.sin(phase * Math.PI * 6) * 0.29;
  return {
    x,
    y,
    left: smooth((0.29 - x) / 0.11),
    right: smooth((x - 0.71) / 0.11),
    top: smooth((0.32 - y) / 0.11),
    bottom: smooth((y - 0.68) / 0.11),
  };
}
