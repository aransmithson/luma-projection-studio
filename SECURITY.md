# Security and data handling

Luma is a local desktop application. It has no account system, cloud storage, telemetry or automatic update service. Dependency installation and GitHub downloads require internet access; the built app runs offline.

## Local data

Projects and preferences are recovered from the local Electron profile. The application identity remains `luma-projection-studio`; existing `.luma` projects and storage keys remain compatible. Saved project files contain shape and effect settings. Audio device permissions and audio samples are not written into project files.

Music input starts only when the user presses Start. Audio is analysed in memory and shared with the output as compact visualisation data; Luma does not record or upload the input. Stop, reload or closing the editor releases capture.

## Desktop boundaries

Renderers use context isolation, sandboxing and no Node integration. The preload exposes specific IPC operations. Native file dialogs run in the main process; project files are size-limited and validated. Navigation and new windows are restricted. These controls do not replace keeping Electron and dependencies current.

The release is not code-signed. Keep the complete application folder together and use the repository's release checksums to detect accidental corruption; checksums are not publisher signatures.

## Reporting an issue

The repository is private. Share suspected vulnerabilities privately with the owner through the existing access channel. Do not include secrets, personal project files, raw audio, clipboard contents or exploit details in a public issue. For ordinary bugs, include the Luma version, Windows version, reproduction steps and a minimal example that contains no private data.

Reports should identify the affected component, expected behaviour, observed behaviour and likely impact. There is no guaranteed response time or support period.
