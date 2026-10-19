---
description: Keep imported animations local, portable and synchronized with Nox playback.
applyTo: 'electron/media.cjs,electron/scene-*.cjs,electron/main.cjs,electron/preload.cjs,src/media*.ts,src/scene*.ts,src/renderer.ts,src/effects.ts,src/components/SceneAnimator.tsx,src/components/MediaControls.tsx,scripts/media-*.mjs,scripts/scene-*.mjs,scripts/compositing-check.mjs'
---

Imports support MP4 (H.264 recommended) and GIF only. Keep video muted and keep audio capture behind its existing explicit Start action. Main/preload must continue to depend only on Electron and Node built-ins.

Scene Animator's separate reference-photo importer accepts JPG/PNG, normalizes to PNG and strips original paths/metadata. Reference photos are not still-image effects. Preserve content-hash photo companions, validated four-corner alignment, shared scene-mapping snapshots and session-only projector photo visibility. AI generation sends the full normalized photo and prompt only after explicit acknowledgement and Generate. Keep API keys only in main memory, never retry a POST automatically, bound provider responses/downloads and restrict output hosts. Native scene tests inject a simulated transport; never use a real API key or charge a provider account in tests.

Use native file dialogs and managed content-hash filenames. Never accept filesystem paths or arbitrary URLs from project JSON or renderer IPC. Preserve size/signature checks, bounded protocol range responses, metadata validation, companion hash checks and symbolic-link rejection. The custom protocol must not bypass CSP.

Keep version-1 projects compatible: imported surfaces carry a `media` binding; built-in effects remain in the procedural catalogue. Project JSON excludes thumbnails and original source paths. Save the referenced files beside the project in `<project path>.media`; restore them into the local library on Open. Missing media must not prevent editing geometry. Locate original restores the same content hash without replacing mapping/timing settings.

Use the shared playback clock. GIF frame selection uses parsed delays and Chromium ImageDecoder composition/disposal; an independently animated img element cannot honor Pause/Restart. Muted video playback must correct drift and seek on pause/restart/trim changes. Dispose decoders, frames and video elements when no longer used. Preserve transparent GIF pixels through the GPU, while keeping existing procedural effects' compositing unchanged.

Run `npm test`, `npm run build`, `npm run test:media` and the relevant compositor checks. The media workflow generates original GIF/H.264 fixtures without third-party footage, uses isolated profiles under test-results, and supports `-- --packaged` with LUMA_RELEASE_DIR. Run native workflows sequentially and close only their own app instances. Inspect the minimum-window-size screenshot as well as playback results.

Scene changes also require `npm run test:scene` and `npm run test:scene -- --packaged`. Verify different props sample different parts of a shared clip, masks/holes remain accurate, photo toggles reach output, reopening resets projector photo visibility, and companion files restore into a missing test library. Do not claim paid live generation was verified when using the simulated transport.

## Learnings

Procedural overlays such as `cracks-glass` opt in through catalogue `transparent: true`: `drawEffect` clears their source instead of filling it, and the renderer allocates an alpha canvas and uses its alpha when blending. Keep other procedural canvases opaque so existing glow artwork stays unchanged, and recreate a surface's resource when assignment changes its alpha mode. A checkerboard belongs only behind a transparent preview in CSS, never in projected pixels. Verify clear pixels, same-ID opaque/transparent reassignment, loop/Restart clearing, all blend modes, holes and colour overlays with `test:compositing`, plus imported GIF regression coverage with `test:media`.
