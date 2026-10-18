import { mod, smooth } from "./effects/common";
export function stackFlow(time: number, duration: number, count: number) {
  const phase = (mod(time, duration) / duration) * count,
    from = Math.min(count - 1, Math.floor(phase)),
    to = (from + 1) % count,
    progress = phase - from,
    transfer = smooth(progress);
  return {
    from,
    to,
    progress,
    transfer,
    stream: Math.sin(progress * Math.PI),
    levels: Array.from({ length: count }, (_, i) =>
      i === from ? 1 - transfer : i === to ? transfer : 0,
    ),
  };
}
