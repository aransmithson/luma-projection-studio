export type Point = { x: number; y: number };
export type BezierEdge = { control1: Point; control2: Point };
export type ShapeKind = "quad" | "triangle" | "ellipse" | "polygon";
export type EffectCategory =
  | "Imported"
  | "Music"
  | "Linked stories"
  | "Chase scenes"
  | "Stage & light"
  | "3D illusions"
  | "Ambient"
  | "Architecture"
  | "Creatures"
  | "Colour blocks"
  | "Shadow puppets"
  | "Textures"
  | "Geometric"
  | "Halloween"
  | "Christmas"
  | "Nature"
  | "Space"
  | "Celebration";
export type EffectId =
  | "imported-media"
  | "eq-bars"
  | "eq-mirror"
  | "eq-halo"
  | "eq-wave"
  | "eq-reactor"
  | "eq-city"
  | "portal-hopper"
  | "story-cosmic-courier"
  | "story-ghost-train"
  | "story-dragon-lanterns"
  | "story-reef-relay"
  | "story-clockwork-marble"
  | "story-firefly-garden"
  | "chase-cat-mouse"
  | "chase-fox-rabbit"
  | "chase-ghost-pumpkin"
  | "chase-robot-alien"
  | "chase-snowman-penguin"
  | "marquee-wall"
  | "led-prism"
  | "stardust-cascade"
  | "hex-relief"
  | "photon-runway"
  | "led-stage"
  | "spectrum-dots"
  | "pearl-silk"
  | "marquee-alphabet"
  | "crimson-silk"
  | "led-cylinder-hall"
  | "led-proscenium"
  | "ribbon-light-stage"
  | "light-canopy"
  | "led-orb-chamber"
  | "diamond-recess"
  | "cubic-tide"
  | "rotating-tile-wall"
  | "prism-skin"
  | "relief-rings"
  | "sliding-relief"
  | "single-eyeball"
  | "eyeball-swarm"
  | "flying-bricks"
  | "tumbling-wall"
  | "vault-iris"
  | "crystal-geode"
  | "folding-facade"
  | "piston-wave"
  | "orbital-gyroscope"
  | "infinite-arcade"
  | "floating-citadel"
  | "ribbon-vortex"
  | "tectonic-rift"
  | "gravity-staircase"
  | "warp-speed"
  | "lunar-orbit"
  | "saturn-rings"
  | "jupiter-storms"
  | "iss-orbit"
  | "spiral-galaxy"
  | "stellar-nebula"
  | "solar-prominences"
  | "comet-flyby"
  | "asteroid-belt"
  | "temple-awakening"
  | "magnetic-ferrofluid"
  | "brushed-aluminium"
  | "riveted-steel"
  | "copper-patina"
  | "desert-sandstone"
  | "red-sandstone"
  | "glyph-pillars"
  | "aurora"
  | "ocean"
  | "plasma"
  | "starfield"
  | "rings"
  | "grid"
  | "prism"
  | "embers"
  | "fog"
  | "eyes"
  | "bats"
  | "snow"
  | "lights"
  | "candy"
  | "twinkle"
  | "cute-ghosts"
  | "scary-ghost"
  | "skeletons"
  | "pumpkins"
  | "curtains"
  | "fire"
  | "underwater"
  | "spaceship"
  | "lava"
  | "neon"
  | "galaxy"
  | "waves"
  | "leaves"
  | "kaleidoscope"
  | "orbits"
  | "cubes"
  | "rain"
  | "bubbles"
  | "confetti"
  | "fireworks"
  | "clouds"
  | "ripples"
  | "electric"
  | "petals"
  | "bokeh"
  | "sunrise"
  | "stacked-liquid"
  | "prismatic-relief"
  | "shatter-rebuild"
  | "liquid-drapery"
  | "spectrum-lattice"
  | "stormfront"
  | "prism-gateway"
  | "chrome-recursion"
  | "edge-runner"
  | "clockwork-wall"
  | "frost-bloom"
  | "creeping-garden"
  | "enchanted-bookshelf"
  | "stained-sunlight"
  | "marble-run"
  | "origami-garden"
  | "living-honeycomb"
  | "moonlit-mushrooms"
  | "peeling-paint"
  | "sand-sculptor"
  | "laser-blueprints"
  | "toy-train"
  | "haunted-portraits"
  | "puppet-woodland"
  | "puppet-dragon"
  | "puppet-ocean"
  | "puppet-ballet"
  | "puppet-spooky"
  | "puppet-winter"
  | "corner-fox"
  | "corner-bunny"
  | "corner-raccoon"
  | "corner-dragon"
  | "corner-skeleton"
  | "corner-witch"
  | "block-spectrum"
  | "block-mosaic"
  | "block-ripples"
  | "block-flip"
  | "block-rise"
  | "chromatic-bricks"
  | "brick-ripple"
  | "red-brick"
  | "limestone"
  | "castle-stone"
  | "timber"
  | "slate"
  | "concrete";
export type MediaAsset = {
  id: string;
  name: string;
  format: "mp4" | "gif";
  bytes: number;
  width: number;
  height: number;
  duration: number;
};
export type LibraryMedia = MediaAsset & { thumbnail?: string };
export type MediaBinding = {
  asset: MediaAsset;
  fit: "contain" | "cover" | "stretch";
  loop: boolean;
  trimStart: number;
  trimEnd: number;
  offset: number;
};
export type BlendMode =
  | "normal"
  | "add"
  | "screen"
  | "multiply"
  | "overlay"
  | "soft-light"
  | "darken"
  | "lighten"
  | "difference"
  | "exclusion";
export type ColorOverlay = {
  enabled: boolean;
  style:
    | "wash"
    | "bands"
    | "ripples"
    | "sweep"
    | "aurora"
    | "checker"
    | "facets"
    | "spotlight";
  palette:
    | "spectrum"
    | "neon"
    | "sunset"
    | "ocean"
    | "ember"
    | "pastel"
    | "halloween"
    | "christmas";
  blend: BlendMode;
  intensity: number;
  speed: number;
  scale: number;
  reverse: boolean;
};
export type Surface = {
  id: string;
  name: string;
  kind: ShapeKind;
  points: Point[];
  curves?: (BezierEdge | null)[];
  effectId: EffectId;
  color: string;
  colorCycle: boolean;
  opacity: number;
  speed: number;
  scale: number;
  feather: number;
  visible: boolean;
  locked: boolean;
  blend: BlendMode;
  colorOverlay?: ColorOverlay;
  seed: number;
  cutoutOf?: string;
  effectSide?: "left" | "right";
  layerId?: string;
  contentTransform?: ContentTransform;
  media?: MediaBinding;
};
export type ContentTransform = {
  rotation: number;
  offsetX: number;
  offsetY: number;
};
export type Layer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
};
export type ChaseEffectId = Extract<EffectId, `chase-${string}`>;
export type LiquidStyle = "water" | "lava" | "potion" | "ice";
type StackBase = {
  id: string;
  name: string;
  surfaceIds: string[];
  duration: number;
  color: string;
  links: boolean;
};
export type LiquidStack = StackBase & { kind?: "liquid"; style?: LiquidStyle };
export type ChaseStack = StackBase & {
  kind: "chase";
  links: false;
  effectId: ChaseEffectId;
  direction: "left" | "right";
  scale: number;
  seed: number;
};
export type PortalCharacter = "robot" | "alien" | "cat";
export type PortalStack = StackBase & {
  kind: "portal";
  links: false;
  character: PortalCharacter;
  direction: "left" | "right";
  scale: number;
  seed: number;
};
export type StoryEffectId = Extract<EffectId, `story-${string}`>;
export type StoryStack = StackBase & {
  kind: "story";
  effectId: StoryEffectId;
  links: false;
  direction: "left" | "right";
  scale: number;
  seed: number;
};
export type AnimationStack = LiquidStack | ChaseStack | PortalStack | StoryStack;
export type Project = {
  version: 1;
  name: string;
  width: number;
  height: number;
  brightness: number;
  surfaces: Surface[];
  stacks: AnimationStack[];
  layers?: Layer[];
  audioSettings?: AudioSettings;
};
export type AudioSettings = {
  gain: number;
  smoothing: number;
  noiseGate: number;
};
export type AudioSource = "system" | "microphone" | "demo";
export type AudioFrame = {
  sequence: number;
  capturedAt: number;
  bands: number[];
  peaks: number[];
  wave: number[];
  level: number;
  bass: number;
  mid: number;
  treble: number;
  beat: number;
};
export type Playback = { playing: boolean; offset: number; startedAt: number };
export type RenderState = {
  project: Project;
  playback: Playback;
  blackout: boolean;
  testPattern: boolean;
  placementMesh?: boolean;
  audio?: AudioFrame | null;
  audioFrozen?: AudioFrame | null;
  pointer?: Point | null;
  soloSurfaceId?: string | null;
  alignment?: { visible: boolean; selectedId: string | null; draft: Point[] };
};
export type DisplayInfo = {
  id: number;
  label: string;
  width: number;
  height: number;
  primary: boolean;
  scaleFactor: number;
};
export type OutputStatus = { open: boolean; displayId: number | null };
export type DesktopBridge = {
  listMedia: () => Promise<LibraryMedia[]>;
  importMedia: (
    expectedId?: string,
  ) => Promise<{
    canceled: boolean;
    asset?: Pick<MediaAsset, "id" | "name" | "format" | "bytes">;
    error?: string;
  }>;
  completeMedia: (asset: LibraryMedia) => Promise<LibraryMedia>;
  onMediaChanged: (callback: () => void) => () => void;
  setAudioCapture: (source: "system" | "microphone" | null) => Promise<void>;
  updateAudioFrame: (frame: AudioFrame | null) => void;
  onAudioFrame: (callback: (frame: AudioFrame | null) => void) => () => void;
  getDisplays: () => Promise<DisplayInfo[]>;
  openOutput: (displayId: number, state: RenderState) => Promise<OutputStatus>;
  closeOutput: () => Promise<OutputStatus>;
  controlOutput: (action: "close" | "fullscreen" | "mesh") => Promise<void>;
  onOutputControl: (callback: (action: "mesh") => void) => () => void;
  updateOutput: (state: RenderState) => void;
  updateOutputPointer: (point: Point | null) => void;
  onOutputPointer: (callback: (point: Point | null) => void) => () => void;
  copyShapes: (data: string) => Promise<void>;
  pasteShapes: () => Promise<string>;
  getOutputState: () => Promise<RenderState | null>;
  onOutputState: (callback: (state: RenderState) => void) => () => void;
  onOutputStatus: (callback: (state: OutputStatus) => void) => () => void;
  saveProject: (
    data: string,
    suggestedName: string,
  ) => Promise<{
    canceled: boolean;
    path?: string;
    error?: string;
    missing?: string[];
  }>;
  openProject: () => Promise<{
    canceled: boolean;
    data?: string;
    path?: string;
    error?: string;
    missing?: string[];
  }>;
};
declare global {
  interface Window {
    luma?: DesktopBridge;
  }
}
