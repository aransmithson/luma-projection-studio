import { glow, mod, random, rgba, TAU } from "./common";

export const orbitPhase = (time: number) => (mod(time, 24) / 24) * TAU;
export function noise(x: number, y: number, seed: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const fx = x - ix,
    fy = y - iy;
  const u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy);
  const a = random(ix + iy * 197, seed),
    b = random(ix + 1 + iy * 197, seed);
  const d = random(ix + (iy + 1) * 197, seed),
    e = random(ix + 1 + (iy + 1) * 197, seed);
  return (a + (b - a) * u) * (1 - v) + (d + (e - d) * u) * v;
}
export function starBackdrop(
  c: CanvasRenderingContext2D,
  phase: number,
  seed: number,
  count = 200,
) {
  for (let i = 0; i < count; i++) {
    const x = random(i * 5, seed) * 1000,
      y = random(i * 5 + 1, seed) * 600;
    const r = 0.3 + random(i * 5 + 2, seed) ** 5 * 1.6;
    const a = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(phase * 2 + i));
    c.fillStyle = rgba(i % 5 ? "#d9e7ff" : "#ffd5a6", a);
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
    if (r > 1.5) {
      glow(c, x, y, r * 6, "#b7ddff", a * 0.4);
      c.fillStyle = rgba("#eef8ff", a * 0.5);
      c.fillRect(x - r * 3, y - 0.3, r * 6, 0.6);
      c.fillRect(x - 0.3, y - r * 3, 0.6, r * 6);
    }
  }
}

type Planet = "moon" | "jupiter" | "saturn";
const maps = new Map<string, Uint8ClampedArray>();
const MAP_W = 1024,
  MAP_H = 512;
function planetMap(kind: Planet, seed: number) {
  const key = `${kind}:${seed}`;
  const cached = maps.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const c = canvas.getContext("2d")!,
    im = c.createImageData(MAP_W, MAP_H);
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      const u = (x / MAP_W) * TAU,
        lat = y / MAP_H;
      const n = noise(x / 34, y / 34, seed),
        grain = random(x + y * MAP_W, seed);
      let rgb: number[];
      if (kind === "moon") {
        const mare = noise(x / 125, y / 110, seed + 18);
        const value =
          125 + n * 48 + grain * 18 - Math.max(0, mare - 0.48) * 165;
        rgb = [value * 1.02, value, value * 0.97];
      } else {
        // Longitude-periodic turbulence keeps the texture seam hidden during rotation.
        const wave =
          Math.sin(u * 7 + lat * 80 + Math.sin(u * 3 + lat * 20)) * 0.012;
        const bands =
          Math.sin((lat + wave) * TAU * 13) * 0.55 +
          Math.sin((lat + wave * 0.5) * TAU * 37) * 0.15;
        const wisps = Math.sin(
          u * 21 + lat * 240 + Math.sin(u * 8 + lat * 54) * 4,
        );
        const value = bands * 32 + wisps * 9 + grain * 7;
        rgb =
          kind === "jupiter"
            ? [199 + value, 160 + value * 1.3, 122 + value * 1.5]
            : [205 + value * 0.6, 184 + value * 0.7, 139 + value * 0.6];
      }
      const j = (y * MAP_W + x) * 4;
      im.data[j] = rgb[0];
      im.data[j + 1] = rgb[1];
      im.data[j + 2] = rgb[2];
      im.data[j + 3] = 255;
    }
  c.putImageData(im, 0, 0);
  if (kind === "moon") {
    for (let i = 0; i < 520; i++) {
      const x = random(i * 4, seed + 9) * MAP_W,
        y = random(i * 4 + 1, seed + 9) * MAP_H;
      const r = 1.1 + random(i * 4 + 2, seed + 9) ** 5 * 24;
      for (const offset of [-MAP_W, 0, MAP_W]) {
        const g = c.createRadialGradient(
          x + offset - r * 0.25,
          y - r * 0.3,
          0,
          x + offset,
          y,
          r,
        );
        g.addColorStop(0, "#5a575466");
        g.addColorStop(0.68, "#37363466");
        g.addColorStop(0.83, "#e4dfd177");
        g.addColorStop(1, "#b7b4ac00");
        c.fillStyle = g;
        c.fillRect(x + offset - r, y - r, r * 2, r * 2);
        if (r > 14) {
          c.strokeStyle = "#eeede32b";
          c.lineWidth = 1.4;
          c.beginPath();
          c.arc(x + offset - 1, y - 1, r * 0.8, Math.PI, Math.PI * 1.9);
          c.stroke();
        }
      }
    }
  } else if (kind === "jupiter") {
    const x = 325 + random(21, seed) * 100,
      y = 324;
    for (let i = 42; i > 0; i--) {
      const f = i / 42;
      c.fillStyle =
        i % 5 === 0
          ? "#e8b588"
          : `rgb(${160 + f * 48},${80 + f * 47},${54 + f * 30})`;
      c.beginPath();
      c.ellipse(
        x + Math.sin(i * 0.47) * 1.5,
        y,
        i * 1.6,
        i * 0.55,
        -0.09,
        0,
        TAU,
      );
      c.fill();
    }
  }
  const data = c.getImageData(0, 0, MAP_W, MAP_H).data;
  // Accommodate all 32 active surfaces plus previews without rebuilding maps each frame.
  if (maps.size >= 40) maps.delete(maps.keys().next().value!);
  maps.set(key, data);
  return data;
}

// Sphere UVs and normals are reusable; only sampling and lighting change per frame.
const SIZE = 384;
let sphere:
  | {
      canvas: HTMLCanvasElement;
      c: CanvasRenderingContext2D;
      image: ImageData;
      pixels: {
        i: number;
        u: number;
        v: number;
        x: number;
        y: number;
        z: number;
        alpha: number;
      }[];
    }
  | undefined;
function sphereBuffer() {
  if (sphere) return sphere;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const c = canvas.getContext("2d")!,
    image = c.createImageData(SIZE, SIZE),
    pixels = [];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const nx = (x + 0.5) / (SIZE / 2) - 1,
        ny = (y + 0.5) / (SIZE / 2) - 1,
        r2 = nx * nx + ny * ny;
      if (r2 >= 1) continue;
      const z = Math.sqrt(1 - r2);
      pixels.push({
        i: (y * SIZE + x) * 4,
        u: Math.atan2(nx, z) / TAU + 0.5,
        v: Math.asin(ny) / Math.PI + 0.5,
        x: nx,
        y: ny,
        z,
        alpha: Math.min(1, ((1 - Math.sqrt(r2)) * SIZE) / 2) * 255,
      });
    }
  sphere = { canvas, c, image, pixels };
  return sphere;
}
export function planet(
  c: CanvasRenderingContext2D,
  kind: Planet,
  x: number,
  y: number,
  r: number,
  phase: number,
  seed: number,
) {
  const map = planetMap(kind, seed),
    b = sphereBuffer(),
    out = b.image.data;
  const rotation = phase / TAU;
  const lightAngle = kind === "moon" ? -0.9 + Math.sin(phase) * 0.55 : -0.55;
  const lx = Math.sin(lightAngle),
    ly = -0.25,
    lz = Math.cos(lightAngle);
  for (const p of b.pixels) {
    const tx = ((p.u + rotation) % 1) * MAP_W;
    const x0 = Math.floor(tx),
      x1 = (x0 + 1) % MAP_W,
      f = tx - x0;
    const row = Math.min(MAP_H - 1, Math.floor(p.v * MAP_H)) * MAP_W;
    const a = (row + x0) * 4,
      d = (row + x1) * 4;
    const shade = 0.055 + Math.max(0, p.x * lx + p.y * ly + p.z * lz) * 0.94;
    out[p.i] = (map[a] * (1 - f) + map[d] * f) * shade;
    out[p.i + 1] = (map[a + 1] * (1 - f) + map[d + 1] * f) * shade;
    out[p.i + 2] = (map[a + 2] * (1 - f) + map[d + 2] * f) * shade;
    out[p.i + 3] = p.alpha;
  }
  b.c.putImageData(b.image, 0, 0);
  c.drawImage(b.canvas, x - r, y - r, r * 2, r * 2);
}
