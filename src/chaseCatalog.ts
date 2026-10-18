import type { Effect } from "./catalog";

export const chaseEffects: Effect[] = [
  {
    id: "chase-cat-mouse",
    name: "Cat & mouse chase",
    color: "#f5b957",
    description:
      "A round-eared mouse runs off with a wedge of cheese while a striped ginger cat bounds after it. Swinging tails, scampering paws and backward glances bring the chase to life.",
    searchTerms: ["animals", "cheese", "kitten", "cute"],
  },
  {
    id: "chase-fox-rabbit",
    name: "Fox & rabbit chase",
    color: "#77d9b0",
    description:
      "A little rabbit hops away with a carrot as a bushy-tailed fox follows. Long ears flop, scarves flutter and autumn leaves drift around the running pair.",
    searchTerms: ["woodland", "bunny", "carrot", "cute", "autumn"],
  },
  {
    id: "chase-ghost-pumpkin",
    name: "Ghost & pumpkin chase",
    color: "#b597ff",
    description:
      "A friendly glowing ghost swoops after a pumpkin on tiny boots. The jack-o'-lantern looks back, its stem bounces, and wisps and magical sparks trail the pair.",
    searchTerms: ["halloween", "spooky", "cute", "jack o lantern"],
  },
  {
    id: "chase-robot-alien",
    name: "Robot & alien chase",
    color: "#66d7ff",
    description:
      "A shiny little robot races after a wide-eyed alien carrying its glowing battery. Jointed legs, a blinking visor and antenna lights give this sci-fi pursuit a playful rhythm.",
    searchTerms: ["space", "sci fi", "android", "extraterrestrial"],
  },
  {
    id: "chase-snowman-penguin",
    name: "Snowman & penguin chase",
    color: "#ff7495",
    description:
      "A penguin waddles away with a silver fish as a cheerful snowman chases it through falling snow. Flapping flippers, a bouncing top hat and flowing scarves finish the winter scene.",
    searchTerms: ["christmas", "winter", "snow", "fish", "cute"],
  },
].map((effect) => ({
  ...effect,
  id: effect.id as Effect["id"],
  category: "Chase scenes",
  tag: "Character chase · 12s",
  detail: 1024,
  loopSeconds: 12,
  previewTime: 2.8,
  description:
    effect.description +
    " Both characters exit one edge and return at the opposite edge in a seamless 12-second loop. Link shapes in Stacked animations to continue the chase across them. Reversing direction swaps the pursuer. Choose character size, accent colour and speed.",
  searchTerms: [
    ...effect.searchTerms,
    "chasing",
    "running",
    "loop",
    "two characters",
    "linked shapes",
  ],
}));
