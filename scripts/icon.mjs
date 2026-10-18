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
const size = 256,
  png = new PNG({ width: size, height: size });
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const channels = [0, 0, 0, 0];
    for (const ox of [0.25, 0.75])
      for (const oy of [0.25, 0.75]) {
        const px = x + ox,
          py = y + oy;
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
        for (let i = 0; i < 3; i++) channels[i] += color[i] / 4;
        channels[3] += 255 / 4;
      }
    channels.forEach((value, i) => {
      png.data[(y * size + x) * 4 + i] = Math.round(value);
    });
  }
const bytes = PNG.sync.write(png);
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(bytes.length, 14);
header.writeUInt32LE(22, 18);
await mkdir("build", { recursive: true });
await writeFile("electron/icon.png", bytes);
await writeFile("build/icon.ico", Buffer.concat([header, bytes]));
console.log("Created Luma application icons from the shared vector mark.");
