import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "placement-profile-"));
const fixture = JSON.parse(await readFile("examples/Edge-runner.luma", "utf8"));
fixture.surfaces[2].opacity = 0;
fixture.surfaces[2].feather = 0.08;
fixture.brightness = 0.45;
const fixturePath = path.join(profile, "placement.luma");
await writeFile(fixturePath, JSON.stringify(fixture));
const packaged = process.argv.includes("--packaged");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
const app = await electron.launch({
  ...(packaged
    ? {
        executablePath: path.resolve(
          process.env.LUMA_RELEASE_DIR || "release",
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
const errors = [];
app.on("window", (page) =>
  page.on("pageerror", (error) => errors.push(error.message)),
);
let page, output;
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  await expect(page.locator(".stage-overlay")).toBeVisible();
  const open = async (filePath) => {
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [filePath],
      });
    }, filePath);
    await page
      .getByRole("button", { name: "Open project", exact: true })
      .click();
  };
  await open(fixturePath);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Launch output", exact: true })
    .click();
  await page
    .locator(".display-option")
    .filter({ hasText: "Primary display" })
    .click();
  await page
    .getByLabel("Projection wireframe", { exact: true })
    .selectOption("off");
  const outputPromise = app.waitForEvent("window");
  await page
    .getByRole("button", { name: "Open output preview", exact: true })
    .click();
  output = await outputPromise;
  output.setDefaultTimeout(15000);
  await expect(output.locator(".projection-canvas")).toBeVisible();
  const getState = () => output.evaluate(() => window.luma.getOutputState());
  const frame = async () =>
    PNG.sync.read(await output.locator(".projection-canvas").screenshot());
  const mesh = (value) =>
    expect.poll(async () => (await getState()).placementMesh).toBe(value);
  const cursor = async (value) => {
    await expect(output.locator(".output-root")).toHaveCSS("cursor", value);
    await expect(output.locator(".projection-canvas")).toHaveCSS(
      "cursor",
      value,
    );
  };
  const allBlack = (pixels) =>
    pixels.every((value, i) => i % 4 === 3 || value === 0);
  const initial = await getState(),
    animation = await frame();
  await cursor("none");
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  await mesh(true);
  await cursor("crosshair");
  await expect(output.locator(".placement-wireframe > g")).toHaveCount(6);
  await expect(
    output.locator(".placement-wireframe .selected text"),
  ).toHaveCount(4);
  const placement = await frame();
  expect(
    placement.data.equals(animation.data),
    "Mesh replaces the animation",
  ).toBe(false);
  expect(
    (await getState()).project,
    "Toggle keeps all effect settings",
  ).toEqual(initial.project);
  const ellipse = fixture.surfaces[2];
  const box = {
    x1: Math.min(...ellipse.points.map((p) => p.x)),
    x2: Math.max(...ellipse.points.map((p) => p.x)),
    y1: Math.min(...ellipse.points.map((p) => p.y)),
    y2: Math.max(...ellipse.points.map((p) => p.y)),
  };
  let bright = 0;
  for (
    let y = Math.ceil(box.y1 * placement.height);
    y < box.y2 * placement.height;
    y++
  ) {
    for (
      let x = Math.ceil(box.x1 * placement.width);
      x < box.x2 * placement.width;
      x++
    ) {
      if (placement.data[(y * placement.width + x) * 4] > 140) bright++;
    }
  }
  expect(
    bright,
    "Zero-opacity feathered surfaces still have a clear mesh",
  ).toBeGreaterThan(300);
  await output.bringToFront();
  await output.mouse.move(320, 240);
  await output.keyboard.press("f");
  await expect
    .poll(() =>
      app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes("output"))
          ?.isFullScreen(),
      ),
    )
    .toBe(true);
  await cursor("crosshair");
  await output.keyboard.press("f");
  await expect
    .poll(() =>
      app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes("output"))
          ?.isFullScreen(),
      ),
    )
    .toBe(false);
  await output.keyboard.press("m");
  await mesh(false);
  await cursor("none");
  await expect(
    page.getByRole("button", { name: "Placement mesh", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(
    (await frame()).data.equals(animation.data),
    "Paused animation returns exactly, including Edge runner mapping",
  ).toBe(true);
  expect((await getState()).playback).toEqual(initial.playback);
  console.log(
    "PASS: mesh replaces six shapes, shows transparent/feathered geometry, and output M restores the exact paused animation and settings.",
  );

  await page.bringToFront();
  const name = page.getByLabel("Project name", { exact: true });
  await name.fill("Mesh test");
  await name.press("m");
  await mesh(false);
  await name.press("Tab");
  await page.keyboard.down("m");
  await mesh(true);
  await page.keyboard.down("m");
  await mesh(true);
  await page.keyboard.up("m");
  await page
    .getByRole("button", { name: "Select Curved frame", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit individual corners", exact: true })
    .click();
  const curvePath = output.locator(
    ".placement-wireframe .selected > path:not(.wire-shadow)",
  );
  await expect
    .poll(async () => (await getState()).alignment.selectedId)
    .toBe("edge-5");
  const beforePath = await curvePath.getAttribute("d"),
    beforeCurve = await frame();
  const handleY = page.getByLabel("Handle 1 Y", { exact: true });
  await handleY.fill(String(Number(await handleY.inputValue()) - 30));
  await handleY.press("Enter");
  await expect(curvePath).not.toHaveAttribute("d", beforePath);
  expect(
    (await frame()).data.equals(beforeCurve.data),
    "Mesh follows Bezier edits while paused",
  ).toBe(false);
  await page
    .getByRole("button", { name: "Solo Curved frame", exact: true })
    .click();
  await expect(output.locator(".placement-wireframe > g")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Stop solo Curved frame", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Hide Triangle", exact: true })
    .click();
  await expect(output.locator(".placement-wireframe > g")).toHaveCount(5);
  await page
    .getByRole("button", { name: "Show Triangle", exact: true })
    .click();
  await page.screenshot({
    path: path.join(artifacts, "luma-placement-mesh.png"),
  });
  await output.screenshot({
    path: path.join(artifacts, "luma-placement-mesh-output.png"),
  });

  await page.getByRole("button", { name: "Blackout B", exact: true }).click();
  await cursor("none");
  await expect(output.locator(".output-wireframe")).toHaveCount(0);
  expect(allBlack((await frame()).data)).toBe(true);
  await output.bringToFront();
  await output.keyboard.press("m");
  await mesh(false);
  expect(
    allBlack((await frame()).data),
    "Changing modes cannot cancel blackout",
  ).toBe(true);
  await output.keyboard.press("m");
  await mesh(true);
  await page.getByRole("button", { name: "Blackout B", exact: true }).click();
  await cursor("crosshair");
  await expect(output.locator(".placement-wireframe > g")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Manage output", exact: true })
    .click();
  await page.getByRole("button", { name: /^Calibration grid/ }).click();
  await expect
    .poll(async () => {
      const s = await getState();
      return [s.testPattern, s.placementMesh];
    })
    .toEqual([true, false]);
  await expect(output.locator(".output-wireframe")).toHaveCount(0);
  await cursor("none");
  await page
    .getByRole("button", { name: "Project placement mesh", exact: true })
    .click();
  await expect
    .poll(async () => {
      const s = await getState();
      return [s.testPattern, s.placementMesh];
    })
    .toEqual([false, true]);
  await page.keyboard.press("m");
  await mesh(false);
  await page
    .getByLabel("Projection wireframe", { exact: true })
    .selectOption("always");
  await cursor("crosshair");
  await expect(output.locator(".output-wireframe")).toHaveCount(1);
  await page
    .getByLabel("Projection wireframe", { exact: true })
    .selectOption("editing");
  await cursor("none");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  const corner = page.getByRole("button", { name: "Corner 1", exact: true });
  await corner.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await cursor("crosshair");
  await expect(output.locator(".output-wireframe")).toHaveCount(1);
  await cursor("none");
  await page
    .getByRole("button", { name: "Manage output", exact: true })
    .click();
  await page
    .getByLabel("Projection wireframe", { exact: true })
    .selectOption("off");
  await page.keyboard.press("m");
  await mesh(true);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  const savePath = path.join(artifacts, "placement-saved.luma");
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, savePath);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Project saved");
  const saved = JSON.parse(await readFile(savePath, "utf8"));
  expect(saved.surfaces.map((s) => s.effectId)).toEqual(
    fixture.surfaces.map((s) => s.effectId),
  );
  expect(saved.placementMesh).toBeUndefined();
  console.log(
    "PASS: keyboard guards, live Bezier edits, solo/hide, blackout, calibration and native save all preserve placement behaviour.",
  );

  await open(path.resolve("examples/Liquid-cascade.luma"));
  await expect(output.locator(".placement-wireframe > g")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  const playing = (await getState()).playback;
  const still = await frame();
  await page.waitForTimeout(400);
  expect(
    (await frame()).data.equals(still.data),
    "Liquid stacks and connecting streams are replaced by a static mesh",
  ).toBe(true);
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  await mesh(false);
  expect(
    (await getState()).playback,
    "Switching views never resets the shared clock",
  ).toEqual(playing);
  const moving = await frame();
  await page.waitForTimeout(400);
  expect((await frame()).data.equals(moving.data)).toBe(false);
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => !w.getTitle().includes("Projector output"))
      .setContentSize(1120, 760),
  );
  const controls = await page.locator(".canvas-view-controls").boundingBox(),
    heading = await page.locator(".canvas-heading h1").boundingBox(),
    panel = await page.locator(".canvas-heading").boundingBox();
  expect(controls.x).toBeGreaterThanOrEqual(heading.x + heading.width);
  expect(controls.x + controls.width).toBeLessThanOrEqual(
    panel.x + panel.width,
  );
  await page.screenshot({
    path: path.join(artifacts, "luma-placement-compact.png"),
  });
  expect(errors).toEqual([]);
  await writeFile(
    path.join(
      artifacts,
      `placement-workflow${packaged ? "-packaged" : ""}.json`,
    ),
    JSON.stringify(
      {
        passed: true,
        packaged,
        cursorModes: [
          "placement mesh",
          "fullscreen mesh",
          "always-on guides",
          "during edits",
          "animation",
          "blackout",
          "calibration",
        ],
        errors,
        checkedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS: ${packaged ? "packaged" : "desktop"} stacked playback restores in phase, mesh remains static, and placement controls fit the minimum window.`,
  );
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({
        path: path.join(artifacts, "placement-failure.png"),
        timeout: 5000,
      })
      .catch(() => {});
  throw error;
} finally {
  await app.close();
}
