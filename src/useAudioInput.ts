import { useCallback, useEffect, useRef, useState } from "react";
import { AudioInput, type AudioStatus } from "./audioInput";
import { setAudioFrame } from "./audioStore";
import { defaultAudioSettings } from "./audioAnalysis";
import type { AudioFrame, AudioSettings, AudioSource } from "./types";

export function useAudioInput(
  settings: AudioSettings | undefined,
  send: (frame: AudioFrame | null) => void,
) {
  const current = useRef(settings ?? defaultAudioSettings),
    publish = useRef(send);
  current.current = settings ?? defaultAudioSettings;
  publish.current = send;
  const [status, setStatus] = useState<AudioStatus>({
    state: "off",
    message: "Audio is off",
  });
  const [source, setSource] = useState<AudioSource>(() => {
    try {
      const s = localStorage.getItem("luma-audio-source");
      return s === "microphone" || s === "demo" ? s : "system";
    } catch {
      return "system";
    }
  });
  const [deviceId, setDeviceId] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const controller = useRef<AudioInput | null>(null);
  if (!controller.current)
    controller.current = new AudioInput(
      () => current.current,
      (frame) => {
        setAudioFrame(frame);
        publish.current(frame);
      },
      setStatus,
    );
  const refreshDevices = useCallback(async () => {
    try {
      setDevices(
        ((await navigator.mediaDevices?.enumerateDevices()) ?? []).filter(
          (d) => d.kind === "audioinput",
        ),
      );
    } catch {
      setDevices([]);
    }
  }, []);
  useEffect(() => {
    void refreshDevices();
    const stop = () => controller.current!.stop();
    window.addEventListener("beforeunload", stop);
    navigator.mediaDevices?.addEventListener("devicechange", refreshDevices);
    return () => {
      window.removeEventListener("beforeunload", stop);
      navigator.mediaDevices?.removeEventListener(
        "devicechange",
        refreshDevices,
      );
      stop();
    };
  }, [refreshDevices]);
  return {
    status,
    source,
    deviceId,
    devices,
    refreshDevices,
    chooseSource: (value: AudioSource) => {
      controller.current!.stop();
      setSource(value);
      try {
        localStorage.setItem("luma-audio-source", value);
      } catch {
        /* Session selection remains available. */
      }
      if (value === "microphone") void refreshDevices();
    },
    chooseDevice: (value: string) => {
      controller.current!.stop();
      setDeviceId(value);
    },
    start: async () => {
      await controller.current!.start(source, deviceId);
      if (source === "microphone") await refreshDevices();
    },
    stop: () => controller.current!.stop(),
  };
}
export type AudioInputControls = ReturnType<typeof useAudioInput>;
