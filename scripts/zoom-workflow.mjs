import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

await mkdir("test-results", { recursive: true });
const artifacts = await mkdtemp(path.resolve("test-results/zoom-workflow-"));
const fixture = JSON.parse(await readFile("examples/Edge-runner.luma", "utf8"));
fixture.name = "Canvas navigation check";
fixture.surfaces[0] = {
  ...fixture.surfaces[0],
  name: "Zoom target",
  kind: "quad",
  points: [
    { x: 0.73, y: 0.2 },
    { x: 0.755, y: 0.2 },
    { x: 0.755, y: 0.24 },
    { x: 0.73, y: 0.24 },
  ],
  curves: [
    { control1: { x: 0.738, y: 0.192 }, control2: { x: 0.747, y: 0.192 } },
    null,
    null,
    null,
  ],
};
const fixturePath = path.join(artifacts, "fixture.luma");
await writeFile(fixturePath, JSON.stringify(fixture));
const packaged = process.argv.includes("--packaged"),
  env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
const app = await electron.launch({
  ...(packaged
    ? {
        executablePath: path.resolve(
          process.env.LUMA_RELEASE_DIR || "release/1.24.0",
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
app.on("window", (page) =>
  page.on("pageerror", (error) => errors.push(error.message)),
);
const pass = (message) => {
  checks.push(message);
  console.log(`PASS: ${message}`);
};
let page;
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  const click = (name) =>
    page.getByRole("button", { name, exact: true }).click();
  const zoom = page.getByLabel("Canvas zoom", { exact: true });
  const view = page.locator(".stage-scroll"),
    board = page.locator(".stage-board");
  await expect(page.locator(".stage-overlay")).toBeVisible({ timeout: 30000 });
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [file],
    });
  }, fixturePath);
  await click("Open project");
  await click("Pause animation");
  await click("Select Zoom target");
  const handle = page.getByRole("button", { name: "Corner 1", exact: true });
  const handleSize = (await handle.boundingBox()).width;
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
  const frame = async () =>
    PNG.sync.read(await output.locator(".projection-canvas").screenshot()).data;
  const initialState = await state(),
    initialFrame = await frame();
  await page.bringToFront();
  const initialBoard = await board.boundingBox();
  await zoom.selectOption("16");
  await expect
    .poll(async () => (await board.boundingBox()).width / initialBoard.width)
    .toBeCloseTo(16, 1);
  await expect(
    page.getByRole("button", { name: "Zoom in", exact: true }),
  ).toBeDisabled();
  await expect
    .poll(() =>
      page.locator(".stage-board canvas").evaluate((canvas) => canvas.width),
    )
    .toBe(fixture.width);
  expect(
    Math.abs((await handle.boundingBox()).width - handleSize),
  ).toBeLessThan(0.1);
  await zoom.selectOption("0.25");
  await expect(
    page.getByRole("button", { name: "Zoom out", exact: true }),
  ).toBeDisabled();
  await click("Fit canvas");
  await expect(zoom).toHaveValue("1");
  pass(
    "25–1600% presets reach both limits, retain fixed-size handles and bound the editor framebuffer",
  );

  const start = await board.boundingBox();
  const pointer = {
    x: start.x + start.width * 0.63,
    y: start.y + start.height * 0.36,
  };
  await page.mouse.move(pointer.x, pointer.y);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -240);
  await page.keyboard.up("Control");
  await expect
    .poll(async () => Number(await zoom.inputValue()))
    .toBeGreaterThan(1.5);
  const after = await board.boundingBox();
  expect(Math.abs(after.x + after.width * 0.63 - pointer.x)).toBeLessThan(2);
  expect(Math.abs(after.y + after.height * 0.36 - pointer.y)).toBeLessThan(2);
  expect(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => !w.webContents.getURL().includes("output"))
        .webContents.getZoomFactor(),
    ),
  ).toBe(1);
  await click("Zoom to selection");
  await expect(zoom).toHaveValue("16");
  const scroll = () =>
    view.evaluate((element) => ({
      left: element.scrollLeft,
      top: element.scrollTop,
    }));
  const panFrom = async (button) => {
    const r = await view.boundingBox(),
      before = await scroll();
    const x = r.x + r.width / 2,
      y = r.y + r.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down({ button });
    await page.mouse.move(x - 54, y - 37, { steps: 6 });
    await page.mouse.up({ button });
    await expect
      .poll(async () => (await scroll()).left - before.left)
      .toBeCloseTo(54, 0);
    await expect
      .poll(async () => (await scroll()).top - before.top)
      .toBeCloseTo(37, 0);
  };
  await click("Pan canvas");
  await panFrom("left");
  await click("Select & move");
  await panFrom("middle");
  const beforeScroll = await scroll();
  await page.mouse.wheel(0, 80);
  await expect
    .poll(async () => (await scroll()).top)
    .toBeGreaterThan(beforeScroll.top);
  await expect(zoom).toHaveValue("16");
  expect((await state()).project).toEqual(initialState.project);
  expect((await state()).playback).toEqual(initialState.playback);
  expect(await frame()).toEqual(initialFrame);
  pass(
    "Cursor zoom keeps the pointed scene coordinate in place; hand/middle panning and ordinary scrolling preserve geometry, playback and projector pixels",
  );

  await click("Zoom to selection");
  await handle.focus();
  await page.keyboard.press("Enter");
  const corner = await handle.boundingBox(),
    svg = await page.locator(".stage-overlay").boundingBox();
  if (
    (await page
      .getByRole("button", { name: "Snap to grid", exact: true })
      .getAttribute("aria-pressed")) === "true"
  )
    await click("Snap to grid");
  await page.mouse.move(
    corner.x + corner.width / 2,
    corner.y + corner.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    corner.x + corner.width / 2 + 8,
    corner.y + corner.height / 2 + 6,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => (await state()).project.surfaces[0].points[0].x)
    .toBeCloseTo(fixture.surfaces[0].points[0].x + 8 / svg.width, 6);
  await expect
    .poll(async () => (await state()).project.surfaces[0].points[0].y)
    .toBeCloseTo(fixture.surfaces[0].points[0].y + 6 / svg.height, 6);
  await click("Undo");
  await expect
    .poll(async () => (await state()).project)
    .toEqual(initialState.project);
  const bezier = page.getByRole("button", {
    name: "Bézier handle 1",
    exact: true,
  });
  const b = await bezier.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 6, {
    steps: 5,
  });
  await page.mouse.up();
  await expect
    .poll(async () => (await state()).project.surfaces[0].curves[0].control1.y)
    .toBeCloseTo(fixture.surfaces[0].curves[0].control1.y - 6 / svg.height, 6);
  await click("Undo");
  await expect
    .poll(async () => (await state()).project)
    .toEqual(initialState.project);
  pass(
    "Corner and Bézier dragging remain accurate at 1600%; Undo restores the exact project",
  );

  await click("Draw custom polygon");
  const tools = page.getByRole("group", { name: "Polygon drawing tools" });
  const docked = await tools.boundingBox();
  const draftView = await view.boundingBox();
  await page.mouse.click(
    draftView.x + draftView.width / 2,
    draftView.y + draftView.height / 2,
  );
  await panFrom("middle");
  await expect(tools).toContainText("1 corners");
  expect(await tools.boundingBox()).toEqual(docked);
  await tools.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.keyboard.press("0");
  await expect(zoom).toHaveValue("1");
  await page.keyboard.press("+");
  await expect(zoom).toHaveValue("1.25");
  await page.keyboard.press("-");
  await expect(zoom).toHaveValue("1");
  await page.keyboard.press("h");
  await expect(
    page.getByRole("button", { name: "Pan canvas", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("h");
  await page.getByLabel("Project name", { exact: true }).fill("");
  await page
    .getByLabel("Project name", { exact: true })
    .pressSequentially("0f-+h");
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "0f-+h",
  );
  await expect(zoom).toHaveValue("1");
  await page.getByLabel("Project name", { exact: true }).press("Tab");
  await click("Select Zoom target");
  await page.keyboard.press("f");
  await expect(zoom).toHaveValue("16");
  const sceneCenter = () =>
    view.evaluate((element) => {
      const rect = element.getBoundingClientRect(),
        board = element.querySelector(".stage-board").getBoundingClientRect();
      return {
        x: (rect.left + element.clientWidth / 2 - board.left) / board.width,
        y: (rect.top + element.clientHeight / 2 - board.top) / board.height,
      };
    });
  const centered = await sceneCenter();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => !w.webContents.getURL().includes("output"))
      .setSize(1120, 760),
  );
  await expect(
    page.getByRole("button", { name: "Fit canvas", exact: true }),
  ).toBeInViewport();
  await click("Hide properties");
  await click("Hide effects library");
  await expect
    .poll(async () => (await sceneCenter()).x)
    .toBeCloseTo(centered.x, 3);
  await expect
    .poll(async () => (await sceneCenter()).y)
    .toBeCloseTo(centered.y, 3);
  await expect(page.locator(".render-error")).toHaveCount(0);
  await page.screenshot({ path: path.join(artifacts, "zoom-1600.png") });
  await click("Fit canvas");
  await expect(board).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: path.join(artifacts, "zoom-fit.png") });
  expect(errors).toEqual([]);
  pass(
    "Polygon panning adds no corners; shortcuts respect text fields; Fit and controls remain usable with a resized workspace",
  );
  await writeFile(
    path.join(artifacts, "report.json"),
    JSON.stringify({ packaged, checks, errors }, null, 2),
  );
  console.log(`Zoom workflow passed: ${artifacts}`);
} catch (error) {
  await page
    ?.screenshot({ path: path.join(artifacts, "failure.png") })
    .catch(() => {});
  throw error;
} finally {
  await app.close();
}
