import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";

const artifacts = path.resolve("test-results");
const { version } = JSON.parse(await readFile("package.json", "utf8"));
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "packaged-profile-"));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
const app = await electron.launch({
  executablePath: path.resolve(
    "release/win-unpacked/Nox Projection Studio.exe",
  ),
  args: [`--user-data-dir=${profile}`],
  env,
  timeout: 60000,
});
try {
  const page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(
    page.getByRole("heading", { name: "Map your space." }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".surface-outline")).toHaveCount(6);
  await expect(page.locator(".render-error")).toHaveCount(0);
  expect(await page.evaluate(() => typeof window.luma?.openOutput)).toBe(
    "function",
  );
  expect(await app.evaluate(({ app }) => app.isPackaged)).toBe(true);
  expect(await app.evaluate(({ app }) => app.getVersion())).toBe(version);
  expect(await page.evaluate(() => location.protocol)).toBe("file:");
  await page
    .getByRole("button", { name: "Launch output", exact: true })
    .click();
  await expect(page.locator(".display-option").first()).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit individual corners", exact: true })
    .click();
  await expect(page.getByLabel("Corner X", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Solo Roofline", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Stop solo Roofline", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Stacked animations", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Create liquid stack", exact: true })
    .click();
  await expect(page.locator(".stack-choice")).toHaveCount(1);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  const example = path.resolve("examples/Liquid-cascade.luma");
  await app.evaluate(({ dialog }, filePath) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] }); }, example);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue("Liquid cascade loop");
  await expect(page.locator(".surface-outline")).toHaveCount(3);
  await page.getByRole("button", { name: "Restart animation", exact: true }).click();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Pause animation", exact: true }).click();
  await page.getByRole("tab", { name: "Effect", exact: true }).click();
  await page.screenshot({ path: path.join(artifacts, "luma-packaged.png") });
  await page.getByRole("button", { name: "Launch output", exact: true }).click();
  await page.locator(".display-option").filter({ hasText: "Primary display" }).click();
  await page.getByLabel("Projection wireframe", { exact: true }).selectOption("off");
  const outputPromise = app.waitForEvent("window", { timeout: 15000 });
  await page.getByRole("button", { name: "Open output preview", exact: true }).click();
  const output = await outputPromise;
  await expect(output.locator(".projection-canvas")).toBeVisible();
  await output.screenshot({ path: path.join(artifacts, "luma-liquid-example.png") });
  expect(errors).toEqual([]);
  console.log(
    "PASS: packaged Windows app loads its bundled app, creates a stack, opens the liquid example and projects its synchronized scene.",
  );
} finally {
  await app.close();
}
