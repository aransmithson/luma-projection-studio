# Nox user guide

[Installation and source setup](../README.md) | [Release history](../CHANGELOG.md)

## Your first projection

1. Connect the projector to your computer. In Windows display settings, choose **Extend these displays**.
2. Open **Launch output**, select the external display and choose your canvas resolution. Use the calibration grid to align and focus the projector.
3. Add rectangles, triangles, ellipses or a custom polygon. Drag a surface to move it, or drag its corner handles to match the real object. Select a numbered corner to enter exact coordinates in the inspector. Arrow keys move the selected corner, or the whole surface when no corner is selected, one projector pixel; hold Shift for ten pixels. Use **S** beside the layer to isolate it while aligning.
4. Select a surface and click an effect in the library. The inspector's **Effect** tab controls speed, pattern scale, accent colour and variation. The **Surface** tab controls position, dimensions, opacity, edge feathering, blending and layer order.
5. Save a `.luma` project and launch output. **B** blacks out the output immediately. **F** toggles fullscreen in the output window; **Esc** closes that window.

On a computer with only one display, output starts in a separate preview window so the editor remains accessible. External displays open fullscreen. The output is letterboxed to preserve the canvas aspect ratio, so use a resolution matching your projector for edge-to-edge output. The native output prevents display sleep while open and closes if its display is disconnected.

## Import animations

In the desktop app, select an editable surface, then choose **Import animation** in the effects library. Pick an **MP4 video** or **animated GIF**. Nox checks decoding, creates a thumbnail, copies the file into its local library and applies it to the selected surface. If no editable surface is selected, the clip is still available in **Imported**. Click its card to use it on another shape. Search includes imported filenames; imported thumbnails are still previews.

Use **MP4 encoded with H.264/AVC**, ideally 1920 × 1080 at 24 or 30 fps, for detailed scenes. Use GIF for short transparent characters or graphics. MP4 sound is always muted; the separate Music input remains opt-in. WebM, MOV, standalone images, After Effects projects and executable effect plugins are not supported.

| Format | Import limits |
| --- | --- |
| MP4 | 512 MB, up to 4096 pixels per side, finite duration up to 24 hours; H.264 recommended |
| GIF | 50 MB, up to 1,200 frames, up to 4096 pixels per side and 4,194,304 pixels total |

The **Effect** inspector provides:

- **Fill:** preserve the clip's aspect ratio and crop its edges to fill the shape. **Fit:** show the whole clip with transparent space around it. **Stretch:** fill the shape without preserving aspect ratio.
- **Loop animation:** repeat the trimmed section, or turn it off to hold the final frame.
- **Trim start / Trim end:** choose the source interval in seconds. Enter a value and leave the field or press Enter to apply it.
- **Time offset:** advance the clip within the shared scene timeline. **Speed:** scale its playback rate; zero freezes it.
- Existing content rotation, horizontal/vertical offsets, colour overlays, blend modes and shape cutouts remain available. Transparent GIF pixels reveal lower layers.

Play, Pause and Restart use the same timeline in the editor and projector. Identical clips with matching speed, trim and offset share playback within each window. MP4 players correct drift against that timeline; this is not hardware frame lock or external timecode sync. GIF frames are selected by their stored delays, including disposal/transparency. Changing speed changes the clip's position relative to the shared scene clock. Use Restart when lining up a new clip. Imported videos do not automatically become linked character stories across tiles.

Imports remain available when the original file is moved. Save creates a companion folder beside the project, for example **House.luma** and **House.luma.media**. Copy both together when moving computers or sharing. Only animations referenced by the saved project are copied; the built-in effects need no media files. Existing unused files in a companion folder are retained, so review that folder before distributing it.

If media is missing, the shape remains editable and renders without its animation. Open **Effect → Locate original** and choose the exact original file; Nox verifies its content hash and keeps all mapping and timing settings. A different file should be imported and applied as a replacement. Opening a project restores available companion files into the local library. The library survives app restarts and project changes; removing a shape does not delete its source animation.

## Create a linked liquid loop

For a ready-to-play scene, use **Open project** and select [Liquid cascade](../examples/Liquid-cascade.luma). It contains just the three linked reservoirs and their return flow.

1. Click **Stacked animations** beneath Add surface, then **Create liquid stack**. This adds three reservoirs and a return stream to your current scene.
2. Close the panel and move, resize or warp each surface onto your physical objects. Connecting streams follow the inlet and outlet positions. Turn off **Show connecting streams and return loop** when you only want the mapped reservoirs.
3. Reopen the stack to change its colour, full-loop duration or flow order. Click **Save stack** to apply these settings. Use **New stack from existing surfaces** to link two to eight surfaces of your own.
4. Use the normal playback controls. **Pause** freezes the entire scene; **Restart** resets every stack to the beginning. Individual surface speed is replaced by the stack's shared duration. Hiding a surface keeps its place in the cycle; solo hides the connecting streams while you align one surface.

Projects support up to eight stacks within the 32-surface total. A surface belongs to one stack at a time. Applying another effect removes it from its stack; a stack with fewer than two members dissolves. **Unlink stack** keeps the surfaces in the scene. All these edits support Undo. Stack membership, order, colour and timing are saved in the project.

## Workspace improvements

- **More room for mapping.** Use the expand icon above the canvas to fold the effects library into a slim bar. On small windows the projector card is compact, and layer controls remain visible. Library, grid, snapping, labels and preview preferences are remembered.
- **Precise corner editing.** Select a numbered handle or choose **Edit individual corners** in the inspector. Enter exact projector pixel coordinates or nudge with arrows (Shift moves ten pixels). Custom polygons have midpoint **+** handles and **Add corner** / **Remove corner** controls. The drawing toolbar has explicit finish, undo-point and cancel buttons.
- **Solo a surface.** The **S** button beside a layer projects only that surface while you align it. Selecting another layer moves solo to it. Click the active **S** or the **Solo ×** chip to restore the scene. Solo never changes the saved visibility of other surfaces.
- **Clearer effects browsing.** Category counts, a named target surface, useful empty states and hover animation make the library easier to browse. **Previews** enables continuous thumbnail animation. Applying an effect opens its settings directly.
- **Stronger recovery.** A temporarily empty project title cannot invalidate recovery. A previous valid save is kept as a backup, with a notification if it is recovered. Interrupted corner drags remain undoable. Errors are visually distinct from successful actions.
- **Less redundant rendering.** Static thumbnails do not run animation loops. Paused or zero-speed effects reuse their textures until their settings change. Primary-display output is correctly labelled **Preview running**.

## Included capabilities

- One independent projector window, controlled live from the editor.
- Up to 32 surfaces per project and 64 vertices per custom polygon.
- True perspective texture mapping on convex four-corner rectangles.
- Triangles, ellipses and concave custom polygons with clipped effects.
- Editable subtractive shapes for holes and notches, with transparent overlaps and Bézier boundaries.
- Cubic Bézier edges on rectangles, triangles and custom polygons, with exact control-handle coordinates.
- Numerical position, size and individual corner coordinates, 15° rotation, centre alignment and optional 10-pixel snapping.
- Layer visibility, solo, locking, ordering, duplication and deletion.
- Ten surface blend modes; adjustable opacity and edge feathering.
- Independent colour overlays with eight styles, eight palettes, ten mix modes and separate motion controls.
- Synchronized animation with pause, resume, restart, brightness and blackout.
- Calibration grid, 720p/1080p/1200p/4K canvas presets, zoom and alignment guides.
- Undo/redo, automatic local recovery, validated native project save/open.
- Searchable effects, favourites, hover previews and ready-made winter/haunted-house scenes.
- Collapsible effects library, optional surface labels and larger mapping workspace.
- A quick guide and keyboard shortcuts built into the app.

## Effects library

All 154 effects and materials are generated locally: 142 animations and twelve still textures. Animation previews play on hover, or continuously when **Previews** is enabled. Still textures remain fixed unless an independent colour overlay is enabled. They do not require stock footage or external downloads.

| Collection | Effects |
| --- | --- |
| Music | Spectrum towers, Mirror pulse, Spectrum halo, Neon waveform, Bass reactor, Spectrum skyline |
| Linked stories | Portal gun journey (robot, alien and space cat explorers) |
| Chase scenes | Cat & mouse chase, Fox & rabbit chase, Ghost & pumpkin chase, Robot & alien chase, Snowman & penguin chase |
| Stage & light | Marquee light wall, Prism LED flares, Stardust cascade, Hex relief wave, Photon runway, LED stage wings, Spectrum dot matrix, Pearl silk, Marquee alphabet, Crimson silk, LED cylinder hall, LED proscenium, Ribbon light stage, Canopy of lights, LED orb chamber, Recessed diamond lattice, Cubic tide, Turning tile wall, Triangular prism skin, Concentric relief rings, Sliding relief maze |
| 3D illusions | Flying brick builders, Tumbling brick wall, Clockwork iris, Crystal geode, Origami facade, Chrome piston ocean, Celestial gyroscope, Infinite arcade, Floating citadel, Ribbon vortex, Tectonic rift, Gravity staircase |
| Ambient | Aurora drift, Deep currents, Liquid spectrum, Into the cosmos, Lava lounge, Neon arcade, Electric currents, Soft bokeh, Liquid flow stack, Enchanted bookshelf, Sand sculptor, Magnetic ferrofluid |
| Architecture | Prismatic relief, Shatter & rebuild, Liquid drapery, Chromatic brickwork, Masonry lightwave, Clockwork wall, Stained-glass sunlight, Peeling paint, Laser blueprints, Temple awakening |
| Creatures | Fox around the corner, Shy little bunny, Curious raccoon, Pocket dragon, Skeleton peek, Witch peek |
| Shadow puppets | Woodland fables, Dragon castle, Ocean tales, Moonlight ballet, Spooky parade, Winter sleigh |
| Colour blocks | Spectrum blocks, Colour mosaic, Ripple blocks, Flip tiles, Rising tiles |
| Textures | Weathered red brick, Pale limestone, Castle stonework, Weathered timber, Slate roof tiles, Cast concrete, Brushed aluminium, Riveted steel, Weathered copper, Desert sandstone, Layered sandstone, Glyph-carved pillars |
| Geometric | Neon echoes, Digital grid, Prism bands, Prism kaleidoscope, Chromatic orbits, Infinity cubes, Spectrum lattice, Prism gateway, Chrome recursion, Edge runner, Marble run, Origami garden |
| Nature | Living flames, Underwater garden, Moonlit waves, Autumn drift, Rain on glass, Bubble ballet, Cloud nine, Liquid ripples, Petal drift, Sunrise horizon, Stormfront, Frost bloom, Creeping garden, Living honeycomb, Moonlit mushrooms |
| Space | Orbital window, Drifting starfield, Warp speed, The Moon, Saturn & rings, Jupiter, ISS: Earth orbit, Spiral galaxy, Stellar nebula, Solar prominences, Comet flyby, Asteroid belt |
| Celebration | Confetti parade, Midnight fireworks, Toy train circuit |
| Halloween | Single eyeball, Eyeball swarm, Witchfire, Haunted mist, Eyes in the dark, Midnight flight, Little boo crew, The lingering ghost, Skeleton shuffle, Pumpkin party, Behind the curtain, Haunted portraits |
| Christmas | First snowfall, Merry & bright, Candy cane lane, Golden wishes |

The ten additional generic effects are Rain on glass, Bubble ballet, Cloud nine, Liquid ripples, Petal drift, Sunrise horizon, Confetti parade, Midnight fireworks, Electric currents and Soft bokeh. **Prism kaleidoscope**, **Chromatic orbits** and **Infinity cubes** start with colour cycling enabled; switch it off in the Effect tab for a fixed palette.

Straight rectangles stretch their effect with a projective transform. Curved shapes and other polygons clip a bounding-box texture to their outline. Edge runner paints the actual perimeter directly for every shape. Toy train circuit follows an inset track along the actual outer contour. Ellipses use a 48-vertex outline and resize handles. A polygon or curved boundary cannot intersect itself. Draw polygons with clicks, finish using **Finish polygon**, Enter or the first corner, remove the last point with Backspace, and cancel with Escape. Add and remove corners after drawing using the inspector or midpoint handles. Inserting a corner on a Bézier edge preserves its curve; removing a corner straightens the merged edge. Rectangles retain four corners and triangles retain three until Make outline editable converts them to polygons. Surface labels and control handles appear only in the editor; output alignment guides are controlled separately.

## Projects and recovery

The current project is saved automatically on this device after changes and recovered at the next start. The previous valid save is retained as a fallback; if the latest save is corrupt, the app restores that backup and tells you. Use **Save project** to create a named `.luma` file for backup or transfer. Switching scenes or opening a project is undoable. A file includes all shapes and effect settings. Projects using imported animations also need their `.luma.media` companion folder when transferred. Playback, solo, blackout and calibration are session controls and are not stored in project files. View preferences are stored separately on this device.

Import validates the version, effects, geometry, dimensions, limits and unique surface IDs before replacing the current project. Project files are limited to 2 MB. A corrupted recovery file will not prevent the editor from starting.
