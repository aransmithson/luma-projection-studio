import type { AudioFrame } from "./types";

let current: AudioFrame | null = null;
const listeners = new Set<() => void>();
export const getAudioFrame = () => current;
export function setAudioFrame(frame: AudioFrame | null) {
  current = frame;
  listeners.forEach((listener) => listener());
}
export const subscribeAudio = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
