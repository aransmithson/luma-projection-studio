import { useCallback, useEffect, useRef } from "react";
import type { Point } from "./types";

// Pointer messages are small and independent of project/history updates.
export function useOutputPointer(
  enabled: boolean,
  send: (point: Point | null) => void,
) {
  const last = useRef<Point | null>(null),
    current = useRef<Point | null>(null),
    active = useRef(enabled),
    sender = useRef(send),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  active.current = enabled;
  sender.current = send;
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const point = active.current ? last.current : null;
    if (point?.x === current.current?.x && point?.y === current.current?.y)
      return;
    current.current = point;
    sender.current(point);
  }, []);
  const track = useCallback(
    (point: Point | null) => {
      last.current = point;
      if (!point) flush();
      else if (!timer.current) timer.current = setTimeout(flush, 1000 / 30);
    },
    [flush],
  );
  useEffect(flush, [enabled, flush]);
  useEffect(() => {
    const leave = () => track(null);
    window.addEventListener("blur", leave);
    return () => {
      window.removeEventListener("blur", leave);
      clearTimeout(timer.current);
      sender.current(null);
    };
  }, [track]);
  return { current, track };
}
