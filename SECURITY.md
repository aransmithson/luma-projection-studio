# Security and data handling

Nox is a local desktop application with optional cloud animation generation. It has no Nox account system, telemetry or automatic update service. Mapping, effects and local playback work offline. Dependency installation, GitHub downloads and optional Runway generation need internet access.

## Local data

Projects and preferences are recovered from the local Electron profile. The application identity remains `luma-projection-studio`; existing `.luma` projects and storage keys remain compatible. Saved project files contain shape and effect settings. Audio device permissions and audio samples are not written into project files.

Imported MP4/GIF files are copied into the profile's managed media library. Content hashes identify them; project JSON contains metadata and playback settings, not original filesystem paths. Saving copies referenced files into a `.luma.media` companion folder. That folder contains the actual footage: review it before sharing a project. Importing and playback do not upload media. Video sound is muted.

Music input starts only when the user presses Start. Audio is analysed in memory and shared with the output as compact visualisation data; Nox does not record or upload the input. Stop, reload or closing the editor releases capture.

## Optional AI generation

Scene Animator imports JPG/PNG reference photos separately from animation imports. Photos are decoded and re-encoded as PNG, resized to at most 4096 pixels per side and stored under content hashes. Original filenames remain as display names; original paths and photo metadata are not included in projects. The normalized reference photo is copied into the `.luma.media` folder on Save. The prompt is saved in the project, so review it and the photo before sharing.

Runway requests happen only after an explicit Generate action and upload/credit acknowledgement. The entire normalized reference photo and prompt are sent to Runway, including areas outside selected shapes. Shape masks are enforced locally after generation. A Runway API key stays in the main process's memory for this app session and is not written to projects, local storage or job history. Disconnect clears it; relaunch requires re-entry. Runway handles uploaded inputs according to its own account policies. Nox does not upload audio or imported clips.

Local generation history stores task IDs, photo IDs, prompts and status, and retains recent tasks for resumption. Generated clips are downloaded to the local profile. With a key configured and the panel open, Nox polls existing tasks; reopening a panel never submits a new generation. Closing the panel or app does not cancel a cloud task. Cancel requests must be made explicitly. A submission that loses its network confirmation may still be charged; Nox does not automatically retry it.

The main process accepts no custom generation endpoints or output URLs from renderer IPC or project JSON. Task downloads are restricted to HTTPS subdomains of Runway and CloudFront, with no API authorization header, redirects or embedded credentials, and a 512 MB limit. Provider responses are bounded and provider/transport errors are replaced with actionable messages rather than echoing credentials. Generation history and temporary files are written atomically under the profile.

## Desktop boundaries

Renderers use context isolation, sandboxing and no Node integration. The preload exposes specific IPC operations. Native file dialogs run in the main process; project files are size-limited and validated. Navigation and new windows are restricted. These controls do not replace keeping Electron and dependencies current.

The `luma-media` protocol serves only validated content-hash filenames in the managed library, with bounded byte ranges for video seeking. It cannot address arbitrary local paths. Companion restoration checks file hashes and rejects symbolic links. MP4/GIF signatures and sizes are checked before import; Chromium verifies that the selected animation can be decoded before it appears in the library.

The release is not code-signed. Keep the complete application folder together and use the repository's release checksums to detect accidental corruption; checksums are not publisher signatures.

## Reporting an issue

The repository is public. Contact the owner privately about suspected vulnerabilities. Do not include secrets, personal project files, imported footage, raw audio, clipboard contents or exploit details in a public issue. For ordinary bugs, include the Nox version, Windows version, reproduction steps and a minimal example that contains no private data.

Reports should identify the affected component, expected behaviour, observed behaviour and likely impact. There is no guaranteed response time or support period.
