import { glow, mod, random, rgba, TAU, type Painter } from "./common";
import { noise, orbitPhase } from "./cosmicArt";
import { gradient, panel, stage } from "./sceneArt";

type Material =
  | "brushed-aluminium"
  | "riveted-steel"
  | "copper-patina"
  | "desert-sandstone"
  | "red-sandstone"
  | "glyph-pillars";
const tiles = new Map<string, HTMLCanvasElement>();

// Decorative geometric carvings; these are original motifs, not transcribed historical writing.
export function glyph(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number,
) {
  c.save();
  c.translate(x, y);
  c.scale(size / 80, size / 80);
  c.beginPath();
  switch (variant % 4) {
    case 0:
      c.moveTo(-30, 28);
      c.lineTo(-30, -25);
      c.lineTo(30, -25);
      c.lineTo(30, 28);
      c.lineTo(-12, 28);
      c.lineTo(-12, -7);
      c.lineTo(12, -7);
      c.lineTo(12, 12);
      c.lineTo(1, 12);
      break;
    case 1:
      c.moveTo(-34, 29);
      c.lineTo(-34, 10);
      c.lineTo(-18, 10);
      c.lineTo(-18, -10);
      c.lineTo(-6, -10);
      c.lineTo(-6, -29);
      c.lineTo(6, -29);
      c.lineTo(6, -10);
      c.lineTo(18, -10);
      c.lineTo(18, 10);
      c.lineTo(34, 10);
      c.lineTo(34, 29);
      c.closePath();
      c.moveTo(-8, 16);
      c.lineTo(8, 16);
      break;
    case 2:
      c.moveTo(16, 0);
      c.arc(0, 0, 16, 0, TAU);
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8;
        c.moveTo(Math.cos(a) * 23, Math.sin(a) * 23);
        c.lineTo(Math.cos(a) * 34, Math.sin(a) * 34);
      }
      c.moveTo(-5, 0);
      c.lineTo(5, 0);
      break;
    default:
      c.moveTo(-32, -26);
      c.lineTo(-12, -26);
      c.lineTo(-12, -8);
      c.lineTo(12, -8);
      c.lineTo(12, -26);
      c.lineTo(32, -26);
      c.lineTo(32, 8);
      c.lineTo(14, 8);
      c.lineTo(14, 26);
      c.lineTo(-14, 26);
      c.lineTo(-14, 8);
      c.lineTo(-32, 8);
      c.closePath();
      c.moveTo(-7, 5);
      c.lineTo(7, 5);
  }
  c.stroke();
  c.restore();
}

function tile(material: Material, color: string, seed: number) {
  const key = `${material}:${color}:${seed}`,
    cached = tiles.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const c = canvas.getContext("2d")!,
    image = c.createImageData(512, 512);
  const base = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const j = (y * 512 + x) * 4,
        grain = random(x + y * 512, seed) - 0.5;
      const n = noise(x / 68, y / 68, seed),
        fine = noise(x / 11, y / 11, seed + 6);
      let rgb: number[];
      if (material === "brushed-aluminium" || material === "riveted-steel") {
        const brushed = (random(y, seed + 2) - 0.5) * 22;
        const sheen =
          14 * Math.cos((x / 512) * TAU) + 22 * Math.cos((y / 512) * TAU);
        rgb = base.map((v) => v * 0.83 + sheen + brushed + grain * 10);
      } else if (material === "copper-patina") {
        const patina = Math.max(0, Math.min(1, (n + fine * 0.3 - 0.57) * 5));
        rgb = base.map(
          (v, i) =>
            v * (0.7 + fine * 0.55) * (1 - patina) +
            [46, 119, 102][i] * patina +
            grain * 18,
        );
      } else if (material === "red-sandstone") {
        const bed = Math.sin(
          (y / 512) * TAU * 16 + Math.sin((x / 512) * TAU * 2) * 1.5 + n * 3,
        );
        const seam = bed > 0.82 ? 35 : bed < -0.85 ? -24 : bed * 12;
        rgb = base.map((v) => v * (0.8 + n * 0.25) + seam + grain * 25);
      } else {
        const value = n * 23 + fine * 14 - 26 + grain * 23;
        rgb = base.map((v) => v + value);
      }
      image.data[j] = rgb[0];
      image.data[j + 1] = rgb[1];
      image.data[j + 2] = rgb[2];
      image.data[j + 3] = 255;
    }
  c.putImageData(image, 0, 0);
  if (material === "brushed-aluminium" || material === "riveted-steel") {
    for (let i = 0; i < 240; i++) {
      const x = random(i * 3, seed) * 512,
        y = random(i * 3 + 1, seed) * 512;
      c.fillStyle = i % 2 ? "#ffffff12" : "#00000016";
      c.fillRect(x, y, random(i * 3 + 2, seed) * 170, 0.5);
    }
  }
  if (material === "riveted-steel") {
    for (let y = 0; y < 512; y += 256)
      for (let x = 0; x < 512; x += 256) {
        c.strokeStyle = "#101a22";
        c.lineWidth = 5;
        c.strokeRect(x + 2, y + 2, 252, 252);
        c.strokeStyle = "#e7f7ff77";
        c.lineWidth = 1.5;
        c.strokeRect(x + 6, y + 6, 244, 244);
        for (const dx of [20, 236])
          for (const dy of [20, 236]) {
            const g = c.createRadialGradient(
              x + dx - 2,
              y + dy - 3,
              0,
              x + dx,
              y + dy,
              8,
            );
            g.addColorStop(0, "#e1e8eb");
            g.addColorStop(0.55, "#8799a4");
            g.addColorStop(0.8, "#3b4750");
            g.addColorStop(1, "#16212b");
            c.fillStyle = g;
            c.beginPath();
            c.arc(x + dx, y + dy, 8, 0, TAU);
            c.fill();
          }
      }
  }
  if (material === "desert-sandstone") {
    c.lineWidth = 4;
    for (let y = 0; y < 512; y += 128) {
      c.strokeStyle = "#46372699";
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(512, y);
      c.stroke();
      c.strokeStyle = "#fff0cd66";
      c.beginPath();
      c.moveTo(0, y + 4);
      c.lineTo(512, y + 4);
      c.stroke();
      for (let x = y % 256 ? -128 : 0; x < 512; x += 256) {
        c.strokeStyle = "#463726aa";
        c.strokeRect(x, y, 256, 128);
        for (let i = 0; i < 5; i++) {
          c.fillStyle = "#4f3b282b";
          c.fillRect(
            x + random(i + y, seed) * 256,
            y + 2,
            4 + random(i + x, seed) * 16,
            2,
          );
        }
      }
    }
  }
  if (material === "glyph-pillars") {
    for (let x = 0; x < 512; x += 128) {
      const g = gradient(c, x, 0, x + 128, 0, [
        "#21170c99",
        "#ffeacb44",
        "#fff0ce0c",
        "#24180eaa",
      ]);
      c.fillStyle = g;
      c.fillRect(x, 0, 128, 512);
      for (let row = 0; row < 4; row++) {
        const y = row * 128,
          variant = Math.floor(random(x + row, seed) * 4);
        c.strokeStyle = "#fff0ca88";
        c.lineWidth = 4;
        c.strokeRect(x + 15, y + 12, 99, 105);
        c.strokeStyle = "#46301cbb";
        c.lineWidth = 4;
        c.strokeRect(x + 13, y + 10, 99, 105);
        c.lineJoin = "miter";
        c.lineWidth = 6;
        c.strokeStyle = "#f8dfafaa";
        glyph(c, x + 66, y + 66, 80, variant);
        c.lineWidth = 5;
        c.strokeStyle = "#49331fd9";
        glyph(c, x + 64, y + 64, 80, variant);
        c.lineWidth = 1.5;
        c.strokeStyle = "#23170e88";
        glyph(c, x + 63, y + 63, 80, variant);
      }
    }
  }
  if (tiles.size >= 20) tiles.delete(tiles.keys().next().value!);
  tiles.set(key, canvas);
  return canvas;
}

const materialPainter =
  (material: Material): Painter =>
  (c, _t, w, h, color, seed) => {
    const pattern = c.createPattern(tile(material, color, seed), "repeat")!;
    pattern.setTransform(new DOMMatrix().scale((Math.min(w, h) / 512) * 1.35));
    c.fillStyle = pattern;
    c.fillRect(-w * 4, -h * 4, w * 9, h * 9);
  };

const temple: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#211c15");
  c.drawImage(tile("glyph-pillars", "#c8a46e", seed), 0, 0, 1000, 600);
  const phase = orbitPhase(t);
  c.globalCompositeOperation = "screen";
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++) {
      const a = (0.5 + 0.5 * Math.sin(phase * 2 - row * 0.95 - col * 0.7)) ** 5;
      const x = col * 250 + 125,
        y = row * 150 + 75;
      glow(c, x, y, 82, color, a * 0.65);
      c.save();
      c.translate(col * 250, row * 150);
      c.scale(250 / 128, 150 / 128);
      c.lineWidth = 3;
      c.strokeStyle = rgba(color, a);
      glyph(c, 64, 64, 80, Math.floor(random(col * 128 + row, seed) * 4));
      c.lineWidth = 1;
      c.strokeStyle = rgba("#effff1", a * 0.8);
      glyph(c, 64, 64, 80, Math.floor(random(col * 128 + row, seed) * 4));
      c.restore();
    }
  for (let i = 0; i < 36; i++) {
    const a = mod(phase / TAU + random(i, seed), 1),
      x = random(i + 40, seed) * 1000;
    glow(
      c,
      x + Math.sin(phase + i) * 12,
      600 - a * 600,
      5,
      color,
      Math.sin(a * Math.PI) * 0.65,
    );
  }
  c.restore();
};

const ferrofluid: Painter = (c, t, w, h, color, seed) => {
  stage(c, w, h, "#050810", "#1b2534");
  const phase = orbitPhase(t);
  glow(c, 500, 220, 470, color, 0.18);
  // Draw rear rows first; specular bands travel continuously over each curved peak.
  for (let row = 0; row < 7; row++)
    for (let col = 0; col < 12; col++) {
      const x = col * 95 - 23 + (row % 2) * 47,
        y = 150 + row * 65;
      const height =
        24 +
        74 *
          (0.5 +
            0.5 *
              Math.sin(
                phase * 2 - col * 0.5 + row * 0.65 + random(row, seed),
              )) **
            2;
      c.beginPath();
      c.moveTo(x - 53, y + 30);
      c.bezierCurveTo(x - 18, y + 30, x - 15, y - height + 12, x, y - height);
      c.bezierCurveTo(x + 15, y - height + 12, x + 16, y + 30, x + 53, y + 30);
      c.quadraticCurveTo(x, y + 55, x - 53, y + 30);
      c.fillStyle = gradient(c, x - 42, y, x + 44, y + 6, [
        "#02050a",
        "#1c293b",
        color,
        "#e7f3ff",
        "#425570",
        "#070c15",
        "#121c2b",
      ]);
      c.fill();
      c.strokeStyle = "#9eafc922";
      c.lineWidth = 1;
      c.stroke();
      const shine = 0.3 + 0.3 * Math.sin(phase + row + col * 0.4);
      c.beginPath();
      c.moveTo(x - 5, y - height + 8);
      c.quadraticCurveTo(x - 12, y - height / 2, x - 15, y + 9);
      c.strokeStyle = rgba("#ffffff", shine);
      c.lineWidth = 1.6;
      c.stroke();
    }
  panel(c, 0, 585, 1000, 15, "#080e15", 0);
  c.restore();
};

export const craftedPainters = {
  "brushed-aluminium": materialPainter("brushed-aluminium"),
  "riveted-steel": materialPainter("riveted-steel"),
  "copper-patina": materialPainter("copper-patina"),
  "desert-sandstone": materialPainter("desert-sandstone"),
  "red-sandstone": materialPainter("red-sandstone"),
  "glyph-pillars": materialPainter("glyph-pillars"),
  "temple-awakening": temple,
  "magnetic-ferrofluid": ferrofluid,
};
