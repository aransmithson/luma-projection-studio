import type { Effect } from "./catalog";
import type { EffectId, StoryEffectId } from "./types";

export const storyEffects: (Effect & { id: StoryEffectId })[] = [
  {
    id: "story-cosmic-courier",
    name: "Cosmic courier",
    color: "#6ce1ff",
    description:
      "A glass-canopied rocket carries a tiny star between orbital outposts. Each station catches its light, opens a holographic beacon and sends the courier onward.",
    searchTerms: ["rocket", "space", "delivery", "planet", "star"],
  },
  {
    id: "story-ghost-train",
    name: "Ghost train",
    color: "#ab96ff",
    description:
      "A glowing midnight locomotive pulls two carriages of curious ghosts through a moonlit railway. Wheels, connecting rods, smoke and station lamps share one loop.",
    searchTerms: ["halloween", "railway", "locomotive", "haunted", "ghosts"],
  },
  {
    id: "story-dragon-lanterns",
    name: "Dragon lantern run",
    color: "#ffb86e",
    description:
      "A little emerald dragon carries a warm ember from tower to tower. Its wings beat as it flies past, breathing sparks that awaken each hanging lantern.",
    searchTerms: ["dragon", "fantasy", "fire", "lantern", "ember"],
  },
  {
    id: "story-reef-relay",
    name: "Reef pearl relay",
    color: "#66eed4",
    description:
      "A sea turtle guides a glowing pearl across an underwater reef. Jellyfish pulse, sea fans sway and each shell opens to greet the passing pearl.",
    searchTerms: ["underwater", "turtle", "ocean", "pearl", "jellyfish"],
  },
  {
    id: "story-clockwork-marble",
    name: "Clockwork marble",
    color: "#ffca79",
    description:
      "A polished energy marble rolls through a miniature brass machine. Meshing gears spin and inspection gates illuminate in sequence as the marble crosses each tile.",
    searchTerms: ["marble", "factory", "machine", "gears", "steampunk"],
  },
  {
    id: "story-firefly-garden",
    name: "Firefly garden",
    color: "#dbff8b",
    description:
      "A friendly firefly carries a trail of golden pollen through a moonlit garden. Flowers unfold beneath its light, shimmer for a moment, then close before the next visit.",
    searchTerms: ["firefly", "flower", "garden", "nature", "pollen"],
  },
  {
    id: "story-ant-city",
    name: "Underground ant city",
    color: "#b9ed8c",
    description:
      "A cutaway ant colony glows with nurseries and winding tunnels. Leaf-carrying workers cross the main tunnel and light each chamber as they arrive. Link shapes to extend the colony.",
    searchTerms: [
      "imagination",
      "creative",
      "ant",
      "colony",
      "underground",
      "tunnel",
      "leaf",
    ],
  },
  {
    id: "story-parcel-network",
    name: "Pneumatic parcel network",
    color: "#70dfff",
    description:
      "Glass tubes carry a glowing parcel capsule between miniature sorting stations. A little inspection robot scans each arrival and sends it onward through the linked tiles.",
    searchTerms: [
      "imagination",
      "creative",
      "parcel",
      "capsule",
      "pneumatic",
      "pipe",
      "robot",
      "post",
    ],
  },
  {
    id: "story-treasure-map",
    name: "Living treasure maps",
    color: "#59beca",
    description:
      "Ink reveals islands on aged parchment while a tiny sailing ship follows the river. Treasure chests open as it passes. Link your shapes into one continuous voyage.",
    searchTerms: [
      "imagination",
      "creative",
      "treasure",
      "map",
      "pirate",
      "ship",
      "parchment",
      "island",
    ],
  },
].map((story) => ({
  ...story,
  id: story.id as StoryEffectId,
  category: "Linked stories",
  tag: "Linked story",
  detail: 1024,
  loopSeconds: 12,
  previewTime: 6,
  searchTerms: [...story.searchTerms, "linked", "story", "tiles", "loop"],
}));

export const storyIds = storyEffects.map((s) => s.id) as [
  StoryEffectId,
  ...StoryEffectId[],
];
export const isStoryEffect = (id: EffectId): id is StoryEffectId =>
  storyIds.includes(id as StoryEffectId);
export const storyDefinition = (id: StoryEffectId) =>
  storyEffects.find((s) => s.id === id)!;
