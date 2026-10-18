import {
  background,
  glow,
  hslHex,
  hue,
  mod,
  oval,
  random,
  smooth,
  TAU,
  type Painter,
} from "./common";

// Four colour-independent atlas pairs at each of two resolutions: small for
// the swarm, detailed for a single projected eye. Colour changes reuse them.
const eyeAtlases = new Map<string, [HTMLCanvasElement, HTMLCanvasElement]>();
function eyeTextures(variant: number, detail: 192 | 768) {
  const key = `${variant}:${detail}`,
    cached = eyeAtlases.get(key);
  if (cached) return cached;
  const tile = () => {
    const c = document.createElement("canvas");
    c.width = c.height = detail;
    return c;
  };
  const white = tile(),
    wc = white.getContext("2d")!,
    fibres = tile(),
    fc = fibres.getContext("2d")!;
  wc.translate(detail / 2, detail / 2);
  wc.scale((detail * 94) / 192, (detail * 94) / 192);
  const shade = wc.createRadialGradient(-0.32, -0.4, 0.05, 0.15, 0.22, 1.17);
  shade.addColorStop(0, "#fffdf5");
  shade.addColorStop(0.43, "#f2eee8");
  shade.addColorStop(0.74, "#c2c3cb");
  shade.addColorStop(0.93, "#737b8d");
  shade.addColorStop(1, "#323c56");
  wc.fillStyle = shade;
  wc.beginPath();
  wc.arc(0, 0, 1, 0, TAU);
  wc.fill();
  wc.save();
  wc.beginPath();
  wc.arc(0, 0, 0.98, 0, TAU);
  wc.clip();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + random(i, variant) * 0.22,
      reach = 0.61 + random(i, variant + 9) * 0.2;
    wc.strokeStyle = "rgba(185,88,111,.28)";
    wc.lineWidth = 0.009;
    wc.beginPath();
    wc.moveTo(Math.cos(a), Math.sin(a));
    wc.bezierCurveTo(
      Math.cos(a + 0.04) * 0.91,
      Math.sin(a + 0.04) * 0.91,
      Math.cos(a - 0.07) * 0.82,
      Math.sin(a - 0.07) * 0.82,
      Math.cos(a + 0.02) * reach,
      Math.sin(a + 0.02) * reach,
    );
    wc.stroke();
    wc.strokeStyle = "rgba(191,99,124,.18)";
    wc.lineWidth = 0.006;
    wc.beginPath();
    wc.moveTo(Math.cos(a - 0.02) * 0.87, Math.sin(a - 0.02) * 0.87);
    wc.quadraticCurveTo(
      Math.cos(a + 0.1) * 0.76,
      Math.sin(a + 0.1) * 0.76,
      Math.cos(a + 0.17) * 0.7,
      Math.sin(a + 0.17) * 0.7,
    );
    wc.stroke();
  }
  wc.restore();
  fc.translate(detail / 2, detail / 2);
  fc.scale((detail * 94) / 192, (detail * 94) / 192);
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * TAU,
      r = 0.38 + random(i, variant) * 0.18;
    fc.strokeStyle = i % 3 ? "rgba(8,25,42,.48)" : "rgba(235,255,234,.55)";
    fc.lineWidth = 0.004 + random(i, variant + 5) * 0.011;
    fc.beginPath();
    fc.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    fc.quadraticCurveTo(
      Math.cos(a + 0.035) * 0.69,
      Math.sin(a + 0.035) * 0.69,
      Math.cos(a) * 0.95,
      Math.sin(a) * 0.95,
    );
    fc.stroke();
  }
  const result: [HTMLCanvasElement, HTMLCanvasElement] = [white, fibres];
  eyeAtlases.set(key, result);
  return result;
}
const targets = [
  [-0.7, 0.1],
  [0.55, -0.35],
  [0.25, 0.65],
  [-0.2, -0.6],
  [0.05, 0.02],
  [0.75, 0.3],
  [-0.7, 0.4],
  [0.15, -0.15],
];
function gaze(phase: number) {
  const moment = mod(phase, 1) * targets.length,
    index = Math.floor(moment),
    next = targets[(index + 1) % targets.length],
    current = targets[index],
    ease = smooth((moment - index - 0.45) / 0.35);
  return [
    current[0] + (next[0] - current[0]) * ease,
    current[1] + (next[1] - current[1]) * ease,
  ];
}
function eyeball(
  c: CanvasRenderingContext2D,
  p: number,
  index: number,
  seed: number,
  color: string,
  detail: 192 | 768 = 192,
) {
  const variant = (index + seed) % 4,
    [white, fibres] = eyeTextures(variant, detail);
  const phase = mod(p + random(index, seed) * 0.024, 1),
    look = gaze(phase),
    a = p * TAU;
  const gx = look[0] * 0.85 + Math.sin(a * 2 + index) * 0.1,
    gy = look[1] * 0.85 + Math.cos(a * 3 + index) * 0.1;
  const blinkTime = mod(p * 3 + random(index, seed + 19), 1);
  const blink =
    Math.abs(blinkTime - 0.5) < 0.033
      ? Math.pow(Math.cos((((blinkTime - 0.5) / 0.033) * Math.PI) / 2), 2)
      : 0;
  const opening = 1 - blink * 0.995;
  const lid = c.createRadialGradient(-0.3, -0.4, 0.05, 0.1, 0.2, 1.2);
  lid.addColorStop(0, "#9292a7");
  lid.addColorStop(0.6, "#4b4b65");
  lid.addColorStop(1, "#171e33");
  c.fillStyle = lid;
  c.beginPath();
  c.arc(0, 0, 1, 0, TAU);
  c.fill();
  c.save();
  c.beginPath();
  c.ellipse(0, 0, 1, opening, 0, 0, TAU);
  c.clip();
  c.drawImage(white, -1.02, -1.02, 2.04, 2.04);
  c.save();
  c.translate(gx * 0.45, gy * 0.42);
  c.rotate(gx * gy * 0.15);
  c.scale(Math.sqrt(1 - gx * gx * 0.6), Math.sqrt(1 - gy * gy * 0.6));
  const radius = 0.49,
    irisHue = hue(color) + (random(index, seed + 5) - 0.5) * 52;
  const iris = c.createRadialGradient(-0.055, -0.065, 0.07, 0, 0, radius);
  iris.addColorStop(0, "#15242f");
  iris.addColorStop(0.34, hslHex(irisHue - 20, 0.62, 0.3));
  iris.addColorStop(0.54, hslHex(irisHue, 0.73, 0.58));
  iris.addColorStop(0.78, hslHex(irisHue + 15, 0.62, 0.43));
  iris.addColorStop(0.94, hslHex(irisHue, 0.45, 0.2));
  iris.addColorStop(1, "#111e2d");
  c.fillStyle = iris;
  c.beginPath();
  c.arc(0, 0, radius, 0, TAU);
  c.fill();
  c.drawImage(fibres, -radius, -radius, radius * 2, radius * 2);
  const pupil = 0.19 + 0.022 * Math.sin(a * 2 + random(index, seed) * TAU);
  oval(c, 0, 0, pupil, pupil, "#040911");
  c.strokeStyle = "rgba(14,24,31,.8)";
  c.lineWidth = 0.012;
  c.beginPath();
  c.arc(0, 0, pupil + 0.018, 0, TAU);
  c.stroke();
  oval(c, -0.13, -0.18, 0.085, 0.059, "rgba(255,255,255,.93)", -0.38);
  oval(c, 0.11, 0.12, 0.027, 0.027, "rgba(208,245,255,.73)");
  c.restore();
  // Corneal sheen remains tied to the light, while the iris moves underneath.
  c.strokeStyle = "rgba(255,255,255,.5)";
  c.lineWidth = 0.026;
  c.beginPath();
  c.ellipse(-0.06, -0.05, 0.78, 0.8, 0, 3.75, 4.67);
  c.stroke();
  if (blink > 0.05) {
    c.strokeStyle = "rgba(22,21,43,.6)";
    c.lineWidth = 0.055;
    c.beginPath();
    c.ellipse(0, 0, 1, opening, 0, 0, TAU);
    c.stroke();
  }
  c.restore();
}

export const singleEyeball: Painter = (c, t, w, h, color, seed) => {
  // Keep the globe fixed at the centre for precise physical placement. Each
  // surface's seed controls its gaze/blink phase; Duplicate preserves it and
  // Shuffle variation gives a duplicated eye independent movement.
  const time = Math.round(mod(t, 24) * 1e6) / 24e6;
  const phase = mod(time + random(seed, 271), 1);
  const radius = Math.min(w, h) * 0.47;
  background(c, w, h, "#000000");
  c.save();
  c.translate(w / 2, h / 2);
  c.scale(radius, radius);
  eyeball(c, phase, 0, seed, color, 768);
  c.restore();
};

export const eyeballSwarm: Painter = (c, t, w, h, color, seed) => {
  const p = Math.round(mod(t, 24) * 1e6) / 24e6,
    a = p * TAU,
    unit = Math.min(w, h),
    spacing = unit * 0.25;
  background(c, w, h, "#02040b", "#111124");
  glow(c, w * 0.5, h * 0.48, unit * 0.85, color, 0.1);
  const cols = Math.min(14, Math.ceil(w / spacing)),
    rows = Math.min(14, Math.ceil(h / spacing)),
    eyes = [];
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col,
        size = 0.74 + random(i, seed) * 0.3;
      eyes.push({
        i,
        size,
        x:
          ((col + 0.5 + (row % 2 ? 0.13 : -0.13)) * w) / cols +
          Math.sin(a + random(i, seed + 1) * TAU) * spacing * 0.045,
        y:
          ((row + 0.5) * h) / rows +
          Math.cos(a + random(i, seed + 2) * TAU) * spacing * 0.05,
        r: Math.min(w / cols, h / rows) * 0.43 * size,
      });
    }
  // Slight size differences and overlapping shadows separate the floating globes.
  eyes.sort((left, right) => left.size - right.size);
  for (const eye of eyes) {
    c.save();
    c.translate(eye.x, eye.y);
    c.scale(eye.r, eye.r);
    glow(c, 0.12, 0.2, 1.3, "#000000", 0.8);
    c.rotate(Math.sin(a + eye.i) * 0.07);
    eyeball(c, p, eye.i, seed, color);
    c.restore();
  }
};
