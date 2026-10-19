import {
  background,
  glow,
  hslHex,
  hue,
  random,
  rgba,
  TAU,
  type Painter,
} from "./common";
import { dreamPhase } from "./dreamMotion";

type Pattern = "spiral" | "ribbons" | "checker" | "rosette" | "marble";
const pattern =
  (kind: Pattern): Painter =>
  (c, t, w, h, color, seed) => {
    const p = dreamPhase(t),
      a = p * TAU,
      base = hue(color),
      variation = random(7, seed) * TAU;
    const radius = Math.hypot(w, h) * 0.62;
    background(c, w, h, "#090c20", "#020711");
    c.save();
    c.translate(w * 0.5, h * 0.5);
    const twist = 4.4 + 0.5 * Math.sin(a + variation);
    const polar = (r: number, theta: number): [number, number] => [
      Math.cos(theta) * r,
      Math.sin(theta) * r,
    ];
    const spiralAngle = (r: number, theta: number) =>
      theta + a + variation + twist * Math.pow(1 - r, 0.9);
    if (kind === "spiral" || kind === "ribbons") {
      const arms = kind === "spiral" ? 8 : 14;
      for (let i = 0; i < arms; i++) {
        const theta = (i / arms) * TAU,
          width = (TAU / arms) * 0.95;
        c.beginPath();
        for (let step = 0; step <= 100; step++) {
          const r = step / 100;
          const [x, y] = polar(r * radius, spiralAngle(r, theta));
          if (step) c.lineTo(x, y);
          else c.moveTo(x, y);
        }
        for (let step = 100; step >= 0; step--) {
          const r = step / 100;
          c.lineTo(...polar(r * radius, spiralAngle(r, theta + width)));
        }
        c.closePath();
        const g = c.createRadialGradient(0, 0, 0, 0, 0, radius);
        const tone =
          base + (kind === "ribbons" ? (i / arms) * 360 + Math.sin(a) * 25 : 0);
        g.addColorStop(0, "#131029");
        g.addColorStop(
          0.2,
          hslHex(tone, 0.48, i % 2 && kind === "spiral" ? 0.83 : 0.29),
        );
        g.addColorStop(
          0.58,
          hslHex(
            tone,
            kind === "ribbons" ? 0.75 : 0.42,
            i % 2 && kind === "spiral" ? 0.9 : 0.58,
          ),
        );
        g.addColorStop(
          1,
          hslHex(tone, 0.45, i % 2 && kind === "spiral" ? 0.7 : 0.26),
        );
        c.fillStyle = g;
        c.fill();
        c.beginPath();
        for (let step = 1; step <= 90; step++) {
          const r = step / 90,
            angle = spiralAngle(r, theta + width * 0.17);
          const q = polar(r * radius, angle);
          if (step === 1) c.moveTo(...q);
          else c.lineTo(...q);
        }
        c.strokeStyle = rgba("#effcff", kind === "ribbons" ? 0.3 : 0.14);
        c.lineWidth = Math.max(0.6, h * 0.002);
        c.stroke();
      }
      glow(c, 0, 0, h * 0.08, kind === "ribbons" ? "#050719" : color, 0.45);
    } else if (kind === "checker") {
      const rows = 20,
        cols = 28;
      for (let row = rows - 1; row >= 0; row--) {
        const r0 = Math.pow(row / rows, 1.8),
          r1 = Math.pow((row + 1) / rows, 1.8);
        for (let col = 0; col < cols; col++) {
          c.beginPath();
          for (const [rr, reverse] of [
            [r0, false],
            [r1, true],
          ] as const) {
            for (let k = 0; k <= 5; k++) {
              const u = reverse ? 1 - k / 5 : k / 5;
              const theta =
                ((col + u) / cols) * TAU +
                a +
                variation +
                3.6 * (1 - rr) +
                0.25 * Math.sin(a + rr * 5);
              const q = polar(rr * radius, theta);
              if (!reverse && k === 0) c.moveTo(...q);
              else c.lineTo(...q);
            }
          }
          c.closePath();
          const light = 0.5 + 0.5 * Math.sin(row * 0.55 - a * 2);
          c.fillStyle =
            (row + col) % 2
              ? hslHex(base, 0.32, 0.58 + light * 0.18)
              : hslHex(base + 45, 0.3, 0.055 + light * 0.065);
          c.fill();
        }
      }
      const shadow = c.createRadialGradient(0, 0, 0, 0, 0, h * 0.24);
      shadow.addColorStop(0, "#00040aff");
      shadow.addColorStop(1, "#00040a00");
      c.fillStyle = shadow;
      c.fillRect(-radius, -radius, radius * 2, radius * 2);
    } else if (kind === "rosette") {
      for (let family = 0; family < 2; family++) {
        c.strokeStyle = rgba(hslHex(base + family * 105, 0.78, 0.7), 0.7);
        c.lineWidth = Math.max(0.6, h * 0.0016);
        for (let i = 0; i < 64; i++) {
          const offset = (i / 64) * TAU + (family ? -a : a) + variation;
          c.beginPath();
          for (let j = 0; j <= 100; j++) {
            const r = j / 100,
              theta =
                offset +
                (family ? -1 : 1) * r * 4.6 +
                0.22 * Math.sin(r * TAU * 2 + a);
            const q = polar(
              radius * r * (1 + 0.035 * Math.sin(offset * 8 + a)),
              theta,
            );
            if (j) c.lineTo(...q);
            else c.moveTo(...q);
          }
          c.stroke();
        }
      }
      glow(c, 0, 0, h * 0.13, color, 0.6);
    } else {
      // Alternating polished contour bands; trigonometric displacement closes exactly.
      for (let ring = 58; ring > 0; ring--) {
        const r = ring / 58,
          rr = radius * r;
        c.beginPath();
        for (let j = 0; j <= 180; j++) {
          const theta = (j / 180) * TAU;
          const distortion =
            1 +
            0.085 * Math.sin(theta * 3 + a + r * 8 + variation) +
            0.055 * Math.sin(theta * 7 - a * 2 + r * 5);
          const angle = theta + a + r * 2.2;
          const q = polar(rr * distortion, angle);
          if (j) c.lineTo(...q);
          else c.moveTo(...q);
        }
        c.closePath();
        const light = 0.5 + 0.5 * Math.sin(ring * 0.82 + a);
        c.fillStyle =
          ring % 11 === 0
            ? "#dfc693"
            : hslHex(
                base + Math.sin(ring * 0.3 + variation) * 42,
                0.46,
                0.07 + light * 0.47,
              );
        c.fill();
        if (ring % 4 === 0) {
          c.strokeStyle = rgba("#e6fff4", 0.18);
          c.lineWidth = Math.max(0.5, h * 0.001);
          c.stroke();
        }
      }
    }
    c.restore();
  };

export const hypnoticPainters = {
  "hypno-spiral": pattern("spiral"),
  "hypno-ribbons": pattern("ribbons"),
  "hypno-checker": pattern("checker"),
  "hypno-rosette": pattern("rosette"),
  "hypno-marble": pattern("marble"),
};
