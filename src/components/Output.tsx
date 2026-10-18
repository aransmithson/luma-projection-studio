import { useEffect, useState } from "react";
import type { Point, RenderState } from "../types";
import { ProjectionCanvas } from "./ProjectionCanvas";
import { ProjectionWireframe } from "./ProjectionWireframe";
import { ProjectionPointer } from "./ProjectionPointer";
import { setAudioFrame } from "../audioStore";

export function Output() {
  const [state, setState] = useState<RenderState | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [size, setSize] = useState({ width: innerWidth, height: innerHeight });
  useEffect(() => {
    document.body.classList.add("output-body");
    const resize = () => setSize({ width: innerWidth, height: innerHeight });
    window.addEventListener("resize", resize);
    let unsubscribe: (() => void) | undefined;
    let unsubscribePointer: (() => void) | undefined;
    let unsubscribeAudio: (() => void) | undefined;
    let channel: BroadcastChannel | undefined;
    if (window.luma) {
      unsubscribe = window.luma.onOutputState((value) => {
        setAudioFrame(value.audio ?? null);
        setState(value);
        setPointer(value.pointer ?? null);
      });
      unsubscribePointer = window.luma.onOutputPointer(setPointer);
      unsubscribeAudio = window.luma.onAudioFrame(setAudioFrame);
      void window.luma.getOutputState().then((value) => {
        if (value) {
          setAudioFrame(value.audio ?? null);
          setState(value);
          setPointer(value.pointer ?? null);
        }
      });
    } else {
      channel = new BroadcastChannel("luma-output");
      channel.onmessage = (event) => {
        if (event.data.type === "state") {
          setAudioFrame(event.data.state.audio ?? null);
          setState(event.data.state);
          setPointer(event.data.state.pointer ?? null);
        }
        if (event.data.type === "pointer") setPointer(event.data.pointer);
        if (event.data.type === "audio") setAudioFrame(event.data.audio);
      };
      channel.postMessage({ type: "ready" });
    }
    const key = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "m" &&
        !e.repeat &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        if (window.luma) void window.luma.controlOutput("mesh");
        else channel?.postMessage({ type: "toggle-mesh" });
        return;
      }
      if (window.luma) {
        if (e.key === "Escape") {
          e.preventDefault();
          void window.luma.controlOutput("close");
        }
        if (e.key.toLowerCase() === "f") {
          e.preventDefault();
          void window.luma.controlOutput("fullscreen");
        }
        return;
      }
      if (e.key.toLowerCase() === "f") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => {});
      }
      if (e.key === "Escape" && !document.fullscreenElement) window.close();
    };
    window.addEventListener("keydown", key);
    return () => {
      unsubscribe?.();
      unsubscribePointer?.();
      unsubscribeAudio?.();
      channel?.close();
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", key);
      document.body.classList.remove("output-body");
    };
  }, []);
  if (!state) return <div className="output-root" />;
  const aspect = state.project.width / state.project.height;
  const width = Math.min(size.width, size.height * aspect);
  const showCursor =
    !state.blackout &&
    !state.testPattern &&
    (state.placementMesh || state.alignment?.visible);
  return (
    <div className={`output-root${showCursor ? " output-aligning" : ""}`}>
      <div className="output-frame" style={{ width, height: width / aspect }}>
        <ProjectionCanvas state={state} />
        <ProjectionWireframe state={state} />
        <ProjectionPointer state={state} point={pointer} />
      </div>
    </div>
  );
}
