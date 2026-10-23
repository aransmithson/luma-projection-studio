import { _electron as electron, expect } from "@playwright/test";
import { createServer } from "vite";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  readdir,
  rename,
} from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { gifFixture, recordVideoFixture } from "./media-fixtures.mjs";

await mkdir("test-results", { recursive: true });
const artifacts = await mkdtemp(path.resolve("test-results/media-workflow-"));
const profile = path.join(artifacts, "profile");
const packaged = process.argv.includes("--packaged");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
let server, app;
const errors = [],
  checks = [];
const check = (message) => {
  checks.push(message);
  console.log(`PASS: ${message}`);
};
const gifPath = path.join(artifacts, "Colour tiles é.gif"),
  mp4Path = path.join(artifacts, "Colour motion.mp4");
await writeFile(gifPath, gifFixture());
const launch = async () => {
  console.log(
    `Starting ${packaged ? "packaged" : "development"} media workflow in an isolated profile.`,
  );
  const release = process.env.LUMA_RELEASE_DIR || "release/1.17.0";
  const options = packaged
    ? {
        executablePath: path.resolve(
          release,
          "win-unpacked/Nox Projection Studio.exe",
        ),
        args: [`--user-data-dir=${profile}`],
      }
    : { args: [path.resolve("."), `--user-data-dir=${profile}`] };
  app = await electron.launch({ ...options, env, timeout: 60000 });
  const page = await app.firstWindow({ timeout: 30000 });
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(page.locator(".stage-overlay")).toBeVisible({ timeout: 30000 });
  return page;
};
const choose = (file) =>
  app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({
      canceled: !filePath,
      filePaths: filePath ? [filePath] : [],
    });
  }, file);
try {
  if (!packaged) {
    server = await createServer({
      server: { host: "127.0.0.1", port: 0 },
      logLevel: "error",
    });
    await server.listen();
    env.VITE_DEV_SERVER_URL = `http://127.0.0.1:${server.httpServer.address().port}`;
  }
  let page = await launch();
  await writeFile(mp4Path, await recordVideoFixture(page));
  await choose(gifPath);
  await page
    .getByRole("button", { name: "Import animation", exact: true })
    .click();
  await expect(page.locator(".media-status")).toContainText("Ready", {
    timeout: 25000,
  });
  await expect(page.locator(".effect-card.applied")).toContainText(
    "Colour tiles",
  );
  await expect(page.getByLabel("Animation fit")).toHaveValue("cover");
  await page.getByLabel("Animation fit").selectOption("contain");
  await page.getByLabel("Time offset", { exact: true }).fill("0.4");
  await page.getByLabel("Time offset", { exact: true }).press("Tab");
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restart animation", exact: true })
    .click();
  check(
    "GIF imports through the real bridge, creates a thumbnail and exposes fit/trim/offset controls",
  );
  await choose(mp4Path);
  await page
    .getByRole("button", { name: "Import animation", exact: true })
    .click();
  await expect(page.locator(".media-status")).toContainText("Ready", {
    timeout: 25000,
  });
  await expect(page.locator(".effect-card")).toHaveCount(2);
  const assets = await page.evaluate(() => window.luma.listMedia());
  expect(assets.map((asset) => asset.format).sort()).toEqual(["gif", "mp4"]);
  expect(
    assets.every((asset) =>
      asset.thumbnail?.startsWith("data:image/png;base64,"),
    ),
  ).toBe(true);
  check(
    "Real H.264 MP4 decodes in Electron and both animations persist in the library",
  );

  await choose(null);
  await page
    .getByRole("button", { name: "Import animation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Import animation", exact: true }),
  ).toBeEnabled();
  expect((await page.evaluate(() => window.luma.listMedia())).length).toBe(2);
  const bad = path.join(artifacts, "invalid.mp4");
  await writeFile(bad, "This is not a video file.");
  await choose(bad);
  await page
    .getByRole("button", { name: "Import animation", exact: true })
    .click();
  await expect(page.locator(".toast")).toContainText("not a valid MP4");
  await choose(gifPath);
  await page
    .getByRole("button", { name: "Locate original", exact: true })
    .click();
  await expect(page.locator(".toast")).toContainText("different file");
  await choose(mp4Path);
  await page
    .getByRole("button", { name: "Locate original", exact: true })
    .click();
  await expect(page.locator(".toast")).toContainText("restored");
  check(
    "Cancel, invalid files, wrong relinks and duplicate imports preserve the current scene",
  );

  const nativeWindow = await app.browserWindow(page);
  await nativeWindow.evaluate((win) => win.setSize(1120, 760));
  await expect(
    page.getByRole("button", { name: "Import animation", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: path.join(artifacts, "import-1120.png") });
  await nativeWindow.evaluate((win) => win.setSize(1560, 1000));
  await page.screenshot({ path: path.join(artifacts, "import-workspace.png") });

  if (!packaged) {
    const rendering = await page.evaluate(async (assets) => {
      const { ProjectionRenderer } = await import("/src/renderer.ts");
      const { createProject, createSurface } = await import("/src/model.ts");
      const { bindMedia } = await import("/src/media.ts");
      const { defaultColorOverlay } = await import("/src/compositing.ts");
      const originalCreate = document.createElement.bind(document),
        videos = [];
      document.createElement = (...args) => {
        const element = originalCreate(...args);
        if (args[0] === "video") videos.push(element);
        return element;
      };
      const canvas = document.createElement("canvas"),
        renderer = new ProjectionRenderer(canvas),
        gl = canvas.getContext("webgl");
      const full = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
      const base = createProject("blank");
      base.width = 640;
      base.height = 360;
      const surface = createSurface("quad", 1, full);
      surface.effectId = "imported-media";
      const state = {
        project: { ...base, surfaces: [surface] },
        playback: { playing: false, offset: 100, startedAt: Date.now() },
        blackout: false,
        testPattern: false,
      };
      const pixel = (x = 320, y = 180) => {
        renderer.render(
          {
            ...state,
            project: {
              ...state.project,
              surfaces: [...state.project.surfaces],
            },
          },
          640,
          360,
        );
        const out = new Uint8Array(4);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
        if (gl.getError()) throw new Error("WebGL media upload failed.");
        return [...out];
      };
      const settle = async (time, channel) => {
        state.playback.offset = time * 1000;
        for (let i = 0; i < 200; i++) {
          const p = pixel();
          if (p[channel] > 210 && p[(channel + 1) % 3] < 70) return p;
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        throw new Error(
          `Expected channel ${channel} at ${time}s, got ${pixel()}`,
        );
      };
      const report = {};
      try {
        for (const format of ["gif", "mp4"]) {
          surface.media = bindMedia(assets.find((a) => a.format === format));
          const times = format === "gif" ? [0.1, 0.5, 1.05] : [0.4, 1.4, 2.4];
          report[format] = [];
          for (let channel = 0; channel < 3; channel++)
            report[format].push(await settle(times[channel], channel));
          const paused = pixel();
          await new Promise((resolve) => setTimeout(resolve, 180));
          if (JSON.stringify(pixel()) !== JSON.stringify(paused))
            throw new Error("Paused media changed.");
          await settle(0.1, 0); // Restart.
          surface.media.trimStart = times[1];
          surface.media.trimEnd = times[2];
          await settle(0, 1);
          surface.media = bindMedia(assets.find((a) => a.format === format));
        }
        surface.media = bindMedia(assets.find((a) => a.format === "gif"));
        await settle(0.1, 0);
        if (
          pixel(30, 30)
            .slice(0, 3)
            .some((v) => v > 2)
        )
          throw new Error("GIF transparency is not black over an empty stage.");
        const underlay = createSurface("quad", 2, full, "aurora");
        state.project.surfaces = [underlay];
        const belowCorner = pixel(30, 30),
          belowCenter = pixel();
        state.project.surfaces = [underlay, surface];
        await settle(0.1, 0);
        if (JSON.stringify(pixel(30, 30)) !== JSON.stringify(belowCorner))
          throw new Error("Transparent GIF hides the layer below it.");
        const hole = createSurface("quad", 3, [
          { x: 0.45, y: 0.45 },
          { x: 0.55, y: 0.45 },
          { x: 0.55, y: 0.55 },
          { x: 0.45, y: 0.55 },
        ]);
        hole.cutoutOf = surface.id;
        state.project.surfaces.push(hole);
        const cutoutPixel = pixel();
        if (JSON.stringify(cutoutPixel) !== JSON.stringify(belowCenter))
          throw new Error(
            `Cutout masks do not expose the lower layer: ${cutoutPixel} vs ${belowCenter}`,
          );
        state.project.surfaces = [surface];
        surface.contentTransform = { rotation: 25, offsetX: 0.8, offsetY: 0 };
        if (
          pixel()
            .slice(0, 3)
            .some((v) => v > 2)
        )
          throw new Error("Media content transform did not move the image.");
        surface.contentTransform = undefined;
        surface.colorOverlay = {
          ...defaultColorOverlay,
          enabled: true,
          intensity: 1,
          style: "wash",
          palette: "ocean",
          blend: "normal",
        };
        const overlay = pixel();
        if (overlay[0] > 245 && overlay[1] < 30 && overlay[2] < 30)
          throw new Error("Colour overlay did not affect imported media.");
        state.blackout = true;
        if (
          pixel()
            .slice(0, 3)
            .some((v) => v > 0)
        )
          throw new Error("Blackout failed.");
        state.blackout = false;
        state.placementMesh = true;
        pixel();
        state.placementMesh = false;
        surface.colorOverlay = undefined;
        await settle(0.5, 1);
        report.masksTransformsAndOverlay = true;
        const originalBinding = surface.media;
        const keeper = {
          ...surface,
          id: "paused-gif-keeper",
          points: full.map((p) => ({ x: p.x * 0.1, y: p.y * 0.1 })),
        };
        state.project.surfaces = [surface, keeper];
        await settle(0.1, 0);
        surface.media = { ...originalBinding, offset: 0.4 };
        await settle(0.1, 1);
        surface.media = originalBinding;
        await settle(0.1, 0);
        surface.effectId = "cracks-glass";
        pixel();
        surface.effectId = "imported-media";
        await settle(0.1, 0);
        report.pausedReassignment = true;
        state.project.surfaces = [surface];
        surface.media = bindMedia(assets.find((a) => a.format === "mp4"));
        surface.points = [
          { x: 0, y: 0 },
          { x: 0.5, y: 0 },
          { x: 0.5, y: 1 },
          { x: 0, y: 1 },
        ];
        const twin = {
          ...surface,
          id: "media-twin",
          points: [
            { x: 0.5, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0.5, y: 1 },
          ],
        };
        state.project.surfaces = [surface, twin];
        state.playback = { playing: true, offset: 400, startedAt: Date.now() };
        const colours = new Set();
        for (let i = 0; i < 95; i++) {
          const left = pixel(160, 180),
            right = pixel(480, 180);
          if (JSON.stringify(left) !== JSON.stringify(right))
            throw new Error("Duplicate clips lost synchronization.");
          if (Math.max(...left.slice(0, 3)) > 210)
            colours.add(
              left.slice(0, 3).indexOf(Math.max(...left.slice(0, 3))),
            );
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        if (colours.size < 2)
          throw new Error("Video failed to animate while playing.");
        const active = videos.filter((video) => video.hasAttribute("src"));
        if (active.length !== 1 || !active[0].muted)
          throw new Error("Matching shapes must share one muted player.");
        state.blackout = true;
        pixel();
        if (videos.some((video) => video.hasAttribute("src")))
          throw new Error("Blackout left a video player running.");
        report.playingSharedMutedPlayerAndCleanup = true;
        return report;
      } finally {
        renderer.dispose();
        document.createElement = originalCreate;
      }
    }, assets);
    await writeFile(
      path.join(artifacts, "rendering.json"),
      JSON.stringify(rendering, null, 2),
    );
    check(
      "GPU rendering verifies RGB frames, GIF transparency, cutouts, transforms, overlays, pause, restart and trim",
    );
  }

  const projectFile = path.join(artifacts, "Imported scene.luma");
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, projectFile);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("Project saved to file.");
  const saved = JSON.parse(await readFile(projectFile, "utf8"));
  expect(saved.version).toBe(1);
  expect(await readdir(`${projectFile}.media`)).toHaveLength(1);
  expect(JSON.stringify(saved)).not.toContain(profile);
  const state = {
    project: saved,
    playback: { playing: false, offset: 1400, startedAt: Date.now() },
    blackout: false,
    testPattern: false,
  };
  const outputPromise = app.waitForEvent("window");
  await page.evaluate(async (state) => {
    const displays = await window.luma.getDisplays();
    await window.luma.openOutput(displays.find((d) => d.primary).id, state);
  }, state);
  const output = await outputPromise;
  await expect(output.locator(".projection-canvas")).toBeVisible();
  const mapped = saved.surfaces.find((s) => s.effectId === "imported-media");
  const center = {
    x: mapped.points.reduce((sum, p) => sum + p.x, 0) / mapped.points.length,
    y: mapped.points.reduce((sum, p) => sum + p.y, 0) / mapped.points.length,
  };
  const outputPixel = async () => {
    const png = PNG.sync.read(
      await output.locator(".projection-canvas").screenshot(),
    );
    const offset =
      (Math.round(center.y * (png.height - 1)) * png.width +
        Math.round(center.x * (png.width - 1))) *
      4;
    return [...png.data.subarray(offset, offset + 3)];
  };
  await expect
    .poll(async () => (await outputPixel())[1], { timeout: 20000 })
    .toBeGreaterThan(210);
  await output.screenshot({
    path: path.join(artifacts, "projector-paused.png"),
  });
  await page.evaluate(() => window.luma.closeOutput());
  check(
    "Projector output decodes the same paused video time and project save copies only used assets",
  );

  await app.close();
  app = null;
  // Only this test profile is renamed; keep backups for inspection.
  await rename(path.join(profile, "media"), path.join(profile, "media-backup"));
  page = await launch();
  await choose(projectFile);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await page.getByRole("button", { name: "Imported", exact: true }).click();
  await expect(page.locator(".effect-card")).toHaveCount(1);
  expect((await page.evaluate(() => window.luma.listMedia()))[0].format).toBe(
    "mp4",
  );
  check(
    "Project and companion folder restore a missing local library after a clean app restart",
  );
  expect(errors).toEqual([]);
  await writeFile(
    path.join(artifacts, "report.json"),
    JSON.stringify({ packaged, checks, errors }, null, 2),
  );
  console.log(`Media workflow passed. Artifacts: ${artifacts}`);
} finally {
  if (app) {
    const process = app.process();
    const cleanup = setTimeout(() => {
      if (process.exitCode === null) process.kill();
    }, 10000);
    try {
      await app.close();
    } finally {
      clearTimeout(cleanup);
    }
  }
  if (server) await server.close();
}
