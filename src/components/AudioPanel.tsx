import { useSyncExternalStore } from "react";
import {
  AudioLines,
  Mic,
  Monitor,
  Play,
  RefreshCw,
  Square,
} from "lucide-react";
import { defaultAudioSettings, silentAudio } from "../audioAnalysis";
import { getAudioFrame, subscribeAudio } from "../audioStore";
import type { AudioSettings, AudioSource } from "../types";
import type { AudioInputControls } from "../useAudioInput";
import { RangeControl } from "./Inspector";

function AudioMeter() {
  const frame =
    useSyncExternalStore(subscribeAudio, getAudioFrame) ?? silentAudio;
  return (
    <div className="audio-meter">
      <div
        className="audio-spectrum-meter"
        role="meter"
        aria-label="Audio input level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(frame.level * 100)}
      >
        {frame.bands.map((value, i) => (
          <i
            key={i}
            style={{
              height: `${3 + value * 97}%`,
              background: `hsl(${180 + i * 4},85%,65%)`,
            }}
          />
        ))}
      </div>
      <div className="audio-meter-labels">
        <span>Bass</span>
        <span>{Math.round(frame.level * 100)}% level</span>
        <span>Treble</span>
      </div>
    </div>
  );
}
export function AudioPanel({
  input,
  settings,
  change,
  begin,
  finish,
}: {
  input: AudioInputControls;
  settings?: AudioSettings;
  change: (settings: AudioSettings) => void;
  begin: () => void;
  finish: () => void;
}) {
  const value = settings ?? defaultAudioSettings,
    active = ["starting", "live", "demo"].includes(input.status.state);
  return (
    <div className="audio-panel">
      <div className="audio-source-options" aria-label="Audio source">
        {(
          [
            ["system", "Computer audio", Monitor],
            ["microphone", "Microphone / line-in", Mic],
            ["demo", "Demo signal", AudioLines],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            aria-pressed={input.source === id}
            onClick={() => input.chooseSource(id as AudioSource)}
          >
            <Icon size={19} />
            {label}
          </button>
        ))}
      </div>
      <p className="muted-copy">
        {input.source === "system"
          ? "React to music playing on this Windows PC, including your music player or browser."
          : input.source === "microphone"
            ? "Use a microphone, mixer or audio interface connected to this computer."
            : "Try the visuals with a simulated beat. This mode does not listen to music or play any sound."}
      </p>
      {input.source === "microphone" && (
        <div className="audio-device-row">
          <label>
            Input device
            <select
              aria-label="Audio input device"
              value={input.deviceId}
              onChange={(e) => input.chooseDevice(e.target.value)}
            >
              <option value="">Windows default input</option>
              {input.deviceId &&
                !input.devices.some((d) => d.deviceId === input.deviceId) && (
                  <option value={input.deviceId}>
                    Disconnected input — choose another
                  </option>
                )}
              {input.devices
                .filter((d) => d.deviceId && d.deviceId !== "default")
                .map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Audio input ${i + 1}`}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="secondary-button"
            aria-label="Refresh audio devices"
            onClick={() => void input.refreshDevices()}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      )}
      <AudioMeter />
      <div className={`audio-input-status ${input.status.state}`} role="status">
        {input.status.message}
      </div>
      <div className="audio-input-actions">
        <button
          className={active ? "secondary-button" : "primary-button"}
          onClick={() => (active ? input.stop() : void input.start())}
        >
          {active ? <Square size={15} /> : <Play size={15} />}{" "}
          {active
            ? "Stop audio"
            : input.source === "demo"
              ? "Start demo"
              : "Start audio"}
        </button>
        <span>Listening starts only when you press Start.</span>
      </div>
      <div className="audio-tuning">
        <RangeControl
          label="Audio sensitivity"
          value={value.gain}
          min={0.25}
          max={8}
          step={0.05}
          display={`${value.gain.toFixed(2)}×`}
          onChange={(gain) => change({ ...value, gain })}
          begin={begin}
          finish={finish}
        />
        <RangeControl
          label="Audio smoothing"
          value={value.smoothing}
          min={0}
          max={0.95}
          step={0.05}
          display={`${Math.round(value.smoothing * 100)}%`}
          onChange={(smoothing) => change({ ...value, smoothing })}
          begin={begin}
          finish={finish}
        />
        <RangeControl
          label="Audio noise gate"
          value={value.noiseGate}
          min={0}
          max={0.05}
          step={0.001}
          display={
            value.noiseGate === 0
              ? "Off"
              : `${(value.noiseGate * 100).toFixed(1)}%`
          }
          onChange={(noiseGate) => change({ ...value, noiseGate })}
          begin={begin}
          finish={finish}
        />
      </div>
      <p className="control-hint">
        Choose an effect from Music, then play your music. Raise sensitivity for
        quiet inputs; use the noise gate to ignore background hum. All shapes
        share this input. Pause freezes the visuals while the meter keeps
        listening. Audio is analysed locally and is not recorded.
      </p>
      {input.status.state === "error" && (
        <p className="audio-error" role="alert">
          Refresh your input devices or try Microphone / line-in. Audio stays
          off until you start again.
        </p>
      )}
    </div>
  );
}
