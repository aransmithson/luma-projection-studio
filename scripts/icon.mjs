import { PNG } from "pngjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// The app, favicon and desktop icon share the same small vector source.
const svg = await readFile("src/assets/brand-mark.svg", "utf8");
const points = (value) => value.split(" ").map((p) => p.split(",").map(Number));
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const facets = [
  ...svg.matchAll(/<polygon points="([^"]+)" fill="(#[a-f0-9]{6})"/g),
].map(([, vertices, fill]) => ({ points: points(vertices), color: rgb(fill) }));
const edge = svg.match(
  /<polyline points="([^"]+)" stroke="(#[a-f0-9]{6})" stroke-width="([\d.]+)"/,
);
const background = svg.match(/<rect[^>]+fill="(#[a-f0-9]{6})"/);
if (facets.length !== 3 || !edge || !background)
  throw new Error("Unexpected brand mark geometry.");
const edgePoints = points(edge[1]),
  edgeColor = rgb(edge[2]),
  backgroundColor = rgb(background[1]);
const segments = edgePoints.slice(1).map((p, i) => [...edgePoints[i], ...p]);
const contains = (x, y, vertices) => {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [ax, ay] = vertices[i],
      [bx, by] = vertices[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)
      inside = !inside;
  }
  return inside;
};
const distance = (x, y, [ax, ay, bx, by]) => {
  const dx = bx - ax,
    dy = by - ay;
  const t = Math.max(
    0,
    Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
};
function renderIcon(size) {
  const png = new PNG({ width: size, height: size });
  const samples = [0.125, 0.375, 0.625, 0.875];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const channels = [0, 0, 0, 0];
      for (const ox of samples)
        for (const oy of samples) {
          const px = (x + ox) * 256 / size,
            py = (y + oy) * 256 / size;
          if (
            Math.hypot(
              Math.max(0, Math.abs(px - 128) - 78),
              Math.max(0, Math.abs(py - 128) - 78),
            ) > 48
          )
            continue;
          let color = backgroundColor;
          for (const facet of facets)
            if (contains(px, py, facet.points)) color = facet.color;
          if (
            segments.some(
              (segment) => distance(px, py, segment) < Number(edge[3]) / 2,
            )
          )
            color = edgeColor;
          for (let i = 0; i < 3; i++) channels[i] += color[i];
          channels[3]++;
        }
      channels.forEach((value, i) => {
        png.data[(y * size + x) * 4 + i] = Math.round(
          i === 3 ? value * 255 / 16 : channels[3] ? value / channels[3] : 0,
        );
      });
    }
  return PNG.sync.write(png);
}
const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = sizes.map(renderIcon);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let i = 0; i < sizes.length; i++) {
  const entry = 6 + i * 16;
  header[entry] = header[entry + 1] = sizes[i] === 256 ? 0 : sizes[i];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[i].length;
}
await mkdir("build", { recursive: true });
await writeFile("electron/icon.png", images.at(-1));
await writeFile("build/icon.ico", Buffer.concat([header, ...images]));
console.log("Created Nox application icons from the shared vector mark.");
