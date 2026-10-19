import { mod, smooth } from "./common";

// Quantised seconds remove floating-point differences at t and t + one loop.
export function dreamPhase(time: number, duration = 24) {
  return (
    mod(Math.round(mod(time, duration) * 1e6), duration * 1e6) /
    (duration * 1e6)
  );
}
export function bloomLife(phase: number, delay: number) {
  const age = mod(phase - delay, 1);
  return {
    stem: smooth(age / 0.22) * (1 - smooth((age - 0.8) / 0.2)),
    petals: smooth((age - 0.16) / 0.25) * (1 - smooth((age - 0.72) / 0.2)),
  };
}
export function fractureLife(phase: number) {
  return {
    reach: smooth(phase / 0.48),
    opacity: smooth(phase / 0.06) * (1 - smooth((phase - 0.76) / 0.24)),
  };
}
