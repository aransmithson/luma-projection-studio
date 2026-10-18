import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioInput } from "./audioInput";
import { defaultAudioSettings } from "./audioAnalysis";

describe("audio input lifecycle", () => {
  const publish = vi.fn(),
    status = vi.fn(),
    permission = vi.fn(async () => {}),
    capture = vi.fn(),
    display = vi.fn();
  let input: AudioInput;
  const contexts: { state: string; close: ReturnType<typeof vi.fn> }[] = [];
  const node = { connect: vi.fn(), disconnect: vi.fn() };
  const track = () => ({
    readyState: "live",
    label: "Test input",
    onended: null as (() => void) | null,
    stop: vi.fn(),
  });
  const stream = (audio = track(), video: ReturnType<typeof track>[] = []) => ({
    getTracks: () => [audio, ...video],
    getAudioTracks: () => [audio],
    getVideoTracks: () => video,
  });
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    contexts.length = 0;
    vi.stubGlobal("window", { luma: { setAudioCapture: permission } });
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: capture, getDisplayMedia: display },
    });
    vi.stubGlobal(
      "MediaStream",
      class {
        constructor(public tracks: unknown[]) {}
      },
    );
    vi.stubGlobal(
      "AudioContext",
      class {
        state = "running";
        sampleRate = 48000;
        close = vi.fn(async () => {
          this.state = "closed";
        });
        resume = vi.fn(async () => {});
        constructor() {
          contexts.push(this);
        }
        createMediaStreamSource() {
          return node;
        }
        createAnalyser() {
          return {
            fftSize: 2048,
            frequencyBinCount: 1024,
            smoothingTimeConstant: 0,
            getFloatFrequencyData: (v: Float32Array) => v.fill(-25),
            getFloatTimeDomainData: (v: Float32Array) => v.fill(0.1),
          };
        }
      },
    );
    input = new AudioInput(() => defaultAudioSettings, publish, status);
  });
  afterEach(() => {
    input.stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("does not open any input until start and releases tracks/context/timer on stop", async () => {
    expect(capture).not.toHaveBeenCalled();
    const t = track();
    capture.mockResolvedValue(stream(t));
    await input.start("microphone", "mixer-1");
    expect(capture.mock.calls[0][0]).toMatchObject({
      video: false,
      audio: {
        deviceId: { exact: "mixer-1" },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    vi.advanceTimersByTime(100);
    expect(publish.mock.lastCall![0].level).toBeGreaterThan(0);
    expect(node.connect).toHaveBeenCalledTimes(1);
    input.stop();
    expect(t.stop).toHaveBeenCalledTimes(1);
    expect(node.disconnect).toHaveBeenCalled();
    expect(contexts[0].close).toHaveBeenCalled();
    expect(publish.mock.lastCall).toEqual([null]);
    expect(permission.mock.lastCall).toEqual([null]);
    const count = publish.mock.calls.length;
    vi.advanceTimersByTime(200);
    expect(publish).toHaveBeenCalledTimes(count);
  });
  it("ignores a capture request that completes after Stop or a source change", async () => {
    let resolve!: (s: unknown) => void;
    capture.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = input.start("microphone");
    await vi.waitFor(() => expect(capture).toHaveBeenCalled());
    await input.start("demo");
    const late = track();
    resolve(stream(late));
    await pending;
    expect(late.stop).toHaveBeenCalled();
    expect(status.mock.lastCall![0].state).toBe("demo");
    expect(contexts[0].state).toBe("closed");
    expect(node.connect).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(publish.mock.lastCall![0].level).toBeGreaterThan(0);
  });
  it("reports denial without leaving an armed permission or audio context", async () => {
    capture.mockRejectedValueOnce(
      new DOMException("Denied", "NotAllowedError"),
    );
    await input.start("microphone");
    expect(status.mock.lastCall![0]).toMatchObject({ state: "error" });
    expect(status.mock.lastCall![0].message).toContain("denied");
    expect(contexts[0].state).toBe("closed");
    expect(permission.mock.lastCall).toEqual([null]);
    expect(publish.mock.lastCall).toEqual([null]);
  });
  it("releases the display track immediately and stops on device disconnection", async () => {
    const audio = track(),
      video = track();
    display.mockResolvedValueOnce(stream(audio, [video]));
    await input.start("system");
    expect(video.stop).toHaveBeenCalledTimes(1);
    expect(audio.stop).not.toHaveBeenCalled();
    audio.onended!();
    expect(audio.stop).toHaveBeenCalled();
    expect(publish.mock.lastCall).toEqual([null]);
    expect(status.mock.lastCall![0].message).toContain("disconnected");
  });
  it("fails clearly if screen sharing supplies no audio", async () => {
    const video = track();
    display.mockResolvedValueOnce({
      getTracks: () => [video],
      getAudioTracks: () => [],
      getVideoTracks: () => [video],
    });
    await input.start("system");
    expect(status.mock.lastCall![0].message).toContain("No audio track");
    expect(contexts[0].state).toBe("closed");
    expect(permission.mock.lastCall).toEqual([null]);
  });
});
