import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "architecture-profile-"));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
const app = await electron.launch({
  args: [path.resolve("."), `--user-data-dir=${profile}`],
  env,
  timeout: 60000,
});
const errors = [];
app.on("window", (page) =>
  page.on("pageerror", (error) => errors.push(error.message)),
);
let page;
const references = [
  ["Smart Reflection", "Prismatic relief", "prismatic-relief"],
  ["Falling Walls", "Shatter & rebuild", "shatter-rebuild"],
  ["Liquid Fabrics", "Liquid drapery", "liquid-drapery"],
  ["ChromaticFlow", "Spectrum lattice", "spectrum-lattice"],
  ["Dawnlight", "Stormfront", "stormfront"],
  ["LetThereBeLight", "Prism gateway", "prism-gateway"],
  ["MetalMadness", "Chrome recursion", "chrome-recursion"],
];
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await page.getByRole("button", { name: "New scene", exact: true }).click();
  await page.locator(".template-card.blank").click();
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await expect(page.locator(".effect-card")).toHaveCount(176);
  await page.getByRole("button", { name: "Architecture", exact: true }).click();
  await expect(page.locator(".effect-card")).toHaveCount(10);
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
  const outputPromise = app.waitForEvent("window", { timeout: 15000 });
  await page
    .getByRole("button", { name: "Open output preview", exact: true })
    .click();
  const output = await outputPromise;
  output.setDefaultTimeout(15000);
  await expect(output.locator(".projection-canvas")).toBeVisible();
  await page.bringToFront();
  const samples = new Map();
  for (const [reference, name, id] of references) {
    await page.getByLabel("Search effects", { exact: true }).fill(reference);
    await expect(page.locator(".effect-card")).toHaveCount(1);
    await page
      .getByRole("button", { name: `Apply ${name}`, exact: true })
      .click();
    await expect
      .poll(() =>
        output.evaluate(
          async () =>
            (await window.luma.getOutputState()).project.surfaces[0].effectId,
        ),
      )
      .toBe(id);
    const frame = PNG.sync.read(
      await output.locator(".projection-canvas").screenshot(),
    ).data;
    await page.waitForTimeout(120);
    const still = PNG.sync.read(
      await output.locator(".projection-canvas").screenshot(),
    ).data;
    expect(frame.equals(still), `${name} holds still when paused`).toBe(true);
    samples.set(id, frame);
  }
  expect(
    new Set([...samples.values()].map((buffer) => buffer.toString("base64")))
      .size,
  ).toBe(7);
  console.log(
    "PASS: all seven reference searches apply distinct original effects to the live output and hold a stable paused frame.",
  );
  await page.getByLabel("Search effects", { exact: true }).fill("racing light");
  await expect(page.locator(".effect-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Apply Edge runner", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Light width", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("slider", { name: "Light width", exact: true })
    .press("End");
  await page
    .getByRole("button", { name: "Colour cycling", exact: true })
    .click();
  await expect
    .poll(() =>
      output.evaluate(async () => {
        const surface = (await window.luma.getOutputState()).project
          .surfaces[0];
        return {
          effect: surface.effectId,
          width: surface.scale,
          cycling: surface.colorCycle,
        };
      }),
    )
    .toEqual({ effect: "edge-runner", width: 3, cycling: true });
  await page.getByLabel("Search effects", { exact: true }).fill("");
  const filePath = path.join(artifacts, "architecture-saved.luma");
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, filePath);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Project saved");
  const savedSurface = JSON.parse(await readFile(filePath, "utf8")).surfaces[0];
  expect(savedSurface.effectId).toBe("edge-runner");
  expect(savedSurface.scale).toBe(3);
  expect(savedSurface.colorCycle).toBe(true);
  const example = path.resolve("examples/Architectural-illusions.luma");
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [filePath],
    });
  }, example);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await expect(page.locator(".surface-outline")).toHaveCount(7);
  await expect
    .poll(() =>
      output.evaluate(async () =>
        (await window.luma.getOutputState()).project.surfaces.map(
          (surface) => surface.effectId,
        ),
      ),
    )
    .toEqual(references.map(([, , id]) => id));
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  await page.waitForTimeout(1800);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page.screenshot({
    path: path.join(artifacts, "luma-architecture.png"),
  });
  await output.screenshot({
    path: path.join(artifacts, "luma-architecture-output.png"),
  });
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [filePath],
    });
  }, path.resolve("examples/Edge-runner.luma"));
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await expect(page.locator(".surface-outline")).toHaveCount(6);
  await expect
    .poll(() =>
      output.evaluate(
        async () => (await window.luma.getOutputState()).project.name,
      ),
    )
    .toBe("Edge runners");
  await page
    .getByRole("button", { name: "Restart animation", exact: true })
    .click();
  await page.screenshot({ path: path.join(artifacts, "luma-edge-runner.png") });
  await output.screenshot({
    path: path.join(artifacts, "luma-edge-runner-output.png"),
  });
  await expect(page.locator(".render-error")).toHaveCount(0);
  await expect(output.locator(".render-error")).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log(
    "PASS: Edge runner width and colour cycling reach the live output and save correctly; architectural and edge examples open and render without errors.",
  );
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({
        path: path.join(artifacts, "architecture-failure.png"),
        timeout: 5000,
      })
      .catch(() => {});
  throw error;
} finally {
  await app.close();
}
