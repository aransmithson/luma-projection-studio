import { useEffect, useRef } from "react";
import { drawEffect } from "../effects";
import type { Effect } from "../catalog";

export function EffectPreview({
  effect,
  active = false,
}: {
  effect: Effect;
  active?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext("2d", { alpha: false })!;
    drawEffect(
      ctx,
      effect.id,
      effect.previewTime ?? 8.5,
      effect.color,
      42,
      1,
      effect.cycleByDefault,
    );
    if (!active || effect.still) return;
    let frame = 0,
      last = 0,
      visible = false;
    const render = (now: number) => {
      if (!visible) return;
      if (now - last >= 100) {
        drawEffect(
          ctx,
          effect.id,
          now / 1000,
          effect.color,
          42,
          1,
          effect.cycleByDefault,
        );
        last = now;
      }
      frame = requestAnimationFrame(render);
    };
    const observer = new IntersectionObserver(([entry]) => {
      const wasVisible = visible;
      visible = entry.isIntersecting;
      if (visible && !wasVisible) frame = requestAnimationFrame(render);
      if (!visible) cancelAnimationFrame(frame);
    });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [effect, active]);
  return <canvas ref={ref} width={280} height={160} aria-hidden="true" />;
}
