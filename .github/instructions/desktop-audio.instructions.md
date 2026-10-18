---
description: Keep live audio capture explicit and share one analysed signal with projection output.
applyTo: 'electron/audio.cjs,electron/main.cjs,electron/preload.cjs,src/audio*.ts,src/useAudioInput.ts,src/components/AudioPanel.tsx,src/components/Output.tsx'
---

Use a single editor-owned input/analyser. Output windows consume compact audio frames and must not open another device. Initialise session permission handlers once: editor and output use the same Electron session, so installing a deny-all handler when opening output breaks capture. Arm capture only after Start, disarm on Stop/reload/crash, deny camera and output-window requests, and never auto-start capture from a saved project.

On Electron 44, `getDisplayMedia` first requests `media` permission with an **empty `mediaTypes` array**, before invoking `setDisplayMediaRequestHandler`. Permit this narrow case only for the armed system-audio editor. Ordinary microphone requests have `['audio']`; camera requests must stay denied. The display handler must check the requesting editor frame, user gesture and audio request. On Windows, use `audio: 'loopback'`; the required video source can be the editor's own `WebFrameMain`, then stop the video track immediately. No screen video needs to be stored or displayed.

The playback state carries one frozen audio snapshot for Pause; fast live frames continue to the meter. Rendering uses the same frozen snapshot in both windows, and stale live frames fall back to silence. Demo audio belongs only in library previews or the explicitly selected Demo source.

`npm run test:audio` exercises actual Chromium capture with a generated PCM test input and Windows loopback with a brief quiet test tone. It uses an isolated profile and does not record microphone or computer audio. Run native desktop workflows sequentially. `test:audio -- --packaged` accepts `LUMA_RELEASE_DIR`. `test:audio-render` checks real GPU output, silence, pause, holes, transforms, calibration and placement mesh. `LUMA_AUDIO_DEBUG=1` logs permission metadata only, never audio samples.
