import type { AudioFrame, AudioSettings, EffectId } from "./types";

export const AUDIO_BANDS = 32;
export const AUDIO_WAVE = 128;
export const defaultAudioSettings: AudioSettings = {
  gain: 1.5,
  smoothing: 0.55,
  noiseGate: 0.003,
};
export const musicIds = [
  "eq-bars",
  "eq-mirror",
  "eq-halo",
  "eq-wave",
  "eq-reactor",
  "eq-city",
] as const;
export type MusicEffectId = (typeof musicIds)[number];
export const isMusicEffect = (id: EffectId): id is MusicEffectId =>
  (musicIds as readonly string[]).includes(id);
const clamp = (n: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, n));
export const silentAudio: AudioFrame = {
  sequence: 0,
  capturedAt: 0,
  bands: Array(AUDIO_BANDS).fill(0),
  peaks: Array(AUDIO_BANDS).fill(0),
  wave: Array(AUDIO_WAVE).fill(0),
  level: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  beat: 0,
};
const average = (values: number[]) =>
  values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);

// One analyser per input. Its compact frames are shared with every mapped shape
// and output window; neither renderer opens a second audio device.
export class SpectrumAnalysis {
  private bands = Array<number>(AUDIO_BANDS).fill(0);
  private peaks = [...this.bands];
  private level = 0;
  private averageBass = 0;
  private beat = 0;
  private lastBeat = -Infinity;
  private lastTime = 0;

  sample(
    db: Float32Array,
    wave: Float32Array,
    sampleRate: number,
    settings: AudioSettings,
    time: number,
    sequence: number,
  ): AudioFrame {
    const dt = this.lastTime
      ? clamp((time - this.lastTime) / 1000, 0.001, 0.25)
      : 1 / 30;
    this.lastTime = time;
    const rms = Math.sqrt(
      wave.reduce((sum, value) => sum + value * value, 0) /
        Math.max(1, wave.length),
    );
    const gate = rms >= settings.noiseGate && rms > 0.000001;
    const hzPerBin = sampleRate / (db.length * 2);
    const maxHz = Math.min(16000, sampleRate / 2);
    const target = Array.from({ length: AUDIO_BANDS }, (_, i) => {
      if (!gate) return 0;
      const lo = 40 * (maxHz / 40) ** (i / AUDIO_BANDS),
        hi = 40 * (maxHz / 40) ** ((i + 1) / AUDIO_BANDS);
      const from = Math.max(
        1,
        Math.min(db.length - 1, Math.floor(lo / hzPerBin)),
      );
      const to = Math.min(
        db.length,
        Math.max(from + 1, Math.ceil(hi / hzPerBin)),
      );
      let power = 0;
      for (let k = from; k < to; k++)
        power += Number.isFinite(db[k]) ? 10 ** (db[k] / 10) : 0;
      const levelDb = 10 * Math.log10(Math.max(1e-14, power / (to - from)));
      return clamp(((levelDb + 70) / 60) * settings.gain);
    });
    const follow = (old: number, next: number) => {
      const tau =
        next > old
          ? 0.018 + settings.smoothing * 0.035
          : 0.04 + settings.smoothing * 0.52;
      const value = old + (next - old) * (1 - Math.exp(-dt / tau));
      return value < 0.0001 ? 0 : value;
    };
    this.bands = target.map((n, i) => follow(this.bands[i], n));
    this.peaks = this.bands.map((n, i) =>
      Math.max(
        n,
        this.peaks[i] - dt * (0.25 + 0.65 * (1 - settings.smoothing)),
      ),
    );
    this.level = follow(this.level, gate ? clamp(rms * settings.gain * 3) : 0);
    const bass = average(this.bands.slice(0, 10)),
      mid = average(this.bands.slice(10, 23)),
      treble = average(this.bands.slice(23));
    if (
      bass > 0.12 &&
      bass > this.averageBass * 1.35 + 0.035 &&
      time - this.lastBeat > 180
    ) {
      this.beat = 1;
      this.lastBeat = time;
    } else this.beat *= Math.exp(-dt / 0.18);
    this.averageBass += (bass - this.averageBass) * (1 - Math.exp(-dt / 0.5));
    return {
      sequence,
      capturedAt: time,
      bands: [...this.bands],
      peaks: [...this.peaks],
      wave: Array.from({ length: AUDIO_WAVE }, (_, i) =>
        gate
          ? clamp(
              wave[Math.floor((i * wave.length) / AUDIO_WAVE)] *
                settings.gain *
                2,
              -1,
              1,
            )
          : 0,
      ),
      level: this.level,
      bass,
      mid,
      treble,
      beat: this.beat,
    };
  }
}

// Only previews and the explicitly selected Demo source use synthetic music.
export function demoAudio(
  time: number,
  sequence = 0,
  capturedAt = 0,
): AudioFrame {
  const t =
      (((Math.round(time * 1e6) % 8_000_000) + 8_000_000) % 8_000_000) / 1e6,
    angle = t * Math.PI * 2;
  const kick = Math.exp(-Math.abs(Math.sin(t * Math.PI * 2)) * 6);
  const bands = Array.from({ length: AUDIO_BANDS }, (_, i) =>
    clamp(
      0.12 +
        (0.35 * (1 + Math.sin((angle * ((i % 3) + 1)) / 8 + i * 0.63))) / 2 +
        kick * 0.55 * Math.exp(-i / 12) +
        0.18 * Math.sin(angle * 0.5 - i * 0.4) ** 2,
    ),
  );
  return {
    sequence,
    capturedAt,
    bands,
    peaks: bands.map((n) => Math.min(1, n + 0.07)),
    wave: Array.from(
      { length: AUDIO_WAVE },
      (_, i) =>
        Math.sin(i * 0.17 + angle * 0.5) * (0.22 + kick * 0.35) +
        Math.sin(i * 0.41 - angle) * 0.1,
    ),
    level: average(bands),
    bass: average(bands.slice(0, 10)),
    mid: average(bands.slice(10, 23)),
    treble: average(bands.slice(23)),
    beat: kick,
  };
}
