import type { Effect } from "./catalog";
import type { DreamEffectId } from "./types";

export const dreamEffects: (Effect & { id: DreamEffectId })[] = [
  {
    id: "endless-cathedral",
    name: "Endless cathedral",
    category: "3D illusions",
    color: "#dbb984",
    description:
      "Travel beneath pointed stone vaults, carved ribs and warm lanterns along a tiled floor. The cathedral continues beyond a luminous vanishing point.",
    searchTerms: ["endless", "corridor", "infinite arcade", "gothic", "arches"],
  },
  {
    id: "neon-transit",
    name: "Neon transit tunnel",
    category: "3D illusions",
    color: "#65e9ff",
    description:
      "Fly through a deep octagonal passage lined with bevelled metal ribs, luminous strips and magenta service lights.",
    searchTerms: ["endless", "corridor", "infinite arcade", "sci fi", "tunnel"],
  },
  {
    id: "overgrown-arcade",
    name: "Overgrown arcade",
    category: "3D illusions",
    color: "#96d793",
    description:
      "An endless garden colonnade: mossy arches and curling vines recede through green mist while fireflies drift in the light.",
    searchTerms: ["endless", "corridor", "infinite arcade", "forest", "vines"],
  },
  {
    id: "prismatic-hall",
    name: "Prismatic mirror hall",
    category: "3D illusions",
    color: "#b5a5ff",
    description:
      "Nested jewel frames turn through a glossy hall of bevelled facets, shifting colour and reflected light as you travel forward.",
    searchTerms: ["endless", "corridor", "infinite arcade", "mirror", "prism"],
  },
  {
    id: "hypno-spiral",
    name: "Velvet spiral",
    category: "Hypnotic",
    color: "#cda7ff",
    description:
      "Broad cream and violet spiral arms revolve around a velvet centre, with gently breathing curvature and shaded edges.",
    searchTerms: ["hypnotic", "swirl", "spiral", "pinwheel"],
  },
  {
    id: "hypno-ribbons",
    name: "Chromatic whirlpool",
    category: "Hypnotic",
    color: "#ff84ca",
    description:
      "Glossy rainbow ribbons spiral into a deep centre. Light travels along each curved band in a continuous colour cycle.",
    searchTerms: ["hypnotic", "swirl", "rainbow", "ribbon"],
  },
  {
    id: "hypno-checker",
    name: "Checker vortex",
    category: "Hypnotic",
    color: "#90ede4",
    description:
      "A chequered funnel flows towards a dark centre, its curved tiles twisting and pulsing with a slow travelling highlight.",
    searchTerms: ["hypnotic", "swirl", "checkerboard", "tunnel"],
  },
  {
    id: "hypno-rosette",
    name: "Moire rosette",
    category: "Hypnotic",
    color: "#ffb680",
    description:
      "Two fine, counter-rotating families of curling lines form a shifting luminous rosette with deep interference-like patterns.",
    searchTerms: ["hypnotic", "swirl", "moire", "spirograph"],
  },
  {
    id: "hypno-marble",
    name: "Liquid agate",
    category: "Hypnotic",
    color: "#62dcc7",
    description:
      "Nested marbled contours rotate and breathe like polished agate, with gold seams between turquoise and indigo bands.",
    searchTerms: ["hypnotic", "swirl", "marble", "agate", "liquid"],
  },
  {
    id: "sprouting-daisies",
    name: "Daisy daydream",
    category: "Nature",
    color: "#ffcf70",
    description:
      "Curved stems sprout, leaves unfurl and layered white daisy heads open around golden pollen centres before gently retreating.",
    searchTerms: ["flower", "sprout", "bloom", "petals", "daisy"],
  },
  {
    id: "sunflower-bloom",
    name: "Sunflower parade",
    category: "Nature",
    color: "#ffbc48",
    description:
      "Large sunflower heads grow from leafy stems, unfurling two crowns of golden petals around intricate spiral seed centres.",
    searchTerms: ["flower", "sprout", "bloom", "petals", "sunflower"],
  },
  {
    id: "moonflower-bloom",
    name: "Luminous moonflowers",
    category: "Nature",
    color: "#bc96ff",
    description:
      "Iridescent flower heads rise on glowing stems, unfolding layered pointed petals and releasing tiny drifting pollen lights.",
    searchTerms: ["flower", "sprout", "bloom", "petals", "lotus"],
  },
  {
    id: "cracks-glass",
    name: "Spreading glass cracks",
    category: "Overlays",
    color: "#d1efff",
    transparent: true,
    description:
      "Fine impact cracks branch across a clear background, catch the light, then fade away. Duplicate a shape and place this above its animation using Normal blend.",
    searchTerms: ["transparent", "crack", "glass", "fracture", "overlay"],
  },
  {
    id: "cracks-stone",
    name: "Creeping stone fissures",
    category: "Overlays",
    color: "#ffc991",
    transparent: true,
    description:
      "Jagged dark fissures spread with raised illuminated edges and tiny branching faults, then heal. The background stays transparent for layering over textures or animations.",
    searchTerms: ["transparent", "crack", "stone", "fault", "overlay"],
  },
  {
    id: "cracks-frost",
    name: "Crystal frost cracks",
    category: "Overlays",
    color: "#a3e8ff",
    transparent: true,
    description:
      "Icy branching fractures grow delicate crystalline side shoots and glint before melting back into a transparent surface.",
    searchTerms: ["transparent", "crack", "frost", "ice", "overlay"],
  },
].map((effect) => ({
  ...effect,
  id: effect.id as DreamEffectId,
  category: effect.category as Effect["category"],
  tag: effect.transparent
    ? "Transparent · 16s"
    : effect.category === "3D illusions"
      ? "Endless depth · 24s"
      : effect.category === "Nature"
        ? "Bloom · 16s"
        : "Hypnotic · 24s",
  detail: 1024,
  loopSeconds: effect.transparent || effect.category === "Nature" ? 16 : 24,
  previewTime: effect.transparent
    ? 7.5
    : effect.category === "Nature"
      ? 8.5
      : 4.5,
  searchTerms: [...effect.searchTerms, "dreamscape"],
}));
