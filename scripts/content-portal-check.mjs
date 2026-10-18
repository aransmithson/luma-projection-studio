import { _electron as electron, expect } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "content-portal-profile-"));
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
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.locator(".stage-overlay")).toBeVisible();
  const result = await page.evaluate(async () => {
    const { ProjectionRenderer } = await import("/src/renderer.ts");
    const { createProject, createSurface } = await import("/src/model.ts");
    const { createPortalStack, createLiquidStack } =
      await import("/src/stacks.ts");
    const { addLayer, moveToLayer, reorderLayer } =
      await import("/src/layers.ts");
    const { chaseRoute } = await import("/src/chaseRoute.ts");
    const { drawLinkedPortal } = await import("/src/effects/portalScene.ts");
    const { blendModes } = await import("/src/compositing.ts");
    const w = 480,
      h = 240;
    const canvas = document.createElement("canvas"),
      renderer = new ProjectionRenderer(canvas),
      gl = canvas.getContext("webgl");
    const rect = (x0 = 0, y0 = 0, x1 = 1, y1 = 1) => [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
    ];
    const p = { ...createProject("blank"), width: w, height: h, surfaces: [] };
    const state = {
      project: p,
      playback: { playing: false, offset: 0, startedAt: 0 },
      blackout: false,
      testPattern: false,
    };
    const frame = (project, time = 0, extra = {}) => {
      renderer.render(
        {
          ...state,
          project,
          playback: { playing: false, offset: time * 1000, startedAt: 0 },
          ...extra,
        },
        w,
        h,
      );
      return pixels();
    };
    const pixels = () => {
      const data = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
      if (gl.getError() !== gl.NO_ERROR) throw Error("WebGL error");
      return data;
    };
    const rgb = (data, x, y) =>
      Array.from(
        data.slice(((h - 1 - y) * w + x) * 4, ((h - 1 - y) * w + x) * 4 + 3),
      );
    const difference = (a, b) =>
      a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / a.length;
    const source = document.createElement("canvas");
    source.width = 960;
    source.height = 480;
    const c = source.getContext("2d"),
      colors = ["#e13454", "#37c78c", "#416ae1", "#edc94b"],
      values = [
        [225, 52, 84],
        [55, 199, 140],
        [65, 106, 225],
        [237, 201, 75],
      ];
    colors.forEach((color, i) => {
      c.fillStyle = color;
      c.fillRect((i % 2) * 480, Math.floor(i / 2) * 240, 480, 240);
    });
    const surface = {
      ...createSurface("quad", 1, rect(), "grid"),
      id: "pattern",
      feather: 0,
    };
    const pattern = (transform, blend = "normal", holes = []) => {
      frame(p);
      const s = { ...surface, contentTransform: transform, blend };
      renderer.drawSurface(s, renderer.resource(s), source, true, holes, 2);
      return pixels();
    };
    let samples = 0,
      maxError = 0;
    for (const rotation of [-180, -90, -33, 0, 37, 90, 180])
      for (const offset of [
        [0, 0],
        [0.21, -0.15],
        [-0.25, 0.2],
      ]) {
        const transform = { rotation, offsetX: offset[0], offsetY: offset[1] },
          data = pattern(transform);
        for (let y = 7; y < h; y += 17)
          for (let x = 9; x < w; x += 23) {
            const dx = ((x + 0.5) / w - 0.5 - offset[0]) * 2,
              dy = (y + 0.5) / h - 0.5 - offset[1],
              a = (rotation * Math.PI) / 180;
            const u = 0.5 + (Math.cos(a) * dx + Math.sin(a) * dy) / 2,
              v = 0.5 - Math.sin(a) * dx + Math.cos(a) * dy;
            if (
              [u, v].some((q) =>
                [0, 0.5, 1].some((edge) => Math.abs(q - edge) < 0.008),
              )
            )
              continue;
            const expected =
              u < 0 || u > 1 || v < 0 || v > 1
                ? [0, 0, 0]
                : values[(u < 0.5 ? 0 : 1) + (v < 0.5 ? 0 : 2)];
            const actual = rgb(data, x, y);
            actual.forEach(
              (n, i) =>
                (maxError = Math.max(maxError, Math.abs(n - expected[i]))),
            );
            samples++;
          }
      }
    if (maxError > 2) throw Error(`Content inverse mapping error ${maxError}`);
    const hole = {
      ...createSurface("quad", 2, rect(0.43, 0.38, 0.57, 0.62)),
      id: "hole",
      cutoutOf: surface.id,
    };
    for (const mode of blendModes) {
      const data = pattern(
        { rotation: 38, offsetX: 0.13, offsetY: -0.08 },
        mode.id,
        [hole],
      );
      if (rgb(data, 240, 120).some((v) => v !== 0))
        throw Error(`Hole moved with content in ${mode.id}`);
      if (rgb(data, 10, 10).some((v) => v !== 0))
        throw Error(`Out-of-bounds content not transparent in ${mode.id}`);
    }
    const still = { ...surface, effectId: "brushed-aluminium" };
    const before = frame({ ...p, surfaces: [still] });
    const placed = {
      ...still,
      contentTransform: { rotation: 45, offsetX: 0.15, offsetY: -0.1 },
    };
    const moved = frame({ ...p, surfaces: [placed] });
    if (difference(before, moved) < 1)
      throw Error("Paused still texture ignores transform");
    for (const flag of ["placementMesh", "testPattern"]) {
      if (
        difference(
          frame({ ...p, surfaces: [still] }, 0, { [flag]: true }),
          frame({ ...p, surfaces: [placed] }, 0, { [flag]: true }),
        )
      )
        throw Error(`${flag} should ignore content placement`);
    }
    const liquid = createLiquidStack(p);
    let layered = addLayer(liquid.project, "front");
    const top = {
      ...surface,
      id: "cover",
      effectId: "brushed-aluminium",
      layerId: "front",
    };
    layered = { ...layered, surfaces: [...layered.surfaces, top] };
    const topOnly = frame({ ...layered, surfaces: [top], stacks: [] }, 3);
    const covered = frame(layered, 3);
    if (difference(topOnly, covered) !== 0)
      throw Error("Liquid streams draw over the foreground layer");
    if (difference(frame(reorderLayer(layered, "front", -1), 3), covered) < 1)
      throw Error("Reordered liquid layer did not move forward");

    const created = createPortalStack({ ...p, width: 1920, height: 1080 });
    const portal = {
      ...created.project,
      name: "Portal journey",
      surfaces: created.project.surfaces.map((s, i) => ({
        ...s,
        id: `portal-tile-${i + 1}`,
        seed: 42,
      })),
    };
    portal.stacks[0] = {
      ...created.stack,
      id: "portal-journey",
      surfaceIds: portal.surfaces.map((s) => s.id),
      seed: 42,
    };
    const stack = portal.stacks[0];
    const sheet = document.createElement("canvas");
    sheet.width = 1040;
    sheet.height = 7 * 240;
    const sc = sheet.getContext("2d");
    sc.fillStyle = "#101625";
    sc.fillRect(0, 0, sheet.width, sheet.height);
    const tiles = portal.surfaces,
      route = chaseRoute(portal, stack);
    const tileCanvas = document.createElement("canvas");
    tileCanvas.width = 320;
    tileCanvas.height = 200;
    const tc = tileCanvas.getContext("2d");
    const times = [0, 1.9, 4.7, 8, 12.7, 16, 20.7];
    for (let row = 0; row < times.length; row++) {
      sc.font = "14px Segoe UI";
      sc.fillStyle = "#d2e4ff";
      sc.fillText(`${times[row].toFixed(1)}s / 24s`, 20, row * 240 + 22);
      for (let col = 0; col < tiles.length; col++) {
        drawLinkedPortal(tc, times[row], stack, route, tiles[col].id);
        sc.drawImage(tileCanvas, 20 + col * 340, row * 240 + 32, 320, 200);
      }
    }
    const characterSheet = document.createElement("canvas");
    characterSheet.width = 1040;
    characterSheet.height = 3 * 240;
    const cc = characterSheet.getContext("2d");
    cc.fillStyle = "#101625";
    cc.fillRect(0, 0, 1040, 720);
    const portalReport = [];
    for (const [row, character] of ["robot", "alien", "cat"].entries())
      for (const direction of ["left", "right"]) {
        const next = {
          ...portal,
          stacks: [{ ...stack, character, direction }],
        };
        const a = frame(next, 4.7),
          b = frame(next, 28.7),
          c = frame(next, 6.7);
        if (difference(a, b) !== 0)
          throw Error(`${character} ${direction} does not loop exactly`);
        if (difference(a, c) < 0.1)
          throw Error(`${character} ${direction} does not animate`);
        for (const boundary of [8, 16, 24]) {
          const left = frame(next, boundary - 0.0001),
            right = frame(next, boundary + 0.0001);
          if (difference(left, right) > 0.12)
            throw Error(`${character} ${direction} jumps at ${boundary}`);
        }
        if (direction === "left") {
          cc.font = "14px Segoe UI";
          cc.fillStyle = "#d2e4ff";
          cc.fillText(character, 20, row * 240 + 22);
          for (let col = 0; col < tiles.length; col++) {
            drawLinkedPortal(tc, 4.7, next.stacks[0], route, tiles[col].id);
            cc.drawImage(tileCanvas, 20 + col * 340, row * 240 + 32, 320, 200);
          }
        }
        portalReport.push({
          character,
          direction,
          exactLoop: true,
          continuousHandoffs: true,
        });
      }
    renderer.dispose();
    return {
      samples,
      maxError,
      holesFixed: true,
      pausedStill: true,
      meshBypass: true,
      calibrationBypass: true,
      liquidLayerOrder: true,
      portalReport,
      sheet: sheet.toDataURL(),
      characters: characterSheet.toDataURL(),
      example: portal,
    };
  });
  await writeFile(
    path.join(artifacts, "portal-storyboard.png"),
    Buffer.from(result.sheet.split(",")[1], "base64"),
  );
  await writeFile(
    path.join(artifacts, "portal-explorers.png"),
    Buffer.from(result.characters.split(",")[1], "base64"),
  );
  await writeFile(
    path.resolve("examples/Portal-journey.luma"),
    JSON.stringify(result.example, null, 2),
  );
  delete result.sheet;
  delete result.characters;
  delete result.example;
  expect(errors).toEqual([]);
  await writeFile(
    path.join(artifacts, "content-portal-checks.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(
    "PASS content placement against independent pixel reference, fixed holes, transparency in all blends, paused stills, mesh/calibration bypass, foreground over streams, portal cycle and handoffs for all explorers and both directions.",
    result,
  );
} finally {
  if (app) await app.close();
  await server.close();
}
