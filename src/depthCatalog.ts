import type { Effect } from "./catalog";
export const depthEffects: Effect[] = [
  {
    id: "flying-bricks",
    name: "Flying brick builders",
    color: "#d79068",
    description:
      "Bevelled masonry flies in from the room, spins into staggered courses and locks into a solid wall before lifting away again.",
    searchTerms: ["3d", "wall building", "bricks flying", "construction"],
  },
  {
    id: "tumbling-wall",
    name: "Tumbling brick wall",
    color: "#c2a181",
    description:
      "A solid masonry wall buckles, breaks into rotating bricks and drops into a dusty heap. The debris rises to rebuild the wall.",
    searchTerms: ["3d", "walls falling down", "collapse", "demolition"],
  },
  {
    id: "vault-iris",
    name: "Clockwork iris",
    color: "#e0b77a",
    description:
      "Machined brass blades draw apart around a luminous chamber, framed by concentric rings and a rotating bank of locking bolts.",
    searchTerms: ["3d", "vault", "mechanical", "portal"],
  },
  {
    id: "crystal-geode",
    name: "Crystal geode",
    color: "#ad85eb",
    description:
      "A floating split geode reveals a forest of faceted crystals. Iridescent tips grow and breathe around a radiant mineral heart.",
    searchTerms: ["3d", "gem", "amethyst", "cave"],
  },
  {
    id: "folding-facade",
    name: "Origami facade",
    color: "#6fcbcd",
    description:
      "A tiled architectural skin peels open in diagonal waves, revealing gilded undersides and a glowing recessed wall.",
    searchTerms: ["3d", "folding", "panels", "architecture"],
  },
  {
    id: "piston-wave",
    name: "Chrome piston ocean",
    color: "#96cddd",
    description:
      "A field of polished hydraulic columns rises in intersecting waves, carrying jewel-coloured inset caps and casting deep troughs between them.",
    searchTerms: ["3d", "pistons", "kinetic", "chrome"],
  },
  {
    id: "orbital-gyroscope",
    name: "Celestial gyroscope",
    color: "#d4b584",
    description:
      "Nested metallic hoops tumble on separate axes around a crystalline core, with illuminated studs and an orbiting satellite ring.",
    searchTerms: ["3d", "armillary", "rings", "orbit"],
  },
  {
    id: "infinite-arcade",
    name: "Infinite arcade",
    color: "#c6a98a",
    description:
      "Travel through a deep stone arcade with segmented arches, inset columns and golden floor lights receding towards a brilliant vanishing point.",
    searchTerms: ["3d", "tunnel", "corridor", "arches"],
  },
  {
    id: "floating-citadel",
    name: "Floating citadel",
    color: "#82bed4",
    description:
      "A miniature illuminated city floats on bevelled islands. Towers and bridges rise above the terraces as the entire citadel gently turns.",
    searchTerms: ["3d", "city", "island", "buildings"],
  },
  {
    id: "ribbon-vortex",
    name: "Ribbon vortex",
    color: "#b399eb",
    description:
      "Three broad metallic ribbons weave through a deep helical sculpture, rolling from cool shadow into pearlescent highlights.",
    searchTerms: ["3d", "helix", "ribbons", "sculpture"],
  },
  {
    id: "tectonic-rift",
    name: "Tectonic rift",
    color: "#ff983e",
    description:
      "Massive stone plates pull apart over a molten seam. Glowing fissures and rising sparks reveal depth beneath the broken surface.",
    searchTerms: ["3d", "lava", "earthquake", "cracked wall"],
  },
  {
    id: "gravity-staircase",
    name: "Gravity staircase",
    color: "#b7d5df",
    description:
      "A double spiral of floating stone steps twists around an illuminated central well, climbing endlessly through a field of suspended dust.",
    searchTerms: ["3d", "stairs", "escher", "impossible"],
  },
].map(
  (effect) =>
    ({
      ...effect,
      category: "3D illusions",
      tag: "Depth illusion · 24s",
      detail: 1024,
      loopSeconds: 24,
    }) as Effect,
);
