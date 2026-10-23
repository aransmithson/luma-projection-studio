---
description: Keep phone control local, explicitly paired, bounded and subordinate to the desktop scene model.
applyTo: 'electron/remote.cjs,electron/main.cjs,electron/preload.cjs,src/remote/**,src/remoteModel*,src/remoteServer.test.ts,src/useRemoteControl.ts,src/components/RemotePanel.tsx,scripts/remote-workflow.mjs,vite.config.ts,remote.html'
---

Remote control starts only through the desktop Start button. Never start from recovery/project settings. Bind only for a local trusted-network session, show the address and pairing code, and stop/revoke on desktop reload, crash, close, explicit Stop or expiry. Do not change firewall/router policy. Main/preload keep Electron and Node built-ins only; frontend QR code dependencies are bundled by Vite.

Preserve the Host/private-address/origin/custom-header checks, same-origin HTTP-only session cookie, bounded pairing attempts, ten-minute pairing code, single controller, eight-hour session, body/time/connection limits and explicit static asset allowlist from the phone build manifest. Do not serve arbitrary files, local media, photos, keys, prompts, audio frames or the complete project/RenderState. The public state has a second explicit whitelist in the main process. New IPC is restricted to the editor's main frame; the phone has no Electron bridge.

The renderer validates allowlisted commands before applying them through the current model/history. Use revision checks for concurrent edits, one in-flight command, bounded request-ID deduplication and no automatic mutation retries after a timeout or reconnect. Reject mutations during a desktop history transaction or incompatible modal. Do not replace a whole project from phone-supplied JSON, break locked layers/holes, change stack membership accidentally or reset shared playback to a separate phone clock.

Touch gestures preview locally and commit once on release. Cancellation or connection loss must not commit a draft. Reject stale geometry instead of overwriting a desktop edit. Local HTTP cannot use crypto.randomUUID on phones; getRandomValues supplies request identifiers without a secure-context dependency. Restore displayed control values after a rejected edit.

Run the unit suite, build, desktop workflows, and native source/packaged remote workflows sequentially using unique test-results profiles. Exercise real touch events, projector state, imported GIF assignment, exact nudges, curved geometry, Undo, locks, stale edits, reconnect/revoke/Stop, 320px layout and packaged manifest assets. A mobile viewport test is not proof of a physical phone or router configuration working.
