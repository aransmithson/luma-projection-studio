import { _electron as electron, expect } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "edge-profile-"));
const example = await readFile("examples/Edge-runner.luma", "utf8");
const trainMode = process.argv.includes("--train");
const server = await createServer({
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "error",
});
await server.listen();
const env = {
  ...process.env,
  VITE_DEV_SERVER_URL: `http://127.0.0.1:${server.httpServer.address().port}`,
};
delete env.ELECTRON_RUN_AS_NODE;
let app;
try {
  app = await electron.launch({
    args: [path.resolve("."), `--user-data-dir=${profile}`],
    env,
  });
  const page = await app.firstWindow();
  await expect(page.locator(".stage-overlay")).toBeVisible();
  const results = await page.evaluate(
    async ({ example, trainMode }) => {
      const { ProjectionRenderer } = await import("/src/renderer.ts");
      const { parseProject } = await import("/src/model.ts");
      const { bounds } = await import("/src/geometry.ts");
      const { surfacePath, surfaceOutline } = await import("/src/curves.ts");
      const project = parseProject(example),
        w = 640,
        h = 360;
      const canvas = document.createElement("canvas"),
        renderer = new ProjectionRenderer(canvas);
      const gl = canvas.getContext("webgl");
      const mask = document.createElement("canvas");
      mask.width = w;
      mask.height = h;
      const maskCtx = mask.getContext("2d", { willReadFrequently: true });
      const sheet = document.createElement("canvas");
      sheet.width = w * 2;
      sheet.height = (h + 32) * 3;
      const sheetCtx = sheet.getContext("2d");
      sheetCtx.fillStyle = "#10121b";
      sheetCtx.fillRect(0, 0, sheet.width, sheet.height);
      const state = {
        project: { ...project, width: w, height: h },
        playback: { playing: false, offset: 0, startedAt: 0 },
        blackout: false,
        testPattern: false,
      };
      const frame = (surface, t) => {
        state.project.surfaces = [surface];
        state.playback.offset = t * 1000;
        renderer.render(state, w, h);
        const pixels = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return pixels;
      };
      const equals = (a, b) => a.every((n, i) => n === b[i]);
      const measure = (surface, pixels) => {
        maskCtx.clearRect(0, 0, w, h);
        maskCtx.strokeStyle = "white";
        maskCtx.lineWidth = trainMode ? 86 : 22;
        maskCtx.lineJoin = "round";
        maskCtx.stroke(new Path2D(surfacePath(surface, w, h)));
        const maskPixels = maskCtx.getImageData(0, 0, w, h).data;
        let bright = 0,
          outside = 0;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const i = ((h - 1 - y) * w + x) * 4;
            if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 100) {
              bright++;
              if (!maskPixels[(y * w + x) * 4 + 3]) outside++;
            }
          }
        return { bright, outside };
      };
      const reports = [];
      const shapes = project.surfaces.map((surface) => {
        const b = bounds(surfaceOutline(surface));
        const map = (p) => ({
          x: 0.1 + ((p.x - b.x) / b.width) * 0.8,
          y: 0.1 + ((p.y - b.y) / b.height) * 0.8,
        });
        return {
          ...surface,
          effectId: trainMode ? "toy-train" : surface.effectId,
          points: surface.points.map(map),
          curves: surface.curves?.map((c) =>
            c ? { control1: map(c.control1), control2: map(c.control2) } : null,
          ),
          scale: 1,
        };
      });
      for (const [index, surface] of shapes.entries()) {
        const first = frame(surface, 0),
          metrics = [measure(surface, first)];
        let animated = true,
          looped = true,
          paused = true;
        for (const t of [1.5, 3, 4.5]) {
          const pixels = frame(surface, t);
          metrics.push(measure(surface, pixels));
          animated &&= !equals(first, pixels);
          paused &&= equals(pixels, frame(surface, t));
          looped &&= equals(pixels, frame(surface, t + (trainMode ? 20 : 6)));
        }
        frame(surface, 1.5);
        const left = (index % 2) * w,
          top = Math.floor(index / 2) * (h + 32);
        sheetCtx.drawImage(canvas, left, top + 32);
        sheetCtx.fillStyle = "#ecf3ff";
        sheetCtx.font = "16px sans-serif";
        sheetCtx.fillText(surface.name, left + 18, top + 23);
        reports.push({ name: surface.name, metrics, animated, looped, paused });
      }
      const original = shapes[3],
        edited = {
          ...original,
          points: original.points.map((p, i) =>
            i === 3 || i === 4 ? { ...p, x: p.x + 0.12 } : p,
          ),
        };
      const before = frame(original, 1.5),
        after = frame(edited, 1.5);
      const geometryChanged = !equals(before, after);
      const freshCanvas = document.createElement("canvas"),
        fresh = new ProjectionRenderer(freshCanvas);
      const freshFrame = (surface, time) => {
        state.project.surfaces = [surface];
        state.playback.offset = time * 1000;
        fresh.render(state, w, h);
        const pixels = new Uint8Array(w * h * 4),
          freshGl = freshCanvas.getContext("webgl");
        freshGl.readPixels(
          0,
          0,
          w,
          h,
          freshGl.RGBA,
          freshGl.UNSIGNED_BYTE,
          pixels,
        );
        return pixels;
      };
      const geometryFresh = equals(after, freshFrame(edited, 1.5));
      const grid = { ...shapes[0], effectId: "grid" };
      frame(shapes[0], 1.5);
      const mappingRestored = equals(frame(grid, 1.5), freshFrame(grid, 1.5));
      const edgeRestored = equals(
        frame(shapes[0], 1.5),
        freshFrame(shapes[0], 1.5),
      );
      const speed = equals(
        frame({ ...shapes[0], speed: 2 }, 1.5),
        frame(shapes[0], 3),
      );
      const frozen = { ...shapes[0], speed: 0 };
      const zeroSpeed = equals(frame(frozen, 0), frame(frozen, 100));
      const widthChanges = !equals(
        frame({ ...shapes[0], scale: 0.25 }, 1.5),
        frame({ ...shapes[0], scale: 3 }, 1.5),
      );
      const colourChanges = !equals(
        frame({ ...shapes[0], color: "#ff0000" }, 1.5),
        frame({ ...shapes[0], color: "#00ff00" }, 1.5),
      );
      renderer.dispose();
      fresh.dispose();
      return {
        reports,
        geometryChanged,
        geometryFresh,
        mappingRestored,
        edgeRestored,
        speed,
        zeroSpeed,
        widthChanges,
        colourChanges,
        sheet: sheet.toDataURL(),
      };
    },
    { example, trainMode },
  );
  await writeFile(
    path.join(
      artifacts,
      trainMode ? "toy-train-shapes.png" : "edge-runner-shapes.png",
    ),
    Buffer.from(results.sheet.split(",")[1], "base64"),
  );
  for (const report of results.reports) {
    for (const metric of report.metrics) {
      expect(metric.bright, `${report.name} has visible light`).toBeGreaterThan(
        80,
      );
      expect(
        metric.outside / metric.bright,
        `${report.name} content follows the boundary`,
      ).toBeLessThan(0.02);
    }
    expect(report.animated, `${report.name} moves`).toBe(true);
    expect(report.looped, `${report.name} repeats after its full loop`).toBe(
      true,
    );
    expect(report.paused, `${report.name} pauses without drift`).toBe(true);
  }
  for (const key of [
    "geometryChanged",
    "geometryFresh",
    "mappingRestored",
    "edgeRestored",
    "speed",
    "zeroSpeed",
    "widthChanges",
    "colourChanges",
  ])
    expect(results[key], key).toBe(true);
  console.log(
    `PASS: ${trainMode ? "toy train" : "edge runner"} follows six shapes (including concave and Bezier), loops and pauses exactly, responds to speed/size/colour, refreshes paused geometry and restores quad projection when changing effects.`,
  );
} finally {
  if (app) await app.close();
  await server.close();
}
