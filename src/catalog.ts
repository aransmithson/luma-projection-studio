import type { EffectCategory, EffectId } from "./types";
import { storybookEffects } from "./storybookCatalog";
import { cosmicEffects } from "./cosmicCatalog";
import { depthEffects } from "./depthCatalog";
import { stageEffects } from "./stageCatalog";
import { chaseEffects } from "./chaseCatalog";
import { musicEffects } from "./musicCatalog";
import { storyEffects } from "./storyCatalog";

export type Effect = {
  id: EffectId;
  name: string;
  category: EffectCategory;
  description: string;
  color: string;
  tag: string;
  cycleByDefault?: boolean;
  searchTerms?: string[];
  still?: boolean;
  detail?: number;
  loopSeconds?: number;
  previewTime?: number;
  audioReactive?: boolean;
};
export const effectCategories: EffectCategory[] = [
  "Music",
  "Linked stories",
  "Chase scenes",
  "Stage & light",
  "3D illusions",
  "Shadow puppets",
  "Ambient",
  "Architecture",
  "Creatures",
  "Colour blocks",
  "Textures",
  "Geometric",
  "Nature",
  "Space",
  "Celebration",
  "Halloween",
  "Christmas",
];
export const effects: Effect[] = [
  ...musicEffects,
  ...storyEffects,
  {
    id: "portal-hopper",
    name: "Portal gun journey",
    category: "Linked stories",
    color: "#67e2ff",
    description:
      "A little explorer fires a glowing portal launcher, opens a doorway on the next tile and steps through. Link two to eight shapes to travel around them on one shared loop, or use a single shape for a self-contained portal scene.",
    tag: "Linked character story",
    detail: 1024,
    loopSeconds: 8,
    previewTime: 3.8,
    searchTerms: [
      "portal gun",
      "teleport",
      "robot",
      "linked",
      "tiles",
      "space",
      "loop",
    ],
  },
  ...chaseEffects,
  ...stageEffects,
  {
    id: "single-eyeball",
    name: "Single eyeball",
    category: "Halloween",
    description:
      "One large, glossy eyeball looks around and blinks on a black background. Place it on its own shape, then duplicate or add more shapes for individually positioned eyes. Each surface has its own iris colour, eye size, speed and variation. Shuffle a duplicate for independent gaze and blink timing.",
    color: "#69d6c0",
    tag: "Individual eye · 24s",
    detail: 1024,
    loopSeconds: 24,
    searchTerms: [
      "eye balls",
      "eyeballs",
      "individual eyes",
      "one eye",
      "solo eye",
      "blinking",
      "3d",
    ],
  },
  {
    id: "eyeball-swarm",
    name: "Eyeball swarm",
    category: "Halloween",
    description:
      "A crowd of floating, glossy eyeballs looks around together, glances independently and blinks at different times. Detailed iris fibres, subtle veins and shaded globes give the eyes depth. Accent colour changes the irises; pattern scale makes the eyes larger or smaller.",
    color: "#69d6c0",
    tag: "Watching eyes · 24s",
    detail: 1024,
    loopSeconds: 24,
    searchTerms: [
      "eye balls",
      "eyeballs",
      "bunch of eyes",
      "eye wall",
      "watching",
      "blinking",
      "3d",
    ],
  },
  ...depthEffects,
  ...cosmicEffects,
  ...storybookEffects,
  {
    id: "corner-skeleton",
    name: "Skeleton peek",
    category: "Creatures",
    description:
      "An ivory skeleton leans around the corner, scans the room with glowing eyes and chatters its jaw. Bony fingers grip the edge. Choose left or right.",
    color: "#e9dfc9",
    tag: "Peek · 18s",
    detail: 1024,
    loopSeconds: 18,
    searchTerms: ["halloween", "skull", "bones", "spooky", "skeleton peak"],
  },
  {
    id: "corner-witch",
    name: "Witch peek",
    category: "Creatures",
    description:
      "A curious witch peeks out in a bent purple hat, looks around and blinks. Copper hair, a swinging moon charm and tiny green sparks complete the scene.",
    color: "#a8c979",
    tag: "Peek · 18s",
    detail: 1024,
    loopSeconds: 18,
    searchTerms: ["halloween", "magic", "spooky", "witch peak"],
  },
  {
    id: "block-spectrum",
    name: "Spectrum blocks",
    category: "Colour blocks",
    description:
      "Glossy square panels sweep through a continuous diagonal rainbow. Smooth, saturated colour changes fill any mapped surface.",
    color: "#a58aff",
    tag: "Spectrum · 16s",
    detail: 1024,
    loopSeconds: 16,
    searchTerms: ["colour shift", "color shift", "tiles", "rainbow"],
  },
  {
    id: "block-mosaic",
    name: "Colour mosaic",
    category: "Colour blocks",
    description:
      "Each bevelled tile fades independently between its own seeded colours, creating a constantly evolving stained-glass mosaic without abrupt flashes.",
    color: "#df8acb",
    tag: "Random fades · 16s",
    detail: 1024,
    loopSeconds: 16,
    searchTerms: ["color", "random", "colour shift", "tiles"],
  },
  {
    id: "block-ripples",
    name: "Ripple blocks",
    category: "Colour blocks",
    description:
      "Concentric rings of coloured light travel across recessed square tiles. Bright ripples alternate with dim, richly coloured panels.",
    color: "#57cfe0",
    tag: "Radial wave · 16s",
    detail: 1024,
    loopSeconds: 16,
    searchTerms: ["color", "colour shift", "pulse", "tiles"],
  },
  {
    id: "block-flip",
    name: "Flip tiles",
    category: "Colour blocks",
    description:
      "A travelling wave turns panels edge-on and reveals contrasting colours on their reverse sides, with shaded edges and glossy faces.",
    color: "#f3a65e",
    tag: "Turning panels · 16s",
    detail: 1024,
    loopSeconds: 16,
    searchTerms: ["color", "colour shift", "rotate", "blocks"],
  },
  {
    id: "block-rise",
    name: "Rising tiles",
    category: "Colour blocks",
    description:
      "Coloured blocks rise and settle in flowing diagonal waves. Shaded side faces create an illusion of depth on a flat wall.",
    color: "#69d9b7",
    tag: "Depth wave · 16s",
    detail: 1024,
    loopSeconds: 16,
    searchTerms: ["color", "colour shift", "3d", "blocks", "depth"],
  },
  {
    id: "corner-fox",
    name: "Fox around the corner",
    category: "Creatures",
    description:
      "A softly lit little fox peeks out, looks around, blinks and ducks back behind the corner. Choose the left or right edge.",
    color: "#eea35c",
    tag: "Peek · 18s",
    detail: 1024,
  },
  {
    id: "corner-bunny",
    name: "Shy little bunny",
    category: "Creatures",
    description:
      "A velvet-furred bunny with tall ears, glossy eyes and a twitching nose cautiously looks around the corner.",
    color: "#e6c2c7",
    tag: "Peek · 18s",
    detail: 1024,
  },
  {
    id: "corner-raccoon",
    name: "Curious raccoon",
    category: "Creatures",
    description:
      "A mischievous masked raccoon leans around an edge, scans the room and curls its tiny paws around the wall.",
    color: "#b8c4d4",
    tag: "Peek · 18s",
    detail: 1024,
  },
  {
    id: "corner-dragon",
    name: "Pocket dragon",
    category: "Creatures",
    description:
      "A friendly little dragon with pearlescent scales, golden horns and curious eyes peeks around the corner.",
    color: "#9fbaed",
    tag: "Peek · 18s",
    detail: 1024,
  },
  {
    id: "chromatic-bricks",
    name: "Chromatic brickwork",
    category: "Architecture",
    description:
      "Textured, bevelled bricks light up independently in changing jewel colours. Staggered fades keep the wall constantly evolving.",
    color: "#9c81ff",
    tag: "Colour bricks",
    detail: 1024,
  },
  {
    id: "brick-ripple",
    name: "Masonry lightwave",
    category: "Architecture",
    description:
      "Waves of coloured light travel across a dimensional brick wall, revealing rough faces, recessed mortar and bright edges.",
    color: "#53d9cd",
    tag: "Lightwave",
    detail: 1024,
  },
  {
    id: "red-brick",
    name: "Weathered red brick",
    category: "Textures",
    description:
      "A still running-bond brick wall with rough fired-clay faces, weathering and recessed mortar. Pattern scale controls the brick size.",
    color: "#ad6246",
    tag: "Still material",
    still: true,
    detail: 1536,
  },
  {
    id: "limestone",
    name: "Pale limestone",
    category: "Textures",
    description:
      "Still ashlar blocks with softly bevelled edges, pale mineral flecks and warm stone variation.",
    color: "#d3c9b0",
    tag: "Still material",
    still: true,
    detail: 1536,
  },
  {
    id: "castle-stone",
    name: "Castle stonework",
    category: "Textures",
    description:
      "Still dark, irregular stone courses with deep joints, chipped edges and subtle moss staining.",
    color: "#8d9691",
    tag: "Still material",
    still: true,
    detail: 1536,
  },
  {
    id: "timber",
    name: "Weathered timber",
    category: "Textures",
    description:
      "Still timber boards with flowing grain, knots, nail heads and softly lit edges.",
    color: "#ad8a63",
    tag: "Still material",
    still: true,
    detail: 1536,
  },
  {
    id: "slate",
    name: "Slate roof tiles",
    category: "Textures",
    description:
      "Still overlapping slate shingles with fine stone striations, highlights and shadows between courses.",
    color: "#727f96",
    tag: "Still material",
    still: true,
    detail: 1536,
  },
  {
    id: "concrete",
    name: "Cast concrete",
    category: "Textures",
    description:
      "Still architectural concrete panels with pores, formwork seams, tie holes and subtle surface variation.",
    color: "#adafac",
    tag: "Still material",
    still: true,
    detail: 1536,
  },
  {
    id: "aurora",
    name: "Aurora drift",
    category: "Ambient",
    description: "Soft ribbons of light, drifting through the dark.",
    color: "#9b7cff",
    tag: "Fluid",
  },
  {
    id: "ocean",
    name: "Deep currents",
    category: "Ambient",
    description: "Layered blue waves with a gentle underwater glow.",
    color: "#46c9ef",
    tag: "Calm",
  },
  {
    id: "plasma",
    name: "Liquid spectrum",
    category: "Ambient",
    description: "A vivid, slowly evolving field of colour.",
    color: "#e170da",
    tag: "Fluid",
  },
  {
    id: "starfield",
    name: "Into the cosmos",
    category: "Ambient",
    description: "An endless journey through a field of stars.",
    color: "#b6b8ff",
    tag: "Particles",
  },
  {
    id: "rings",
    name: "Neon echoes",
    category: "Geometric",
    description: "Expanding rings of light from a glowing centre.",
    color: "#a38aff",
    tag: "Pulse",
  },
  {
    id: "grid",
    name: "Digital grid",
    category: "Geometric",
    description: "A luminous grid with travelling pulses.",
    color: "#51d5c0",
    tag: "Pattern",
  },
  {
    id: "prism",
    name: "Prism bands",
    category: "Geometric",
    description: "Saturated diagonal bands in perpetual motion.",
    color: "#fb9acb",
    tag: "Pattern",
  },
  {
    id: "embers",
    name: "Witchfire",
    category: "Halloween",
    description: "Smouldering orange flames and rising embers.",
    color: "#ff862e",
    tag: "Fire",
  },
  {
    id: "fog",
    name: "Haunted mist",
    category: "Halloween",
    description: "Eerie violet fog rolling through the shadows.",
    color: "#a27cf4",
    tag: "Atmosphere",
  },
  {
    id: "eyes",
    name: "Eyes in the dark",
    category: "Halloween",
    description: "Watchful eyes emerge and blink in the darkness.",
    color: "#b8f56c",
    tag: "Spooky",
  },
  {
    id: "bats",
    name: "Midnight flight",
    category: "Halloween",
    description: "A colony of bats crossing a hazy autumn moon.",
    color: "#ce87ff",
    tag: "Silhouettes",
  },
  {
    id: "snow",
    name: "First snowfall",
    category: "Christmas",
    description: "Soft snowflakes drifting through a winter night.",
    color: "#a9ddff",
    tag: "Particles",
  },
  {
    id: "lights",
    name: "Merry & bright",
    category: "Christmas",
    description: "Festive strings of gently twinkling coloured lights.",
    color: "#ffd58a",
    tag: "Lights",
  },
  {
    id: "candy",
    name: "Candy cane lane",
    category: "Christmas",
    description: "Classic red and ivory stripes with a little sparkle.",
    color: "#ff556b",
    tag: "Pattern",
  },
  {
    id: "twinkle",
    name: "Golden wishes",
    category: "Christmas",
    description: "Warm golden stars for a little festive magic.",
    color: "#ffcf7c",
    tag: "Stars",
  },
  {
    id: "cute-ghosts",
    name: "Little boo crew",
    category: "Halloween",
    description:
      "Friendly, rosy-cheeked ghosts float and wave through a starry violet night.",
    color: "#b7a5ff",
    tag: "Cute ghosts",
  },
  {
    id: "scary-ghost",
    name: "The lingering ghost",
    category: "Halloween",
    description:
      "A looming spectre with hollow eyes and a flowing, ragged shroud.",
    color: "#9bcaca",
    tag: "Haunting",
  },
  {
    id: "skeletons",
    name: "Skeleton shuffle",
    category: "Halloween",
    description:
      "Three grinning skeletons dance in time, swinging their arms and kicking their knees.",
    color: "#b49aff",
    tag: "Dancing",
  },
  {
    id: "pumpkins",
    name: "Pumpkin party",
    category: "Halloween",
    description:
      "Glowing jack-o’-lanterns bob, tilt and blink with flickering candlelight inside.",
    color: "#ff8b25",
    tag: "Animated",
  },
  {
    id: "curtains",
    name: "Behind the curtain",
    category: "Halloween",
    description:
      "Velvet curtains open to reveal a sinister face, pause, then close. The full sequence repeats every 16 seconds at 1× speed.",
    color: "#c93055",
    tag: "Reveal · 16s",
  },
  {
    id: "fire",
    name: "Living flames",
    category: "Nature",
    description:
      "Layered tongues of fire curl upward from a glowing hearth, trailing sparks.",
    color: "#ff6626",
    tag: "Fire",
  },
  {
    id: "underwater",
    name: "Underwater garden",
    category: "Nature",
    description:
      "Sunbeams, swimming fish, bubbles and swaying seaweed beneath a turquoise sea.",
    color: "#49e3d0",
    tag: "Underwater",
  },
  {
    id: "spaceship",
    name: "Orbital window",
    category: "Space",
    description:
      "Look through a spacecraft window at a slowly turning Earth, drifting stars and a luminous atmosphere.",
    color: "#60beff",
    tag: "Earth view",
  },
  {
    id: "lava",
    name: "Lava lounge",
    category: "Ambient",
    description:
      "Warm wax blobs stretch, merge and drift inside a glowing lava lamp.",
    color: "#ff70a9",
    tag: "Lava lamp",
  },
  {
    id: "neon",
    name: "Neon arcade",
    category: "Ambient",
    description:
      "Bright neon tubes, nested frames and travelling light traces on a dark wall.",
    color: "#ff64d8",
    tag: "Neon lights",
  },
  {
    id: "galaxy",
    name: "Drifting starfield",
    category: "Space",
    description:
      "Layers of stars drift gently across a deep nebula with occasional shooting stars.",
    color: "#9bafff",
    tag: "Starfield",
  },
  {
    id: "waves",
    name: "Moonlit waves",
    category: "Nature",
    description: "Rolling blue waves, shimmering foam and reflected moonlight.",
    color: "#49bde9",
    tag: "Ocean waves",
  },
  {
    id: "leaves",
    name: "Autumn drift",
    category: "Nature",
    description:
      "Golden, russet and red leaves tumble in a gentle autumn breeze.",
    color: "#edaa40",
    tag: "Falling leaves",
  },
  {
    id: "kaleidoscope",
    name: "Prism kaleidoscope",
    category: "Geometric",
    description:
      "Mirrored petals and layered polygons spin into intricate colour-changing patterns. Colour cycling can be switched off.",
    color: "#a176ff",
    tag: "Spinning",
    cycleByDefault: true,
  },
  {
    id: "orbits",
    name: "Chromatic orbits",
    category: "Geometric",
    description:
      "Luminous polygon rings turn around a shared centre, with orbiting points of light. Optional colour cycling.",
    color: "#59ddff",
    tag: "Spinning",
    cycleByDefault: true,
  },
  {
    id: "cubes",
    name: "Infinity cubes",
    category: "Geometric",
    description:
      "Nested three-dimensional wireframe cubes rotate through one another. Optional colour cycling.",
    color: "#e28cff",
    tag: "3D geometry",
    cycleByDefault: true,
  },
  {
    id: "rain",
    name: "Rain on glass",
    category: "Nature",
    description:
      "Rain trails slide down a dark pane with soft city lights in the distance.",
    color: "#7cbeeb",
    tag: "Rainfall",
  },
  {
    id: "bubbles",
    name: "Bubble ballet",
    category: "Nature",
    description:
      "Iridescent bubbles rise and sway, catching colourful reflections.",
    color: "#7fe4ed",
    tag: "Bubbles",
  },
  {
    id: "confetti",
    name: "Confetti parade",
    category: "Celebration",
    description: "Colourful paper pieces tumble and flutter through the air.",
    color: "#f79bcb",
    tag: "Party",
  },
  {
    id: "fireworks",
    name: "Midnight fireworks",
    category: "Celebration",
    description:
      "Rockets climb into the night and blossom into colourful, slowly fading sparks.",
    color: "#ffbf68",
    tag: "Fireworks",
  },
  {
    id: "clouds",
    name: "Cloud nine",
    category: "Nature",
    description:
      "Soft clouds cross a luminous sky with a slow, soothing drift.",
    color: "#9ed9ff",
    tag: "Sky",
  },
  {
    id: "ripples",
    name: "Liquid ripples",
    category: "Nature",
    description: "Raindrops spread concentric rings across a glowing pool.",
    color: "#61d6df",
    tag: "Water",
  },
  {
    id: "electric",
    name: "Electric currents",
    category: "Ambient",
    description:
      "Branching filaments of light weave across a dark electric field.",
    color: "#7cafff",
    tag: "Energy",
  },
  {
    id: "petals",
    name: "Petal drift",
    category: "Nature",
    description:
      "Soft cherry-blossom petals float and turn through warm evening light.",
    color: "#ffb6d5",
    tag: "Blossom",
  },
  {
    id: "bokeh",
    name: "Soft bokeh",
    category: "Ambient",
    description:
      "Large, softly glowing circles drift through a layered field of colour.",
    color: "#ce9eff",
    tag: "Soft light",
  },
  {
    id: "sunrise",
    name: "Sunrise horizon",
    category: "Nature",
    description:
      "A warm sun rises behind layered mountain silhouettes and a shimmering lake.",
    color: "#ffbb72",
    tag: "Landscape",
  },
  {
    id: "stacked-liquid",
    name: "Liquid flow stack",
    category: "Ambient",
    description:
      "Link two to eight surfaces into one synchronised liquid loop. Open Stacked animations to arrange the order, colour and cycle length.",
    color: "#58d9e9",
    tag: "Linked · loop",
  },
  {
    id: "prismatic-relief",
    name: "Prismatic relief",
    category: "Architecture",
    description:
      "Reflective panels tilt, rotate and push out from a recessed wall, creating a sculpted depth illusion. A 15-second movement loop at 1× speed.",
    color: "#a4d4ee",
    tag: "3D relief",
    searchTerms: [
      "Smart Reflection",
      "Video Mapping Store",
      "extrusion",
      "depth",
    ],
  },
  {
    id: "shatter-rebuild",
    name: "Shatter & rebuild",
    category: "Architecture",
    description:
      "A solid facade fractures into tumbling glass-like shards, reveals a deep void, then rebuilds itself. The complete sequence loops every 15 seconds at 1× speed.",
    color: "#b8dce7",
    tag: "Collapse · 15s",
    searchTerms: [
      "Falling Walls",
      "Video Mapping Store",
      "collapse",
      "glass",
      "destruction",
    ],
  },
  {
    id: "liquid-drapery",
    name: "Liquid drapery",
    category: "Architecture",
    description:
      "Liquid folds and rippling satin highlights sweep across the entire surface, making a rigid wall appear fluid. A seamless 15-second loop at 1× speed.",
    color: "#82cedd",
    tag: "Fluid wall",
    searchTerms: [
      "Liquid Fabrics",
      "Video Mapping Store",
      "water",
      "curtain",
      "cloth",
    ],
  },
  {
    id: "spectrum-lattice",
    name: "Spectrum lattice",
    category: "Geometric",
    description:
      "A twisting three-dimensional wireframe mesh turns through coloured light, with travelling nodes and a fine technical grid. Optional colour cycling; 15-second movement loop.",
    color: "#72e3e5",
    tag: "Wireframe",
    cycleByDefault: true,
    searchTerms: ["ChromaticFlow", "ojovivo", "Resolume", "mesh"],
  },
  {
    id: "stormfront",
    name: "Stormfront",
    category: "Nature",
    description:
      "Layered storm clouds drift through a dark sky, illuminated by branching lightning and soft internal light. A 15-second loop with two lightning strikes at 1× speed.",
    color: "#93b9ef",
    tag: "Clouds + lightning",
    searchTerms: ["Dawnlight", "Artificial Imagination", "Resolume", "storm"],
  },
  {
    id: "prism-gateway",
    name: "Prism gateway",
    category: "Geometric",
    description:
      "Nested sci-fi portals advance from a luminous centre, surrounded by rotating crystalline geometry and energy traces. Optional colour cycling; 15-second movement loop.",
    color: "#be89ff",
    tag: "Energy portal",
    cycleByDefault: true,
    searchTerms: [
      "LetThereBeLight",
      "VersaTale",
      "Resolume",
      "psychedelic",
      "sci-fi",
    ],
  },
  {
    id: "chrome-recursion",
    name: "Chrome recursion",
    category: "Geometric",
    description:
      "A recursive metallic sponge turns and breathes, revealing hundreds of smaller cubes, deep cavities and moving chrome reflections. Optional colour cycling; 15-second movement loop.",
    color: "#bbcedd",
    tag: "Metal fractal",
    searchTerms: [
      "MetalMadness",
      "Machina Infinitum",
      "Resolume",
      "fractal",
      "metallic",
    ],
  },
  {
    id: "edge-runner",
    name: "Edge runner",
    category: "Geometric",
    description:
      "A bright light races around this surface’s actual edge with a fading glow trail, following corners and Bézier curves. One lap takes six seconds at 1× speed. Light width controls the glow; colour cycling is optional.",
    color: "#7be4ff",
    tag: "Follows shape",
    searchTerms: ["edge light", "perimeter", "trace", "racing light", "chase"],
  },
];
export const effectById = Object.fromEntries(
  effects.map((e) => [e.id, e]),
) as Record<EffectId, Effect>;
effectById["imported-media"] = {
  id: "imported-media",
  name: "Imported animation",
  category: "Imported",
  description:
    "Local MP4 video or GIF. Follows the shared playback clock; video sound is muted.",
  color: "#70e8ee",
  tag: "Local media",
  detail: 1920,
};
