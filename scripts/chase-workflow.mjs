import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "chase-profile-"));
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
  await expect(page.locator(".effect-card")).toHaveCount(191);
  await page.getByRole("button", { name: "Chase scenes", exact: true }).click();
  await expect(page.locator(".effect-card")).toHaveCount(5);
  await page.mouse.move(10, 10);
  const thumbnails = await page
    .locator(".effect-card canvas")
    .evaluateAll((canvases) =>
      canvases.map((canvas) => {
        const { width, height } = canvas,
          pixels = canvas
            .getContext("2d")
            .getImageData(0, 0, width, height).data;
        const lit = [0, 0];
        for (let y = 0; y < height; y++)
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 80) {
              if (x < width / 3) lit[0]++;
              if (x > width * 0.6) lit[1]++;
            }
          }
        return lit;
      }),
    );
  expect(
    thumbnails,
    "each still thumbnail shows characters on both sides",
  ).toHaveLength(5);
  for (const [chaser, leader] of thumbnails) {
    expect(chaser).toBeGreaterThan(200);
    expect(leader).toBeGreaterThan(200);
  }
  await page.getByLabel("Search effects", { exact: true }).fill("cat mouse");
  await expect(page.locator(".effect-card")).toHaveCount(1);
  await page
    .getByLabel("Search effects", { exact: true })
    .fill("two characters");
  await expect(page.locator(".effect-card")).toHaveCount(5);
  await page.getByLabel("Search effects", { exact: true }).fill("");
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
  await page.waitForTimeout(2350);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  const names = await page
    .locator(".effect-apply")
    .evaluateAll((buttons) =>
      buttons.map((b) => b.getAttribute("aria-label").replace("Apply ", "")),
    );
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
      `${name} is visible`,
    ).toBe(true);
    for (const previous of samples)
      expect(image.equals(previous), `${name} is visually distinct`).toBe(
        false,
      );
    await page
      .getByLabel("Chase direction", { exact: true })
      .selectOption("right");
    expect((await pixels()).equals(image), name + " reverses in output").toBe(
      false,
    );
    await expect
      .poll(async () => (await state()).project.surfaces[0].effectSide)
      .toBe("right");
    await page
      .getByLabel("Chase direction", { exact: true })
      .selectOption("left");
    expect(
      (await pixels()).equals(image),
      name + " restores the same paused pose",
    ).toBe(true);
    samples.push(image);
    await page.waitForTimeout(90);
    expect(
      (await pixels()).equals(image),
      `${name} holds the paused frame`,
    ).toBe(true);
  }
  await page
    .getByRole("slider", { name: "Character size", exact: true })
    .focus();
  await page.keyboard.press("Home");
  await expect
    .poll(async () => (await state()).project.surfaces[0].scale)
    .toBe(0.45);
  expect(
    (await pixels()).equals(samples.at(-1)),
    "size changes characters",
  ).toBe(false);
  await page.keyboard.press("End");
  await expect
    .poll(async () => (await state()).project.surfaces[0].scale)
    .toBe(1.55);
  await page
    .getByLabel("Chase direction", { exact: true })
    .selectOption("right");
  await page.getByLabel("Accent colour", { exact: true }).fill("#ef8a5d");
  const tinted = await pixels();
  expect(tinted.equals(samples.at(-1))).toBe(false);
  const previousSeed = (await state()).project.surfaces[0].seed;
  await page
    .getByRole("button", { name: "Shuffle variation", exact: true })
    .click();
  await expect
    .poll(async () => (await state()).project.surfaces[0].seed)
    .not.toBe(previousSeed);
  expect((await pixels()).equals(tinted)).toBe(false);
  await page
    .getByRole("button", { name: "Enable colour overlay", exact: true })
    .click();
  await page.getByLabel("Overlay style", { exact: true }).selectOption("bands");
  await page
    .getByLabel("Overlay palette", { exact: true })
    .selectOption("neon");
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  const moving = await pixels();
  await page.waitForTimeout(700);
  expect((await pixels()).equals(moving)).toBe(false);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  const paused = await pixels();
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  expect((await pixels()).equals(paused)).toBe(false);
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  expect((await pixels()).equals(paused)).toBe(true);
  console.log(
    "PASS: five distinct chase scenes; search, both directions, character size, pause, colour, variation, overlay, motion and placement mesh.",
  );
  const saved = path.join(artifacts, "chase-saved.luma"),
    before = (await state()).project;
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, saved);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Project saved");
  expect(JSON.parse(await readFile(saved, "utf8"))).toEqual(before);
  const open = async (file) => {
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [filePath],
      });
    }, file);
    await page
      .getByRole("button", { name: "Open project", exact: true })
      .click();
  };
  for (const file of ["Chase-parade.luma"]) {
    const full = path.resolve("examples", file),
      scene = JSON.parse(await readFile(full, "utf8"));
    await open(full);
    await expect.poll(async () => (await state()).project).toEqual(scene);
    await output.locator(".projection-canvas").screenshot({
      path: path.join(artifacts, file.replace(".luma", "-output.png")),
    });
  }
  await open(saved);
  await page.reload();
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await expect.poll(async () => (await state()).project).toEqual(before);
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => !w.webContents.getURL().includes("output"))
      .setSize(1120, 760),
  );
  await page.getByLabel("Search effects", { exact: true }).fill("");
  await page.getByRole("button", { name: "Chase scenes", exact: true }).click();
  await page
    .getByRole("region", { name: "Effect results", exact: true })
    .focus();
  await page.keyboard.press("End");
  await expect
    .poll(() => page.locator(".effect-cards").evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await page.screenshot({ path: path.join(artifacts, "chase-library.png") });
  expect(errors).toEqual([]);
  await writeFile(
    path.join(artifacts, `chase-workflow${packaged ? "-packaged" : ""}.json`),
    JSON.stringify(
      {
        effects: names,
        packaged,
        passed: true,
        errors,
        checkedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: native save/open, recovery, synchronized five-lane example and vertical browsing at the minimum window size.",
  );
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({ path: path.join(artifacts, "chase-failure.png") })
      .catch(() => {});
  throw error;
} finally {
  await app.close();
}
