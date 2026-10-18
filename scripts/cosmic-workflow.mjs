import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "cosmic-profile-"));
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
  await expect(page.locator(".effect-card")).toHaveCount(154);
  await page.getByRole("button", { name: "Space", exact: true }).click();
  await expect(page.locator(".effect-card")).toHaveCount(12);
  await page.getByLabel("Search effects", { exact: true }).fill("jupitor");
  await expect(page.locator(".effect-card")).toHaveCount(1);
  await expect(page.locator(".effect-card")).toContainText("Jupiter");
  await page
    .getByRole("button", { name: "Clear effect search", exact: true })
    .click();
  await page.getByRole("button", { name: "All effects", exact: true }).click();
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
  const surfaces = async () => (await state()).project.surfaces;
  const pixels = async () =>
    PNG.sync.read(await output.locator(".projection-canvas").screenshot()).data;
  await page
    .getByRole("button", { name: "Restart animation", exact: true })
    .click();
  await page.waitForTimeout(2200);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  const scenes = await Promise.all(
    [
      "Cosmic-voyage.luma",
      "Metals-and-sandstone.luma",
      "Cosmic-extras.luma",
    ].map(async (f) =>
      JSON.parse(await readFile(path.join("examples", f), "utf8")),
    ),
  );
  const samples = [];
  const effects = [
    ...new Map(
      scenes.flatMap((s) => s.surfaces).map((s) => [s.effectId, s]),
    ).values(),
  ];
  expect(effects).toHaveLength(18);
  for (const effect of process.argv.includes("--shapes-only") ? [] : effects) {
    await page.getByLabel("Search effects", { exact: true }).fill(effect.name);
    await page
      .getByRole("button", { name: `Apply ${effect.name}`, exact: true })
      .click();
    await expect
      .poll(async () => (await surfaces())[0].effectId)
      .toBe(effect.effectId);
    const image = await pixels();
    expect(
      image.some((v, i) => i % 4 !== 3 && v > 50),
      `${effect.name} visible in output`,
    ).toBe(true);
    for (const other of samples)
      expect(image.equals(other), `${effect.name} has distinct artwork`).toBe(
        false,
      );
    samples.push(image);
    await page.waitForTimeout(90);
    expect(
      (await pixels()).equals(image),
      `${effect.name} freezes on pause`,
    ).toBe(true);
    if (scenes[1].surfaces.some((s) => s.effectId === effect.effectId))
      await expect(
        page.getByRole("slider", { name: "Speed", exact: true }),
      ).toHaveCount(0);
  }
  if (
    await page
      .getByRole("button", { name: "Clear effect search", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Clear effect search", exact: true })
      .click();
  if (!process.argv.includes("--shapes-only"))
    console.log(
      "PASS: 18 new effects/materials searchable, distinct in native output, stable on pause; still textures have no speed control.",
    );

  const add = async (name) => {
    await page.locator(".add-surface-button").click();
    await page
      .locator(".shape-menu")
      .getByRole("button", { name, exact: name !== "Ring" })
      .click();
  };
  for (const name of [
    "Rounded rectangle",
    "Arch",
    "Hexagon",
    "Star",
    "Diamond",
    "Ring",
  ])
    await add(name);
  await expect.poll(async () => (await surfaces()).length).toBe(8);
  let all = await surfaces();
  const ring = all.at(-2),
    hole = all.at(-1);
  expect(hole.cutoutOf).toBe(ring.id);
  expect(ring.kind).toBe("ellipse");
  expect(all[1].curves.filter(Boolean)).toHaveLength(4);
  expect(all[2].curves.filter(Boolean)).toHaveLength(2);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(async () => (await surfaces()).length).toBe(6);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect.poll(async () => (await surfaces()).length).toBe(8);
  await page
    .getByRole("button", { name: `Select ${ring.name}`, exact: true })
    .click();
  const beforeRotate = await surfaces();
  await page.getByRole("tab", { name: "Surface", exact: true }).click();
  await page.getByLabel("Rotate by", { exact: true }).fill("7.5");
  await page.getByLabel("Rotate by", { exact: true }).press("Enter");
  await expect
    .poll(async () => JSON.stringify((await surfaces()).at(-1).points))
    .not.toBe(JSON.stringify(beforeRotate.at(-1).points));
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(surfaces).toEqual(beforeRotate);
  await page
    .getByRole("button", { name: "Make outline editable", exact: true })
    .click();
  await expect
    .poll(async () => (await surfaces()).find((s) => s.id === ring.id).kind)
    .toBe("polygon");
  expect((await surfaces()).find((s) => s.id === ring.id).curves).toHaveLength(
    4,
  );
  expect((await surfaces()).at(-1)).toEqual(hole);
  await page
    .getByRole("button", { name: "Edit whole surface", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Straighten all edges", exact: true })
    .click();
  await expect
    .poll(async () => (await surfaces()).find((s) => s.id === ring.id).curves)
    .toBeUndefined();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await surfaces()).find((s) => s.id === ring.id).curves?.length,
    )
    .toBe(4);
  await page
    .getByRole("button", { name: `Lock ${ring.name}`, exact: true })
    .click();
  await expect(page.getByLabel("Rotate by", { exact: true })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Straighten all edges", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: `Unlock ${ring.name}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select Diamond 6", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit individual corners", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Smooth corner", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await surfaces())
          .find((s) => s.name === "Diamond 6")
          .curves?.filter(Boolean).length,
    )
    .toBe(2);
  console.log(
    "PASS: six presets, atomic ring Undo/Redo, fractional rotation moves the hole, ellipse conversion, smooth corner and reversible straightening.",
  );

  // Use a small window to exercise the scrollable shape menu and canvas placement.
  const win = await app.browserWindow(page);
  await win.evaluate((w) => w.setSize(1120, 760));
  await page
    .getByRole("button", { name: "Keep projection wireframe", exact: true })
    .click();
  await page.locator(".add-surface-button").click();
  await page.getByLabel("Draw new shapes to size", { exact: true }).check();
  await page
    .locator(".shape-menu")
    .getByRole("button", { name: "Ellipse", exact: false })
    .click();
  await expect(page.locator(".placement-toolbar")).toBeVisible();
  const board = await page.locator(".stage-overlay").boundingBox();
  const start = {
      x: board.x + board.width * 0.2,
      y: board.y + board.height * 0.25,
    },
    end = { x: board.x + board.width * 0.48, y: board.y + board.height * 0.68 };
  await page.keyboard.down("Shift");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 6 });
  await expect(page.locator(".placement-draft")).toBeVisible();
  await expect
    .poll(async () => (await state()).alignment.draft.length)
    .toBeGreaterThan(40);
  expect((await state()).alignment.visible).toBe(true);
  expect((await surfaces()).length).toBe(8);
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect.poll(async () => (await surfaces()).length).toBe(9);
  const circle = (await surfaces()).at(-1),
    xs = circle.points.map((p) => p.x),
    ys = circle.points.map((p) => p.y);
  expect(
    Math.abs(
      (Math.max(...xs) - Math.min(...xs)) * 1920 -
        (Math.max(...ys) - Math.min(...ys)) * 1080,
    ),
  ).toBeLessThan(0.01);
  await expect.poll(async () => (await state()).alignment.draft.length).toBe(0);
  await add("Arch");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator(".placement-toolbar")).toHaveCount(0);
  expect((await surfaces()).length).toBe(9);
  await add("Rounded rectangle");
  await page.mouse.move(end.x, end.y);
  await page.mouse.down();
  await page.mouse.move(start.x, start.y, { steps: 4 });
  await expect(page.locator(".placement-draft")).toBeVisible();
  await page.mouse.up();
  await expect.poll(async () => (await surfaces()).length).toBe(10);
  expect((await surfaces()).at(-1).curves.filter(Boolean)).toHaveLength(4);
  await page.screenshot({
    path: path.join(artifacts, "cosmic-shape-tools.png"),
  });
  console.log(
    "PASS: drawing over existing shapes, reverse-direction draw, Shift physical circle, live projected draft and Escape cancellation at 1120 x 760.",
  );

  const savedPath = path.join(artifacts, "cosmic-shapes-saved.luma"),
    beforeSave = (await state()).project;
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, savedPath);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Project saved");
  expect(JSON.parse(await readFile(savedPath, "utf8"))).toEqual(beforeSave);
  const open = async (filePath) => {
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, filePath);
    await page
      .getByRole("button", { name: "Open project", exact: true })
      .click();
  };
  for (const [i, file] of [
    "Cosmic-voyage.luma",
    "Metals-and-sandstone.luma",
    "Cosmic-extras.luma",
  ].entries()) {
    await open(path.resolve("examples", file));
    await expect
      .poll(async () => (await state()).project.name)
      .toBe(scenes[i].name);
    await output.locator(".projection-canvas").screenshot({
      path: path.join(artifacts, file.replace(".luma", "-output.png")),
    });
  }
  await open(savedPath);
  await expect.poll(async () => (await state()).project).toEqual(beforeSave);
  await page.reload();
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await expect.poll(async () => (await state()).project).toEqual(beforeSave);
  expect(errors).toEqual([]);
  console.log(
    "PASS: native save/open and recovery preserve new effects, curved presets, exact drawing geometry and ring holes; all examples load without errors.",
  );
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({ path: path.join(artifacts, "cosmic-failure.png") })
      .catch(() => {});
  throw error;
} finally {
  await app.close();
}
