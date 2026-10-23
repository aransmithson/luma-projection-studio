# Phone remote

Nox 1.25 adds local phone control of the scene currently open on the PC. Use the phone browser while standing beside your props and watching the projector. The desktop remains the source of truth, with its existing autosave, Undo, locks and playback clock.

## Connect

1. Connect the PC and phone to the same trusted Wi-Fi. Ethernet on the PC also works if it is on the same local network.
2. Click the **Phone remote** icon in the Nox header, then **Start phone remote**.
3. Scan the QR code with the phone camera, or type the displayed **Phone address** into the browser. If the PC has several network adapters, choose the address for the network shared with your phone.
4. Enter the six-digit pairing code. The QR contains the address only; the code is still required.
5. Keep Nox open. You can close the pairing dialog and continue using the desktop.

The code expires after 10 minutes. One phone may be paired at a time. **Disconnect phone & change code** revokes the old phone and permits a new pairing. **Stop phone remote** closes the listener. Closing or reloading Nox also stops it; sessions end after eight hours. It never starts automatically with Nox or a saved project.

If Windows asks, allow Nox on **private networks**. Nox does not change firewall rules. Guest Wi-Fi, client isolation, VPNs or a public-network firewall policy can prevent a connection. Use the exact address shown for the current session; its port may change after restarting the remote.

This version uses local HTTP on trusted Wi-Fi. It has no internet relay, account, router configuration or remote cloud access. Use it on a network you trust.

## Edit from the phone

- **Map:** select a shape from the list or tap its outline. Drag a selected shape or its numbered corners. Selecting a corner reveals that edge's existing Bézier controls. Ellipses move and resize as whole shapes. Pan, zoom and focus buttons help with small details; nudging supports 1, 5 or 10 projector pixels. Size fields use projector pixels. You can hide, duplicate or delete shapes; duplicating and moving a parent includes its holes.
- **Effects:** search the built-in catalogue or apply an animation already imported on the PC. Adjust opacity, speed, scale, edge softness, colour cycling, colour, blend mode, content rotation and offsets. Cutouts do not have effects of their own. Linked-animation membership, timing and scale remain in the desktop stacked editor.
- **Scene:** adjust master brightness and layer visibility, and add a rectangle, triangle, ellipse, arch, hexagon or star to an unlocked layer.
- **Transport:** play/pause, restart, placement mesh and blackout update the desktop and projector. Undo and Redo use the same scene history as the desktop.

Drag and slider edits apply when you release the control, so each gesture is one Undo step. The phone shows a live wireframe layout with colour hints; it does not stream the animated projector image. Watch the projector for the final appearance. Map zoom is independent of desktop canvas zoom and never changes geometry.

Desktop changes appear on the phone automatically. If the scene changes while you are making an edit, Nox rejects the stale edit and refreshes the view. Finish the current desktop drag, text edit or dialog before editing shapes from the phone. On connection loss, controls become unavailable; pending edits are never automatically resubmitted. Check the current scene before repeating an edit whose confirmation was interrupted.

Changes are autosaved in Nox's normal recovery storage on the PC. Use **Save project** on the desktop to write a project file. Opening projects, importing new files, drawing new custom polygons, creating/rearranging linked stacks, photo editing, AI generation, audio capture and display selection remain desktop operations. Photo images, prompts, AI keys, file paths and audio frames are not sent to the phone. Existing holes, imported animation bindings and shared scene mappings are preserved by remote edits.

## Development and verification

Build both desktop and phone entries with `npm run build`. The main process serves only the phone entry's manifest-listed assets, never a generic project directory. Node's built-in HTTP server is the only desktop server dependency; QR generation is bundled in the frontend. See the [remote boundary instructions](../.github/instructions/phone-remote.instructions.md).

Run `npm test` and `npm run test:remote`; for a packaged build set `LUMA_RELEASE_DIR` and run `npm run test:remote -- --packaged`. The native workflow uses isolated desktop and Edge profiles under `test-results`, a generated GIF and a mobile viewport with touch events. It does not use a real phone or verify the user's router/firewall configuration. It checks real desktop/output state, pairing/revocation, touch geometry, conflicts, Undo and narrow-screen layout. Native workflows must run sequentially.
