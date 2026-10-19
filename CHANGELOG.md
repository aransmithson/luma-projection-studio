# Changelog

Nox Projection Studio keeps the existing Luma project format and application identity.

## 1.19.1

- Added visible **Effects** and **Properties** toggles above the canvas. Hide either panel independently or both together, then click the same controls to restore them.
- Hiding effects now removes the whole browser, including its header, to free more vertical space. Hiding properties expands the workspace across the right-hand side. Panel controls wrap at smaller window sizes and remain accessible with both panels hidden.
- Panel visibility is remembered on this device. Hiding panels preserves shape selection, effect search and projector playback; the inspector's **Change effect** action still opens the library.

## 1.19.0

- Added **Scene Animator** with JPG/PNG reference photos, four-corner perspective alignment, precise projector coordinates, opacity, editor visibility and an independent projector photo toggle. Imported photos are normalized locally and travel with the project's companion folder.
- Added optional **Runway Gen-4.5** image-to-video generation with five- or ten-second clips, an explicit upload/credit acknowledgement, session-only API keys, resumable job history, cancellation and local MP4 downloads. Failed connections never automatically resubmit a billable generation.
- Added an independent, masked preview and shared scene mapping across selected props. The same clip continues across shapes; holes, layers and blend modes remain intact. External MP4/GIF clips can use the same workflow without AI.
- Added loop, trim and time-offset controls in the preview. Applying resets selected props' content transforms and speed, then follows the existing shared Play/Pause/Restart clock. Projector photo visibility resets on reopening a project or app.
- Preserved version-1 projects, persistent Luma identifiers and all 160 built-in effects/materials. Added model, native storage, mocked-provider, real H.264 rendering and desktop workflow checks. Paid live Runway generation has not been verified without an API key; AI geometry and seamless looping remain dependent on the generated result.

## 1.18.0

- Added six original linked stories: **Cosmic courier**, **Ghost train**, **Dragon lantern run**, **Reef pearl relay**, **Clockwork marble** and **Firefly garden**. Travellers cross each shape into the next, triggering station lights, lanterns, shells, machinery or flowers along the route, then return to the first shape.
- Added **Linked stories** to the stacked editor with live theme previews, one-click three-tile scenes, linking of two to eight existing shapes, route ordering, reverse travel, traveller size, accent colour and full-loop duration.
- Added six ready-to-open example projects. Each story also works as an individual effect in the library. The library now contains **160 effects and materials: 148 animations and 12 still textures**.
- Stories follow the shared Play, Pause and Restart clock in both editor and projector. Hidden tiles keep their turn; holes, content transforms, layers, blending, colour overlays, mesh mode, Undo and version-1 project save/open remain supported.
- Added timing, rendering and native desktop checks covering loop continuity, reverse travel, unequal tiles, compact-window layout and projector synchronization. Existing liquid, chase and portal stacks remain compatible.

## 1.17.0

- Rebranded the app as **Nox Projection Studio**, with a faceted neon N icon, refreshed banner, window titles, project dialogs and calibration label.
- Renamed the public repository to `aransmithson/nox-projection-studio`, retaining its history and previous releases.
- Added Windows icon sizes from 16 to 256 pixels and updated the source launcher and release filenames.
- Preserved `.luma` projects, imported media, autosave, preferences, clipboard and application identifiers. Existing projects need no conversion. The 154 built-in effects and MP4/GIF import support are unchanged.

## 1.16.0

- Made the GitHub repository and release downloads public, preserving `UNLICENSED` status and the Luma name.
- Added desktop imports for MP4 video (H.264 recommended) and animated GIFs, with local thumbnails and an Imported collection.
- Added fill, fit and stretch, looping or final-frame hold, trim, time offset and speed. Shared Play, Pause and Restart drive both editor and projector; video sound is muted.
- Preserved transparent GIF pixels, shape warping, cutouts, content transforms, layers, blend modes and colour overlays for imported animations.
- Added managed media copies, portable `.luma.media` companion folders and Locate original for missing footage. Existing version-1 projects and clipboard identities remain compatible.
- Added native import/render/save/restore checks using original generated GIF and H.264 footage.

## 1.15.2

- Refreshed Luma's faceted light mark, application icon and browser favicon.
- Added repository documentation, a user guide and contribution instructions.
- Published the source repository and Windows release.
- Existing projects, recovery data, preferences and effect count are unchanged.

## 1.15.1

The **Stacked animations** editor is wider, with three columns for saved stacks, settings and surface order. All settings and **Save stack** fit at the minimum desktop window size of 1120 × 760. Longer lists of stacks and surfaces scroll inside their own panels, while Save and Unlink stay visible. Liquid, chase and portal stacks use the same layout.

Custom media imports remain at the recommendation stage. The suggested first formats are MP4/H.264 for full scenes, WebM with alpha for transparent characters, and animated GIF for small, simple loops. A future importer should share the app's playback clock, preserve shape mapping and blending, and copy media into a managed library so projects do not break when the original download is moved.

## 1.15

Six new **Music** effects react to sound: **Spectrum towers**, **Mirror pulse**, **Spectrum halo**, **Neon waveform**, **Bass reactor** and **Spectrum skyline**. The library now has **154 effects: 142 animations and 12 still textures**.

1. Choose **Music input** in the top bar.
2. Select **Computer audio** for music playing on this Windows PC, or **Microphone / line-in** for a microphone, mixer or audio interface. Choose the input device if needed.
3. Press **Start audio** and play your music. The meter shows bass on the left and treble on the right.
4. Apply an effect from the **Music** collection to each shape. Adjust **Audio sensitivity**, **Audio smoothing** and **Audio noise gate** to suit the source. Colour, scale, content rotation/offset, blending, layers and holes still work normally.

Open [Music spectrum](./examples/Music-spectrum.luma) for six ready-made tiles. All shapes and the projector share one analysed signal. **Pause** freezes the same music frame in both windows while the meter keeps listening; **Play** returns to current sound. **Stop audio** releases the input. Silent or disconnected inputs settle to a static display. Library thumbnails use simulated music; choose **Demo signal → Start demo** to project that simulation without listening or playing sound.

Tuning is saved in the project. Listening never starts automatically on launch or project recovery, and audio samples/device permissions are not stored in the project. Audio is analysed locally, without recording or sending it over the network. Computer audio uses Windows system loopback; in browser preview, audio availability depends on the browser's sharing picker. If the input cannot open, check the selected device and Windows microphone privacy settings or try another source. Music effects follow the live signal rather than the generic Speed slider; this is reactive audio, not a BPM-synchronised show timeline.

## 1.14

**Position the animation inside a shape:** select a shape, open **Effect → Position inside shape**, and adjust **Content rotation**, **Horizontal offset** and **Vertical offset**. Use sliders or type precise values; the two 90° buttons make quarter-turns and **Reset content position** restores the original placement. Rotation is clockwise, positive offsets move right/down, and offsets are percentages of the shape's content area. The mapped outline, perspective corners and holes remain fixed. Content outside the shape is clipped, and empty areas reveal lower layers. These controls also work while paused, on still textures and on individual linked tiles. Placement mesh and calibration stay aligned to the physical shape. Settings support save/open, Undo and copy/paste.

**Portal gun journey:** open **Stacked animations → Portal journey → Create portal journey** for three ready-made tiles. A character aims and fires a glowing portal launcher, opens an entrance and an exit on the next tile, walks through, and repeats until the last tile returns to the first. Choose **Robot explorer**, **Alien courier** or **Space cat**; set colour, size, travel direction and full-loop duration. The entire journey uses one shared clock and consistent character size across unequal tiles. Each tile can have its own content rotation and offset without changing the story clock.

To link existing shapes, apply **Portal gun journey** from the new **Linked stories** collection, then choose **Link portal tiles**, select two to eight shapes, arrange **Route order**, and press **Save stack**. Hidden tiles retain their turn. Open [Portal journey](./examples/Portal-journey.luma) for a ready-to-project example. The library now contains **148 effects: 136 animations and 12 still textures**.

**Layer repairs:** Undo and Redo keep the active layer aligned with the selected shape; holes remain grouped beneath their parent in the list; hiding a hole's parent releases Solo; and foreground layers now cover liquid connection streams. Group visibility, locking, reorder, copy/paste and project recovery are checked in the native desktop app.

Ideas for future linked stories: a firefly passing a glowing spark between lanterns, a magician throwing a parcel through hats on different tiles, and a rocket visiting a planet in each window before returning to its launchpad.

## 1.13

**Linked character chases:** all five chase pairs can travel across **two to eight shapes** on one continuous circuit. Characters leave one shape and immediately enter the next; the last shape returns to the first. The two characters share a clock and a physical size across differently sized shapes. Shape gaps are skipped; curved outlines, perspective mapping and holes still clip the animation. Align shape edges and floor heights for a continuous visual join.

Select a chase shape, open **Effect → Link this chase across shapes**, tick the other shapes, arrange **Route order**, and press **Save stack**. Alternatively, use **Stacked animations → Character chase → Create linked chase** for three ready-made shapes. The stack controls characters, direction, size, accent colour and full-loop duration together. Pause, Restart, mesh mode, save/open and Undo work with the whole group. Hidden shapes retain their place in the route.

**Reversing direction swaps the pursuer:** mouse chases cat, rabbit chases fox, pumpkin chases ghost, alien chases robot, and penguin chases snowman. This also works on individual chase shapes. Linked routes run through their order backwards when travelling right to left. The controls display the current pursuer.

**Three more linked liquid examples** are available under **Stacked animations → Liquid flow**. Each preset creates three linked reservoirs with shared transfer timing and a return stream:

- **Molten lava:** glowing orange liquid with drifting dark crust and bright fissures.
- **Glowing potion:** luminous bubbles and swirling ribbons over a violet glass background.
- **Icy water:** floating crystals, reflective facets and cool sparkles.

Use **Liquid style** to change an existing liquid stack. Open the ready-made [linked chase](./examples/Linked-chase.luma), [lava cascade](./examples/Lava-cascade.luma), [potion cascade](./examples/Potion-cascade.luma), or [icy water cascade](./examples/Ice-cascade.luma). These are stack presets; the effects library still contains 147 entries. Existing water stacks retain their original appearance and settings.

## 1.12.1

Fixed desktop shape copy/paste. The clipboard handlers now await Electron's asynchronous read and write operations, so Paste receives the copied shapes and Copy reports completion only after the write succeeds. The regression workflow exercises actual Windows clipboard buttons, shortcuts, paste in place, curves, holes and Undo/Redo, with all previous clipboard formats restored afterward unless the user copied something else during the test.

## 1.12

- **Projected editing cursor:** a bright yellow crosshair follows your mouse over the editor canvas whenever placement mesh or alignment guides are showing. It stays aligned with the output at different zoom levels and resolutions, including letterboxing. It clears when you leave the canvas or the editor loses focus, and hides during normal playback, blackout and calibration. The output window also retains its native crosshair in mesh mode.
- **Copy and paste shapes:** select a shape and use **Ctrl+C / Ctrl+V**, or the **Copy / Paste** buttons above the layer list. **Ctrl+Shift+V** (the crosshair paste button) pastes at the original position. Normal paste offsets each copy slightly. Effects, overlays, curves and attached holes are preserved, with independent IDs. Copies can be pasted into another open project. A hole copied alone becomes a regular shape. Copying a liquid surface retains its effect; use Stacked animations to link the copy into a synchronized stack.
- **Named layers:** use **+** beside LAYERS to create a group, edit its name, and move the selected shape using **Move to layer**. Parent shapes and their holes move together. Select a layer header to make it the destination for new shapes and pasted copies. The eye and padlock hide or lock the whole group; arrows bring it forward or send it backward. Top layers project in front, with shape ordering and blending preserved inside each layer. Collapse groups to reduce clutter. Empty unlocked layers can be removed.

Layer visibility and locking preserve each shape's individual settings. Layers are included in project saves, autosave and Undo/Redo; existing projects open in a default Layer 1. There are up to **16 layers** and **32 shapes including holes**. A paste exceeding the shape limit is rejected in full. Clipboard shortcuts keep their normal text-editing behaviour when a text field is focused. In browser preview, an in-window clipboard is used if browser clipboard permission is unavailable.

## 1.11.1

The projector output now shows a crosshair cursor whenever placement mesh or alignment wireframes are visible, in both preview and fullscreen output. This includes **Always on** guides and temporary guides **During edits**. The cursor hides with the guides when returning to normal playback, calibration or blackout.

## 1.11

**Five character chases** are available in the new **Chase scenes** collection. The library now contains **147 effects: 135 animations and 12 still textures**.

- **Cat & mouse chase:** a ginger cat runs after a mouse carrying cheese, with scampering paws and swinging tails.
- **Fox & rabbit chase:** a bushy-tailed fox follows a carrot-carrying rabbit with floppy ears and hopping feet.
- **Ghost & pumpkin chase:** a friendly ghost floats after a running pumpkin with tiny boots and a glowing grin.
- **Robot & alien chase:** a jointed robot pursues an alien carrying a glowing battery.
- **Snowman & penguin chase:** a snowman in a bouncing top hat follows a waddling penguin carrying a fish.

Each pair travels across its surface, exits completely at one edge and re-enters at the other. Travel, running poses, glances and scenery repeat together every **12 seconds at 1× speed**. The chase continues over the boundary without teleporting a visible character. **Chase direction** switches left-to-right or right-to-left; **Character size** resizes the actors while retaining the full-width path. **Accent colour** changes scarves, lights and decorative details. **Shuffle variation** changes the starting position, gait phase and scenery. Both characters use the same clock and remain together when changing speed, pausing or restarting. Existing overlays, blending, perspective mapping, cutouts and placement mesh are supported.

Open [Chase parade](./examples/Chase-parade.luma) to see all five in synchronized lanes. Use a wide rectangle for a long running path; other shape outlines and holes clip the characters to the mapped surface.

## 1.10

**21 new animations** live in the **Stage & light** collection. The complete library now contains **142 effects and materials: 130 animations and 12 still textures**. All new artwork is generated locally, using the public Envato previews as broad visual references. No Envato clips, preview files or other stock assets have been downloaded or bundled.

- **Six LED stage scenes:** LED stage wings, LED cylinder hall, LED proscenium, Ribbon light stage, Canopy of lights and LED orb chamber. These use curved screens, illuminated arches, rolling ribbons, a vaulted canopy and a rotating sphere, with travelling light patterns and reflections. Search **backstage** to find this set.
- **Seven geometric mapping scenes:** Hex relief wave, Recessed diamond lattice, Cubic tide, Turning tile wall, Triangular prism skin, Concentric relief rings and Sliding relief maze. These use perspective geometry, bevels, directional shading and recessed spaces. Search **3D Video Mapping** to find this set.
- **Eight further effects:** Marquee light wall, Prism LED flares, Stardust cascade, Photon runway, Spectrum dot matrix, Pearl silk, Marquee alphabet and Crimson silk.

Each scene uses the shared playback clock and supports independent **Speed**, **Pattern scale**, **Accent colour** and **Shuffle variation**, plus existing overlays, blending, holes and placement mesh. Movement loops last 24 seconds at normal speed, except **Marquee alphabet**, which cycles through A–Z and 0–9 in 36 seconds. Shuffle changes its starting character and Speed zero holds it; it is an animated alphabet, not a custom text editor. Global Pause and Restart still control the whole scene. Colour overlays have their own cycle, so combining different speeds or periods can lengthen the overall repetition.

Open [LED stage scenes](./examples/LED-stage-scenes.luma), [Geometric mapping scenes](./examples/Geometric-mapping-scenes.luma) or [Stage light and silk](./examples/Stage-light-and-silk.luma) to compare the new scenes. Use one large surface to see the strongest relief; playing many detailed scenes together costs more rendering time.

### Envato reference shortlist

Observed on 18 October 2026: the first ten results in VideoHive's **Motion Graphics**, **projection mapping**, **Best sellers** [filtered ranking](https://videohive.net/category/motion-graphics?sort=sales&term=projection%20mapping). This is a search-specific ranking, not a claim about the ten best animations on Envato. The Back Stage and 3D mapping references were expanded into the sets above. Luma's implementations have their own geometry, timing and artwork.

| Rank | Envato / VideoHive reference | Luma effect or set |
| --- | --- | --- |
| 1 | [Lights Flashing — HK_graphic](https://videohive.net/item/lights-flashing/5318332) | Marquee light wall |
| 2 | [Led Flare (5-Pack) — DizArt_Studio](https://videohive.net/item/led-flare-5pack/6727946) | Prism LED flares |
| 3 | [Particles Background — HK_graphic](https://videohive.net/item/particle-rain/6122422) | Stardust cascade |
| 4 | [3D Video Mapping – Vj Loop Pack (7in1) — Vj_Yarkus](https://videohive.net/item/3d-video-mapping-vj-loop-pack-7in1/16429779) | Seven geometric mapping scenes |
| 5 | [Cosmo Run Way — DizArt_Studio](https://videohive.net/item/cosmo-run-way/6639590) | Photon runway |
| 6 | [Back Stage (3-Pack) — DizArt_Studio](https://videohive.net/item/back-stage-3pack/6902605) | Six LED stage scenes |
| 7 | [Colorful Led — DizArt_Studio](https://videohive.net/item/colorful-led/7358753) | Spectrum dot matrix |
| 8 | [Wedding Background — HK_graphic](https://videohive.net/item/wedding-background/7053664) | Pearl silk |
| 9 | [Lights Alphabet — HK_graphic](https://videohive.net/item/lights-alphabet/11209303) | Marquee alphabet |
| 10 | [Red Silk Cloth — HK_graphic](https://videohive.net/item/red-silk-cloth/7775894) | Crimson silk |

### Import formats

**Open project** accepts `.luma` files, and `.json` files containing the same valid Luma project structure. Video files such as MP4, MOV and WebM, animated GIFs, image files and After Effects projects cannot yet be imported as effects. The scenes above are built in and need no import.

## 1.9.2

**Single eyeball** is a separate effect under **Halloween**, alongside **Eyeball swarm**. It places one detailed, shaded globe in the centre of a shape on a black background. The eye looks around, blinks and changes pupil size on a 24-second loop. Larger iris and sclera textures keep individual eyes crisp when projected at a larger size. The library now contains **121 effects and materials: 109 animations and 12 still textures**.

Add an **Ellipse** or other shape, apply **Single eyeball**, then move and resize the shape to place that eye. **Eye size**, **Accent colour** and **Speed** affect only the selected surface. Add another shape for another eye, or duplicate the first. Duplicates keep the original timing; use **Shuffle variation** on one for independent gaze and blink timing. Speed zero holds that eye still while other eyes continue. Global Pause and Restart still affect the whole scene. The globe stays centred while its iris moves, so it does not drift out of alignment.

Open [Individual eyes](./examples/Individual-eyes.luma) for two separately positioned circular eyes with different iris colours and animation variations.

## 1.9.1

**Eyeball swarm** adds a crowd of floating, shaded eyeballs under **Halloween**, bringing the library to **120 effects and materials: 108 animations and 12 still textures**. The eyes share a moving gaze, glance with slight individual differences and blink independently. Detailed iris fibres, subtle veins, changing pupils and glossy corneal highlights give each globe depth. The complete movement repeats every 24 seconds at normal speed.

Use **Accent colour** to change the irises, **Pattern scale** to resize the crowd, **Speed** to adjust motion and **Shuffle variation** for different eye sizes and blink timings. Colour overlays and placement mesh work as usual. Search for **eyeballs** or **eye balls**, or open [Eyeball swarm](./examples/Eyeball-swarm.luma) for a large projection-ready scene.

## 1.9

**Twelve new 3D illusions bring the library to 119 effects and materials: 107 animations and 12 still textures.** Open the **3D illusions** category to find them. The scenes use perspective geometry, bevelled edges, directional shading, surface grain, metallic highlights and depth ordering. Each repeats every 24 seconds at normal speed and follows the shared playback clock.

- **Flying brick builders:** staggered courses assemble from spinning, incoming bricks, hold as a wall, then lift away.
- **Tumbling brick wall:** masonry buckles into a dusty heap and rises to rebuild.
- **Ten further scenes:** Clockwork iris, Crystal geode, Origami facade, Chrome piston ocean, Celestial gyroscope, Infinite arcade, Floating citadel, Ribbon vortex, Tectonic rift and Gravity staircase.

Try [Masonry magic](./examples/Masonry-magic.luma) for the two wall animations, and [Kinetic depth](./examples/Kinetic-depth.luma) for the ten additional scenes. Use a large mapped surface for the strongest depth illusion. These are rendered illusions inside your mapped shape; existing corner skew, curved boundaries, cutouts and placement mesh still control where they appear. Performance depends on the number and complexity of visible surfaces.

### Combine layers with ten blend modes

Select a surface and choose **Blend mode** under **Surface > Appearance** or **Effect > Combine layers**. The surface combines with visible layers underneath it. Change their order with **Bring forward** and **Send backward**. Opacity and edge feathering continue to apply, and holes remain transparent.

**Normal, Additive, Screen, Multiply, Overlay, Soft light, Darken, Lighten, Difference and Exclusion** are available. Screen/Additive suit light beams; Multiply combines darker textures with a lit background; Soft light and Overlay retain the underlying shading. The control includes a short explanation of each mode. Advanced modes use GPU compositing without copying frames to the CPU.

### Independent colour-cycling overlays

In the **Effect** tab, enable **Colour overlay**. It works over every animation, still texture and liquid-stack member. Choose from:

- **Eight styles:** Full colour wash, Travelling bands, Radial ripples, Rotating sweep, Aurora ribbons, Checker pulse, Prismatic facets and Orbiting spotlight.
- **Eight palettes:** Rainbow spectrum, Electric neon, Golden sunset, Deep ocean, Ember & gold, Pastel dream, Halloween and Christmas.
- **Overlay mix:** all ten blend modes, separate from the surface's blend with other layers. Soft light is the default to keep the original shading.
- **Intensity, speed, pattern scale and reverse motion.** Wash has no spatial scale control. Speed zero holds a still overlay; at normal speed the palette cycle lasts 24 seconds.

The stage and output show the combined result; the small library/inspector thumbnail previews the original effect. Overlay timing is independent of effect speed but follows global Play, Pause and Restart. Applying a different effect preserves its overlay. Placement mesh and calibration bypass overlays. Liquid connections retain the stack colour; each member can have its own overlay. Undo, project files and recovery preserve every setting. Existing projects open with overlays off. Older app versions cannot open projects that use the new blend modes or effect IDs.

Open [Colour overlay lab](./examples/Colour-overlay-lab.luma) to compare all eight styles over brushed aluminium. The underlying still material remains cached while its overlay animates.

## 1.8

**18 additions bring the library to 107 effects and materials: 95 animations and 12 still textures.** The new animations share the playback clock and repeat every 24 seconds at normal speed. They are original procedural artwork and work offline.

- **Seven requested space scenes:** Warp speed, The Moon, Saturn & rings, Jupiter, ISS: Earth orbit, Spiral galaxy and Stellar nebula. The planets use rotating texture maps and directional lighting; Saturn's rings pass behind and in front of its globe. The ISS has paired solar wings, modules and a truss over a cloud-covered Earth horizon.
- **Six still materials:** Brushed aluminium, Riveted steel, Weathered copper, Desert sandstone, Layered sandstone and Glyph-carved pillars. The pillars use decorative Aztec-inspired geometric carvings rather than historical inscriptions.
- **Five extra animations:** Solar prominences, Comet flyby, Asteroid belt, Temple awakening and Magnetic ferrofluid. The first three live in Space, the glowing temple in Architecture, and the liquid metal in Ambient.

Try [Cosmic voyage](./examples/Cosmic-voyage.luma), [Metals and sandstone](./examples/Metals-and-sandstone.luma) and [Light and matter](./examples/Cosmic-extras.luma). Each can be opened through **Open project**. Speed, pattern scale, colour, variation, pause/restart and output mesh continue to work. Colour controls accent lighting; recognizable planetary and Earth surface colours are retained. Optional colour cycling follows its own cycle, so enable it only when a changing palette is wanted.

### More flexible shapes

- **Six new presets:** rounded rectangle, arch, hexagon, star, diamond and ring, under **Add surface**. A ring contains two linked surfaces: its outside and an independently editable ellipse hole. It is created in one Undo step and takes two of the 32 available surface slots.
- **Draw to size:** enable **Draw new shapes to size** in the Add surface menu, select a shape and drag on the canvas. A live outline and projector-pixel dimensions guide placement. Hold **Shift** for equal width and height in projector pixels; **Escape** cancels. Default quick-add behaviour remains available when the option is off. Custom polygons still use click-to-place corners.
- **Smooth corner:** select a corner in the Surface inspector, then smooth it to align the incoming and outgoing Bézier handles. Refinements that cross another edge or leave the canvas are rejected.
- **Straighten all edges:** remove the selected outline's curves in one reversible operation.
- **Make outline editable:** convert an ellipse to editable curves, or a rectangle/triangle to a polygon that accepts more corners. Keep a four-corner rectangle when perspective skew is needed; editable polygons map content to their bounding outline. Conversion preserves existing cutouts.
- **Precise rotation:** enter a positive or negative angle in **Rotate by** and press Enter. Fractional degrees are supported. Linked holes rotate with their parent. Locked surfaces keep their geometry protected.

Open [Shape workshop](./examples/Shape-workshop.luma) to compare the six presets. Existing projects remain readable; the new presets use the existing polygon, curve and cutout data format.

## 1.7

**20 new animations bring the library to 89 effects and materials: 83 animations and six still textures.** All 15 previously proposed ideas are implemented, with shadow puppet theatre expanded into six distinct performances. Each new animation uses a repeating 20-second loop at normal speed, shares the playback clock, and supports accent colour and Shuffle variation.

- **Shadow puppets:** a dedicated collection containing **Woodland fables**, **Dragon castle**, **Ocean tales**, **Moonlight ballet**, **Spooky parade** and **Winter sleigh**. Jointed silhouettes perform behind textured, warmly illuminated screens with foreground curtains. Open [Shadow puppet theatres](./examples/Shadow-puppet-theatres.luma) to compare all six.
- **Architecture:** **Clockwork wall**, **Stained-glass sunlight**, **Peeling paint** and **Laser blueprints**.
- **Nature:** **Frost bloom**, **Creeping garden**, **Living honeycomb** and **Moonlit mushrooms**.
- **Ambient:** **Enchanted bookshelf** and **Sand sculptor**.
- **Geometric:** **Marble run** and **Origami garden**. Both also offer optional colour cycling.
- **Celebration:** **Toy train circuit**. The railway follows the actual outer boundary of a shape, including concave polygons and Bézier curves. A locomotive and four carriages run through two tunnels. Adjust **Train size** in the Effect tab; geometry changes update the track even while paused. Very narrow shapes leave less room for the carriages.
- **Halloween:** **Haunted portraits**: a count, a spectral lady and a sea captain blink, glance and change expression by candlelight.

Open [Living walls](./examples/Living-walls.luma) to preview the other 14 new animations together. Individual effects are rendered at up to 1024 pixels on their longest texture edge before mapping; performance depends on the number and complexity of active surfaces.

### Browse vertically

The effects library now uses a **vertical scrolling grid in both compact and expanded views**, with a visible scrollbar. Collections have their own scrolling list on the left, including the new **Shadow puppets** section. The search and controls stay in place as you browse. **View all** enlarges the browser; **Compact view** restores more mapping space; the collapse button hides the library.

Search supports multiple words in any order, for example **winter shadow**. Sort by **Featured first** or **Name A–Z**, and star any effect for **Favourites**. Choosing a collection, changing the search or changing the sort returns the grid to the top. Keyboard users can focus the grid and use arrows, Page Up/Down, Home and End without moving the selected surface. Only visible animated thumbnails run their preview clocks.

Custom effect imports and the other premium-feature ideas remain at the design stage in this release. Close an older running version before launching the new executable, because opening another copy restores the existing app window.

## 1.6

**Seven new animations bring the library to 69 effects and materials.**

- **Skeleton peek:** an ivory skull with glowing eyes, a moving jaw, visible ribs and bony fingers gripping the corner.
- **Witch peek:** a green-faced witch with copper hair, blinking eyes, a bent purple hat, swinging moon charm and little sparks.
- **Colour blocks:** a new category with **Spectrum blocks** (diagonal rainbow sweep), **Colour mosaic** (independent seeded colour fades), **Ripple blocks** (radial light waves), **Flip tiles** (turning panels with contrasting reverse sides) and **Rising tiles** (shaded blocks rising in waves).

Find the two peeks under **Creatures**. Both use an 18-second loop at 1× speed and support **Peek from → Left / Right**, creature size, accent colour and variation. The five block animations use 16-second loops and support **Speed**, **Block size**, accent colour and variation. They use the shared playback clock, so pause, restart and editor/projector output stay synchronized. Existing perspective mapping, curved shapes, cutouts and placement mesh continue to work.

Open [Halloween peeks](./examples/Halloween-peeks.luma) for the skeleton and witch facing inward, or [Colour block studies](./examples/Colour-blocks.luma) to compare all five block patterns. The creature size control now displays the actual supported size when switching from an effect with a larger pattern scale.

## 1.5

**12 new effects and materials bring the library to 62.** The new animations use higher-resolution drawing, shaded characters, glossy eyes, dimensional masonry and cached textured surfaces. Everything is generated locally and works offline.

- **Creatures:** Fox around the corner, Shy little bunny, Curious raccoon and Pocket dragon. They emerge, look around, blink and retreat on an 18-second loop at 1× speed. Choose **Peek from → Left / Right** and adjust **Creature size** in the Effect tab. Map the narrow shaded edge onto a real corner. Open [Creature corners](./examples/Creature-corners.luma) to see all four.
- **Architecture:** Chromatic brickwork lights individual bricks in changing jewel colours; Masonry lightwave sends waves of light across the wall. Both retain recessed joints and rough brick detail.
- **Textures:** Weathered red brick, Pale limestone, Castle stonework, Weathered timber, Slate roof tiles and Cast concrete. These six materials stay completely still during playback. Adjust pattern scale, accent colour and variation; there is no speed control. Open [Building materials](./examples/Building-materials.luma) to compare them.

### Subtract shapes and make holes

1. Select the surface that should have a hole, then open **Surface → Cutouts & holes**.
2. Click **Rectangle hole** or **Ellipse hole** for a preset. To use your own polygon or curved shape, draw it first, select the parent surface, choose it under **Subtract existing shape**, then click **Subtract shape**.
3. Select the orange dashed cutout outline or its entry in the layer list. Move its corners and Bézier handles as usual. Placement mesh shows the holes on the projector while you align them.

A cutout removes only its parent's content, so lower layers show through; with nothing behind it, the hole projects black. Multiple cutouts combine, including overlapping holes and shapes crossing an outside edge to form a notch. Hide a cutout to fill its hole, or choose **Restore as surface** to make it a normal effect surface again. Nested cutouts are not supported.

Moving, resizing or rotating a whole parent carries its holes with it. Editing an individual parent corner leaves holes independently placed. Duplicating or deleting a parent includes its cutouts. All these actions support Undo, and cutouts are stored in saved projects. Cutout boundaries are crisp; edge feathering still applies to the parent's outside edge. Cutouts count towards the 32-shape limit. Open [Facade with cutouts](./examples/Facade-with-cutouts.luma) for a wall with creature windows and a curved doorway.

The coordinate editor also preserves precise positions when you tab through rounded fields without changing them. The Windows startup and window-recovery fixes from 1.4.1 are retained.

## 1.4

**Placement mesh** replaces the animations with a static wire mesh on each visible shape, in both the editor and projector output. Click **Placement mesh** above the canvas or press **M** in either window. Press **M** again to return to the animations. The same switch is available in **Output settings**.

The mesh shows perspective on four-corner surfaces and clips to triangles, ellipses, concave polygons and Bézier edges. Bright outlines and numbered corners stay visible while you move or reshape a surface. It remains clear even when the assigned effect has low opacity, feathering or dim master brightness. **Solo** isolates one surface, hidden surfaces stay hidden, and **Blackout** overrides the mesh. Calibration and placement mesh are separate, mutually exclusive views.

Effects and liquid stacks keep their settings and shared playback timing while the mesh is displayed; playback controls still work. The mode is a temporary placement aid and is not saved in project files. The previous outline-over-animation setting returns when you leave mesh mode. The 50-effect library and the 1.3.1 Windows startup fix are retained.

## 1.3

Eight new procedural animations bring the library to **50 effects**, including **Edge runner** and a new **Architecture** category. The seven architectural and atmospheric animations below are original effects covering the requested visual styles; no vendor footage is included. Search any reference name to find its Luma equivalent, or open the [Architectural illusions example](./examples/Architectural-illusions.luma) to see all seven together.

**Edge runner** sends a bright light and fading glow trail racing around the actual shape boundary. Select a surface, then choose **Geometric → Edge runner**. It follows distorted rectangles, triangles, ellipses, concave polygons and Bézier curves. **Speed** changes the pace (one lap every six seconds at 1×); **Light width** changes the glow's thickness. Choose an accent colour or enable **Colour cycling**. Pause, restart and saved projects use the same controls as other effects. Open the [Edge runner example](./examples/Edge-runner.luma) to see six different outlines together.

| Reference | Built-in Luma effect | Animation |
| --- | --- | --- |
| [Smart Reflection — Video Mapping Store](https://videomapping.store/shop/all-video-mapping-loops-bundle/) | Prismatic relief | Reflective panels tilt, rotate and protrude from a recessed facade. |
| [Falling Walls — Video Mapping Store](https://videomapping.store/shop/all-video-mapping-loops-bundle/) | Shatter & rebuild | A wall fractures into tumbling shards, then reconstructs itself. |
| [Liquid Fabrics — Video Mapping Store](https://videomapping.store/shop/all-video-mapping-loops-bundle/) | Liquid drapery | Flowing folds and reflective ripples make the entire wall appear fluid. |
| [ChromaticFlow — ojovivo](https://resolume.com/footage/ChromaticFlow) | Spectrum lattice | A colourful three-dimensional wireframe mesh twists and rotates. |
| [Dawnlight — Artificial Imagination](https://resolume.com/footage/Dawnlight) | Stormfront | Moving cloud layers illuminate around branching lightning. |
| [LetThereBeLight — VersaTale](https://resolume.com/footage/LetThereBeLight) | Prism gateway | Sci-fi portal frames advance around rotating crystalline geometry. |
| [MetalMadness — Machina Infinitum](https://resolume.com/footage/MetalMadness) | Chrome recursion | A rotating metallic Menger sponge reveals recursive cubes and cavities. |

All seven have a 15-second movement loop at 1× speed and use the shared playback clock. **Spectrum lattice** and **Prism gateway** enable optional colour cycling by default. The effects support the existing speed, scale, accent colour, variation, opacity, blending and feathering controls. Geometry depth and cloud lighting are generated at runtime; the app remains usable offline.

## 1.2

- **Stacked animations.** A ready-made three-surface liquid loop drains from the upper reservoir into the middle, then the lower, and returns to the top. Link two to eight existing surfaces, change their order, set a shared 4–120 second duration and choose a liquid colour. Every reservoir and connecting stream follows the same playback clock in the editor and output.
- **42 effects.** The library now includes cute and scary ghosts, dancing skeletons, animated pumpkins, opening curtains with a scary face, fire, underwater scenery, an orbital window looking at Earth, lava lamps, neon, stars, waves and autumn leaves. Three spinning geometric effects have optional colour cycling. Ten additional generic effects complete the collection.
- **Bézier edges.** Select a corner and enable **Bézier edge** to curve the edge leading to the next corner. Drag either teal control handle or enter exact projector-pixel coordinates. Handles support arrow-key nudging, transform with their surface, and are included in undo and saved projects.
- **Projected wireframes.** The actual output shows shape outlines and corner numbers while placing or editing surfaces, including curved edges and unfinished polygons. In **Output settings → Projection wireframe**, choose **During edits**, **Always on** or **Off**. The wireframe button above the canvas pins guides on. Blackout also hides guides.
