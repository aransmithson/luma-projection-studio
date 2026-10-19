---
description: Keep imported animations local, portable and synchronized with Luma playback.
applyTo: 'electron/media.cjs,electron/main.cjs,electron/preload.cjs,src/media*.ts,src/components/MediaControls.tsx,scripts/media-*.mjs'
---

Imports support MP4 (H.264 recommended) and GIF only. Keep video muted and keep audio capture behind its existing explicit Start action. Main/preload must continue to depend only on Electron and Node built-ins.

Use native file dialogs and managed content-hash filenames. Never accept filesystem paths or arbitrary URLs from project JSON or renderer IPC. Preserve size/signature checks, bounded protocol range responses, metadata validation, companion hash checks and symbolic-link rejection. The custom protocol must not bypass CSP.

Keep version-1 projects compatible: imported surfaces carry a `media` binding; the 154 built-ins remain in the procedural catalogue. Project JSON excludes thumbnails and original source paths. Save the referenced files beside the project in `<project path>.media`; restore them into the local library on Open. Missing media must not prevent editing geometry. Locate original restores the same content hash without replacing mapping/timing settings.

Use the shared playback clock. GIF frame selection uses parsed delays and Chromium ImageDecoder composition/disposal; an independently animated img element cannot honor Pause/Restart. Muted video playback must correct drift and seek on pause/restart/trim changes. Dispose decoders, frames and video elements when no longer used. Preserve transparent GIF pixels through the GPU, while keeping existing procedural effects' compositing unchanged.

Run `npm test`, `npm run build`, `npm run test:media` and the relevant compositor checks. The media workflow generates original GIF/H.264 fixtures without third-party footage, uses isolated profiles under test-results, and supports `-- --packaged` with LUMA_RELEASE_DIR. Run native workflows sequentially and close only their own app instances. Inspect the minimum-window-size screenshot as well as playback results.
