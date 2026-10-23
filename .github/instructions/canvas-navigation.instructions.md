---
description: Preserve precise editor navigation, bounded GPU buffers and unchanged projector output.
applyTo: 'src/useStageNavigation.ts,src/canvasView*,src/components/Stage.tsx,src/components/ProjectionCanvas.tsx,src/App.tsx,src/styles.css,scripts/zoom-workflow.mjs'
---

Canvas zoom is relative to the fitted workspace, not projector pixel density. Keep zoom and scroll outside the project/RenderState model: navigating must not modify saved coordinates, effect transforms or the shared playback clock. Preserve normalized scene coordinates under the pointer when wheel-zooming, and the view centre when resizing panels or windows. Fit must also recenter when the current zoom is already 100%.

The editor's CSS board can be much larger than its WebGL buffer. At 1600%, a 1000px-wide fitted board becomes 16000 CSS pixels wide; passing that size times devicePixelRatio directly to the renderer can exceed GPU limits. Use the editor-only `editorPreviewSize` cap (projector resolution and a 4096px side), preserve the aspect ratio, and leave the output window's resolution path unchanged. Keep SVG handles and text strokes constant in screen pixels, including corner-number outlines and draft/grid strokes.

Intercept pan gestures in the scroll container's capture phase, before surface and corner handlers can start edits. Middle-button panning must preserve polygon drafts. Release pointer capture on completion, cancellation or window blur; do not reuse Space for panning because it controls playback. Register Ctrl+wheel as a non-passive listener on the canvas so it does not zoom the entire Electron page.

Run `npm test`, `npm run build`, `npm run test:zoom`, `npm run test:desktop` and `npm run test:placement` after navigation changes; run native workflows sequentially with isolated profiles. Before distributing a build, repeat `npm run test:zoom -- --packaged` using `LUMA_RELEASE_DIR`. Check exact paused projector pixels and saved geometry before/after navigation, both zoom limits, pointer anchoring, fixed handle sizes, corner/Bézier edits and Undo, and layout after panel/window resizing. Generated fixtures belong under `test-results`; never use a user's scene or real profile for testing.
