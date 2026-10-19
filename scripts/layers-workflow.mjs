import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "layers-profile-"));
const original = JSON.parse(
  await readFile("examples/Edge-runner.luma", "utf8"),
);
const base = original.surfaces[0];
const rect = (x, y, w, h) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];
const surface = (id, name, points, effectId, color) => ({
  ...base,
  id,
  name,
  kind: "quad",
  points,
  curves: undefined,
  effectId,
  color,
  colorCycle: false,
  opacity: 1,
  feather: 0,
  speed: 1,
  scale: 1,
  blend: "normal",
  visible: true,
  locked: false,
});
const fixture = {
  version: 1,
  name: "Layers and placement",
  width: 1280,
  height: 720,
  brightness: 1,
  stacks: [],
  surfaces: [
    surface(
      "background",
      "Background",
      rect(0.05, 0.05, 0.9, 0.9),
      "limestone",
      "#65b5a1",
    ),
    {
      ...surface(
        "facade",
        "Curved facade",
        rect(0.2, 0.15, 0.6, 0.7),
        "red-brick",
        "#b65c3c",
      ),
      curves: [
        { control1: { x: 0.4, y: 0.08 }, control2: { x: 0.6, y: 0.08 } },
        null,
        null,
        null,
      ],
      colorOverlay: {
        enabled: false,
        style: "facets",
        palette: "neon",
        blend: "screen",
        intensity: 0.4,
        speed: 0.8,
        scale: 1.3,
        reverse: true,
      },
    },
    {
      ...surface(
        "hole",
        "Window hole",
        rect(0.4, 0.35, 0.15, 0.25),
        "concrete",
        "#c8cbd0",
      ),
      cutoutOf: "facade",
    },
  ],
};
const fixturePath = path.join(profile, "fixture.luma"),
  savedPath = path.join(profile, "saved.luma");
await writeFile(fixturePath, JSON.stringify(fixture));
const packaged = process.argv.includes("--packaged"),
  env = { ...process.env };
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
app.on("window", (page) => page.on("pageerror", (e) => errors.push(e.message)));
let page, output;
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  await expect(page.locator(".stage-overlay")).toBeVisible();
  // Exercise the real preload/IPC, replacing only OS clipboard storage so the user's clipboard is untouched.
  await app.evaluate(
    ({ clipboard, dialog }, { fixturePath, savedPath }) => {
      let memory = "";
      clipboard.writeText = async (text) => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        memory = text;
      };
      clipboard.readText = async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return memory;
      };
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [fixturePath],
      });
      dialog.showSaveDialog = async () => ({
        canceled: false,
        filePath: savedPath,
      });
    },
    { fixturePath, savedPath },
  );
  const click = (name) =>
    page.getByRole("button", { name, exact: true }).click();
  const shortcut = async (key) => {
    await page.locator(".panel-heading").first().click();
    await page.keyboard.press(key);
  };
  await click("Open project");
  await click("Pause animation");
  await click("Launch output");
  await page
    .locator(".display-option")
    .filter({ hasText: "Primary display" })
    .click();
  await page
    .getByLabel("Projection wireframe", { exact: true })
    .selectOption("off");
  const outputPromise = app.waitForEvent("window");
  await click("Open output preview");
  output = await outputPromise;
  output.setDefaultTimeout(15000);
  await expect(output.locator(".projection-canvas")).toBeVisible();
  const state = () => output.evaluate(() => window.luma.getOutputState());
  const project = async () => (await state()).project;
  const pixel = async (x, y) => {
    const png = PNG.sync.read(
      await output.locator(".projection-canvas").screenshot(),
    );
    const i =
      (Math.floor(y * png.height) * png.width + Math.floor(x * png.width)) * 4;
    return [...png.data.subarray(i, i + 3)];
  };
  const initial = await state();
  await page.bringToFront();
  await click("Placement mesh");
  const stage = await page.locator(".stage-overlay").boundingBox();
  await page.mouse.move(
    stage.x + stage.width * 0.32,
    stage.y + stage.height * 0.42,
  );
  await expect(output.locator(".output-pointer")).toBeVisible();
  await expect
    .poll(async () => (await state()).pointer?.x)
    .toBeCloseTo(0.32, 2);
  await expect
    .poll(async () => (await state()).pointer?.y)
    .toBeCloseTo(0.42, 2);
  expect((await state()).project).toEqual(initial.project);
  expect((await state()).playback).toEqual(initial.playback);
  // Letterboxed output must keep the projected crosshair in the same normalized position.
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.webContents.getURL().includes("output=1"))
      .setContentSize(960, 720),
  );
  const center = await output
      .locator(".output-pointer .pointer-centre")
      .boundingBox(),
    frame = await output.locator(".output-frame").boundingBox();
  expect((center.x + center.width / 2 - frame.x) / frame.width).toBeCloseTo(
    0.32,
    2,
  );
  expect((center.y + center.height / 2 - frame.y) / frame.height).toBeCloseTo(
    0.42,
    2,
  );
  await output.screenshot({
    path: path.join(artifacts, "projected-cursor.png"),
  });
  await page.mouse.move(20, 25);
  await expect(output.locator(".output-pointer")).toHaveCount(0);
  await page.mouse.move(
    stage.x + stage.width * 0.4,
    stage.y + stage.height * 0.4,
  );
  await expect(output.locator(".output-pointer")).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(output.locator(".output-pointer")).toHaveCount(0);
  await page.mouse.move(
    stage.x + stage.width * 0.41,
    stage.y + stage.height * 0.41,
  );
  await page.keyboard.press("b");
  await expect(output.locator(".output-pointer")).toHaveCount(0);
  await page.keyboard.press("b");
  await expect(output.locator(".output-pointer")).toBeVisible();
  await page.keyboard.press("m");
  await expect(output.locator(".output-pointer")).toHaveCount(0);
  console.log(
    "PASS projected cursor, coordinates, letterboxing, leave/blur, blackout and playback isolation",
  );

  await click("Select Curved facade");
  await shortcut("Control+c");
  await click("Add layer");
  await page.getByLabel("Layer name", { exact: true }).fill("Foreground");
  await page.getByLabel("Layer name", { exact: true }).press("Enter");
  await shortcut("Control+Shift+v");
  await expect.poll(async () => (await project()).surfaces.length).toBe(5);
  let p = await project(),
    copies = p.surfaces.slice(-2),
    frontId = p.layers.find((l) => l.name === "Foreground").id;
  expect(copies[0].points).toEqual(fixture.surfaces[1].points);
  expect(copies[0].curves).toEqual(fixture.surfaces[1].curves);
  expect(copies[0].colorOverlay).toEqual(fixture.surfaces[1].colorOverlay);
  expect(copies.every((s) => s.layerId === frontId)).toBe(true);
  expect(copies[1].cutoutOf).toBe(copies[0].id);
  await shortcut("Control+z");
  await expect.poll(async () => (await project()).surfaces.length).toBe(3);
  await shortcut("Control+y");
  await expect.poll(async () => (await project()).surfaces.length).toBe(5);
  await shortcut("Control+v");
  await expect.poll(async () => (await project()).surfaces.length).toBe(7);
  p = await project();
  expect(p.surfaces.at(-2).points[0].x).toBeCloseTo(
    fixture.surfaces[1].points[0].x + 0.02,
  );
  await shortcut("Control+v");
  await expect.poll(async () => (await project()).surfaces.length).toBe(9);
  expect((await project()).surfaces.at(-2).points[0].x).toBeCloseTo(
    fixture.surfaces[1].points[0].x + 0.04,
  );
  await shortcut("Control+z");
  await shortcut("Control+z");
  await expect.poll(async () => (await project()).surfaces.length).toBe(5);
  // Typing shortcuts in a field keep their native editing meaning.
  const beforeInput = await project();
  await page.getByLabel("Layer name", { exact: true }).focus();
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  await page.keyboard.press("Escape");
  expect(await project()).toEqual(beforeInput);
  await app.evaluate(({ clipboard }) =>
    clipboard.writeText("LUMA_SHAPES_V1\nnot json"),
  );
  await shortcut("Control+v");
  await expect(page.locator(".toast")).toContainText("valid Nox shapes");
  expect(await project()).toEqual(beforeInput);
  console.log(
    "PASS clipboard, fresh IDs, holes, curves, overlays, in-place and repeated offsets, undo/redo and invalid data",
  );

  await click("Select Background");
  const layeredBefore = await project();
  await page.getByLabel("Shape layer", { exact: true }).selectOption(frontId);
  await expect
    .poll(
      async () =>
        (await project()).surfaces.find((s) => s.id === "background").layerId,
    )
    .toBe(frontId);
  await expect(
    page.getByRole("button", { name: "Select layer Foreground", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await shortcut("Control+z");
  await expect(page.getByLabel("Shape layer", { exact: true })).toHaveValue(
    layeredBefore.layers[0].id,
  );
  await expect(
    page.getByRole("button", { name: "Select layer Layer 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await shortcut("Control+Shift+z");
  await expect(
    page.getByRole("button", { name: "Select layer Foreground", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const frontPixel = await pixel(0.3, 0.5);
  await click("Send layer backward");
  await expect.poll(async () => (await project()).layers[0].id).toBe(frontId);
  const backPixel = await pixel(0.3, 0.5);
  expect(backPixel).not.toEqual(frontPixel);
  await click("Hide layer Layer 1");
  await expect
    .poll(
      async () =>
        (await project()).layers.find((l) => l.name === "Layer 1").visible,
    )
    .toBe(false);
  expect(await pixel(0.3, 0.5)).toEqual(frontPixel);
  await click("Show layer Layer 1");
  await click("Solo Window hole");
  await expect.poll(async () => (await state()).soloSurfaceId).toBe("hole");
  await click("Hide Curved facade");
  await expect.poll(async () => (await state()).soloSurfaceId).toBeNull();
  await expect(
    page.getByRole("button", { name: "Solo Window hole", exact: true }),
  ).toBeDisabled();
  await click("Show Curved facade");
  await click("Select Curved facade");
  await page.getByLabel("Shape layer", { exact: true }).selectOption(frontId);
  await expect
    .poll(async () =>
      (await project()).surfaces
        .filter((s) => ["facade", "hole"].includes(s.id))
        .every((s) => s.layerId === frontId),
    )
    .toBe(true);
  await click("Lock layer Foreground");
  await expect(page.getByLabel("Surface name", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Shape layer", { exact: true })).toBeDisabled();
  await expect(page.locator(".stage-overlay .vertex-handle")).toHaveCount(0);
  const locked = await project();
  await shortcut("ArrowRight");
  await shortcut("Delete");
  await shortcut("Control+v");
  expect(await project()).toEqual(locked);
  await click("Unlock layer Foreground");
  await click("Hide layer Foreground");
  const dark = await pixel(0.3, 0.5);
  expect(dark).toEqual([0, 0, 0]);
  await click("Placement mesh");
  await expect(output.locator(".placement-wireframe > g")).toHaveCount(0);
  await click("Show layer Foreground");
  await expect(output.locator(".placement-wireframe > g")).toHaveCount(5);
  await click("Placement mesh");
  await click("Select layer Layer 1");
  await expect(
    page.getByRole("button", { name: "Remove empty layer", exact: true }),
  ).toBeEnabled();
  await click("Remove empty layer");
  await expect.poll(async () => (await project()).layers.length).toBe(1);
  await shortcut("Control+z");
  await expect.poll(async () => (await project()).layers.length).toBe(2);
  expect(layeredBefore.layers).toHaveLength(2);
  await click("Select Curved facade");
  await click("Copy");
  // Clipboard survives opening a different project; old layer IDs are not carried over.
  const preserved = await project();
  await click("Save project");
  await expect
    .poll(async () => JSON.parse(await readFile(savedPath, "utf8")))
    .toEqual(preserved);
  await click("Open project");
  await expect.poll(async () => (await project()).surfaces.length).toBe(3);
  await click("Paste in place");
  await expect.poll(async () => (await project()).surfaces.length).toBe(5);
  expect(
    (await project()).surfaces.slice(-2).every((s) => s.layerId === undefined),
  ).toBe(true);
  await app.evaluate(({ dialog }, savedPath) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [savedPath],
    });
  }, savedPath);
  await click("Open project");
  await expect.poll(project).toEqual(preserved);
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("luma-project-v1"))),
    )
    .toEqual(preserved);
  await page.reload();
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await expect.poll(project).toEqual(preserved);
  console.log(
    "PASS layer membership, pixel order, visibility, locking, empty-layer removal, save/open and recovery",
  );

  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => !w.webContents.getURL().includes("output=1"))
      .setSize(1120, 760),
  );
  await page.bringToFront();
  await click("Select Curved facade");
  await expect(
    page.getByRole("button", { name: "Copy", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Shape layer", { exact: true })).toBeVisible();
  const listBox = await page.locator(".layer-list").boundingBox(),
    workspaceBox = await page.locator(".workspace").boundingBox();
  expect(listBox.height).toBeGreaterThan(125);
  expect(listBox.y + listBox.height).toBeLessThanOrEqual(
    workspaceBox.y + workspaceBox.height,
  );
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth > innerWidth ||
      document.documentElement.scrollHeight > innerHeight,
  );
  expect(overflow).toBe(false);
  await page.screenshot({
    path: path.join(artifacts, "layers-minimum-layout.png"),
  });
  expect(errors).toEqual([]);
  await writeFile(
    path.join(artifacts, `layers-workflow${packaged ? "-packaged" : ""}.json`),
    JSON.stringify(
      { passed: true, packaged, errors, checkedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log("PASS minimum desktop layout and no renderer errors");
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({
        path: path.join(artifacts, "layers-failure.png"),
        timeout: 5000,
      })
      .catch(() => {});
  throw error;
} finally {
  await app.close();
}
