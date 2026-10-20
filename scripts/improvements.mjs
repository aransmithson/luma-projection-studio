import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "workflow-profile-"));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
const errors = [];
const packaged = process.argv.includes("--packaged");
const app = await electron.launch({
  ...(packaged
    ? {
        executablePath: path.resolve(
          process.env.LUMA_RELEASE_DIR || "release",
          "win-unpacked",
          "Nox Projection Studio.exe",
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
app.on("window", (page) =>
  page.on("pageerror", (error) => errors.push(error.message)),
);
let page;
const selectedPoints = async () =>
  (await page.locator(".selection-controls polygon").getAttribute("points"))
    .split(" ")
    .map((pair) => pair.split(",").map(Number));
const litFraction = (buffer) => {
  const image = PNG.sync.read(buffer);
  let lit = 0;
  for (let i = 0; i < image.data.length; i += 4)
    if (Math.max(...image.data.subarray(i, i + 3)) > 15) lit++;
  return lit / (image.width * image.height);
};
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(
    page.getByRole("heading", { name: "Map your space." }),
  ).toBeVisible({ timeout: 30000 });
  if (
    await page
      .getByRole("button", { name: "Show effects library", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Show effects library", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();

  const before = await selectedPoints();
  await page.getByRole("button", { name: "Corner 1", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Corner X", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  const nudged = await selectedPoints();
  expect(nudged[0][0]).toBeCloseTo(before[0][0] + 1, 6);
  expect(nudged[0][1]).toBeCloseTo(before[0][1] + 10, 6);
  expect(nudged.slice(1)).toEqual(before.slice(1));
  await page.getByLabel("Corner X", { exact: true }).fill("1000");
  await page.getByLabel("Corner X", { exact: true }).press("Enter");
  expect((await selectedPoints())[0][0]).toBeCloseTo(1000, 6);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await selectedPoints()).toEqual(nudged);
  await page
    .getByRole("button", { name: "Lock Roofline", exact: true })
    .click();
  await expect(page.getByLabel("Corner X", { exact: true })).toBeDisabled();
  await page
    .getByRole("button", { name: "Unlock Roofline", exact: true })
    .click();
  console.log(
    "PASS: individual corner coordinates, 1/10-pixel nudging, undo and geometry lock",
  );

  await page
    .getByRole("button", { name: "Draw custom polygon", exact: true })
    .click();
  const drawingTools = page.getByRole("group", {
    name: "Polygon drawing tools",
  });
  await expect(drawingTools).toBeVisible();
  const dockedTools = await drawingTools.boundingBox();
  const drawingArea = await page.locator(".stage-scroll").boundingBox();
  expect(dockedTools.y + dockedTools.height).toBeLessThanOrEqual(
    drawingArea.y + 1,
  );
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.locator(".stage-scroll").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.scrollLeft = element.scrollWidth;
  });
  expect(await drawingTools.boundingBox()).toEqual(dockedTools);
  await expect(
    drawingTools.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "200%", exact: true }).click();
  await page.waitForTimeout(150);
  const stage = await page.locator(".stage-overlay").boundingBox();
  for (const [x, y] of [
    [0.04, 0.2],
    [0.16, 0.2],
    [0.16, 0.38],
    [0.1, 0.38],
    [0.1, 0.5],
    [0.04, 0.5],
  ])
    await page.mouse.click(
      stage.x + stage.width * x,
      stage.y + stage.height * y,
    );
  await page
    .getByRole("button", { name: "Finish polygon", exact: true })
    .click();
  await expect(page.locator(".vertex-handle")).toHaveCount(6);
  await page.getByRole("button", { name: "Corner 1", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Add corner", exact: true }).click();
  await expect(page.locator(".vertex-handle")).toHaveCount(7);
  await page
    .getByRole("button", { name: "Remove corner", exact: true })
    .click();
  await expect(page.locator(".vertex-handle")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Add corner after 1", exact: true })
    .click();
  await expect(page.locator(".vertex-handle")).toHaveCount(7);
  await page.keyboard.press("Delete");
  await expect(page.locator(".vertex-handle")).toHaveCount(6);
  const beforeDrag = await selectedPoints();
  const handle = await page.locator('[data-vertex="0"]').boundingBox();
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handle.x + 10, handle.y + 10, { steps: 3 });
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.mouse.up();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await selectedPoints()).toEqual(beforeDrag);
  console.log(
    "PASS: visible polygon completion, corner insertion/removal and interrupted-drag undo",
  );

  await page.getByRole("button", { name: "New scene", exact: true }).click();
  await page.locator(".template-card.winter").click();
  await page
    .getByRole("button", { name: "Select Roofline", exact: true })
    .click();
  const thumbnail = page.locator(".effect-thumbnail canvas").first();
  await page.mouse.move(10, 10);
  const staticPreview = await thumbnail.evaluate((canvas) =>
    canvas.toDataURL(),
  );
  await page.waitForTimeout(220);
  expect(await thumbnail.evaluate((canvas) => canvas.toDataURL())).toBe(
    staticPreview,
  );
  await thumbnail.hover();
  await page.waitForTimeout(220);
  expect(await thumbnail.evaluate((canvas) => canvas.toDataURL())).not.toBe(
    staticPreview,
  );
  await page.getByRole("button", { name: "Favourites", exact: true }).click();
  await expect(
    page.getByText("Your favourite effects live here", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Browse all effects", exact: true })
    .click();
  await page
    .getByLabel("Search effects", { exact: true })
    .fill("unmatched-effect");
  await expect(
    page.getByText("No effects found", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Browse all effects", exact: true })
    .click();
  await expect(page.locator(".effect-card")).toHaveCount(199);
  console.log(
    "PASS: idle previews stay still, hover previews animate, and empty filters have a reset",
  );

  await page
    .getByRole("button", { name: "Launch output", exact: true })
    .click();
  // These pixel checks cover the scene itself; guide lifetime has its own workflow tests.
  await page
    .getByLabel("Projection wireframe", { exact: true })
    .selectOption("off");
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
  await expect(output.locator(".projection-canvas")).toBeVisible();
  const outputCanvas = output.locator(".projection-canvas");
  await page.waitForTimeout(150);
  const fullFrame = await outputCanvas.screenshot();
  const originalVisibility = await output.evaluate(async () =>
    (await window.luma.getOutputState()).project.surfaces.map((s) => s.visible),
  );
  await page.bringToFront();
  await expect(
    page.getByRole("button", { name: "Manage output", exact: true }),
  ).toHaveText("Preview running");
  await page
    .getByRole("button", { name: "Solo Roofline", exact: true })
    .click();
  await expect
    .poll(() =>
      output.evaluate(
        async () => !!(await window.luma.getOutputState()).soloSurfaceId,
      ),
    )
    .toBe(true);
  await page.waitForTimeout(150);
  const soloFrame = await outputCanvas.screenshot();
  expect(litFraction(soloFrame)).toBeGreaterThan(0.02);
  expect(litFraction(soloFrame)).toBeLessThan(litFraction(fullFrame) * 0.6);
  expect(
    await output.evaluate(async () =>
      (await window.luma.getOutputState()).project.surfaces.map(
        (s) => s.visible,
      ),
    ),
  ).toEqual(originalVisibility);
  await expect(output.locator(".surface-label, .vertex-handle")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Stop solo Roofline", exact: true })
    .click();
  await page.waitForTimeout(150);
  expect(
    PNG.sync
      .read(await outputCanvas.screenshot())
      .data.equals(PNG.sync.read(fullFrame).data),
    "Stopping solo restores the same paused scene",
  ).toBe(true);
  await page
    .getByRole("button", { name: "Apply Deep currents", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Effect", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.waitForTimeout(150);
  const changedFrame = await outputCanvas.screenshot();
  expect(
    PNG.sync.read(changedFrame).data.equals(PNG.sync.read(fullFrame).data),
    "Changing an effect refreshes paused output",
  ).toBe(false);
  await page.waitForTimeout(150);
  expect(
    PNG.sync
      .read(await outputCanvas.screenshot())
      .data.equals(PNG.sync.read(changedFrame).data),
    "Paused output stays still",
  ).toBe(true);
  console.log(
    "PASS: solo changes projected pixels without changing visibility, clean output, accurate preview status and paused-effect refresh",
  );

  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => !w.getTitle().includes("Projector output"))
      .setSize(1120, 760),
  );
  await expect.poll(() => page.evaluate(() => innerWidth)).toBeLessThan(1121);
  await page.waitForTimeout(150);
  const pointsBeforePanels = await selectedPoints();
  const workspaceBefore = await page
    .locator(".mapping-workspace")
    .boundingBox();
  await page
    .getByRole("button", { name: "Hide properties", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Show properties", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".inspector")).toBeHidden();
  await expect(page.locator(".effects-library")).toBeVisible();
  await expect
    .poll(
      async () =>
        (await page.locator(".mapping-workspace").boundingBox()).width,
    )
    .toBeGreaterThan(workspaceBefore.width + 260);
  // Restore with the keyboard; panel controls remain reachable when hidden.
  await page
    .getByRole("button", { name: "Show properties", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".inspector")).toBeVisible();
  await expect
    .poll(
      async () =>
        (await page.locator(".mapping-workspace").boundingBox()).width,
    )
    .toBeCloseTo(workspaceBefore.width, 0);
  await page.getByLabel("Search effects", { exact: true }).fill("ghost");
  await page.waitForTimeout(150);
  const compactBefore = await page.locator(".stage-board").boundingBox();
  await page.getByRole("button", { name: "Hide effects", exact: true }).click();
  await expect(page.locator(".effects-library")).toBeHidden();
  await page.waitForTimeout(150);
  const compactAfter = await page.locator(".stage-board").boundingBox();
  expect(compactAfter.height).toBeGreaterThan(compactBefore.height * 1.4);
  expect(compactAfter.height).toBeGreaterThan(280);
  const layout = await page.evaluate(() => ({
    viewport: [innerWidth, innerHeight],
    body: [
      document.documentElement.scrollWidth,
      document.documentElement.scrollHeight,
    ],
    layers: document.querySelector(".layer-list").getBoundingClientRect()
      .height,
    inspector: document
      .querySelector(".inspector-scroll")
      .getBoundingClientRect().height,
  }));
  expect(layout.body).toEqual(layout.viewport);
  expect(layout.layers).toBeGreaterThan(300);
  expect(layout.inspector).toBeGreaterThan(300);
  await page.getByRole("tab", { name: "Surface", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit individual corners", exact: true })
    .click();
  await page.screenshot({
    path: path.join(artifacts, "luma-improved-compact.png"),
  });
  await page
    .getByRole("button", { name: "Hide properties", exact: true })
    .click();
  await expect(page.locator(".inspector")).toBeHidden();
  await expect
    .poll(async () => (await page.locator(".stage-board").boundingBox()).width)
    .toBeGreaterThan(compactAfter.width + 150);
  const bothHidden = await page.locator(".stage-board").boundingBox();
  const panelLayout = await page.evaluate(() => {
    const controls = document
      .querySelector(".workspace-panel-controls")
      .getBoundingClientRect();
    const heading = document
      .querySelector(".canvas-heading")
      .getBoundingClientRect();
    const footer = document
      .querySelector(".status-bar")
      .getBoundingClientRect();
    return {
      noOverflow:
        document.documentElement.scrollWidth === innerWidth &&
        document.documentElement.scrollHeight === innerHeight,
      controlsVisible:
        controls.left >= heading.left &&
        controls.right <= heading.right &&
        controls.bottom <= heading.bottom,
      footerVisible: footer.height > 0 && footer.bottom <= innerHeight,
    };
  });
  expect(panelLayout).toEqual({
    noOverflow: true,
    controlsVisible: true,
    footerVisible: true,
  });
  expect(await selectedPoints()).toEqual(pointsBeforePanels);
  expect(
    PNG.sync
      .read(await outputCanvas.screenshot())
      .data.equals(PNG.sync.read(changedFrame).data),
    "Panel layout leaves paused projector pixels unchanged",
  ).toBe(true);
  await output.close();
  await page.screenshot({
    path: path.join(artifacts, "nox-workspace-panels-hidden.png"),
  });
  await page
    .getByRole("button", { name: "Show effects library", exact: true })
    .click();
  await expect(page.getByLabel("Search effects", { exact: true })).toHaveValue(
    "ghost",
  );
  await expect(page.locator(".inspector")).toBeHidden();
  // The library's own close control returns focus to its visible restore button.
  await page
    .getByRole("button", { name: "Hide effects library", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Show effects library", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Surface labels", exact: true })
    .click();
  await expect(page.locator(".surface-label")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".effects-library")).toBeHidden();
  await expect(page.locator(".inspector")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Surface labels", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  console.log(
    `PASS: independent panels, compact canvas ${Math.round(compactBefore.width)}×${Math.round(compactBefore.height)} → ${Math.round(bothHidden.width)}×${Math.round(bothHidden.height)}, no overflow, preserved output and persistent preferences`,
  );
  await page
    .getByRole("button", { name: "Show properties", exact: true })
    .click();
  await expect(page.locator(".inspector")).toBeVisible();
  await page.getByRole("tab", { name: "Effect", exact: true }).click();
  await page
    .getByRole("button", { name: "Change effect", exact: true })
    .click();
  await expect(page.locator(".effects-library")).toBeVisible();
  await page
    .getByRole("button", { name: "Hide effects library", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Show effects library", exact: true })
    .click();
  await expect(page.locator(".effects-library")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Hide effects", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.screenshot({
    path: path.join(artifacts, "nox-workspace-panels-restored.png"),
  });

  await page.getByLabel("Project name", { exact: true }).fill("");
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("luma-project-v1")).name,
      ),
    )
    .toBe("Untitled mapping");
  await page.reload();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "Untitled mapping",
  );
  // Simulate disk corruption before React reads recovery in this disposable profile.
  await page.addInitScript(() => {
    const backup = JSON.parse(localStorage.getItem("luma-project-v1"));
    backup.name = "Recovered mapping";
    localStorage.setItem("luma-recovery-v1", JSON.stringify(backup));
    localStorage.setItem("luma-project-v1", "{broken");
  });
  await page.reload();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "Recovered mapping",
  );
  await expect(page.getByRole("status")).toContainText(
    "Recovered the previous valid save",
  );
  expect(errors).toEqual([]);
  console.log(
    "PASS: empty-title recovery, damaged-autosave fallback and no renderer errors",
  );
} catch (error) {
  if (page && !page.isClosed())
    await page.screenshot({
      path: path.join(artifacts, "workflow-failure.png"),
    });
  console.error("Renderer errors:", errors);
  throw error;
} finally {
  await app.close();
}
