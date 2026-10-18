---
description: Match Electron's installed clipboard API and verify native copy/paste without losing the user's clipboard.
applyTo: 'electron/**,scripts/**'
---

Check the installed Electron declarations before implementing native APIs. In this app's Electron 44 runtime, `clipboard.readText()` and `clipboard.writeText()` return promises. Await both inside async IPC handlers; checking `.length` on the unresolved read silently rejects valid copied shapes, and an unawaited write reports success before completion or failure.

Clipboard test substitutes must preserve the asynchronous contract, including delayed completion and rejection. A synchronous string-returning substitute made the 1.12.0 integration tests pass while actual Windows paste always failed. Run `npm run test:clipboard` against the real clipboard after clipboard changes, and use `-- --packaged` with `LUMA_RELEASE_DIR` for release verification.

The native clipboard workflow snapshots every clipboard format in memory using `clipboard.read()` and `ClipboardItem`, restores it atomically with `clipboard.write()`, and never prints or saves its contents. Restore only while the clipboard still contains this test's own data; preserve anything the user copies during the test. Keep GUI workflows sequential and use isolated app profiles.
