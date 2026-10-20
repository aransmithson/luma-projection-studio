import type { Effect } from "./catalog";
import type { PsychedelicEffectId } from "./types";

export const psychedelicEffects: (Effect & { id: PsychedelicEffectId })[] = [
  {
    id: "psy-fractal-sanctuary",
    name: "Fractal sanctuary",
    color: "#b58aff",
    description:
      "An intricate living mandala of branching gold filigree, turquoise jewels and nested geometric gates. Its symmetry breathes and slowly unfolds.",
    searchTerms: ["fractal", "mandala", "sacred geometry", "temple"],
  },
  {
    id: "psy-jewel-hyperspace",
    name: "Jewel hyperspace",
    color: "#58e6d9",
    description:
      "Travel through a kaleidoscopic tunnel of bevelled gemstone facets, iridescent reflections and twisting seams of light.",
    searchTerms: ["kaleidoscope", "tunnel", "gem", "depth"],
  },
  {
    id: "psy-lotus-awakening",
    name: "Lotus awakening",
    color: "#fa79cf",
    description:
      "Seven layered crowns of luminous petals unfurl around an opal heart, with delicate veins and a gentle breathing motion.",
    searchTerms: ["flower", "lotus", "petals", "bloom"],
  },
  {
    id: "psy-astral-eye",
    name: "Astral eye",
    color: "#71d8fc",
    description:
      "A giant iridescent eye gazes and slowly closes inside a halo of moving ornamental contours, golden rays and tiny orbiting jewels.",
    searchTerms: ["eye", "vision", "iris", "surreal"],
  },
  {
    id: "psy-neon-mycelium",
    name: "Neon mycelium",
    color: "#70f3b9",
    description:
      "A bioluminescent forest of branching tendrils sways beneath glowing translucent caps, while spores drift through a deep violet atmosphere.",
    searchTerms: ["organic", "mushroom", "forest", "bioluminescent"],
  },
  {
    id: "psy-liquid-mosaic",
    name: "Liquid mosaic",
    color: "#ffae62",
    description:
      "A wall of liquid stained-glass cells ripples and changes colour. Nested enamel contours, bright seams and glossy hearts give each tile depth.",
    searchTerms: ["stained glass", "cells", "tiles", "liquid"],
  },
  {
    id: "psy-serpent-ribbons",
    name: "Serpent ribbons",
    color: "#d6a1ff",
    description:
      "Scaled, iridescent ribbons weave over and under one another in a continuous serpentine dance, with jewel highlights travelling along their backs.",
    searchTerms: ["serpent", "ribbon", "woven", "scales"],
  },
  {
    id: "psy-dimensional-lattice",
    name: "Dimensional lattice",
    color: "#91bbff",
    description:
      "Nested four-dimensional cubes rotate through each other, revealing translucent coloured faces, luminous edges and gem-like vertices in a field of stars.",
    searchTerms: ["tesseract", "hypercube", "4d", "geometry", "space"],
  },
].map((effect) => ({
  ...effect,
  id: effect.id as PsychedelicEffectId,
  category: "Psychedelic",
  tag: "Psychedelic · 24s",
  detail: 1024,
  loopSeconds: 24,
  previewTime: 4.5,
  searchTerms: [
    ...effect.searchTerms,
    "psychedelic",
    "dmt",
    "trip",
    "visionary",
  ],
}));
