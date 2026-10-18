# Repository instructions

## Product and scope

This is **Luma Projection Studio**, a local Windows desktop projection-mapping app for one projector. The user explicitly chose to keep the Luma name. The current release contains 154 effects/materials. Video, GIF and image imports are recommendations only; do not claim they exist.

## Compatibility

- Preserve the package identity `luma-projection-studio`, app ID `studio.luma.projection`, `.luma` project extension, `luma-*` storage keys, `window.luma` bridge and `LUMA_SHAPES_V1` clipboard format. They are persistent compatibility identifiers.
- Projects use version 1, validated through the model. Keep existing projects, layer behaviour, holes and shared stack timing compatible.
- Do not move, clear or test against the real user profile. Tests use unique directories under `test-results` and close only their own processes.
- Audio capture starts only after an explicit user action. A saved project never starts listening.

## Working on the code

- Read the applicable [desktop instructions](.github/instructions/) before changing Electron, clipboard or audio behaviour.
- Use the existing Canvas 2D/WebGL pipeline and shared playback clock. Pause, Restart, editor and projector output must agree.
- Keep frontend and main-process dependencies separate. Main/preload currently use only Electron and Node built-ins.
- Preserve changes already in the workspace and avoid unrelated refactors.
- Use `rg` to find source; exclude generated output, dependencies and test profiles.

## Verification and delivery

- Run `npm run build`, and tests appropriate to the change. See [CONTRIBUTING.md](CONTRIBUTING.md) for workflows.
- Run native desktop workflows sequentially. Verify real native window visibility after startup changes, not only a loaded DOM or running process.
- Preserve `asar: false`, `signAndEditExecutable: false` and `!node_modules/**/*` packaging settings. Packaged runtime hashes must match Electron's installed executable.
- Stop Vite/tests before packaging. Keep `release` and `test-results` excluded from watchers. Build into a new version directory.
- Keep documentation accurate, especially media-import limitations. Do not commit generated releases, test profiles, credentials or dependencies.
- Do not change repository visibility or grant an open-source licence without an explicit instruction from the owner.
