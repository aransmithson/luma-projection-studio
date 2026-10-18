import type { Effect } from "./catalog";

// Original procedural scenes. Public stock previews informed the broad themes;
// no third-party video, image, geometry or animation data is shipped.
export const stageEffects: Effect[] = [
  {
    id: "marquee-wall",
    name: "Marquee light wall",
    color: "#ffce8b",
    description:
      "Round theatre lamps chase across a dark metal wall in soft waves. Glass lenses, warm filaments and sweeping highlights give each bulb depth.",
    searchTerms: ["Lights Flashing", "bulbs", "chase", "stage lights"],
  },
  {
    id: "led-prism",
    name: "Prism LED flares",
    color: "#9a79ff",
    description:
      "A dense LED screen draws expanding diamond waves and rotating pinwheels, with brilliant lens stars travelling along the pattern.",
    searchTerms: ["Led Flare", "diamond", "pinwheel", "lens flares"],
  },
  {
    id: "stardust-cascade",
    name: "Stardust cascade",
    color: "#b08cff",
    description:
      "Fine chains of light fall through a deep field of glowing dust. Near particles drift out of focus while distant sparks remain crisp.",
    searchTerms: [
      "Particles Background",
      "particle rain",
      "bokeh",
      "falling lights",
    ],
  },
  {
    id: "hex-relief",
    name: "Hex relief wave",
    color: "#bfd7e3",
    description:
      "A wall of bevelled hexagonal pistons pushes out in circular waves. Dark recesses, polished faces and luminous seams reveal the moving depth.",
    searchTerms: [
      "3D Video Mapping",
      "Vj Loop Pack",
      "hexagons",
      "relief",
      "3d",
    ],
  },
  {
    id: "photon-runway",
    name: "Photon runway",
    color: "#ab78ff",
    description:
      "Glide through a long geometric corridor of luminous frames, travelling floor strips and bright rails converging at the vanishing point.",
    searchTerms: ["Cosmo Run Way", "space tunnel", "neon corridor", "3d"],
  },
  {
    id: "led-stage",
    name: "LED stage wings",
    color: "#ed73da",
    description:
      "Curved LED wings and a recessed central screen ripple with colour above a reflective stage. Sweeping light beams frame the empty centre.",
    searchTerms: ["Back Stage", "concert", "led columns", "reflection"],
  },
  {
    id: "spectrum-dots",
    name: "Spectrum dot matrix",
    color: "#3de0ce",
    description:
      "Hundreds of glowing dots flow between rings, chevrons and diagonal colour bands. The patterns travel smoothly across a dark LED panel.",
    searchTerms: ["Colorful Led", "colourful LED", "rainbow", "matrix"],
  },
  {
    id: "pearl-silk",
    name: "Pearl silk",
    color: "#d5e5f0",
    description:
      "Soft pearl fabric billows across the whole surface, with rolling folds, silvery creases and a subtle woven sheen. Accent colour tints the cloth.",
    searchTerms: ["Wedding Background", "white fabric", "satin", "wedding"],
  },
  {
    id: "marquee-alphabet",
    name: "Marquee alphabet",
    color: "#ffd28c",
    description:
      "A large bulb-lit character cycles through A–Z and 0–9, one character per second. Shuffle changes the starting character; Speed zero holds it. This is an alphabet animation, not a custom text editor.",
    searchTerms: ["Lights Alphabet", "letters", "numbers", "typography"],
    loopSeconds: 36,
  },
  {
    id: "crimson-silk",
    name: "Crimson silk",
    color: "#db254e",
    description:
      "Rich satin tumbles into deep sculpted folds, catching sharp glossy highlights as the fabric flows diagonally. Choose any accent colour for a different silk.",
    searchTerms: ["Red Silk Cloth", "red fabric", "satin", "flowing cloth"],
  },
  {
    id: "led-cylinder-hall",
    name: "LED cylinder hall",
    color: "#a880ff",
    description:
      "Four curved towers of light turn through flowing colour ribbons, with shaded edges and reflections on a dark stage floor.",
    searchTerms: ["Back Stage", "led columns", "cylinders", "concert"],
  },
  {
    id: "led-proscenium",
    name: "LED proscenium",
    color: "#f290d1",
    description:
      "A broad arch of close-set LEDs chases with light above two illuminated side pillars. A dark central opening works well around doors or windows.",
    searchTerms: ["Back Stage", "led arch", "theatre", "doorway"],
  },
  {
    id: "ribbon-light-stage",
    name: "Ribbon light stage",
    color: "#4ee8cc",
    description:
      "Three wide ribbons of LED lights sweep through space, rolling towards and away from the viewer as colour runs along their length.",
    searchTerms: ["Back Stage", "led ribbons", "waves", "concert"],
  },
  {
    id: "light-canopy",
    name: "Canopy of lights",
    color: "#a291ff",
    description:
      "A curving canopy of suspended lights rises from a distant horizon, carrying waves of colour across a deep vaulted ceiling.",
    searchTerms: ["Back Stage", "led ceiling", "canopy", "vault"],
  },
  {
    id: "led-orb-chamber",
    name: "LED orb chamber",
    color: "#59cce9",
    description:
      "A giant sphere built from tiny lights slowly rotates above a reflective floor. Moving bands curl around its curved surface.",
    searchTerms: ["Back Stage", "led sphere", "orb", "globe"],
  },
  {
    id: "diamond-recess",
    name: "Recessed diamond lattice",
    color: "#d5e4e9",
    description:
      "Deep diamond-shaped openings breathe in a pale architectural lattice. Bevelled rims and shadowed wells make a flat surface appear perforated.",
    searchTerms: [
      "3D Video Mapping",
      "Vj Loop Pack",
      "recess",
      "diamond",
      "3d",
    ],
  },
  {
    id: "cubic-tide",
    name: "Cubic tide",
    color: "#c3dbe8",
    description:
      "A dense wall of solid cubes rises and sinks in diagonal tides, exposing deep sides and small bright gaps between neighbouring blocks.",
    searchTerms: ["3D Video Mapping", "Vj Loop Pack", "cube wall", "3d"],
  },
  {
    id: "rotating-tile-wall",
    name: "Turning tile wall",
    color: "#b3dcd5",
    description:
      "Rows of square panels turn over in a travelling wave, revealing their thickness and darker reverse surfaces before closing again.",
    searchTerms: ["3D Video Mapping", "Vj Loop Pack", "rotating panels", "3d"],
  },
  {
    id: "prism-skin",
    name: "Triangular prism skin",
    color: "#d5c4e6",
    description:
      "A tessellated wall of triangular facets grows into sharp pyramids and flattens again, with directional highlights moving across the peaks.",
    searchTerms: [
      "3D Video Mapping",
      "Vj Loop Pack",
      "pyramids",
      "facets",
      "3d",
    ],
  },
  {
    id: "relief-rings",
    name: "Concentric relief rings",
    color: "#d1dce9",
    description:
      "Segmented stone rings rise, recede and counter-rotate around a deep central well. Each band catches a different sweep of light.",
    searchTerms: ["3D Video Mapping", "Vj Loop Pack", "rings", "recess", "3d"],
  },
  {
    id: "sliding-relief",
    name: "Sliding relief maze",
    color: "#c1d7d5",
    description:
      "Interlocking rows of raised bars slide in opposite directions, opening and closing passages through a sculpted geometric maze.",
    searchTerms: [
      "3D Video Mapping",
      "Vj Loop Pack",
      "maze",
      "sliding blocks",
      "3d",
    ],
  },
].map(
  (effect) =>
    ({
      ...effect,
      category: "Stage & light",
      tag: `Stage loop · ${effect.loopSeconds ?? 24}s`,
      detail: 1024,
      loopSeconds: effect.loopSeconds ?? 24,
      searchTerms: [
        ...effect.searchTerms,
        ...(effect.searchTerms.includes("Back Stage") ? ["backstage"] : []),
        "stage collection",
        "envato",
        "videohive",
      ],
    }) as Effect,
);
