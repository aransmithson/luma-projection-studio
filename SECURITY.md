# Security and data handling

Nox is a local desktop application. It has no account system, cloud storage, telemetry or automatic update service. Dependency installation and GitHub downloads require internet access; the built app runs offline.

## Local data

Projects and preferences are recovered from the local Electron profile. The application identity remains `luma-projection-studio`; existing `.luma` projects and storage keys remain compatible. Saved project files contain shape and effect settings. Audio device permissions and audio samples are not written into project files.

Imported MP4/GIF files are copied into the profile's managed media library. Content hashes identify them; project JSON contains metadata and playback settings, not original filesystem paths. Saving copies referenced files into a `.luma.media` companion folder. That folder contains the actual footage: review it before sharing a project. Importing and playback do not upload media. Video sound is muted.

Music input starts only when the user presses Start. Audio is analysed in memory and shared with the output as compact visualisation data; Nox does not record or upload the input. Stop, reload or closing the editor releases capture.

## Desktop boundaries

Renderers use context isolation, sandboxing and no Node integration. The preload exposes specific IPC operations. Native file dialogs run in the main process; project files are size-limited and validated. Navigation and new windows are restricted. These controls do not replace keeping Electron and dependencies current.

The `luma-media` protocol serves only validated content-hash filenames in the managed library, with bounded byte ranges for video seeking. It cannot address arbitrary local paths. Companion restoration checks file hashes and rejects symbolic links. MP4/GIF signatures and sizes are checked before import; Chromium verifies that the selected animation can be decoded before it appears in the library.

The release is not code-signed. Keep the complete application folder together and use the repository's release checksums to detect accidental corruption; checksums are not publisher signatures.

## Reporting an issue

The repository is public. Contact the owner privately about suspected vulnerabilities. Do not include secrets, personal project files, imported footage, raw audio, clipboard contents or exploit details in a public issue. For ordinary bugs, include the Nox version, Windows version, reproduction steps and a minimal example that contains no private data.

Reports should identify the affected component, expected behaviour, observed behaviour and likely impact. There is no guaranteed response time or support period.
