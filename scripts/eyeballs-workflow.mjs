import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "eyeballs-profile-"));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
const packaged = process.argv.includes("--packaged");
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
let page;
const errors = [];
app.on("window", (p) => p.on("pageerror", (e) => errors.push(e.message)));
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(20000);
  await expect(page.locator(".stage-overlay")).toBeVisible();
  const example = path.resolve("examples/Eyeball-swarm.luma");
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [file],
    });
  }, example);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await expect(page.locator(".effect-card")).toHaveCount(166);
  await page.getByRole("button", { name: "Halloween", exact: true }).click();
  await expect(page.locator(".effect-card")).toHaveCount(12);
  await page.getByLabel("Search effects", { exact: true }).fill("eye balls");
  await expect(page.locator(".effect-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Apply Eyeball swarm", exact: true })
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
  const opened = app.waitForEvent("window");
  await page
    .getByRole("button", { name: "Open output preview", exact: true })
    .click();
  const output = await opened;
  await expect(output.locator(".projection-canvas")).toBeVisible();
  const state = () => output.evaluate(() => window.luma.getOutputState());
  const pixels = async () =>
    PNG.sync.read(await output.locator(".projection-canvas").screenshot()).data;
  await page
    .getByRole("button", { name: "Restart animation", exact: true })
    .click();
  const first = await pixels();
  await page.waitForTimeout(1000);
  expect((await pixels()).equals(first)).toBe(false);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  const paused = await pixels();
  await page.waitForTimeout(150);
  expect((await pixels()).equals(paused)).toBe(true);
  expect((await state()).project.surfaces[0].effectId).toBe("eyeball-swarm");
  await page.getByLabel("Accent colour", { exact: true }).fill("#b275ef");
  const purple = await pixels();
  expect(purple.equals(paused)).toBe(false);
  await page
    .getByRole("button", { name: "Shuffle variation", exact: true })
    .click();
  const shuffled = await pixels();
  expect(shuffled.equals(purple)).toBe(false);
  await page
    .getByRole("button", { name: "Enable colour overlay", exact: true })
    .click();
  await expect
    .poll(async () => (await state()).project.surfaces[0].colorOverlay.enabled)
    .toBe(true);
  const overlaid = await pixels();
  expect(overlaid.equals(shuffled)).toBe(false);
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  expect((await pixels()).equals(overlaid)).toBe(false);
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  expect((await pixels()).equals(overlaid)).toBe(true);
  await page
    .getByRole("button", { name: "Enable colour overlay", exact: true })
    .click();
  await output
    .locator(".projection-canvas")
    .screenshot({ path: path.join(artifacts, "eyeball-swarm-output.png") });
  await page.screenshot({
    path: path.join(artifacts, "eyeball-swarm-editor.png"),
  });
  const individualExample = path.resolve("examples/Individual-eyes.luma");
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [file],
    });
  }, individualExample);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await expect
    .poll(async () => (await state()).project.surfaces.map((s) => s.effectId))
    .toEqual(["single-eyeball", "single-eyeball"]);
  await page
    .getByRole("button", { name: "Select Left eye", exact: true })
    .click();
  await page
    .getByLabel("Search effects", { exact: true })
    .fill("individual eye");
  await expect(page.locator(".effect-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Apply Single eyeball", exact: true })
    .click();
  const untouchedRight = (await state()).project.surfaces[1];
  await page.getByLabel("Accent colour", { exact: true }).fill("#54c9f2");
  await page.getByRole("slider", { name: "Eye size", exact: true }).focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight");
  await page
    .getByRole("button", { name: "Shuffle variation", exact: true })
    .click();
  await expect
    .poll(async () => (await state()).project.surfaces[0].scale)
    .toBeCloseTo(0.85);
  await page.getByRole("slider", { name: "Speed", exact: true }).focus();
  await page.keyboard.press("Home");
  await expect
    .poll(async () => (await state()).project.surfaces[0].speed)
    .toBe(0);
  expect((await state()).project.surfaces[1]).toEqual(untouchedRight);
  if (
    await page
      .getByRole("button", { name: "Play animation", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Play animation", exact: true })
      .click();
  const region = async (x1, x2) => {
    const image = PNG.sync.read(
      await output.locator(".projection-canvas").screenshot(),
    );
    const rows = [];
    for (let y = Math.floor(image.height * 0.15); y < image.height * 0.85; y++)
      rows.push(
        image.data.subarray(
          (y * image.width + Math.floor(image.width * x1)) * 4,
          (y * image.width + Math.floor(image.width * x2)) * 4,
        ),
      );
    return Buffer.concat(rows);
  };
  const leftStill = await region(0.12, 0.49),
    rightMoving = await region(0.51, 0.88);
  await page.waitForTimeout(1100);
  expect(
    (await region(0.12, 0.49)).equals(leftStill),
    "left eye holds at speed zero",
  ).toBe(true);
  expect(
    (await region(0.51, 0.88)).equals(rightMoving),
    "right eye continues independently",
  ).toBe(false);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  const singlePaused = await pixels();
  await page.waitForTimeout(150);
  expect((await pixels()).equals(singlePaused)).toBe(true);
  await output
    .locator(".projection-canvas")
    .screenshot({ path: path.join(artifacts, "individual-eyes-output.png") });
  console.log(
    "PASS: single-eye search and two separately placed eyes; colour, eye size, variation and speed affect only the selected eye; one eye can hold while the other animates.",
  );
  const saved = path.join(artifacts, "eyeballs-saved.luma"),
    before = (await state()).project;
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, saved);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Project saved");
  expect(JSON.parse(await readFile(saved, "utf8"))).toEqual(before);
  await page.reload();
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await expect.poll(async () => (await state()).project).toEqual(before);
  expect(errors).toEqual([]);
  console.log(
    "PASS: swarm and individual-eye output, pause, iris colour, Shuffle, overlay, placement mesh, native save and recovery.",
  );
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({ path: path.join(artifacts, "eyeballs-failure.png") })
      .catch(() => {});
  throw error;
} finally {
  await app.close();
}
