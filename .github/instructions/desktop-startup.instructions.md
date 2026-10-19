---
description: Preserve Windows desktop visibility and verify real Nox startup and packaging.
applyTo: 'electron/**,scripts/**,package.json'
---

Keep the packaged Electron executable unmodified: `build.asar: false` and `build.win.signAndEditExecutable: false` are both required on this machine. ASAR integrity injection modifies the executable even when resource editing is disabled, and Windows Code Integrity has blocked that combination. Verify the packaged executable hash against the installed Electron runtime.

Do not treat a running process, a loaded DOM or a successful screenshot as proof that a desktop window is visible. A launch with `windowsHide: true` reproduced a fully running editor with no visible native window. Show the editor explicitly after loading, restore it on a second-instance event, and keep `windowsHide: false` for interactive Electron launches; background shell helpers can remain hidden. Exercise `test:startup -- unpacked --hidden --copy-saved-profile` and `test:startup-recovery -- --packaged` after startup changes.

Vite bundles the frontend dependencies; the main process and preload only import Electron and Node built-ins. Preserve the package exclusion `!node_modules/**/*` unless a new desktop runtime dependency requires a targeted exception. Duplicate frontend dependency files inflated the old portable extraction from 78 to 5,239 files and made Explorer launches appear stuck in the background. Verify both the packaged contents and a normal portable launch using the user's actual Windows TEMP directory, not just an agent-specific temp root.

Use isolated test profiles, optionally seeded from a copy of the saved profile, and close only processes owned by the test. Never clear the real profile to make a startup check pass. If the user is running an older unpacked app, build into a separate version directory, for example `npm run package -- --config.directories.output=release/1.4.1`, and set `LUMA_RELEASE_DIR` to that directory for the startup, recovery, placement and portable checks.

Keep generated `release` and `test-results` trees excluded from Vite's watcher. On Windows a running Vite watcher can hold a new Electron directory open and make the packager's `win-unpacked.tmp` rename fail with `EPERM`; stop development tests before retrying a failed package. The installed runtime can also be used with `--config.electronDist=node_modules/electron/dist`, but always verify the resulting executable hash and actual native startup. For local portable verification builds, `ELECTRON_BUILDER_COMPRESSION_LEVEL=1` avoids a lengthy maximum-compression step.
