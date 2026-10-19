import type { Effect } from "./catalog";
import type { ImaginationEffectId } from "./types";

export const imaginationEffects: (Effect & { id: ImaginationEffectId })[] = [
  {
    id: "living-comic",
    name: "Living comic book",
    color: "#ffcc69",
    description:
      "A halftone comic springs to life: an inked hero leans beyond the panel, speech balloons grow and a colourful POW shakes the page.",
    searchTerms: ["comic", "ink", "halftone", "pop art", "panels"],
  },
  {
    id: "claymation-chaos",
    name: "Claymation chaos",
    color: "#ff9bc5",
    description:
      "Squashy clay creatures wobble, leave finger marks and turn a smiling giant into a doorway. Sculpted highlights and stepped motion give the scene a handmade feel.",
    searchTerms: ["clay", "stop motion", "plasticine", "door", "creature"],
  },
  {
    id: "yarn-factory",
    name: "The yarn factory",
    color: "#80e6cd",
    description:
      "Needles knit a colourful fabric and two little button-eyed yarn friends. A travelling thread unravels the stitches before the next pass.",
    searchTerms: ["yarn", "knit", "thread", "fabric", "stitch", "doll"],
  },
  {
    id: "bubble-creatures",
    name: "Bubble-wrap creatures",
    color: "#99dfff",
    description:
      "Glossy bubbles swell around curious faces, wobble and burst into tiny coloured confetti before growing again. Each bubble has its own place in the loop.",
    searchTerms: ["bubble", "wrap", "pop", "glass", "faces"],
  },
  {
    id: "porcelain-dreams",
    name: "Porcelain dreams",
    color: "#ebbd68",
    description:
      "Glazed ceramic develops golden seams as sculpted flowers rise and painted birds stir. The relief settles and the cracks heal on a repeating cycle.",
    searchTerms: ["porcelain", "ceramic", "kintsugi", "gold", "flower", "bird"],
  },
  {
    id: "mosaic-faces",
    name: "Living mosaic faces",
    color: "#ffb69b",
    description:
      "Bevelled tiles flip between colourful abstraction and a large expressive face. Tile eyes glance and blink while the smile changes.",
    searchTerms: ["mosaic", "portrait", "face", "tile", "flip"],
  },
  {
    id: "rubber-room",
    name: "Impossible rubber room",
    color: "#a597ff",
    description:
      "A glossy bouncing ball pushes dents into an elastic room. The tiled walls, ceiling and floor bulge, stretch and spring back around it.",
    searchTerms: ["rubber", "elastic", "bounce", "ball", "room", "depth"],
  },
].map((effect) => ({
  ...effect,
  id: effect.id as ImaginationEffectId,
  category: "Imagination",
  tag: "Imagination · 12s",
  detail: 1024,
  loopSeconds: 12,
  previewTime: 3.6,
  searchTerms: [...effect.searchTerms, "imagination", "creative"],
}));
