import { useEffect, useRef, useState } from "react";
import { ProjectionRenderer } from "../renderer";
import type { RenderState } from "../types";
import { getAudioFrame } from "../audioStore";

export function ProjectionCanvas({
  state,
  className = "",
  onFps,
}: {
  state: RenderState;
  className?: string;
  onFps?: (fps: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    latest = useRef(state),
    fpsCallback = useRef(onFps);
  const [error, setError] = useState("");
  latest.current = state;
  fpsCallback.current = onFps;
  useEffect(() => {
    const canvas = ref.current!;
    let renderer: ProjectionRenderer;
    try {
      renderer = new ProjectionRenderer(canvas);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Renderer unavailable.");
      return;
    }
    let frame = 0,
      last = 0,
      lastReport = performance.now(),
      count = 0,
      stopped = false;
    let width = 1,
      height = 1;
    const resize = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      width = rect.width;
      height = rect.height;
    });
    resize.observe(canvas);
    const lost = (e: Event) => {
      e.preventDefault();
      stopped = true;
      setError(
        "Graphics context lost. Save your project, then restart Nox to reconnect the renderer.",
      );
    };
    canvas.addEventListener("webglcontextlost", lost);
    const render = (time: number) => {
      if (stopped) return;
      if (time - last >= 1000 / 31) {
        last = time;
        try {
          renderer.render(
            { ...latest.current, audio: getAudioFrame() },
            width * Math.min(devicePixelRatio, 2),
            height * Math.min(devicePixelRatio, 2),
          );
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Unable to render projection.",
          );
          stopped = true;
          return;
        }
        count++;
        if (time - lastReport > 1000) {
          fpsCallback.current?.(
            Math.round((count * 1000) / (time - lastReport)),
          );
          count = 0;
          lastReport = time;
        }
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      renderer.dispose();
    };
  }, []);
  return (
    <>
      <canvas
        ref={ref}
        className={`projection-canvas ${className}`}
        aria-label="Live projection preview"
      />
      {error && (
        <div className="render-error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
