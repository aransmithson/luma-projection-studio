import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "storybook-profile-"));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
const packaged = process.argv.includes("--packaged");
const app = await electron.launch({
  ...(packaged
    ? {
        executablePath: path.resolve(
          process.env.LUMA_RELEASE_DIR || "release",
          "win-unpacked/Luma Projection Studio.exe",
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
  if (
    await page
      .getByRole("button", { name: "Show effects library", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Show effects library", exact: true })
      .click();
  const cards = page.getByRole("region", {
    name: "Effect results",
    exact: true,
  });
  await expect(page.locator(".effect-card")).toHaveCount(154);
  const headingBefore = await page.locator(".library-heading").boundingBox();
  const geometryBefore = await page
    .locator(".selection-controls polygon")
    .getAttribute("points");
  await cards.hover();
  await page.mouse.wheel(0, 650);
  await expect
    .poll(() => cards.evaluate((e) => e.scrollTop))
    .toBeGreaterThan(100);
  expect(await cards.evaluate((e) => e.scrollLeft)).toBe(0);
  expect((await page.locator(".library-heading").boundingBox()).y).toBe(
    headingBefore.y,
  );
  await cards.focus();
  await cards.press("End");
  await expect
    .poll(() =>
      cards.evaluate((e) => e.scrollTop + e.clientHeight >= e.scrollHeight - 2),
    )
    .toBe(true);
  await cards.press("ArrowUp");
  expect(
    await page.locator(".selection-controls polygon").getAttribute("points"),
  ).toBe(geometryBefore);
  await page
    .getByRole("button", { name: "Shadow puppets", exact: true })
    .click();
  await expect(page.locator(".effect-card")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Shadow puppets", exact: true })
    .press("ArrowRight");
  expect(
    await page.locator(".selection-controls polygon").getAttribute("points"),
  ).toBe(geometryBefore);
  await expect.poll(() => cards.evaluate((e) => e.scrollTop)).toBe(0);
  await page
    .getByLabel("Search effects", { exact: true })
    .fill("winter shadow");
  await expect(page.locator(".effect-card")).toHaveCount(1);
  await expect(page.locator(".effect-card")).toContainText("Winter sleigh");
  await page
    .getByRole("button", { name: "Favourite Winter sleigh", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Clear effect search", exact: true })
    .click();
  await page.getByRole("button", { name: "Favourites", exact: true }).click();
  await expect(page.locator(".effect-card")).toHaveCount(1);
  await page.getByRole("button", { name: "All effects", exact: true }).click();
  await page.getByLabel("Sort effects", { exact: true }).selectOption("name");
  const names = await page
    .locator(".effect-card-info strong")
    .allTextContents();
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  await page
    .getByLabel("Sort effects", { exact: true })
    .selectOption("featured");
  console.log(
    "PASS: vertical wheel and keyboard scrolling, fixed browser header, multi-word search, collection reset, favourites and alphabetical sorting.",
  );

  const win = await app.browserWindow(page);
  await win.evaluate((w) => w.setSize(1120, 760));
  const checkLayout = async () => {
    const layout = await page.evaluate(() => {
      const cards = document.querySelector(".effect-cards"),
        library = document.querySelector(".effects-library");
      return {
        viewport: [innerWidth, innerHeight],
        body: [
          document.documentElement.scrollWidth,
          document.documentElement.scrollHeight,
        ],
        horizontalOverflow: cards.scrollWidth - cards.clientWidth,
        height: cards.clientHeight,
        libraryBottom: library.getBoundingClientRect().bottom,
        cardRects: [...document.querySelectorAll(".effect-card")].map(
          (card) => {
            const r = card.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, height: r.height };
          },
        ),
      };
    });
    expect(layout.body).toEqual(layout.viewport);
    expect(layout.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(layout.height).toBeGreaterThan(90);
    expect(layout.libraryBottom).toBeLessThanOrEqual(layout.viewport[1]);
    expect(layout.cardRects.every((r) => r.height > 130)).toBe(true);
    const first = layout.cardRects[0],
      nextRow = layout.cardRects.find((r) => r.top > first.top + 1);
    if (nextRow) expect(nextRow.top).toBeGreaterThan(first.bottom + 5);
  };
  await checkLayout();
  await page.screenshot({
    path: path.join(artifacts, "effects-browser-compact.png"),
  });
  await page.getByRole("button", { name: /View all/ }).click();
  await checkLayout();
  await page
    .getByRole("button", { name: "Shadow puppets", exact: true })
    .click();
  await page.screenshot({
    path: path.join(artifacts, "effects-browser-expanded.png"),
  });
  await page.getByRole("button", { name: /Compact view/ }).click();
  await page
    .getByRole("button", { name: "Hide effects library", exact: true })
    .click();
  await expect(page.locator(".effects-library")).toHaveClass(/collapsed/);
  await page
    .getByRole("button", { name: "Show effects library", exact: true })
    .click();
  console.log(
    "PASS: compact, expanded and collapsed browser at the minimum 1120 x 760 desktop size.",
  );

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
  const pixels = async () =>
    PNG.sync.read(await output.locator(".projection-canvas").screenshot()).data;
  await page
    .getByRole("button", { name: "Restart animation", exact: true })
    .click();
  await page.waitForTimeout(2400);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  const scenes = await Promise.all(
    ["Shadow-puppet-theatres.luma", "Living-walls.luma"].map(async (f) =>
      JSON.parse(await readFile(path.join("examples", f), "utf8")),
    ),
  );
  const newEffects = scenes.flatMap((s) => s.surfaces);
  const samples = [];
  await page.getByRole("button", { name: "All effects", exact: true }).click();
  for (const effect of newEffects) {
    await page.getByLabel("Search effects", { exact: true }).fill(effect.name);
    await page
      .getByRole("button", { name: `Apply ${effect.name}`, exact: true })
      .click();
    await expect
      .poll(async () => (await state()).project.surfaces[0].effectId)
      .toBe(effect.effectId);
    const image = await pixels();
    expect(
      image.some((v, i) => i % 4 !== 3 && v > 50),
      `${effect.name} has visible output`,
    ).toBe(true);
    for (const other of samples)
      expect(image.equals(other), `${effect.name} has distinct artwork`).toBe(
        false,
      );
    samples.push(image);
    await page.waitForTimeout(80);
    expect(
      (await pixels()).equals(image),
      `${effect.name} holds a paused frame`,
    ).toBe(true);
  }
  await page.getByLabel("Search effects", { exact: true }).fill("toy train");
  await page
    .getByRole("button", { name: "Apply Toy train circuit", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Train size", exact: true }),
  ).toBeVisible();
  const before = await pixels();
  await page
    .getByRole("slider", { name: "Train size", exact: true })
    .press("End");
  expect((await pixels()).equals(before)).toBe(false);
  console.log(
    "PASS: all 20 new effects render distinctly in native output, hold paused frames and offer appropriate train sizing.",
  );

  const open = async (file, name) => {
    await app.evaluate(
      ({ dialog }, filePath) => {
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [filePath],
        });
      },
      path.resolve("examples", file),
    );
    await page
      .getByRole("button", { name: "Open project", exact: true })
      .click();
    await expect.poll(async () => (await state()).project.name).toBe(name);
  };
  await page
    .getByRole("button", { name: "Clear effect search", exact: true })
    .click();
  await open("Shadow-puppet-theatres.luma", "Shadow puppet theatres");
  await expect
    .poll(async () => (await state()).project.surfaces.length)
    .toBe(6);
  const savePath = path.join(artifacts, "shadow-puppets-saved.luma");
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, savePath);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Project saved");
  const saved = JSON.parse(await readFile(savePath, "utf8"));
  expect(saved.surfaces.map((s) => s.effectId)).toEqual(
    scenes[0].surfaces.map((s) => s.effectId),
  );
  await output
    .locator(".projection-canvas")
    .screenshot({ path: path.join(artifacts, "shadow-puppets-output.png") });
  await open("Living-walls.luma", "Living walls");
  await expect
    .poll(async () => (await state()).project.surfaces.length)
    .toBe(14);
  await output
    .locator(".projection-canvas")
    .screenshot({ path: path.join(artifacts, "living-walls-output.png") });
  await page.reload();
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await page.getByRole("button", { name: "Favourites", exact: true }).click();
  await expect(page.locator(".effect-card")).toHaveCount(1);
  await expect(page.locator(".effect-card")).toContainText("Winter sleigh");
  expect(errors).toEqual([]);
  console.log(
    "PASS: new example scenes, native save/open, recovered custom effects and persistent favourites with no renderer errors.",
  );
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({ path: path.join(artifacts, "storybook-failure.png") })
      .catch(() => {});
  throw error;
} finally {
  await app.close();
}
