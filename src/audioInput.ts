import { demoAudio, SpectrumAnalysis } from "./audioAnalysis";
import type { AudioFrame, AudioSettings, AudioSource } from "./types";

export type AudioStatus = {
  state: "off" | "starting" | "live" | "demo" | "error";
  message: string;
};
const audioError = (error: unknown) => {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Audio access was denied. Check Windows microphone privacy settings or select another source.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "That audio input is unavailable. Refresh the device list and choose an available microphone or line-in.";
  if (name === "NotReadableError")
    return "The audio device could not be opened. It may be disconnected or in exclusive use by another app.";
  return error instanceof Error
    ? error.message
    : "Unable to start audio. Try another input.";
};
export class AudioInput {
  private generation = 0;
  private sequence = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: MediaStreamAudioSourceNode | null = null;
  constructor(
    private settings: () => AudioSettings,
    private publish: (frame: AudioFrame | null) => void,
    private status: (status: AudioStatus) => void,
  ) {}

  stop() {
    this.generation++;
    clearInterval(this.timer);
    this.timer = undefined;
    this.stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    this.stream = null;
    this.node?.disconnect();
    this.node = null;
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    void window.luma?.setAudioCapture(null).catch(() => {});
    this.publish(null);
    this.status({ state: "off", message: "Audio is off" });
  }
  async start(source: AudioSource, deviceId = "") {
    this.stop();
    const generation = this.generation;
    this.status({ state: "starting", message: "Connecting audio…" });
    if (source === "demo") {
      const start = performance.now(),
        analysis = new SpectrumAnalysis();
      this.timer = setInterval(() => {
        const demo = demoAudio((performance.now() - start) / 1000);
        const db = Float32Array.from({ length: 1024 }, (_, i) => {
          const band = Math.max(
            0,
            Math.min(
              31,
              Math.floor(
                (Math.log(Math.max(40, (i * 48000) / 2048) / 40) /
                  Math.log(400)) *
                  32,
              ),
            ),
          );
          return demo.bands[band] * 60 - 70;
        });
        this.publish(
          analysis.sample(
            db,
            Float32Array.from(demo.wave, (v) => v * 0.2),
            48000,
            this.settings(),
            Date.now(),
            ++this.sequence,
          ),
        );
      }, 1000 / 30);
      this.status({ state: "demo", message: "Demo signal · no audio input" });
      return;
    }
    let stream: MediaStream | null = null,
      context: AudioContext | null = null;
    try {
      if (!navigator.mediaDevices)
        throw new Error(
          "Audio capture is unavailable in this window. Open the desktop app.",
        );
      context = new AudioContext({ latencyHint: "interactive" });
      this.context = context;
      await context.resume();
      if (generation !== this.generation) return;
      await window.luma?.setAudioCapture(source);
      if (generation !== this.generation) return;
      const clean = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      };
      stream =
        source === "system"
          ? await navigator.mediaDevices.getDisplayMedia({
              video: { width: 16, height: 16, frameRate: 1 },
              audio: clean,
            })
          : await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: {
                ...clean,
                ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
              },
            });
      // Chromium requires a display track to grant loopback. It is never rendered
      // or recorded; release it immediately and retain only the audio track.
      stream.getVideoTracks().forEach((track) => track.stop());
      if (generation !== this.generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const track = stream.getAudioTracks()[0];
      if (!track || track.readyState !== "live")
        throw new Error(
          "No audio track was supplied. Choose microphone/line-in, or enable audio sharing in the browser picker.",
        );
      this.stream = stream;
      const node = context.createMediaStreamSource(new MediaStream([track]));
      this.node = node;
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;
      node.connect(analyser); // Deliberately no speaker connection: no monitoring echo.
      const db = new Float32Array(analyser.frequencyBinCount),
        wave = new Float32Array(analyser.fftSize),
        analysis = new SpectrumAnalysis();
      this.timer = setInterval(() => {
        if (context?.state === "closed") return;
        analyser.getFloatFrequencyData(db);
        analyser.getFloatTimeDomainData(wave);
        this.publish(
          analysis.sample(
            db,
            wave,
            context!.sampleRate,
            this.settings(),
            Date.now(),
            ++this.sequence,
          ),
        );
      }, 1000 / 30);
      track.onended = () => {
        if (generation !== this.generation) return;
        this.stop();
        this.status({
          state: "error",
          message: "Audio input disconnected. Choose an input and start again.",
        });
      };
      this.status({
        state: "live",
        message:
          source === "system"
            ? "Listening to computer audio"
            : `Listening · ${track.label || "audio input"}`,
      });
    } catch (error) {
      stream?.getTracks().forEach((t) => t.stop());
      if (context && context.state !== "closed")
        void context.close().catch(() => {});
      if (generation === this.generation) {
        this.stop();
        this.status({ state: "error", message: audioError(error) });
      }
    }
  }
}
