import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "portal-workflow-profile-"));
const fixture = JSON.parse(
  await readFile("examples/Portal-journey.luma", "utf8"),
);
const loose = { ...fixture, stacks: [], name: "Portal tiles to link" };
const fixturePath = path.join(profile, "loose.luma"),
  savedPath = path.join(profile, "saved.luma");
await writeFile(fixturePath, JSON.stringify(loose));
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
let page, output;
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await app.evaluate(
    ({ dialog, clipboard }, { fixturePath, savedPath }) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [fixturePath],
      });
      dialog.showSaveDialog = async () => ({
        canceled: false,
        filePath: savedPath,
      });
      let memory = "";
      clipboard.readText = async () => memory;
      clipboard.writeText = async (value) => {
        memory = value;
      };
    },
    { fixturePath, savedPath },
  );
  const click = (name) =>
    page.getByRole("button", { name, exact: true }).click();
  const shortcut = async (key) => {
    await page.locator(".panel-heading").first().click();
    await page.keyboard.press(key);
  };
  const number = async (label, value) => {
    const input = page.getByLabel(label, { exact: true });
    await input.fill(String(value));
    await input.press("Enter");
  };
  await click("Open project");
  await click("Pause animation");
  await click("Restart animation");
  await page.getByRole("tab", { name: "Effect", exact: true }).click();
  await click("Link portal tiles");
  await expect(
    page.getByRole("button", { name: "Portal journey", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const s of fixture.surfaces)
    await page.getByLabel(`Include ${s.name}`, { exact: true }).check();
  await page.getByLabel("Stack name", { exact: true }).fill("Portal circuit");
  await click(`Move ${fixture.surfaces[2].name} earlier`);
  await click("Save stack");
  await click("Close dialog");
  await click("Launch output");
  await page
    .locator(".display-option")
    .filter({ hasText: "Primary display" })
    .click();
  await page
    .getByLabel("Projection wireframe", { exact: true })
    .selectOption("off");
  const opened = app.waitForEvent("window");
  await click("Open output preview");
  output = await opened;
  await expect(output.locator(".projection-canvas")).toBeVisible();
  const state = () => output.evaluate(() => window.luma.getOutputState());
  const project = async () => (await state()).project;
  const selected = async () =>
    (await project()).surfaces.find((s) => s.id === fixture.surfaces[0].id);
  await expect
    .poll(async () => (await project()).stacks[0].surfaceIds)
    .toEqual([
      fixture.surfaces[0].id,
      fixture.surfaces[2].id,
      fixture.surfaces[1].id,
    ]);
  const contentOnly = {
    style:
      ".output-wireframe,.projection-pointer,.stage-overlay,.canvas-instruction,.stage-coordinate{visibility:hidden!important}",
  };
  const shot = async () =>
    PNG.sync.read(
      await output.locator(".projection-canvas").screenshot(contentOnly),
    );
  const initial = await shot();
  const shapeBefore = await selected();
  await number("Content rotation", 37.5);
  await number("Horizontal offset", 18.25);
  await number("Vertical offset", -12.75);
  const desired = { rotation: 37.5, offsetX: 0.1825, offsetY: -0.1275 };
  await expect(
    page.getByLabel("Content rotation", { exact: true }),
  ).toHaveValue("37.5");
  await expect(
    page.getByLabel("Horizontal offset", { exact: true }),
  ).toHaveValue("18.25");
  await expect(page.getByLabel("Vertical offset", { exact: true })).toHaveValue(
    "-12.75",
  );
  await expect
    .poll(async () => (await selected()).contentTransform)
    .toEqual(desired);
  expect((await selected()).points).toEqual(shapeBefore.points);
  expect((await shot()).data.equals(initial.data)).toBe(false);
  await click("Reset content position");
  await expect
    .poll(async () => (await selected()).contentTransform)
    .toBeUndefined();
  await shortcut("Control+z");
  await expect
    .poll(async () => (await selected()).contentTransform)
    .toEqual(desired);
  await click("Rotate content right 90 degrees");
  await expect
    .poll(async () => (await selected()).contentTransform.rotation)
    .toBe(127.5);
  await click("Rotate content left 90 degrees");
  await expect
    .poll(async () => (await selected()).contentTransform)
    .toEqual(desired);
  await click("Copy");
  await click("Paste in place");
  await expect.poll(async () => (await project()).surfaces.length).toBe(4);
  expect((await project()).surfaces.at(-1).contentTransform).toEqual(desired);
  expect((await project()).stacks[0].surfaceIds).not.toContain(
    (await project()).surfaces.at(-1).id,
  );
  await shortcut("Control+z");
  await expect.poll(async () => (await project()).surfaces.length).toBe(3);
  await click(`Select ${fixture.surfaces[0].name}`);
  console.log(
    "PASS rotation and both offsets update paused native output, preserve geometry, support reset, Undo, 90 degree steps and copy/paste.",
  );

  for (const character of ["robot", "alien", "cat"]) {
    await page.getByRole("tab", { name: "Effect", exact: true }).click();
    await click("Edit portal journey");
    await page
      .getByLabel("Portal character", { exact: true })
      .selectOption(character);
    await page
      .getByLabel("Portal direction", { exact: true })
      .selectOption("right");
    await page.getByLabel("Stack duration", { exact: true }).fill("30");
    await page.getByLabel("Portal character size", { exact: true }).fill("1.2");
    await click("Save stack");
    await click("Close dialog");
    await expect
      .poll(async () => (await project()).stacks[0].character)
      .toBe(character);
    expect((await project()).stacks[0]).toMatchObject({
      direction: "right",
      duration: 30,
      scale: 1.2,
    });
    expect((await selected()).contentTransform).toEqual(desired);
  }
  const preserved = await project();
  await click("Save project");
  await expect
    .poll(async () => JSON.parse(await readFile(savedPath, "utf8")))
    .toEqual(preserved);
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("luma-project-v1"))),
    )
    .toEqual(preserved);
  await page.reload();
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await expect.poll(project).toEqual(preserved);
  await app.evaluate(({ dialog }, savedPath) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [savedPath],
    });
  }, savedPath);
  await click("Open project");
  await expect.poll(project).toEqual(preserved);
  await click(`Select ${fixture.surfaces[0].name}`);
  await page.getByRole("tab", { name: "Effect", exact: true }).click();
  await click("Lock layer Layer 1");
  await expect(
    page.getByLabel("Content rotation", { exact: true }),
  ).toBeDisabled();
  await click("Unlock layer Layer 1");
  const beforeCreate = await project();
  await click("Edit portal journey");
  await click("Create portal journey");
  await expect(page.locator(".stack-choice")).toHaveCount(2);
  await expect.poll(async () => (await project()).surfaces.length).toBe(6);
  const created = await project();
  expect(created.stacks[1].character).toBe("cat");
  await click("Close dialog");
  await shortcut("Control+z");
  await expect.poll(project).toEqual(beforeCreate);
  console.log(
    "PASS link existing tiles, reorder route, all three explorers, reverse, duration, size, separate content positions, save/open/recovery, locked layers and ready-made portal creation.",
  );

  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => !w.webContents.getURL().includes("output=1"))
      .setSize(1120, 760),
  );
  await page.bringToFront();
  await click(`Select ${fixture.surfaces[0].name}`);
  await page.getByRole("tab", { name: "Effect", exact: true }).click();
  await page
    .getByLabel("Content rotation", { exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByLabel("Horizontal offset", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Vertical offset", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(artifacts, "content-placement-ui.png"),
  });
  await click("Edit portal journey");
  await page
    .getByRole("button", { name: "Portal journey", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Portal journey", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: path.join(artifacts, "portal-editor-ui.png") });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
  await writeFile(
    path.join(artifacts, `portal-workflow${packaged ? "-packaged" : ""}.json`),
    JSON.stringify(
      { passed: true, packaged, errors, checkedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log("PASS minimum window layout and no renderer errors.");
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({ path: path.join(artifacts, "portal-workflow-failure.png") })
      .catch(() => {});
  throw error;
} finally {
  await app.close();
}
