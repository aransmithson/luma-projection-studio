import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

await mkdir("test-results", { recursive: true });
const artifacts = await mkdtemp(path.resolve("test-results/stick-workflow-"));
const packaged = process.argv.includes("--packaged");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
const app = await electron.launch({
  ...(packaged
    ? {
        executablePath: path.resolve(
          process.env.LUMA_RELEASE_DIR || "release/1.20.0",
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
const check = (text) => {
  checks.push(text);
  console.log(`PASS: ${text}`);
};
app.on("window", (page) => page.on("pageerror", (e) => errors.push(e.message)));
let page;
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  const click = (name) =>
    page.getByRole("button", { name, exact: true }).click();
  const example = JSON.parse(
    await readFile("examples/Boxed-stick-figures.luma", "utf8"),
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
  await open("examples/Boxed-stick-figures.luma");
  await click("Pause animation");
  await click("Restart animation");
  await click("Stick figures");
  await expect(page.locator(".effect-card")).toHaveCount(6);
  await page.getByLabel("Search effects", { exact: true }).fill("stick men");
  await expect(page.locator(".effect-card")).toHaveCount(6);
  await click("Select Glass-box mime");
  await click("Apply Wall pusher");
  await expect(
    page.locator(".assigned-effect, .effect-description"),
  ).toContainText("Wall pusher");
  await click("Undo");
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
    .poll(async () => (await state()).project.surfaces.map((s) => s.effectId))
    .toEqual(example.surfaces.map((s) => s.effectId));
  const snapshot = async () =>
    PNG.sync.read(
      await output
        .locator(".projection-canvas")
        .screenshot({
          style:
            ".output-wireframe, .projection-pointer { visibility: hidden !important }",
        }),
    );
  const first = await snapshot();
  expect((await snapshot()).data).toEqual(first.data);
  await click("Play animation");
  await expect
    .poll(async () => (await snapshot()).data.equals(first.data))
    .toBe(false);
  await click("Pause animation");
  const paused = await snapshot();
  expect((await snapshot()).data).toEqual(paused.data);
  await click("Restart animation");
  await expect
    .poll(async () => (await snapshot()).data.equals(first.data))
    .toBe(true);
  check(
    "Six-box example, category/search, effect assignment, Undo, shared Play/Pause/Restart and projector playback",
  );

  await page.getByRole("tab", { name: "Effect", exact: true }).click();
  const untouched = (await state()).project.surfaces.slice(1);
  await page
    .getByRole("slider", { name: "Figure size", exact: true })
    .fill("1.3");
  await expect
    .poll(async () => (await state()).project.surfaces[0].scale)
    .toBe(1.3);
  const sized = await snapshot();
  await page
    .getByRole("slider", { name: "Figure size", exact: true })
    .fill("1.55");
  await expect
    .poll(async () => (await state()).project.surfaces[0].scale)
    .toBe(1.55);
  const larger = await snapshot();
  expect(larger.data.equals(sized.data)).toBe(false);
  const wall = (image) => {
    const rows = [];
    for (let y = Math.ceil(image.height * 0.15); y < image.height * 0.32; y++)
      rows.push(
        image.data.subarray(
          (y * image.width + Math.ceil(image.width * 0.049)) * 4,
          (y * image.width + Math.floor(image.width * 0.058)) * 4,
        ),
      );
    return Buffer.concat(rows);
  };
  expect(wall(larger)).toEqual(wall(sized));
  expect((await state()).project.surfaces.slice(1)).toEqual(untouched);
  await page.getByLabel("Accent colour", { exact: true }).fill("#ffbf70");
  await expect
    .poll(async () => (await snapshot()).data.equals(larger.data))
    .toBe(false);
  const coloured = await snapshot();
  await click("Shuffle variation");
  await expect
    .poll(async () => (await snapshot()).data.equals(coloured.data))
    .toBe(false);
  const shuffled = await snapshot();
  await click("Placement mesh");
  await expect
    .poll(async () => (await snapshot()).data.equals(shuffled.data))
    .toBe(false);
  await click("Placement mesh");
  await expect
    .poll(async () => (await snapshot()).data.equals(shuffled.data))
    .toBe(true);
  await page
    .getByRole("slider", { name: "Figure size", exact: true })
    .fill("1");
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => !w.webContents.getURL().includes("output"))
      .setSize(1120, 760),
  );
  await page.screenshot({
    path: path.join(artifacts, "stick-editor-1120.png"),
  });
  await output
    .locator(".projection-canvas")
    .screenshot({ path: path.join(artifacts, "stick-projector.png") });
  check(
    "Figure sizing grows through 155% with fixed box edges; colour, Shuffle and mesh affect the correct shape",
  );

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
    "Native save/reopen retains all six effects and controls without renderer errors",
  );
  await writeFile(
    path.join(artifacts, "report.json"),
    JSON.stringify({ packaged, checks, errors }, null, 2),
  );
  console.log(`Stick figures verified: ${artifacts}`);
} catch (error) {
  await page
    ?.screenshot({ path: path.join(artifacts, "failure.png") })
    .catch(() => {});
  throw error;
} finally {
  await app.close();
}
