# Developing Nox

Use Windows, Node.js 24 and npm. The repository is public and retains its `UNLICENSED` status; visibility is not an open-source licence.

## Setup

```powershell
npm ci
npm run dev
```

The lockfile pins the dependency versions. Installation downloads Electron. `npm run dev` starts the Vite server and the native editor; `npm run dev:web` is a browser-only preview.

## Validate changes

```powershell
npm test
npm run build
```

Choose native workflows that exercise the change. Run them sequentially with their isolated profiles:

| Change | Relevant checks |
| --- | --- |
| General editor or output | `npm run test:desktop` |
| Stacked animations | `npm run test:creative`, `npm run test:linked`, `npm run test:portals` |
| Shapes, curves or holes | `npm run test:placement`, `npm run test:cutouts` |
| Layers or copy/paste | `npm run test:layers`, `npm run test:clipboard` |
| Audio | `npm run test:audio`, `npm run test:audio-render` |
| Imported media | `npm run test:media` and `npm run test:media -- --packaged` |
| Effect rendering | `npm run test:effects` and the relevant collection workflow |

Audio checks use generated input and a brief quiet loopback test tone. Clipboard tests restore the original clipboard unless the user has copied something new. Never point a test at the real profile or close an app the test did not launch.

## Package Windows builds

Stop development servers and desktop tests before packaging. Build each version into a separate directory so a running older release stays intact.

```powershell
$env:ELECTRON_BUILDER_COMPRESSION_LEVEL='1'
npm run package -- --config.directories.output=release/1.17.0
$env:LUMA_RELEASE_DIR='release/1.17.0'
npm run test:startup -- unpacked --hidden --copy-saved-profile
npm run test:startup -- portable
npm run test:startup-recovery -- --packaged
```

Keep `build.asar: false` and `build.win.signAndEditExecutable: false`. Compare the unpacked executable's SHA-256 hash with `node_modules/electron/dist/electron.exe`: they must match. These settings avoid executable rewriting that Windows Code Integrity has blocked on the development machine. Keep `!node_modules/**/*` excluded from the package; frontend dependencies are bundled by Vite.

Distribute the complete unpacked folder as a ZIP, or the portable executable. Do not commit either binary, dependencies, build output or test profiles to Git. Attach builds to GitHub Releases and include checksums. See the [startup instructions](.github/instructions/desktop-startup.instructions.md).

## Source map

- [App](src/App.tsx): editor, shortcuts and project actions.
- [Components](src/components/): stage, inspector, effects browser, stacked editor and projector output.
- [Renderer](src/renderer.ts): shared playback clock, mapping and WebGL compositing.
- [Project model](src/model.ts): validation, limits and recovery.
- [Geometry](src/geometry.ts), [curves](src/curves.ts) and [cutouts](src/cutouts.ts): shape editing and masks.
- [Stacks](src/stacks.ts), [chase routes](src/chaseRoute.ts) and [portal motion](src/portalMotion.ts): linked scenes.
- [Effects](src/effects/) and [catalogue](src/catalog.ts): procedural artwork and effect metadata.
- [Desktop process](electron/main.cjs) and [preload bridge](electron/preload.cjs): native windows, validated IPC and file dialogs.
- [Audio analysis](src/audioAnalysis.ts) and [desktop permissions](electron/audio.cjs): shared music input.
- [Media storage](electron/media.cjs), [timing](src/media.ts) and [playback](src/mediaPlayback.ts): native imports, portable companions, GIF decoding and shared video timing. The media workflow generates its own GIF and H.264 test footage in an isolated profile; it downloads no footage or codec tools.

## Brand assets

[The vector mark](src/assets/brand-mark.svg) supplies the interface and browser favicon. `node scripts/icon.mjs` reads its three polygons to generate the 256-pixel PNG window icon and a Windows ICO with 16, 24, 32, 48, 64, 128 and 256-pixel entries. Keep the simple three-facet geometry supported by that script, and inspect the resulting icon at small and large sizes after changing it.

Nox is the display brand. Keep `package.json`'s top-level `name` as `luma-projection-studio`, and do not add a top-level `productName` or call `app.setName`: Electron uses the application name to locate the existing profile. Only `build.productName` and release filenames use the new brand. Keep the app ID, `.luma` extension, IPC, media protocol, clipboard and storage identifiers stable.

## Contributions

Keep changes focused and describe the user-visible result, validation and any limitations. Update the [changelog](CHANGELOG.md) and affected documentation when behaviour changes. Preserve `.luma` project compatibility and existing storage identifiers unless a separately tested migration is required. Do not bundle third-party footage or add an open-source licence without the owner's instruction.
