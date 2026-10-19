import { _electron as electron, expect } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

await mkdir("test-results", { recursive: true });
const artifacts = await mkdtemp(path.resolve("test-results/stories-workflow-"));
const profile = path.join(artifacts, "profile");
const packaged = process.argv.includes("--packaged");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
let app, server;
const errors = [],
  checks = [];
const check = (message) => {
  checks.push(message);
  console.log(`PASS: ${message}`);
};
try {
  if (!packaged) {
    server = await createServer({
      server: { host: "127.0.0.1", port: 0 },
      logLevel: "error",
    });
    await server.listen();
    env.VITE_DEV_SERVER_URL = `http://127.0.0.1:${server.httpServer.address().port}`;
  }
  app = await electron.launch({
    ...(packaged
      ? {
          executablePath: path.resolve(
            process.env.LUMA_RELEASE_DIR || "release/1.18.0",
            "win-unpacked/Nox Projection Studio.exe",
          ),
        }
      : {}),
    args: [
      ...(packaged ? [] : [path.resolve(".")]),
      `--user-data-dir=${profile}`,
    ],
    env,
    timeout: 60000,
  });
  app.on("window", (p) => p.on("pageerror", (e) => errors.push(e.message)));
  const page = await app.firstWindow({ timeout: 30000 });
  page.setDefaultTimeout(15000);
  await expect(page.locator(".stage-overlay")).toBeVisible();
  if (!packaged) {
    const rendered = await page.evaluate(async () => {
      const { storyEffects } = await import("/src/storyCatalog.ts");
      const { createProject, createSurface } = await import("/src/model.ts");
      const { createStoryStack, withStack } = await import("/src/stacks.ts");
      const { chaseRoute } = await import("/src/chaseRoute.ts");
      const { drawLinkedStory } = await import("/src/effects/linkedStories.ts");
      const { drawEffect } = await import("/src/effects.ts");
      const { ProjectionRenderer } = await import("/src/renderer.ts");
      const rect = (x, y, w, h) => [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ];
      const difference = (a, b) =>
        a.reduce((n, v, i) => n + Math.abs(v - b[i]), 0) / a.length;
      const assert = (condition, message) => {
        if (!condition) throw Error(message);
      };
      const sheet = document.createElement("canvas");
      sheet.width = 1200;
      sheet.height = 660;
      const sc = sheet.getContext("2d");
      sc.fillStyle = "#11131d";
      sc.fillRect(0, 0, 1200, 660);
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 280;
      const c = canvas.getContext("2d", { willReadFrequently: true });
      const fixtures = [],
        reports = [];
      for (const [i, effect] of storyEffects.entries()) {
        const base = {
          ...createProject("blank"),
          surfaces: [],
          width: 1200,
          height: 600,
        };
        const { project, stack } = createStoryStack(base, undefined, effect.id);
        stack.seed = 42;
        stack.name = effect.name;
        project.name = effect.name;
        const p = withStack(project, stack);
        fixtures.push({ name: effect.name, project: p });
        const route = chaseRoute(p, stack);
        const frame = (t, direction = "left") => {
          const data = new Uint8ClampedArray(
            400 * 280 * 4 * stack.surfaceIds.length,
          );
          stack.surfaceIds.forEach((id, j) => {
            drawLinkedStory(c, t, { ...stack, direction }, route, id);
            data.set(c.getImageData(0, 0, 400, 280).data, j * 400 * 280 * 4);
          });
          return data;
        };
        const a = frame(5.9),
          b = frame(29.9),
          moved = frame(13.2),
          reversed = frame(5.9, "right");
        assert(
          difference(a, b) === 0,
          `${effect.name}: full loop differs: ${difference(a, b)}; ${a.reduce((n, v, i) => n + (v !== b[i] ? 1 : 0), 0)} channels`,
        );
        assert(difference(a, moved) > 0.3, `${effect.name}: no animation`);
        const sizedFrame = (scale) => {
          const settings = { ...stack, scale };
          const scaledProject = withStack(p, settings);
          const scaledRoute = chaseRoute(scaledProject, settings);
          const data = new Uint8ClampedArray(
            400 * 280 * 4 * stack.surfaceIds.length,
          );
          stack.surfaceIds.forEach((id, j) => {
            drawLinkedStory(c, 5.9, settings, scaledRoute, id);
            data.set(c.getImageData(0, 0, 400, 280).data, j * 400 * 280 * 4);
          });
          return data;
        };
        assert(
          difference(sizedFrame(1.3), sizedFrame(1.55)) > 0.1,
          `${effect.name}: linked size stops growing above 130%`,
        );
        drawEffect(c, effect.id, 6, effect.color, 42, 1.3, false, "left");
        const smaller = c.getImageData(0, 0, 400, 280).data;
        drawEffect(c, effect.id, 6, effect.color, 42, 1.55, false, "left");
        assert(
          difference(smaller, c.getImageData(0, 0, 400, 280).data) > 0.1,
          `${effect.name}: standalone size stops growing above 130%`,
        );
        assert(
          difference(a, reversed) > 0.3,
          `${effect.name}: no reverse change`,
        );
        assert(
          difference(frame(24 - 0.00001), frame(0.00001)) < 0.08,
          `${effect.name}: wrap seam`,
        );
        for (const direction of ["left", "right"]) {
          drawEffect(c, effect.id, 6, effect.color, 42, 1, false, direction);
          const still = c.getImageData(0, 0, 400, 280).data;
          drawEffect(c, effect.id, 18, effect.color, 42, 1, false, direction);
          assert(
            difference(still, c.getImageData(0, 0, 400, 280).data) === 0,
            `${effect.name}: standalone loop`,
          );
        }
        drawEffect(c, effect.id, 6, effect.color, 42, 1, false, "left");
        const x = (i % 3) * 400,
          y = Math.floor(i / 3) * 330;
        sc.drawImage(canvas, x, y + 35);
        sc.fillStyle = "#e5e8ff";
        sc.font = "17px Segoe UI";
        sc.fillText(effect.name, x + 16, y + 24);
        reports.push({
          id: effect.id,
          loop: true,
          reverse: true,
          motion: true,
          seam: true,
        });
      }
      const gpu = document.createElement("canvas"),
        renderer = new ProjectionRenderer(gpu),
        gl = gpu.getContext("webgl");
      const w = 600,
        h = 300;
      let p = fixtures[0].project;
      p = {
        ...p,
        width: w,
        height: h,
        surfaces: p.surfaces.map((s, i) => ({
          ...s,
          points: rect(i / 3, 0, 1 / 3, 1),
        })),
      };
      const frame = (project, time = 6, extra = {}) => {
        renderer.render(
          {
            project,
            playback: { playing: false, offset: time * 1000, startedAt: 0 },
            blackout: false,
            testPattern: false,
            ...extra,
          },
          w,
          h,
        );
        const data = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
        assert(gl.getError() === gl.NO_ERROR, "GPU error");
        return data;
      };
      const baseline = frame(p);
      assert(difference(baseline, frame(p)) === 0, "Pause changes frame");
      assert(difference(baseline, frame(p, 30)) === 0, "GPU loop differs");
      const hidden = {
        ...p,
        surfaces: p.surfaces.map((s, i) =>
          i === 1 ? { ...s, visible: false } : s,
        ),
      };
      const hiddenFrame = frame(hidden);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (x < 200 || x >= 400) {
            const at = (y * w + x) * 4;
            assert(
              baseline[at] === hiddenFrame[at] &&
                baseline[at + 1] === hiddenFrame[at + 1] &&
                baseline[at + 2] === hiddenFrame[at + 2],
              "Hiding a tile changes other clocks",
            );
          }
      const hole = {
        ...createSurface("quad", 5, rect(0.08, 0.4, 0.12, 0.2)),
        cutoutOf: p.surfaces[0].id,
      };
      const cut = frame({ ...p, surfaces: [...p.surfaces, hole] });
      const sample = ((h - 1 - 150) * w + 84) * 4;
      assert(
        cut[sample] + cut[sample + 1] + cut[sample + 2] === 0,
        "Hole did not clip story",
      );
      const shifted = frame({
        ...p,
        surfaces: p.surfaces.map((s) => ({
          ...s,
          contentTransform: { rotation: 22, offsetX: 0.08, offsetY: -0.04 },
          blend: "screen",
          colorOverlay: {
            enabled: true,
            style: "wash",
            palette: "ocean",
            blend: "screen",
            intensity: 0.4,
            speed: 1,
            scale: 1,
            reverse: false,
          },
        })),
      });
      assert(
        difference(baseline, shifted) > 0.3,
        "Content/compositing changes ignored",
      );
      const mesh = frame(p, 6, { placementMesh: true });
      assert(
        difference(mesh, frame(p, 17, { placementMesh: true })) === 0,
        "Mesh animates",
      );
      const black = frame(p, 6, { blackout: true });
      assert(
        black.every((v, i) => i % 4 === 3 || v === 0),
        "Blackout failed",
      );
      renderer.dispose();
      return {
        fixtures,
        reports,
        sheet: sheet.toDataURL("image/png"),
        gpu: true,
      };
    });
    await writeFile(
      path.join(artifacts, "stories-contact-sheet.png"),
      Buffer.from(rendered.sheet.split(",")[1], "base64"),
    );
    await writeFile(
      path.join(artifacts, "rendering.json"),
      JSON.stringify({ reports: rendered.reports, gpu: rendered.gpu }, null, 2),
    );
    // Keep generated test fixtures separate from the committed examples.
    for (const fixture of rendered.fixtures)
      await writeFile(
        path.join(artifacts, `${fixture.name.replaceAll(" ", "-")}.luma`),
        JSON.stringify(fixture.project, null, 2) + "\n",
      );
    check(
      "Six original stories render, repeat exactly, reverse and cross the loop seam; GPU pause, hidden tiles, holes, transforms, mesh and blackout pass",
    );
  }
  const fixtures = [
    "Cosmic-courier",
    "Ghost-train",
    "Dragon-lantern-run",
    "Reef-pearl-relay",
    "Clockwork-marble",
    "Firefly-garden",
  ];
  const example = JSON.parse(
    await readFile(`examples/${fixtures[0]}.luma`, "utf8"),
  );
  const loose = { ...example, stacks: [], name: "Story tiles to link" };
  const fixturePath = path.join(artifacts, "loose.luma"),
    savedPath = path.join(artifacts, "saved.luma");
  await writeFile(fixturePath, JSON.stringify(loose));
  const choose = (file) =>
    app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, file);
  await choose(fixturePath);
  await app.evaluate(({ dialog }, file) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
  }, savedPath);
  const click = (name) =>
    page.getByRole("button", { name, exact: true }).click();
  await click("Open project");
  await click("Pause animation");
  await click("Restart animation");
  await page
    .getByRole("button", { name: "Linked stories", exact: true })
    .click();
  await expect(page.locator(".effect-card")).toHaveCount(7);
  await click("Apply Cosmic courier");
  await click("Link this story across shapes");
  await expect(
    page
      .locator(".stack-mode")
      .getByRole("button", { name: "Linked stories", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const s of example.surfaces)
    await page.getByLabel(`Include ${s.name}`, { exact: true }).check();
  await page
    .getByLabel("Stack name", { exact: true })
    .fill("Linked story circuit");
  await page
    .locator(".stack-modal")
    .getByLabel("Story direction", { exact: true })
    .selectOption("right");
  await page.getByLabel("Stack duration", { exact: true }).fill("18");
  await page.getByLabel("Story traveller size", { exact: true }).fill("1.3");
  await click(`Move ${example.surfaces[2].name} earlier`);
  await click("Save stack");
  const modal = page.locator(".stack-modal");
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1120, 760),
  );
  await page.screenshot({
    path: path.join(artifacts, "story-editor-compact.png"),
  });
  const layout = await modal.evaluate((el) => ({
    width: el.clientWidth,
    scroll: el.scrollWidth,
    height: el.clientHeight,
    scrollHeight: el.scrollHeight,
  }));
  expect(layout.scroll).toBeLessThanOrEqual(layout.width + 1);
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.height + 1);
  await expect(
    page.getByRole("button", { name: "Save stack", exact: true }),
  ).toBeInViewport();
  await click("Close dialog");
  await click("Save project");
  await expect
    .poll(
      async () =>
        JSON.parse(await readFile(savedPath, "utf8")).stacks[0]?.direction,
    )
    .toBe("right");
  const saved = JSON.parse(await readFile(savedPath, "utf8"));
  expect(saved.stacks[0].surfaceIds).toEqual([
    example.surfaces[0].id,
    example.surfaces[2].id,
    example.surfaces[1].id,
  ]);
  expect(saved.stacks[0].duration).toBe(18);
  expect(saved.stacks[0].scale).toBe(1.3);
  expect(saved.surfaces.every((s) => s.scale === 1.3)).toBe(true);
  check(
    "Effect browser, link-existing-shapes, route order, reverse direction, timing, compact editor and native save pass",
  );
  await click("Launch output");
  await page
    .locator(".display-option")
    .filter({ hasText: "Primary display" })
    .click();
  await page
    .getByLabel("Projection wireframe", { exact: true })
    .selectOption("off");
  const opening = app.waitForEvent("window");
  await click("Open output preview");
  const output = await opening;
  await expect(output.locator(".projection-canvas")).toBeVisible();
  const state = () => output.evaluate(() => window.luma.getOutputState());
  await expect
    .poll(async () => (await state()).project.stacks[0]?.direction)
    .toBe("right");
  const snapshot = async () =>
    PNG.sync.read(await output.locator(".projection-canvas").screenshot()).data;
  expect(await snapshot()).toEqual(await snapshot());
  const screenshot = await output.locator(".projection-canvas").screenshot();
  await writeFile(path.join(artifacts, "paused-projector.png"), screenshot);
  const firstFrame = await snapshot();
  await click("Play animation");
  await expect.poll(async () => (await state()).playback.playing).toBe(true);
  await expect
    .poll(async () => firstFrame.equals(await snapshot()))
    .toBe(false);
  await click("Pause animation");
  await expect.poll(async () => (await state()).playback.playing).toBe(false);
  expect(await snapshot()).toEqual(await snapshot());
  await click("Restart animation");
  await expect.poll(async () => firstFrame.equals(await snapshot())).toBe(true);
  await click("Edit linked story");
  await page.getByLabel("Story traveller size", { exact: true }).fill("1.55");
  await click("Save stack");
  await click("Close dialog");
  await expect
    .poll(async () => (await state()).project.stacks[0].scale)
    .toBe(1.55);
  await expect
    .poll(async () => firstFrame.equals(await snapshot()))
    .toBe(false);
  await page.locator(".panel-heading").first().click();
  await page.keyboard.press("Control+z");
  await expect
    .poll(async () => (await state()).project.stacks[0].scale)
    .toBe(1.3);
  await expect.poll(async () => firstFrame.equals(await snapshot())).toBe(true);
  check(
    "Traveller size grows above 130% on the projector while paused; Undo restores every tile and its frame",
  );
  await click("Edit linked story");
  await page
    .getByLabel("Story theme", { exact: true })
    .selectOption("story-ghost-train");
  await click("Save stack");
  await click("Close dialog");
  await expect
    .poll(async () => (await state()).project.stacks[0].effectId)
    .toBe("story-ghost-train");
  await page.locator(".panel-heading").first().click();
  await page.keyboard.press("Control+z");
  await expect
    .poll(async () => (await state()).project.stacks[0].effectId)
    .toBe("story-cosmic-courier");
  check(
    "Projector follows shared Play, Pause, Restart, theme changes and Undo",
  );
  await page.evaluate(() => window.luma.closeOutput());
  await choose(savedPath);
  await click("Open project");
  await page.getByRole("tab", { name: "Effect", exact: true }).click();
  await click("Edit linked story");
  await expect(page.getByLabel("Stack name", { exact: true })).toHaveValue(
    "Linked story circuit",
  );
  await expect(page.getByLabel("Stack duration", { exact: true })).toHaveValue(
    "18",
  );
  await expect(
    page.getByLabel("Story traveller size", { exact: true }),
  ).toHaveValue("1.3");
  await expect(
    modal.getByLabel("Story direction", { exact: true }),
  ).toHaveValue("right");
  await expect(page.locator(".stack-order li")).toHaveText([
    `1${example.surfaces[0].name}`,
    `2${example.surfaces[2].name}`,
    `3${example.surfaces[1].name}`,
  ]);
  await click("Close dialog");
  check(
    "Reopening the native save restores the custom name, direction, duration and route order",
  );
  for (const file of fixtures) {
    await choose(path.resolve(`examples/${file}.luma`));
    await click("Open project");
    await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
      file.replaceAll("-", " "),
    );
    await page.getByRole("tab", { name: "Effect", exact: true }).click();
    await expect(page.locator(".stack-membership")).toContainText(
      file.replaceAll("-", " "),
    );
    await click("Edit linked story");
    await click("Create linked story");
    await expect(page.locator(".stack-choices .stack-choice")).toHaveCount(2);
    await click("Close dialog");
  }
  check(
    "All six example projects reopen and each theme can create three new linked tiles",
  );
  expect(errors).toEqual([]);
  await writeFile(
    path.join(artifacts, "report.json"),
    JSON.stringify({ packaged, checks, errors }, null, 2),
  );
  console.log(`Story workflow passed. Artifacts: ${artifacts}`);
} finally {
  const child = app?.process();
  const timer = setTimeout(() => child?.kill(), 10000);
  try {
    await app?.close();
  } finally {
    clearTimeout(timer);
    await server?.close();
  }
}
