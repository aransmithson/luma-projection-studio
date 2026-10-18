import type { BlendMode, ColorOverlay } from "./types";

// Order is shared with the fragment shader. Normal/add/screen keep the fast
// fixed-function path when blending whole surfaces.
export const blendModes: { id: BlendMode; name: string; hint: string }[] = [
  {
    id: "normal",
    name: "Normal",
    hint: "Covers layers underneath; opacity reveals them.",
  },
  {
    id: "add",
    name: "Additive",
    hint: "Adds light for bright beams and luminous effects.",
  },
  {
    id: "screen",
    name: "Screen",
    hint: "Lifts light areas while black reveals the layer below.",
  },
  {
    id: "multiply",
    name: "Multiply",
    hint: "Combines shadows and textures; needs a lit layer underneath.",
  },
  {
    id: "overlay",
    name: "Overlay",
    hint: "Adds contrast while retaining highlights and shadows.",
  },
  {
    id: "soft-light",
    name: "Soft light",
    hint: "Gently colours the existing light and shade.",
  },
  {
    id: "darken",
    name: "Darken",
    hint: "Keeps the darker colour from each layer.",
  },
  {
    id: "lighten",
    name: "Lighten",
    hint: "Keeps the lighter colour from each layer.",
  },
  {
    id: "difference",
    name: "Difference",
    hint: "Creates inverted colours where layers differ.",
  },
  {
    id: "exclusion",
    name: "Exclusion",
    hint: "A softer, lower-contrast colour inversion.",
  },
];
export const overlayStyles: { id: ColorOverlay["style"]; name: string }[] = [
  { id: "wash", name: "Full colour wash" },
  { id: "bands", name: "Travelling bands" },
  { id: "ripples", name: "Radial ripples" },
  { id: "sweep", name: "Rotating sweep" },
  { id: "aurora", name: "Aurora ribbons" },
  { id: "checker", name: "Checker pulse" },
  { id: "facets", name: "Prismatic facets" },
  { id: "spotlight", name: "Orbiting spotlight" },
];
export const overlayPalettes: {
  id: ColorOverlay["palette"];
  name: string;
  colors: string[];
}[] = [
  {
    id: "spectrum",
    name: "Rainbow spectrum",
    colors: ["#ff547c", "#ffc94b", "#77e779", "#49dfe3", "#6a79ff", "#d75cff"],
  },
  {
    id: "neon",
    name: "Electric neon",
    colors: ["#15ffdf", "#2072ff", "#8a39ff", "#ff39cf", "#ff5777", "#8cff6b"],
  },
  {
    id: "sunset",
    name: "Golden sunset",
    colors: ["#ffe5a0", "#ffae55", "#f05b63", "#b64590", "#715ab5", "#ed97a0"],
  },
  {
    id: "ocean",
    name: "Deep ocean",
    colors: ["#1749b8", "#2b83df", "#38dce8", "#a0fbe9", "#39b69e", "#336cca"],
  },
  {
    id: "ember",
    name: "Ember & gold",
    colors: ["#ac1532", "#f23b27", "#ff9430", "#ffe49c", "#ffbc48", "#dc5221"],
  },
  {
    id: "pastel",
    name: "Pastel dream",
    colors: ["#ffb6cf", "#ffddba", "#e4f5aa", "#a5eddb", "#b9ceff", "#d7b8ff"],
  },
  {
    id: "halloween",
    name: "Halloween",
    colors: ["#ff8c29", "#af46d5", "#6fce50", "#ffbc4a", "#7137b8", "#d95070"],
  },
  {
    id: "christmas",
    name: "Christmas",
    colors: ["#e9364f", "#ffc878", "#32bb70", "#bcffe3", "#f9eece", "#d65367"],
  },
];
export const defaultColorOverlay: ColorOverlay = {
  enabled: true,
  style: "bands",
  palette: "spectrum",
  blend: "soft-light",
  intensity: 0.85,
  speed: 1,
  scale: 1,
  reverse: false,
};
export const blendIndex = (mode: BlendMode) =>
  blendModes.findIndex((b) => b.id === mode);
export function overlayPhase(time: number, overlay: ColorOverlay) {
  const phase = ((time * overlay.speed) / 24) * (overlay.reverse ? -1 : 1);
  return ((phase % 1) + 1) % 1;
}
export const paletteUniforms = Object.fromEntries(
  overlayPalettes.map((p) => [
    p.id,
    new Float32Array(
      p.colors.flatMap((hex) =>
        [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255),
      ),
    ),
  ]),
) as Record<ColorOverlay["palette"], Float32Array>;

// Separable blend functions from https://www.w3.org/TR/compositing-1/#blending.
// Shared by the surface compositor and independent colour overlay.
export const blendShader = `
float softLight(float b, float s) {
  float d = b <= 0.25 ? ((16.0*b-12.0)*b+4.0)*b : sqrt(b);
  return s <= 0.5 ? b-(1.0-2.0*s)*b*(1.0-b) : b+(2.0*s-1.0)*(d-b);
}
vec3 blendColor(vec3 b, vec3 s, int mode) {
  if (mode == 1) return min(vec3(1.0), b+s);
  if (mode == 2) return b+s-b*s;
  if (mode == 3) return b*s;
  if (mode == 4) return mix(2.0*b*s, 1.0-2.0*(1.0-b)*(1.0-s), step(vec3(0.5),b));
  if (mode == 5) return vec3(softLight(b.r,s.r),softLight(b.g,s.g),softLight(b.b,s.b));
  if (mode == 6) return min(b,s);
  if (mode == 7) return max(b,s);
  if (mode == 8) return abs(b-s);
  if (mode == 9) return b+s-2.0*b*s;
  return s;
}`;
export const overlayShader = `
uniform int u_overlayStyle;
uniform int u_overlayBlend;
uniform float u_overlayIntensity;
uniform float u_overlayPhase;
uniform float u_overlayScale;
uniform float u_textureAspect;
uniform vec3 u_palette[6];
vec3 paletteAt(float t) {
  float f = fract(t)*6.0;
  float k = smoothstep(0.0,1.0,fract(f));
  if (f < 1.0) return mix(u_palette[0],u_palette[1],k);
  if (f < 2.0) return mix(u_palette[1],u_palette[2],k);
  if (f < 3.0) return mix(u_palette[2],u_palette[3],k);
  if (f < 4.0) return mix(u_palette[3],u_palette[4],k);
  if (f < 5.0) return mix(u_palette[4],u_palette[5],k);
  return mix(u_palette[5],u_palette[0],k);
}
vec3 overlayColor(vec3 base, vec2 uv) {
  if (u_overlayIntensity <= 0.0) return base;
  vec2 p = (uv-0.5)*vec2(u_textureAspect,1.0)*u_overlayScale;
  float t = u_overlayPhase, f = t, mask = 1.0;
  if (u_overlayStyle == 1) f += p.x*0.7;
  if (u_overlayStyle == 2) f -= length(p)*1.4;
  if (u_overlayStyle == 3) f += atan(p.y,p.x+0.00001)/6.2831853;
  if (u_overlayStyle == 4) f += p.x*0.55 + sin(p.y*5.0+t*6.2831853)*0.16;
  if (u_overlayStyle == 5) f += (floor(p.x*5.0)+floor(p.y*5.0))*0.13;
  if (u_overlayStyle == 6) {
    vec2 cell = floor(p*5.0);
    f += dot(cell,vec2(0.17,0.23)) + step(fract(p.x*5.0),fract(p.y*5.0))*0.12;
  }
  if (u_overlayStyle == 7) {
    vec2 orbit = vec2(cos(t*6.2831853),sin(t*6.2831853))*0.35;
    mask = exp(-5.0*dot(p-orbit,p-orbit));
    f += length(p-orbit)*0.5;
  }
  return mix(base,blendColor(base,paletteAt(f),u_overlayBlend),u_overlayIntensity*mask);
}`;
