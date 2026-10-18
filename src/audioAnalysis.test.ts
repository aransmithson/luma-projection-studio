import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import {
  AUDIO_BANDS,
  AUDIO_WAVE,
  defaultAudioSettings,
  demoAudio,
  musicIds,
  silentAudio,
  SpectrumAnalysis,
} from "./audioAnalysis";
import { createProject, parseProject, serializeProject } from "./model";
import { effects } from "./catalog";

const { configureAudio, validAudioFrame, copyAudioFrame } = createRequire(
  import.meta.url,
)("../electron/audio.cjs");
const sampleRate = 48000,
  wave = Float32Array.from(
    { length: 2048 },
    (_, i) => 0.12 * Math.sin(i * 0.13),
  );
const tone = (hz: number, db = -25) => {
  const bins = new Float32Array(1024).fill(-Infinity);
  bins[Math.round(hz / (sampleRate / 2048))] = db;
  return bins;
};
const settings = { ...defaultAudioSettings, gain: 1, smoothing: 0 };
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("live music analysis", () => {
  it("distinguishes bass, mid and treble without producing invalid samples", () => {
    for (const [hz, range] of [
      [94, [0, 10]],
      [1000, [10, 23]],
      [8000, [23, 32]],
    ] as const) {
      const analysis = new SpectrumAnalysis();
      let frame = silentAudio;
      for (let i = 1; i <= 8; i++)
        frame = analysis.sample(
          tone(hz),
          wave,
          sampleRate,
          settings,
          1000 + i * 33,
          i,
        );
      expect(sum(frame.bands.slice(...range))).toBeGreaterThan(0.2);
      expect(
        sum(frame.bands.slice(0, range[0])) + sum(frame.bands.slice(range[1])),
      ).toBe(0);
      expect(frame.wave).toHaveLength(AUDIO_WAVE);
      expect(frame.bands).toHaveLength(AUDIO_BANDS);
      expect(validAudioFrame(frame)).toBe(true);
    }
  });
  it("gates background noise, preserves signed waveform and responds to sensitivity", () => {
    const sample = (gain: number, noiseGate = 0.003, signal = wave) =>
      new SpectrumAnalysis().sample(
        tone(1000, -55),
        signal,
        sampleRate,
        { ...settings, gain, noiseGate },
        1000,
        1,
      );
    expect(sample(4).mid).toBeGreaterThan(sample(0.5).mid);
    const quiet = sample(8, 0.01, new Float32Array(2048).fill(0.0001));
    expect(quiet.bands.every((n) => n === 0)).toBe(true);
    expect(quiet.wave.every((n) => n === 0)).toBe(true);
    expect(sample(1).wave.some((n) => n < 0)).toBe(true);
    expect(sample(1).wave.some((n) => n > 0)).toBe(true);
  });
  it("decays to silence, retains falling peak markers and smooths sudden changes", () => {
    const fast = new SpectrumAnalysis(),
      slow = new SpectrumAnalysis();
    let f = silentAudio,
      s = silentAudio;
    for (let i = 1; i <= 20; i++) {
      f = fast.sample(tone(94), wave, sampleRate, settings, i * 33, i);
      s = slow.sample(
        tone(94),
        wave,
        sampleRate,
        { ...settings, smoothing: 0.95 },
        i * 33,
        i,
      );
    }
    f = fast.sample(
      tone(94),
      new Float32Array(2048),
      sampleRate,
      settings,
      700,
      21,
    );
    s = slow.sample(
      tone(94),
      new Float32Array(2048),
      sampleRate,
      { ...settings, smoothing: 0.95 },
      700,
      21,
    );
    expect(s.bass).toBeGreaterThan(f.bass);
    expect(Math.max(...f.peaks)).toBeGreaterThan(Math.max(...f.bands));
    for (let i = 22; i < 240; i++)
      s = slow.sample(
        new Float32Array(1024).fill(-Infinity),
        new Float32Array(2048),
        sampleRate,
        settings,
        700 + i * 33,
        i,
      );
    expect(s.bands.every((n) => n === 0)).toBe(true);
    expect(s.peaks.every((n) => n === 0)).toBe(true);
    expect(s.level).toBe(0);
  });
  it("only triggers bass accents when bass exceeds the recent envelope", () => {
    const a = new SpectrumAnalysis(),
      bins = new Float32Array(1024).fill(-Infinity);
    for (let i = 1; i < 13; i++) bins[i] = -20;
    const first = a.sample(bins, wave, sampleRate, settings, 1000, 1);
    expect(first.beat).toBe(1);
    const second = a.sample(bins, wave, sampleRate, settings, 1033, 2);
    expect(second.beat).toBeLessThan(1);
    expect(second.beat).toBeGreaterThan(0);
    let frame = second;
    for (let i = 3; i < 150; i++)
      frame = a.sample(bins, wave, sampleRate, settings, 1000 + i * 33, i);
    expect(frame.beat).toBeLessThan(0.001);
  });
  it("has repeatable, explicitly synthetic previews for every new effect", () => {
    for (const t of [0, 0.25, 2.25, 5.3, 7.8]) {
      expect(demoAudio(t)).toEqual(demoAudio(t + 8));
      expect(validAudioFrame(demoAudio(t))).toBe(true);
    }
    expect(effects.filter((e) => e.audioReactive).map((e) => e.id)).toEqual([
      ...musicIds,
    ]);
  });
  it("round-trips tuning without storing permission, device IDs or audio samples", () => {
    const project = {
      ...createProject("blank"),
      audioSettings: defaultAudioSettings,
    };
    project.surfaces[0].effectId = "eq-halo";
    expect(parseProject(serializeProject(project))).toEqual(project);
    expect(
      parseProject(serializeProject(createProject("blank"))).audioSettings,
    ).toBeUndefined();
    for (const audioSettings of [
      { ...settings, gain: 0 },
      { ...settings, gain: 9 },
      { ...settings, smoothing: 1 },
      { ...settings, noiseGate: -1 },
    ])
      expect(() =>
        parseProject(JSON.stringify({ ...project, audioSettings })),
      ).toThrow();
  });
});

describe("desktop music boundary", () => {
  it("copies compact validated frames and rejects malformed or oversized messages", () => {
    const input = demoAudio(2, 100, 10000),
      copy = copyAudioFrame({ ...input, secret: "discard" });
    expect(copy).toEqual(input);
    expect(copy.bands).not.toBe(input.bands);
    expect(validAudioFrame(null)).toBe(true);
    for (const bad of [
      undefined,
      {},
      { ...input, bands: [1] },
      { ...input, wave: Array(129).fill(0) },
      { ...input, bass: Infinity },
      { ...input, sequence: -1 },
      { ...input, level: 2 },
      { ...input, wave: Array(128).fill(NaN) },
    ])
      expect(() => copyAudioFrame(bad)).toThrow();
  });
  it("requires an armed editor, denies camera/output capture and revokes on stop", () => {
    let check: Function, request: Function, display: Function;
    const mainFrame = {},
      contents = { mainFrame },
      output = { mainFrame: {} },
      editor = { webContents: contents, isDestroyed: () => false };
    const arm = configureAudio(
      {
        setPermissionCheckHandler: (f: Function) => (check = f),
        setPermissionRequestHandler: (f: Function) => (request = f),
        setDisplayMediaRequestHandler: (f: Function) => (display = f),
      },
      () => editor,
    );
    expect(check!(contents, "media", "", { mediaType: "audio" })).toBe(false);
    arm("microphone");
    expect(check!(contents, "media", "", { mediaType: "audio" })).toBe(true);
    expect(check!(contents, "media", "", { mediaType: "video" })).toBe(false);
    expect(check!(output, "media", "", { mediaType: "audio" })).toBe(false);
    let granted;
    request!(contents, "media", (v: boolean) => (granted = v), {
      mediaTypes: ["audio"],
    });
    expect(granted).toBe(true);
    request!(contents, "media", (v: boolean) => (granted = v), {
      mediaTypes: ["audio", "video"],
    });
    expect(granted).toBe(false);
    arm(null);
    expect(check!(contents, "media", "", { mediaType: "audio" })).toBe(false);
    expect(() => arm("camera")).toThrow();
    if (process.platform === "win32") {
      arm("system");
      request!(contents, "media", (v: boolean) => (granted = v), {
        mediaTypes: [],
      });
      expect(granted).toBe(true);
      request!(contents, "media", (v: boolean) => (granted = v), {
        mediaTypes: ["audio"],
      });
      expect(granted).toBe(false);
      request!(contents, "media", (v: boolean) => (granted = v), {
        mediaTypes: ["video"],
      });
      expect(granted).toBe(false);
      request!(output, "media", (v: boolean) => (granted = v), {
        mediaTypes: [],
      });
      expect(granted).toBe(false);
      const req = { frame: mainFrame, audioRequested: true, userGesture: true };
      let streams;
      display!(req, (v: unknown) => (streams = v));
      expect(streams).toEqual({ video: mainFrame, audio: "loopback" });
      for (const change of [
        { userGesture: false },
        { audioRequested: false },
        { frame: output.mainFrame },
      ]) {
        display!({ ...req, ...change }, (v: unknown) => (streams = v));
        expect(streams).toBeNull();
      }
    }
  });
});
