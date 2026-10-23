# Nox user guide

[Installation and source setup](../README.md) | [Release history](../CHANGELOG.md)

## Your first projection

1. Connect the projector to your computer. In Windows display settings, choose **Extend these displays**.
2. Open **Launch output**, select the external display and choose your canvas resolution. Use the calibration grid to align and focus the projector.
3. Add rectangles, triangles, ellipses or a custom polygon. Drag a surface to move it, or drag its corner handles to match the real object. Select a numbered corner to enter exact coordinates in the inspector. Arrow keys move the selected corner, or the whole surface when no corner is selected, one projector pixel; hold Shift for ten pixels. Use **S** beside the layer to isolate it while aligning.
4. Select a surface and click an effect in the library. The inspector's **Effect** tab controls speed, pattern scale, accent colour and variation. The **Surface** tab controls position, dimensions, opacity, edge feathering, blending and layer order.
5. Save a `.luma` project and launch output. **B** blacks out the output immediately. **F** toggles fullscreen in the output window; **Esc** closes that window.

On a computer with only one display, output starts in a separate preview window so the editor remains accessible. External displays open fullscreen. The output is letterboxed to preserve the canvas aspect ratio, so use a resolution matching your projector for edge-to-edge output. The native output prevents display sleep while open and closes if its display is disconnected.

## Make more room for mapping

Use **Effects** and **Properties** above the canvas to hide or show the effects browser and the right-hand inspector independently. Turn both off for the largest workspace. The buttons stay visible so you can bring either panel back with one click; highlighted buttons mean that panel is open.

Nox remembers these choices on this device, including after restarting. Hiding a panel keeps your selected shape and effect search, and leaves projector playback running. The library's down-arrow also hides it; **Change effect** in the inspector opens it again. **View all** and **Compact view** still resize the effects browser while it is visible.

## Zoom and pan the canvas

- Choose **25–1600%** in the canvas toolbar or click the **− / +** buttons. Keyboard **− / +** also steps between zoom levels. **100%** means the canvas fitted to the available workspace, rather than one screen pixel per projector pixel.
- Hold **Ctrl** and scroll over the canvas to zoom around the point under the cursor. Trackpad pinch works through the same control. Ordinary scrolling moves around the enlarged canvas; Shift+scroll moves horizontally.
- Choose the **hand tool**, or press **H**, and drag to pan without moving any shapes. **Middle mouse drag** pans temporarily from any drawing tool, preserving unfinished polygon points. Choose **Select & move** or press H again to return to editing.
- Click **Fit** or press **0** to see the whole canvas. Click **Zoom to selection** or press **F** to centre and enlarge the selected shape or reference photo. Fitting a curved shape includes its visible curved outline.
- Zooming and panning change only the editor view. Shape coordinates, effect scale, projector output and playback stay unchanged. Corner and Bézier handles keep a constant screen size. The animation preview renders up to projector resolution with a 4096-pixel side limit, so very high zoom magnifies the preview pixels while the mapping outlines remain sharp.

Navigation shortcuts are inactive while typing in a text or numeric field. The existing **Space** shortcut still controls playback. Hide **Effects** and **Properties** for more room; the view keeps its centre as the workspace resizes.

## Import animations

In the desktop app, select an editable surface, then choose **Import animation** in the effects library. Pick an **MP4 video** or **animated GIF**. Nox checks decoding, creates a thumbnail, copies the file into its local library and applies it to the selected surface. If no editable surface is selected, the clip is still available in **Imported**. Click its card to use it on another shape. Search includes imported filenames; imported thumbnails are still previews.

Use **MP4 encoded with H.264/AVC**, ideally 1920 × 1080 at 24 or 30 fps, for detailed scenes. Use GIF for short transparent characters or graphics. MP4 sound is always muted; the separate Music input remains opt-in. WebM, MOV, still-image effects, After Effects projects and executable effect plugins are not supported. JPG/PNG photos are available separately as references in Scene Animator.

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

## Scene Animator

Scene Animator starts with a photo of a small prop arrangement and gives all selected shapes a shared view of one animation. It also works with imported clips without using an AI service. The same manual workflow can be used for larger objects and facades, subject to projector coverage and photo alignment; it does not reconstruct 3D geometry or calibrate a projector automatically.

### Align the reference

1. Position the projector and props, then take a photo from as close to the projector lens as practical. Keep both fixed afterward. Strong camera/projector separation produces parallax, especially with props at different depths.
2. Open **Scene Animator → Align photo → Import reference photo**. Choose JPG/JPEG or PNG, up to 30 MB and 32 megapixels. Nox stores a normalized PNG at up to 4096 pixels per side. General animation imports remain MP4/GIF only.
3. Drag the four numbered corners, or type **X px / Y px** coordinates. Keep the corners in order. **Reset photo to fit** restores the complete photo without cropping. Use **Photo opacity** to compare the reference with the content beneath it.
4. **Show photo in main editor** helps tracing. **Show photo on projector** is independent and only affects an open output window. Blackout, calibration and placement mesh take priority. Projector photo visibility is never saved and starts off after opening a project or relaunching Nox.
5. Choose **Outline props in editor**. Use existing shape, Bezier, hole and name controls to trace each physical prop, then reopen Scene Animator. Select the props that should receive the animation; locked shapes and locked layers cannot be changed.

Four-corner alignment is a perspective transform for a plane. For protruding objects, refine the individual shape masks and test the result on the actual props. A photo alone cannot guarantee alignment across multiple depths.

The imported photo also appears as **Reference photo · alignment guide** in the main object list, above your layers. Click its row to open **Reference photo properties**. Drag the photo on the canvas or use its four corners; enter exact **Photo X**, **Photo Y**, **Photo width** and **Photo height** values in projector pixels. Select a corner to edit its coordinates or nudge it with arrow keys (Shift moves ten pixels). Opacity, editor visibility, the session-only projector toggle, **Fit photo to canvas** and **Remove reference photo** are available here. These edits support Undo. The reference is an alignment guide, so it does not count toward the 32 mapped surfaces or become a still-image effect.

### Generate a variation

1. In **Create animation**, describe visible objects and the motion you want. For example: “Tiny ghosts peek from the pumpkins, float from the left box to the right box, then return.” The app adds instructions for a fixed camera, stationary object boundaries and a repeating action. Prompts allow 800 characters; choose five or ten seconds.
2. Create a [Runway API account](https://dev.runwayml.com/) and check [current API pricing](https://docs.dev.runwayml.com/guides/pricing/). API credits are separate from Nox. Paste your key into the password field and choose **Use key for this session**. The field clears; Nox keeps the key in main-process memory until Disconnect or app exit. It is not saved in the project or job history.
3. Read and tick the upload/credit acknowledgement, then choose **Generate variation**. This sends the **whole normalized photo and prompt** to Runway Gen-4.5, including areas outside selected props. The photo is resized to a supported output frame without cropping; Nox maps the complete result back into the aligned photo footprint. Shape masks are applied locally, not submitted as hard generation masks.
4. A variation shows Queued, Generating/downloading, Ready, Failed or Canceled. At most two tasks can be active. **Cancel task** sends a cancellation request; credit handling is controlled by Runway. Closing the panel or app does not cancel a submitted task. Reopen and reconnect the key to resume checking and downloading existing tasks. Nox keeps up to 100 recent task records locally; generated files remain in the profile.
5. Choose **Preview** when ready. Nox downloads the MP4 locally, checks decoding and adds it to the Imported library. Generating another variation leaves applied content unchanged. Network failures never automatically resubmit a billable request; if confirmation was lost, check your Runway account before generating again.

AI may shift objects, move the camera or create an imperfect loop despite the prompt. Inspect the whole result before projecting. The provider request/download lifecycle is covered by simulated-service tests; a paid live generation was not part of the 1.19.0 verification.

### Preview, loop and apply

**Preview & apply** also offers an existing Imported clip or **Import MP4 or GIF for this scene**. Use footage with the same framing as the photo. A generic clip can span props too, but it will not automatically understand or match their physical details.

The preview has an independent clock with Play/Pause and Restart. **Show full scene** reveals the whole animation; turn it off to inspect selected shapes and their holes. Change **Loop animation**, **Trim start**, **Trim end** and **Time offset** to refine the repeated interval. Loop repeats the interval; it does not synthesize a seamless transition or crossfade.

**Apply to props** sets each selected editable prop to the same source and scene alignment. Different shapes reveal different areas of the full scene instead of repeating the entire video. Shapes, Bezier outlines, holes, layer visibility, opacity, blending and colour overlays remain intact. Applying resets the selected shapes' content rotation/offset and speed, removes them from old linked stacks as necessary, and hides the reference photo in editor and output. Use the main **Restart** to begin at the clip's start. Matching media, speed, trim and offset use the shared scene clock; changing one shape's playback controls independently can desynchronize it intentionally.

Applied media stores an alignment snapshot, so later reference-photo adjustments do not silently move live content. Reapply from Scene Animator to use an updated alignment. The Effect inspector identifies scene-aligned content and offers **Fit clip to this shape instead** to return that shape to independent fill/fit/stretch mapping.

Save copies the reference PNG and any applied animations beside the `.luma` file in its `.luma.media` folder. The project stores the prompt, photo metadata and alignment, plus applied clip settings; credentials and original source paths are excluded. Unapplied variations stay in the local generation history/library. Keep the companion folder with the project when moving computers. If the reference is missing, use **Locate original photo** in Scene Animator; animation recovery remains **Effect → Locate original**. Review the actual photo, prompt and companion files before sharing.

## Create a linked story

Open **Stacked animations → Linked stories**, choose a **Story theme**, then click **Create linked story**. This adds three movable tiles to the active unlocked layer. Close the editor to place and warp each tile over a physical surface.

| Story and example project | What happens along the route |
| --- | --- |
| [Cosmic courier](../examples/Cosmic-courier.luma) | A rocket carries a tiny star past orbital outposts; receivers light up and send holographic rings into the sky. |
| [Ghost train](../examples/Ghost-train.luma) | A midnight locomotive pulls ghost-filled carriages past glowing station lamps, with moving wheels, rods and smoke. |
| [Dragon lantern run](../examples/Dragon-lantern-run.luma) | An emerald dragon flies between towers, waking their lanterns with a trail of embers. |
| [Reef pearl relay](../examples/Reef-pearl-relay.luma) | A sea turtle guides a pearl through swaying coral and jellyfish; shells open as it passes. |
| [Clockwork marble](../examples/Clockwork-marble.luma) | A polished energy marble rolls through brass machinery and illuminates inspection gates. |
| [Firefly garden](../examples/Firefly-garden.luma) | A firefly carries glowing pollen over flowers that bloom, shimmer and close before its next visit. |
| [Underground ant city](../examples/Underground-ant-city.luma) | Leaf-carrying ants pass through cutaway tunnels and illuminate each nursery chamber. |
| [Pneumatic parcel network](../examples/Pneumatic-parcel-network.luma) | A capsule races through transparent pipes while a miniature robot scans each arrival. |
| [Living treasure maps](../examples/Living-treasure-maps.luma) | A sailing ship travels across parchment maps; ink reveals islands and treasure chests open as it passes. |

To link your own shapes, apply a story from the **Linked stories** effects collection, then choose **Effect → Link this story across shapes**. Select **two to eight** shapes, use the arrows to set **Route order**, and click **Save stack**. Reopen **Edit linked story** to change the theme, colour, traveller size, direction or **4–120 second** full-loop duration. Changing a theme keeps the mapped outlines and holes. **Create linked story** always adds a new three-tile scene; use **Save stack** to update the selected stack.

The traveller leaves one tile and enters the next, skipping the physical gap between them. The last tile returns to the first. Right-to-left travel follows the route backwards. Align adjoining edges and travel heights for the smoothest visual handoff. Traveller size is shared across differently sized tiles: the smallest tile sets the base size, then the full 45–155% slider scales it proportionally. Large travellers can extend beyond a tile and remain clipped by its outline. The preview follows size and direction; click **Save stack** to apply changes across the route, including while paused. Each tile can still use its own rotation, offset, cutouts, blend and colour overlay.

All stories use the same scene clock in editor and projector. **Pause** freezes travellers and local reactions; **Restart** resets the entire scene. Hidden tiles keep their place in the route. Stack duration replaces individual surface speed. Unlinked story effects loop within a single shape. The existing **Portal journey**, **Character chase** and **Liquid flow** modes remain available in the same editor.

## Create a linked liquid loop

For a ready-to-play scene, use **Open project** and select [Liquid cascade](../examples/Liquid-cascade.luma). It contains just the three linked reservoirs and their return flow.

1. Click **Stacked animations** beneath Add surface and choose **Liquid flow**, or apply **Liquid flow stack** from the effects library. Choose Water, Molten lava, Glowing potion or Icy water. Choosing a style does not add shapes or change the projection.
2. Tick **two to eight existing shapes** under Available surfaces. Use the arrows to arrange their flow order, then click **Apply to selected shapes**. Their positions, sizes, layers and holes stay intact. Shapes already in another stack, locked shapes and shapes in locked layers cannot be added. Use **New stack from existing surfaces** when another loop is already selected.
3. Reopen the stack to change its style, colour, full-loop duration or flow order, then click **Save stack**. Connecting streams follow inlet and outlet positions; turn off **Show connecting streams and return loop** to project only the reservoirs. If you want new objects, **Add 3 demo shapes** explicitly adds three linked reservoirs using the chosen style, ready to move, resize and warp.
4. Use the normal playback controls. **Pause** freezes the entire scene; **Restart** resets every stack to the beginning. Individual surface speed is replaced by the stack's shared duration. Hiding a surface keeps its place in the cycle; solo hides the connecting streams while you align one surface.

Projects support up to eight stacks within the 32-surface total. A surface belongs to one stack at a time. Applying another effect removes it from its stack; a stack with fewer than two members dissolves. **Unlink stack** keeps the surfaces in the scene. All these edits support Undo. Stack membership, order, colour and timing are saved in the project.

## Workspace improvements

- **More room for mapping.** Use **Effects** and **Properties** above the canvas to hide either panel or both; click them again to restore the panels. Panel visibility, grid, snapping, labels and preview preferences are remembered on this device.
- **Precise corner editing.** Select a numbered handle or choose **Edit individual corners** in the inspector. Enter exact projector pixel coordinates or nudge with arrows (Shift moves ten pixels). Custom polygons have midpoint **+** handles and **Add corner** / **Remove corner** controls. Drawing tools are docked above the canvas, with finish, undo-point and cancel buttons that remain visible while zooming or scrolling.
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

All 199 effects and materials are generated locally: 187 animations and twelve still textures. Animation previews play on hover, or continuously when **Previews** is enabled. Still textures remain fixed unless an independent colour overlay is enabled. They do not require stock footage or external downloads.

| Collection | Effects |
| --- | --- |
| Psychedelic | Fractal sanctuary, Jewel hyperspace, Lotus awakening, Astral eye, Neon mycelium, Liquid mosaic, Serpent ribbons, Dimensional lattice |
| Hypnotic | Velvet spiral, Chromatic whirlpool, Checker vortex, Moire rosette, Liquid agate |
| Overlays | Spreading glass cracks, Creeping stone fissures, Crystal frost cracks |
| Imagination | Living comic book, Claymation chaos, The yarn factory, Bubble-wrap creatures, Porcelain dreams, Living mosaic faces, Impossible rubber room |
| Music | Spectrum towers, Mirror pulse, Spectrum halo, Neon waveform, Bass reactor, Spectrum skyline |
| Linked stories | Cosmic courier, Ghost train, Dragon lantern run, Reef pearl relay, Clockwork marble, Firefly garden, Underground ant city, Pneumatic parcel network, Living treasure maps, Portal gun journey (robot, alien and space cat explorers) |
| Chase scenes | Cat & mouse chase, Fox & rabbit chase, Ghost & pumpkin chase, Robot & alien chase, Snowman & penguin chase |
| Stick figures | Glass-box mime, Wall pusher, Ceiling bonk, Corner climber, Gravity tumble, Box buddies |
| Stage & light | Marquee light wall, Prism LED flares, Stardust cascade, Hex relief wave, Photon runway, LED stage wings, Spectrum dot matrix, Pearl silk, Marquee alphabet, Crimson silk, LED cylinder hall, LED proscenium, Ribbon light stage, Canopy of lights, LED orb chamber, Recessed diamond lattice, Cubic tide, Turning tile wall, Triangular prism skin, Concentric relief rings, Sliding relief maze |
| 3D illusions | Flying brick builders, Tumbling brick wall, Clockwork iris, Crystal geode, Origami facade, Chrome piston ocean, Celestial gyroscope, Infinite arcade, Floating citadel, Ribbon vortex, Tectonic rift, Gravity staircase, Endless cathedral, Neon transit tunnel, Overgrown arcade, Prismatic mirror hall |
| Ambient | Aurora drift, Deep currents, Liquid spectrum, Into the cosmos, Lava lounge, Neon arcade, Electric currents, Soft bokeh, Liquid flow stack, Enchanted bookshelf, Sand sculptor, Magnetic ferrofluid |
| Architecture | Prismatic relief, Shatter & rebuild, Liquid drapery, Chromatic brickwork, Masonry lightwave, Clockwork wall, Stained-glass sunlight, Peeling paint, Laser blueprints, Temple awakening |
| Creatures | Fox around the corner, Shy little bunny, Curious raccoon, Pocket dragon, Skeleton peek, Witch peek |
| Shadow puppets | Woodland fables, Dragon castle, Ocean tales, Moonlight ballet, Spooky parade, Winter sleigh |
| Colour blocks | Spectrum blocks, Colour mosaic, Ripple blocks, Flip tiles, Rising tiles |
| Textures | Weathered red brick, Pale limestone, Castle stonework, Weathered timber, Slate roof tiles, Cast concrete, Brushed aluminium, Riveted steel, Weathered copper, Desert sandstone, Layered sandstone, Glyph-carved pillars |
| Geometric | Neon echoes, Digital grid, Prism bands, Prism kaleidoscope, Chromatic orbits, Infinity cubes, Spectrum lattice, Prism gateway, Chrome recursion, Edge runner, Marble run, Origami garden |
| Nature | Living flames, Underwater garden, Moonlit waves, Autumn drift, Rain on glass, Bubble ballet, Cloud nine, Liquid ripples, Petal drift, Sunrise horizon, Stormfront, Frost bloom, Creeping garden, Living honeycomb, Moonlit mushrooms, Daisy daydream, Sunflower parade, Luminous moonflowers |
| Space | Orbital window, Drifting starfield, Warp speed, The Moon, Saturn & rings, Jupiter, ISS: Earth orbit, Spiral galaxy, Stellar nebula, Solar prominences, Comet flyby, Asteroid belt |
| Celebration | Confetti parade, Midnight fireworks, Toy train circuit |
| Halloween | Single eyeball, Eyeball swarm, Witchfire, Haunted mist, Eyes in the dark, Midnight flight, Little boo crew, The lingering ghost, Skeleton shuffle, Pumpkin party, Behind the curtain, Haunted portraits |
| Christmas | First snowfall, Merry & bright, Candy cane lane, Golden wishes |

The ten additional generic effects are Rain on glass, Bubble ballet, Cloud nine, Liquid ripples, Petal drift, Sunrise horizon, Confetti parade, Midnight fireworks, Electric currents and Soft bokeh. **Prism kaleidoscope**, **Chromatic orbits** and **Infinity cubes** start with colour cycling enabled; switch it off in the Effect tab for a fixed palette.

Straight rectangles stretch their effect with a projective transform. Curved shapes and other polygons clip a bounding-box texture to their outline. Edge runner paints the actual perimeter directly for every shape. Toy train circuit follows an inset track along the actual outer contour. Ellipses use a 48-vertex outline and resize handles. A polygon or curved boundary cannot intersect itself. Draw polygons with clicks, finish using **Finish polygon**, Enter or the first corner, remove the last point with Backspace, and cancel with Escape. Add and remove corners after drawing using the inspector or midpoint handles. Inserting a corner on a Bézier edge preserves its curve; removing a corner straightens the merged edge. Rectangles retain four corners and triangles retain three until Make outline editable converts them to polygons. Surface labels and control handles appear only in the editor; output alignment guides are controlled separately.

### Psychedelic visions

Choose **Psychedelic** in the effects browser, or choose **All effects** and search **DMT**. Select an existing shape and click an effect to apply it. The eight DMT-inspired styles include recursive mandalas, a faceted gemstone tunnel, a breathing lotus, a slowly closing eye, luminous mycelium, flowing stained-glass cells, woven serpentine ribbons and nested rotating hypercubes.

All eight use 24-second loops at normal speed. **Pattern scale** zooms the design within the shape; content rotation and offsets position it. **Speed**, **Accent colour**, **Shuffle variation**, optional colour cycling and overlays use the existing Effect controls. The artwork already contains multiple colours; colour cycling adds the app's independent palette rotation. **Play**, **Pause** and **Restart** remain shared by the editor and projector. Try the [eight-effect gallery](../examples/Psychedelic-collection.luma).

### Corridors, hypnotic swirls and sprouting flowers

Choose **All effects** and search **dreamscape** for all fifteen new animations, or use **3D illusions**, **Hypnotic**, **Nature** and **Overlays**. The four corridors and five hypnotic patterns loop every 24 seconds at normal speed. Flowers and cracks loop every 16 seconds. **Speed**, **Pattern scale**, **Accent colour**, optional colour cycling, colour overlays and **Shuffle variation** use the existing Effect controls. Playback is shared by the editor and projector.

The corridors retain one vanishing point through their receding frames, columns, lighting and floor lines. The flower heads grow from stems, unfold layered petals and withdraw before sprouting again. The three flower styles have distinct petal palettes and centres. Try the [Dreamscape gallery](../examples/Dreamscape-collection.luma).

### Layer transparent cracks over an animation

1. Select the shape containing your background animation or texture and choose **Duplicate**.
2. Apply **Spreading glass cracks**, **Creeping stone fissures** or **Crystal frost cracks** to the duplicate from **Overlays**. Keep the duplicate above the original in the object/layer order and align their corners if needed.
3. Leave **Blend mode** on **Normal**. Only the cracks cover the lower layer; their background is transparent. Adjust **Opacity**, **Accent colour**, **Pattern scale** and content rotation/offset as needed. Other blend modes and colour overlays also preserve the clear background.
4. Press **Play**. The fractures spread, hold and fade; **Restart** clears them immediately. **Pause** freezes their current state. Shape holes and placement mesh work as usual.

The thumbnail checkerboard is a transparency guide and does not appear on the projector. These effects create drawn cracks, not new geometry or cutout holes. Open [Transparent cracks](../examples/Transparent-cracks.luma) for examples over animated ribbons, brick and metal.

### Imagination styles

The seven **Imagination** effects use comic ink, stepped clay motion, knitted stitches, glossy bubbles, glazed porcelain, flipping mosaic tiles and an elastic room. Choose **All effects**, then search **creative** to include the three new travelling stories as well. Applying a card changes the selected shape; it does not add objects.

All ten loop every 12 seconds at normal speed when used on a single shape. **Effect → Speed**, **Pattern scale** (or **Character size** for a story), **Accent colour**, colour cycling and overlays work with the normal playback controls. **Shuffle variation** changes the seeded decoration or starting phase. For a linked story, use the stack's shared duration, traveller size and direction instead.

Open [Imagination collection](../examples/Imagination-collection.luma) to see all ten on separate tiles. To carry ants, capsules or the ship between your own shapes, apply its **Linked stories** card and use **Link this story across shapes**, select two to eight shapes, arrange their route and **Save stack**. The three linked examples above are also ready to open.

### Stick figures in boxes

Select an existing shape, choose **Stick figures** in the effects browser and click a card to apply it. The six routines include a mime feeling the glass, a figure pushing the wall, a jump into the ceiling, a failed corner climb, rotating gravity, and two friends attempting a boost. The box is drawn inside the mapped shape; rectangular surfaces give the strongest depth illusion.

Use **Effect → Figure size** to scale the characters from 45% to 155% without moving the box frame. **Speed** changes the pace; a full routine takes 12 seconds at 1×. **Accent colour**, colour cycling and overlays recolour the scene. **Shuffle variation** changes the starting phase. All six follow the shared Play, Pause and Restart controls, including on the projector. They work independently on existing shapes and do not create extra surfaces.

Open the [Boxed stick figures example](../examples/Boxed-stick-figures.luma) for six ready-to-place tiles. The routines use the same clock, but each has its own escape sequence; they do not travel between tiles.

## Projects and recovery

The current project is saved automatically on this device after changes and recovered at the next start. The previous valid save is retained as a fallback; if the latest save is corrupt, the app restores that backup and tells you. Use **Save project** to create a named `.luma` file for backup or transfer. Switching scenes or opening a project is undoable. A file includes all shapes and effect settings. Projects using imported animations also need their `.luma.media` companion folder when transferred. Playback, solo, blackout and calibration are session controls and are not stored in project files. View preferences are stored separately on this device.

Import validates the version, effects, geometry, dimensions, limits and unique surface IDs before replacing the current project. Project files are limited to 2 MB. A corrupted recovery file will not prevent the editor from starting.
