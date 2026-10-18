import type { Effect } from "./catalog";
export const musicEffects: Effect[] = [
  {
    id: "eq-bars",
    name: "Spectrum towers",
    description:
      "A glowing bank of segmented equaliser bars with falling peak markers. Bass sits on the left and treble on the right.",
    color: "#65ecce",
    tag: "Live audio · spectrum",
  },
  {
    id: "eq-mirror",
    name: "Mirror pulse",
    description:
      "Twin banks of neon frequency bars burst above and below a bright central line, responding to the same music.",
    color: "#b58bff",
    tag: "Live audio · mirrored",
  },
  {
    id: "eq-halo",
    name: "Spectrum halo",
    description:
      "A circular equaliser surrounds a luminous centre. Frequency spokes and bass rings swell with the music.",
    color: "#69d9ff",
    tag: "Live audio · radial",
  },
  {
    id: "eq-wave",
    name: "Neon waveform",
    description:
      "An oscilloscope-style ribbon follows the actual audio waveform, with luminous trails and a reflected wave.",
    color: "#6fffd8",
    tag: "Live audio · waveform",
  },
  {
    id: "eq-reactor",
    name: "Bass reactor",
    description:
      "A faceted energy core pulses with the bass while concentric frequency rings light up around it.",
    color: "#ff9765",
    tag: "Live audio · bass",
  },
  {
    id: "eq-city",
    name: "Spectrum skyline",
    description:
      "A miniature skyline of glass equaliser towers rises to the frequency spectrum, with shaded sides and reflections.",
    color: "#82aaff",
    tag: "Live audio · 3D bars",
  },
].map((effect) => ({
  ...effect,
  category: "Music",
  detail: 960,
  loopSeconds: 8,
  previewTime: 2.25,
  audioReactive: true,
  searchTerms: [
    "music",
    "audio",
    "equaliser",
    "equalizer",
    "sound",
    "beat",
    "spectrum",
    "microphone",
  ],
})) as Effect[];
