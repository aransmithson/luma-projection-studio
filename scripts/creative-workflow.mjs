import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "creative-profile-"));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
const app = await electron.launch({
  args: [path.resolve("."), `--user-data-dir=${profile}`],
  env,
  timeout: 60000,
});
const errors = [];
app.on("window", (p) => p.on("pageerror", (e) => errors.push(e.message)));
let page;
const project = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("luma-project-v1")));
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.locator(".stage-overlay")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "New scene", exact: true }).click();
  await page.locator(".template-card.blank").click();
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit individual corners", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Curve this edge", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Bézier handle 1", exact: true }),
  ).toBeVisible();
  const initialPath = await page.locator(".selected-curve").getAttribute("d");
  const initialY = Number(
    await page.getByLabel("Handle 1 Y", { exact: true }).inputValue(),
  );
  await page
    .getByLabel("Handle 1 Y", { exact: true })
    .fill(String(initialY - 70));
  await page.getByLabel("Handle 1 Y", { exact: true }).press("Enter");
  await expect(page.locator(".selected-curve")).not.toHaveAttribute(
    "d",
    initialPath,
  );
  await page
    .getByRole("button", { name: "Bézier handle 1", exact: true })
    .focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("Handle 1 Y", { exact: true })).toHaveValue(
    String(initialY - 69),
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Handle 1 Y", { exact: true })).toHaveValue(
    String(initialY - 70),
  );
  await page.screenshot({ path: path.join(artifacts, "luma-bezier.png") });
  console.log(
    "PASS: Bézier edge conversion, precise control coordinates, keyboard handles and undo",
  );

  await page
    .getByRole("button", { name: "Keep projection wireframe", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Launch output", exact: true })
    .click();
  await page
    .locator(".display-option")
    .filter({ hasText: "Primary display" })
    .click();
  const outputPromise = app.waitForEvent("window", { timeout: 15000 });
  await page
    .getByRole("button", { name: "Open output preview", exact: true })
    .click();
  const output = await outputPromise;
  output.setDefaultTimeout(15000);
  await expect(output.locator(".output-wireframe")).toBeVisible();
  expect(
    await output
      .locator(".output-wireframe .selected path:not(.wire-shadow)")
      .getAttribute("d"),
  ).toBe(await page.locator(".selected-curve").getAttribute("d"));
  await output.screenshot({
    path: path.join(artifacts, "luma-projected-wireframe.png"),
  });
  await page.bringToFront();
  await page.getByRole("button", { name: "Blackout B", exact: true }).click();
  await expect(output.locator(".output-wireframe")).toHaveCount(0);
  const black = PNG.sync.read(
    await output.locator(".projection-canvas").screenshot(),
  );
  expect(black.data.every((v, i) => i % 4 === 3 || v === 0)).toBe(true);
  await page.getByRole("button", { name: "Blackout B", exact: true }).click();
  await page
    .getByRole("button", { name: "Manage output", exact: true })
    .click();
  await page
    .getByLabel("Projection wireframe", { exact: true })
    .selectOption("off");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(output.locator(".output-wireframe")).toHaveCount(0);
  await page
    .getByLabel("Handle 2 Y", { exact: true })
    .fill(String(initialY - 70));
  await page.getByLabel("Handle 2 Y", { exact: true }).press("Enter");
  await expect(output.locator(".output-wireframe")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Manage output", exact: true })
    .click();
  await page
    .getByLabel("Projection wireframe", { exact: true })
    .selectOption("editing");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByLabel("Handle 2 Y", { exact: true })
    .fill(String(initialY - 60));
  await page.getByLabel("Handle 2 Y", { exact: true }).press("Enter");
  await expect(output.locator(".output-wireframe")).toBeVisible();
  await expect(output.locator(".output-wireframe")).toHaveCount(0, {
    timeout: 4000,
  });
  console.log(
    "PASS: projected curves match the editor, guide modes work, automatic guides expire and blackout hides everything",
  );
  const handle = await page
    .getByRole("button", { name: "Bézier handle 1", exact: true })
    .boundingBox();
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.waitForTimeout(2800);
  await expect(output.locator(".output-wireframe")).toBeVisible();
  await page.mouse.up();
  await expect(output.locator(".output-wireframe")).toHaveCount(0, {
    timeout: 4000,
  });
  console.log(
    "PASS: wireframe remains visible throughout a held drag and clears after release",
  );

  if (
    await page
      .getByRole("button", { name: "Show effects library", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Show effects library", exact: true })
      .click();
  await page.getByRole("button", { name: "Geometric", exact: true }).click();
  await page
    .getByRole("button", { name: "Apply Infinity cubes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Colour cycling", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Colour cycling", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Colour cycling", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("button", { name: "Stacked animations", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Add 3 demo shapes", exact: true })
    .click();
  await expect(page.locator(".stack-choice")).toHaveCount(1);
  await page.getByLabel("Stack duration", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Save stack", exact: true }).click();
  await page.screenshot({
    path: path.join(artifacts, "luma-stack-editor.png"),
  });
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect.poll(async () => (await project()).stacks[0]?.duration).toBe(12);
  await expect
    .poll(() =>
      output.evaluate(
        async () =>
          (await window.luma.getOutputState()).project.stacks[0]?.surfaceIds
            .length,
      ),
    )
    .toBe(3);
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  await page.waitForTimeout(1400);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  const pausedState = await output.evaluate(() => window.luma.getOutputState());
  expect(pausedState.playback.playing).toBe(false);
  // Compare projection content, excluding editor-only handles/labels and expiring
  // output alignment guides. Different viewport sizes place those overlays at
  // different sampled pixels; they are not part of the synchronized animation.
  const contentOnly = {
    style:
      ".stage-overlay, .output-wireframe, .canvas-instruction, .stage-coordinate { visibility: hidden !important; }",
  };
  const first = PNG.sync.read(
    await output.locator(".projection-canvas").screenshot(contentOnly),
  );
  await page.waitForTimeout(300);
  const second = PNG.sync.read(
    await output.locator(".projection-canvas").screenshot(contentOnly),
  );
  expect(
    second.data.equals(first.data),
    "The entire liquid stack freezes when paused",
  ).toBe(true);
  const editor = PNG.sync.read(
    await page
      .locator(".mapping-workspace .projection-canvas")
      .screenshot(contentOnly),
  );
  let totalError = 0,
    samples = 0;
  for (let y = 1; y < 12; y++)
    for (let x = 1; x < 20; x++) {
      const a =
          (Math.floor((y / 12) * editor.height) * editor.width +
            Math.floor((x / 20) * editor.width)) *
          4,
        b =
          (Math.floor((y / 12) * first.height) * first.width +
            Math.floor((x / 20) * first.width)) *
          4;
      for (let c = 0; c < 3; c++) {
        totalError += Math.abs(editor.data[a + c] - first.data[b + c]);
        samples++;
      }
    }
  expect(
    totalError / samples,
    "Editor and projector use the same paused liquid phase",
  ).toBeLessThan(10);
  await page
    .getByRole("button", { name: "Restart animation", exact: true })
    .click();
  await expect
    .poll(() =>
      output.evaluate(
        async () => (await window.luma.getOutputState()).playback.offset,
      ),
    )
    .toBe(0);
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  await page.waitForTimeout(1700);
  await page.screenshot({
    path: path.join(artifacts, "luma-liquid-stack.png"),
  });
  await output.screenshot({
    path: path.join(artifacts, "luma-liquid-output.png"),
  });
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  console.log(
    "PASS: optional colour cycling, three-surface liquid stack, shared editor/output phase, pause and restart",
  );

  const filePath = path.join(artifacts, "creative-project.luma");
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [filePath],
    });
  }, filePath);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Project saved");
  const saved = JSON.parse(await readFile(filePath, "utf8"));
  expect(saved.stacks[0].duration).toBe(12);
  expect(saved.surfaces[0].curves[0]).toBeTruthy();
  expect(saved.surfaces[0].colorCycle).toBe(false);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await expect(page.locator(".surface-outline")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Stacked animations", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Move Flow 1 · Lower earlier", exact: true })
    .click();
  await page.getByRole("button", { name: "Save stack", exact: true }).click();
  await expect
    .poll(async () => (await project()).stacks[0].surfaceIds[1])
    .toBe(saved.stacks[0].surfaceIds[2]);
  await page.getByRole("button", { name: "Unlink stack", exact: true }).click();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect.poll(async () => (await project()).stacks.length).toBe(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(async () => (await project()).stacks.length).toBe(1);
  await expect(page.locator(".render-error")).toHaveCount(0);
  await expect(output.locator(".render-error")).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log(
    "PASS: curves, cycling preference and linked timing survive native save/open; stack reordering and unlink are undoable",
  );
  await page
    .getByRole("button", { name: "Stacked animations", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Add 3 demo shapes", exact: true })
    .click();
  await expect(page.locator(".stack-choice")).toHaveCount(2);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Flow 1 · Upper", exact: true })
    .click();
  await page.getByRole("tab", { name: "Effect", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit stack timing & colour", exact: true })
    .click();
  await expect(page.getByLabel("Stack name", { exact: true })).toHaveValue(
    "Liquid loop 1",
  );
  console.log(
    "PASS: editing a member selects its own stack when several stacks exist",
  );
} catch (error) {
  if (page && !page.isClosed())
    await page.screenshot({
      path: path.join(artifacts, "creative-failure.png"),
    });
  console.error("Renderer errors:", errors);
  throw error;
} finally {
  await app.close();
}
