import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "depth-profile-"));
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
  page.setDefaultTimeout(20000);
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await page.getByRole("button", { name: "New scene", exact: true }).click();
  await page.locator(".template-card.blank").click();
  await expect(page.locator(".effect-card")).toHaveCount(176);
  await page.getByRole("button", { name: "3D illusions", exact: true }).click();
  await expect(page.locator(".effect-card")).toHaveCount(12);
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
  const state = () => output.evaluate(() => window.luma.getOutputState()),
    surface = async () => (await state()).project.surfaces[0];
  const pixels = async () =>
    PNG.sync.read(await output.locator(".projection-canvas").screenshot()).data;
  await page
    .getByRole("button", { name: "Restart animation", exact: true })
    .click();
  await page.waitForTimeout(2300);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  const names = [
    "Flying brick builders",
    "Tumbling brick wall",
    "Clockwork iris",
    "Crystal geode",
    "Origami facade",
    "Chrome piston ocean",
    "Celestial gyroscope",
    "Infinite arcade",
    "Floating citadel",
    "Ribbon vortex",
    "Tectonic rift",
    "Gravity staircase",
  ];
  const samples = [];
  for (const name of names) {
    await page.getByLabel("Search effects", { exact: true }).fill(name);
    await page
      .getByRole("button", { name: `Apply ${name}`, exact: true })
      .click();
    await expect(page.locator(".effect-description h3")).toContainText(name);
    const image = await pixels();
    expect(
      image.some((v, i) => i % 4 !== 3 && v > 50),
      `${name} is lit`,
    ).toBe(true);
    for (const previous of samples)
      expect(image.equals(previous), `${name} distinct`).toBe(false);
    samples.push(image);
    await page.waitForTimeout(100);
    expect((await pixels()).equals(image), `${name} paused`).toBe(true);
  }
  console.log(
    "PASS: twelve distinct 3D scenes searchable, applied and frozen in native projection output.",
  );
  await page
    .getByRole("button", { name: "Enable colour overlay", exact: true })
    .click();
  await expect
    .poll(async () => (await surface()).colorOverlay?.enabled)
    .toBe(true);
  const styles = [
    "wash",
    "bands",
    "ripples",
    "sweep",
    "aurora",
    "checker",
    "facets",
    "spotlight",
  ];
  for (const style of styles) {
    await page.getByLabel("Overlay style", { exact: true }).selectOption(style);
    await expect
      .poll(async () => (await surface()).colorOverlay.style)
      .toBe(style);
  }
  await page
    .getByLabel("Overlay palette", { exact: true })
    .selectOption("neon");
  await page.getByLabel("Overlay mix", { exact: true }).selectOption("overlay");
  await page.getByLabel("Reverse colour motion", { exact: true }).check();
  const stylesSaved = (await surface()).colorOverlay;
  await page
    .getByLabel("Overlay style", { exact: true })
    .selectOption("facets");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(async () => (await surface()).colorOverlay)
    .toEqual(stylesSaved);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect
    .poll(async () => (await surface()).colorOverlay.style)
    .toBe("facets");
  await expect(
    page.getByLabel("Blend mode", { exact: true }).locator("option"),
  ).toHaveCount(10);
  for (const mode of [
    "add",
    "screen",
    "multiply",
    "overlay",
    "soft-light",
    "darken",
    "lighten",
    "difference",
    "exclusion",
    "normal",
  ]) {
    await page.getByLabel("Blend mode", { exact: true }).selectOption(mode);
    await expect.poll(async () => (await surface()).blend).toBe(mode);
  }
  // Switch to a still material: the independent overlay continues to animate.
  await page.getByLabel("Search effects", { exact: true }).fill("");
  await page.getByRole("button", { name: "All effects", exact: true }).click();
  await page
    .getByLabel("Search effects", { exact: true })
    .fill("Brushed aluminium");
  await page
    .getByRole("button", { name: "Apply Brushed aluminium", exact: true })
    .click();
  expect((await surface()).colorOverlay.style).toBe("facets");
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  const moving = await pixels();
  await page.waitForTimeout(800);
  expect((await pixels()).equals(moving)).toBe(false);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  const paused = await pixels();
  await page.waitForTimeout(150);
  expect((await pixels()).equals(paused)).toBe(true);
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  const mesh = await pixels();
  await page
    .getByRole("button", { name: "Enable colour overlay", exact: true })
    .click();
  expect((await pixels()).equals(mesh)).toBe(true);
  await page
    .getByRole("button", { name: "Enable colour overlay", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  expect((await pixels()).equals(paused)).toBe(true);
  console.log(
    "PASS: ten blend controls, eight overlay styles, palette/mix/reverse, Undo/Redo, independent motion on still textures, pause and mesh bypass.",
  );
  await app.evaluate(({ BrowserWindow }) => {
    const editor = BrowserWindow.getAllWindows().find(
      (w) => !w.webContents.getURL().includes("output"),
    );
    editor.setSize(1120, 760);
  });
  await page
    .getByLabel("Overlay style", { exact: true })
    .scrollIntoViewIfNeeded();
  const overflow = await page
    .locator(".colour-overlay-controls")
    .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  expect(overflow).toBe(false);
  await page.screenshot({
    path: path.join(artifacts, "depth-overlay-controls.png"),
  });
  const saved = path.join(artifacts, "depth-overlays-saved.luma"),
    before = (await state()).project;
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, saved);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Project saved");
  expect(JSON.parse(await readFile(saved, "utf8"))).toEqual(before);
  const open = async (file) => {
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, file);
    await page
      .getByRole("button", { name: "Open project", exact: true })
      .click();
  };
  for (const file of [
    "Masonry-magic.luma",
    "Kinetic-depth.luma",
    "Colour-overlay-lab.luma",
  ]) {
    const scene = JSON.parse(
      await readFile(path.resolve("examples", file), "utf8"),
    );
    await open(path.resolve("examples", file));
    await expect.poll(async () => (await state()).project).toEqual(scene);
    await output
      .locator(".projection-canvas")
      .screenshot({
        path: path.join(artifacts, file.replace(".luma", "-output.png")),
      });
  }
  await open(saved);
  await expect.poll(async () => (await state()).project).toEqual(before);
  await page.reload();
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await expect.poll(async () => (await state()).project).toEqual(before);
  expect(errors).toEqual([]);
  console.log(
    "PASS: minimum-size controls, native save/open, recovery and three example projects.",
  );
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({ path: path.join(artifacts, "depth-failure.png") })
      .catch(() => {});
  throw error;
} finally {
  await app.close();
}
