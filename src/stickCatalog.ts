import type { Effect } from "./catalog";
import type { StickEffectId } from "./types";

export const stickEffects: (Effect & { id: StickEffectId })[] = [
  {
    id: "stick-glass-box",
    name: "Glass-box mime",
    color: "#75eaff",
    description:
      "A curious stick figure feels the invisible glass, taps with both palms, peers out and waves for help. Soft handprints and glass reflections reveal the box.",
    searchTerms: ["mime", "glass", "palms", "window"],
    previewTime: 3,
  },
  {
    id: "stick-wall-pusher",
    name: "Wall pusher",
    color: "#ffbf70",
    description:
      "A determined stick figure braces against the side wall, strains to push it open, recoils and tries again. The recessed box flexes with each push.",
    searchTerms: ["push", "wall", "escape", "strain"],
    previewTime: 5,
  },
  {
    id: "stick-ceiling-bonk",
    name: "Ceiling bonk",
    color: "#f99bdd",
    description:
      "A stick figure crouches, jumps into the ceiling, sees little stars, lands and rubs its head before another hopeful attempt.",
    searchTerms: ["jump", "ceiling", "bonk", "stars"],
    previewTime: 4.5,
  },
  {
    id: "stick-corner-climber",
    name: "Corner climber",
    color: "#a5f58e",
    description:
      "A resourceful stick figure scrambles up the corner, reaches for the rim, loses its grip and slides back to the floor. A comic escape attempt on a continuous loop.",
    searchTerms: ["climb", "corner", "slip", "escape"],
    previewTime: 6,
  },
  {
    id: "stick-gravity-tumble",
    name: "Gravity tumble",
    color: "#b5a0ff",
    description:
      "Gravity slowly turns inside a fixed box. A bewildered stick figure tumbles from floor to wall to ceiling, pedalling its legs as it goes around.",
    searchTerms: ["gravity", "tumble", "spin", "upside down"],
    previewTime: 3,
  },
  {
    id: "stick-box-buddies",
    name: "Box buddies",
    color: "#75eac5",
    description:
      "Two trapped stick figures try a shaky boost, wobble, land and exchange a hopeful high-five. A tiny teamwork comedy inside one recessed box.",
    searchTerms: ["pair", "two", "friends", "teamwork", "boost"],
    previewTime: 6,
  },
].map((effect) => ({
  ...effect,
  id: effect.id as StickEffectId,
  category: "Stick figures",
  tag: "Boxed character · 12s",
  detail: 1024,
  loopSeconds: 12,
  searchTerms: [
    ...effect.searchTerms,
    "stick men",
    "stickman",
    "stick figure",
    "stuck",
    "trapped",
    "box",
  ],
}));
