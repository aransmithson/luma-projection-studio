import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";

// NSIS starts Electron as a child process, so use its localhost debug port
// instead of expecting Electron's inspector messages on the launcher's stderr.
const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "portable-profile-"));
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
const child = spawn(
  path.resolve(
    process.env.LUMA_RELEASE_DIR || "release",
    `Nox-Projection-Studio-${version}.exe`,
  ),
  [`--user-data-dir=${profile}`, "--remote-debugging-port=0"],
  { env, windowsHide: true, stdio: "ignore" },
);
let browser, spawnError;
child.on("error", (error) => {
  spawnError = error;
});
try {
  let port;
  // Flat-file portable extraction can take more than 30 seconds on Windows.
  for (let attempt = 0; attempt < 300; attempt++) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null)
      throw new Error(`Portable launcher exited early: ${child.exitCode}`);
    try {
      port = (
        await readFile(path.join(profile, "DevToolsActivePort"), "utf8")
      ).split(/\r?\n/)[0];
    } catch {
      /* Extraction and Chromium startup are still in progress. */
    }
    if (port) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!port)
    throw new Error(
      "The portable app did not start its renderer within 60 seconds.",
    );
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  const page = context.pages()[0] || (await context.waitForEvent("page"));
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(
    page.getByRole("heading", { name: "Map your space." }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".surface-outline")).toHaveCount(6);
  await expect(page.locator(".effect-card")).toHaveCount(176);
  await expect(page.locator(".render-error")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Placement mesh", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("m");
  await expect(
    page.getByRole("button", { name: "Placement mesh", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("button", { name: "Edit individual corners", exact: true })
    .click();
  await expect(page.getByLabel("Corner X", { exact: true })).toHaveValue("960");
  await page
    .getByRole("button", { name: "Curve this edge", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Bézier handle 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Solo Roofline", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Stop solo Roofline", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Launch output", exact: true })
    .click();
  await expect(page.locator(".display-option").first()).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Architecture", exact: true }).click();
  await expect(page.locator(".effect-card")).toHaveCount(10);
  await page
    .getByRole("button", { name: "Apply Prismatic relief", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Effect", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Geometric", exact: true }).click();
  await page
    .getByRole("button", { name: "Apply Edge runner", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Light width", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Stacked animations", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Create liquid stack", exact: true })
    .click();
  await expect(page.locator(".stack-choice")).toHaveCount(1);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.screenshot({ path: path.join(artifacts, "luma-portable.png") });
  expect(errors).toEqual([]);
  console.log(
    `PASS: portable ${version} extracts, toggles placement mesh, edits Bézier edges, applies architecture and Edge runner effects, creates a liquid stack and detects displays.`,
  );
} finally {
  if (browser) {
    for (const context of browser.contexts())
      for (const page of context.pages()) await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  if (child.exitCode === null) {
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 5000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    if (child.exitCode === null) child.kill();
  }
}
