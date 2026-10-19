import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "peeks-blocks-profile-"));
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
const errors = [];
app.on("window", (p) => p.on("pageerror", (e) => errors.push(e.message)));
let page;
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await page.getByRole("button", { name: "New scene", exact: true }).click();
  await page.locator(".template-card.blank").click();
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
  const output = await outputPromise;
  await expect(output.locator(".projection-canvas")).toBeVisible();
  const state = () => output.evaluate(() => window.luma.getOutputState());
  const surface = async () => (await state()).project.surfaces[0];
  const pixels = async () =>
    PNG.sync.read(await output.locator(".projection-canvas").screenshot()).data;
  const changed = (a, b) =>
    a.reduce((sum, v, i) => sum + (Math.abs(v - b[i]) > 10 ? 1 : 0), 0) /
    a.length;
  const open = async (file, name) => {
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [filePath],
      });
    }, path.resolve(file));
    await page
      .getByRole("button", { name: "Open project", exact: true })
      .click();
    await expect.poll(async () => (await state()).project.name).toBe(name);
  };
  await page.getByRole("button", { name: "Creatures", exact: true }).click();
  await expect(page.locator(".effect-card")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Apply Skeleton peek", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restart animation", exact: true })
    .click();
  await page.waitForTimeout(5200);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  const samples = [];
  for (const [name, id] of [
    ["Skeleton peek", "corner-skeleton"],
    ["Witch peek", "corner-witch"],
  ]) {
    await page
      .getByRole("button", { name: `Apply ${name}`, exact: true })
      .click();
    await expect.poll(async () => (await surface()).effectId).toBe(id);
    await page.getByLabel("Peek from").selectOption("left");
    const left = await pixels();
    await page.getByLabel("Peek from").selectOption("right");
    await expect.poll(async () => (await surface()).effectSide).toBe("right");
    const right = await pixels();
    expect(changed(left, right)).toBeGreaterThan(0.01);
    await page.waitForTimeout(150);
    expect((await pixels()).equals(right)).toBe(true);
    samples.push(right);
  }
  console.log(
    "PASS: both Halloween peeks render in native output, mirror from either side and hold an exact paused frame.",
  );
  await page
    .getByRole("button", { name: "Colour blocks", exact: true })
    .click();
  await expect(page.locator(".effect-card")).toHaveCount(5);
  for (const [name, id] of [
    ["Spectrum blocks", "block-spectrum"],
    ["Colour mosaic", "block-mosaic"],
    ["Ripple blocks", "block-ripples"],
    ["Flip tiles", "block-flip"],
    ["Rising tiles", "block-rise"],
  ]) {
    await page
      .getByRole("button", { name: `Apply ${name}`, exact: true })
      .click();
    await expect.poll(async () => (await surface()).effectId).toBe(id);
    await expect(page.getByLabel("Peek from")).toHaveCount(0);
    await expect(
      page.getByRole("slider", { name: "Block size", exact: true }),
    ).toBeVisible();
    const before = await pixels();
    for (const other of samples)
      expect(changed(before, other)).toBeGreaterThan(0.01);
    samples.push(before);
    await page
      .getByRole("slider", { name: "Speed", exact: true })
      .press("ArrowRight");
    await expect.poll(async () => (await surface()).speed).toBeGreaterThan(1);
    expect(changed(before, await pixels())).toBeGreaterThan(0.002);
    await page
      .getByRole("slider", { name: "Block size", exact: true })
      .press("ArrowRight");
  }
  console.log(
    "PASS: all five colour-block patterns produce distinct output and respond to speed and block size.",
  );
  await open("examples/Halloween-peeks.luma", "Halloween peeks");
  await expect
    .poll(async () => (await state()).project.surfaces.length)
    .toBe(2);
  await output
    .locator(".projection-canvas")
    .screenshot({ path: path.join(artifacts, "halloween-peeks-output.png") });
  await page
    .getByRole("button", { name: "Select Witch peek", exact: true })
    .click();
  await page.getByRole("tab", { name: "Effect", exact: true }).click();
  await expect(page.getByLabel("Peek from")).toHaveValue("right");
  const savePath = path.join(artifacts, "halloween-peeks-saved.luma");
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, savePath);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Project saved");
  const saved = JSON.parse(await readFile(savePath, "utf8"));
  expect(saved.surfaces.map((s) => s.effectId)).toEqual([
    "corner-skeleton",
    "corner-witch",
  ]);
  expect(saved.surfaces[1].effectSide).toBe("right");
  await open("examples/Colour-blocks.luma", "Colour block studies");
  await expect
    .poll(async () => (await state()).project.surfaces.length)
    .toBe(5);
  await page.getByRole("tab", { name: "Effect", exact: true }).click();
  await page
    .getByRole("button", { name: "Colour blocks", exact: true })
    .click();
  const win = await app.browserWindow(page);
  await win.evaluate((w) => w.setSize(1120, 760));
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(artifacts, "colour-blocks-editor.png"),
  });
  await output
    .locator(".projection-canvas")
    .screenshot({ path: path.join(artifacts, "colour-blocks-output.png") });
  await page
    .getByRole("slider", { name: "Block size", exact: true })
    .press("End");
  await expect.poll(async () => (await surface()).scale).toBe(3);
  await page.getByRole("button", { name: "Creatures", exact: true }).click();
  await page
    .getByRole("button", { name: "Apply Skeleton peek", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Creature size", exact: true }),
  ).toHaveValue("1.55");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(async () => (await surface()).effectId)
    .toBe("block-spectrum");
  await expect(
    page.getByRole("slider", { name: "Block size", exact: true }),
  ).toHaveValue("3");
  expect(errors).toEqual([]);
  console.log(
    "PASS: both example scenes, saved peek direction, compact layout and sensible size controls when switching effects.",
  );
} catch (error) {
  if (page)
    await page
      .screenshot({ path: path.join(artifacts, "peeks-blocks-failure.png") })
      .catch(() => {});
  throw error;
} finally {
  await app.close();
}
