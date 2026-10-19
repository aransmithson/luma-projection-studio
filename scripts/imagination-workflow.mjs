import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

await mkdir("test-results", { recursive: true });
const artifacts = await mkdtemp(
  path.resolve("test-results/imagination-workflow-"),
);
const packaged = process.argv.includes("--packaged"),
  env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
const app = await electron.launch({
  ...(packaged
    ? {
        executablePath: path.resolve(
          process.env.LUMA_RELEASE_DIR || "release/1.21.0",
          "win-unpacked/Nox Projection Studio.exe",
        ),
      }
    : {}),
  args: [
    ...(packaged ? [] : [path.resolve(".")]),
    `--user-data-dir=${path.join(artifacts, "profile")}`,
  ],
  env,
  timeout: 60000,
});
const errors = [],
  checks = [];
const check = (message) => {
  checks.push(message);
  console.log(`PASS: ${message}`);
};
app.on("window", (page) => page.on("pageerror", (e) => errors.push(e.message)));
let page;
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  const click = (name) =>
    page.getByRole("button", { name, exact: true }).click();
  const example = JSON.parse(
    await readFile("examples/Imagination-collection.luma", "utf8"),
  );
  const open = async (file) => {
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [filePath],
      });
    }, path.resolve(file));
    await click("Open project");
  };
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await open("examples/Imagination-collection.luma");
  await click("Pause animation");
  await click("Restart animation");
  await click("Imagination");
  await expect(page.locator(".effect-card")).toHaveCount(7);
  await click("All effects");
  await page.getByLabel("Search effects", { exact: true }).fill("creative");
  await expect(page.locator(".effect-card")).toHaveCount(10);
  await click("Select Living comic book");
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
  const snapshot = async () =>
    PNG.sync.read(await output.locator(".projection-canvas").screenshot()).data;
  await expect
    .poll(async () => (await state()).project.surfaces.map((s) => s.effectId))
    .toEqual(example.surfaces.map((s) => s.effectId));
  const untouched = (await state()).project.surfaces.slice(1);
  for (const effect of example.surfaces.slice(1)) {
    await click(`Apply ${effect.name}`);
    await expect
      .poll(async () => (await state()).project.surfaces[0].effectId)
      .toBe(effect.effectId);
    expect((await state()).project.surfaces).toHaveLength(10);
    expect((await state()).project.surfaces.slice(1)).toEqual(untouched);
    await click("Undo");
    await expect
      .poll(async () => (await state()).project.surfaces[0].effectId)
      .toBe("living-comic");
  }
  check(
    "All ten cards apply to the selected shape without adding objects; category, search and Undo preserve the other nine shapes",
  );
  const initial = await snapshot();
  expect(await snapshot()).toEqual(initial);
  await click("Play animation");
  await expect.poll(async () => initial.equals(await snapshot())).toBe(false);
  await click("Pause animation");
  const paused = await snapshot();
  expect(await snapshot()).toEqual(paused);
  await click("Restart animation");
  await expect.poll(async () => initial.equals(await snapshot())).toBe(true);
  await page.getByRole("tab", { name: "Effect", exact: true }).click();
  await page
    .getByRole("slider", { name: "Pattern scale", exact: true })
    .fill("1.5");
  await expect
    .poll(async () => (await state()).project.surfaces[0].scale)
    .toBe(1.5);
  await expect.poll(async () => initial.equals(await snapshot())).toBe(false);
  const sized = await snapshot();
  await page.getByLabel("Accent colour", { exact: true }).fill("#8cf3cd");
  await expect.poll(async () => sized.equals(await snapshot())).toBe(false);
  const coloured = await snapshot();
  await click("Shuffle variation");
  await expect.poll(async () => coloured.equals(await snapshot())).toBe(false);
  const shuffled = await snapshot();
  await click("Placement mesh");
  await expect.poll(async () => shuffled.equals(await snapshot())).toBe(false);
  await click("Placement mesh");
  await expect.poll(async () => shuffled.equals(await snapshot())).toBe(true);
  check(
    "Shared Play/Pause/Restart, scale, colour, Shuffle and placement mesh update paused projector output correctly",
  );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => !w.webContents.getURL().includes("output"))
      .setSize(1120, 760),
  );
  await page.screenshot({
    path: path.join(artifacts, "imagination-editor-1120.png"),
  });
  await output
    .locator(".projection-canvas")
    .screenshot({ path: path.join(artifacts, "imagination-projector.png") });
  const savePath = path.join(artifacts, "saved.luma");
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, savePath);
  await click("Save project");
  const before = (await state()).project;
  await expect
    .poll(async () => JSON.parse(await readFile(savePath, "utf8")))
    .toEqual(before);
  await open(savePath);
  await expect.poll(async () => (await state()).project).toEqual(before);
  expect(errors).toEqual([]);
  check(
    "Native save and reopen retain all ten effects and their settings without renderer errors",
  );
  await writeFile(
    path.join(artifacts, "report.json"),
    JSON.stringify({ packaged, checks, errors }, null, 2),
  );
  console.log(`Imagination workflow passed: ${artifacts}`);
} catch (error) {
  await page
    ?.screenshot({ path: path.join(artifacts, "failure.png") })
    .catch(() => {});
  throw error;
} finally {
  await app.close();
}
