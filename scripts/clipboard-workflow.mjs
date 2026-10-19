import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "clipboard-profile-"));
const fixture = JSON.parse(await readFile("examples/Edge-runner.luma", "utf8"));
const source = {
  ...fixture.surfaces[0],
  id: "clipboard-parent",
  name: "Clipboard facade",
  kind: "quad",
  points: [
    { x: 0.2, y: 0.2 },
    { x: 0.7, y: 0.2 },
    { x: 0.7, y: 0.8 },
    { x: 0.2, y: 0.8 },
  ],
  curves: [
    { control1: { x: 0.35, y: 0.1 }, control2: { x: 0.55, y: 0.1 } },
    null,
    null,
    null,
  ],
};
const hole = {
  ...fixture.surfaces[0],
  id: "clipboard-hole",
  name: "Clipboard hole",
  kind: "quad",
  points: [
    { x: 0.35, y: 0.4 },
    { x: 0.5, y: 0.4 },
    { x: 0.5, y: 0.6 },
    { x: 0.35, y: 0.6 },
  ],
  curves: undefined,
  cutoutOf: source.id,
};
fixture.name = "Native clipboard check";
fixture.surfaces = [source, hole];
fixture.stacks = [];
const fixturePath = path.join(profile, "fixture.luma");
await writeFile(fixturePath, JSON.stringify(fixture));
const packaged = process.argv.includes("--packaged"),
  expectBroken = process.argv.includes("--expect-broken");
const env = { ...process.env };
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
let page,
  backedUp = false,
  restored = false;
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  await expect(page.locator(".stage-overlay")).toBeVisible();
  // Snapshot every format in memory, including raw Windows formats. Never log clipboard contents.
  // The clipboard implementation itself is not mocked or patched in this workflow.
  await app.evaluate(
    async ({ clipboard, ClipboardItem, dialog }, fixturePath) => {
      const items = await clipboard.read();
      const backup = await Promise.all(
        items.map(async (item) => {
          const formats = {};
          for (const type of item.types)
            formats[type] = await item.getType(type);
          return new ClipboardItem(formats);
        }),
      );
      globalThis.__lumaClipboardTest = { backup, owned: new Set() };
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [fixturePath],
      });
    },
    fixturePath,
  );
  backedUp = true;
  const click = (name) =>
    page.getByRole("button", { name, exact: true }).click();
  await click("Open project");
  await click("Select Clipboard facade");
  await click("Copy");
  await expect(page.locator(".toast")).toContainText("Shape copied");
  const probe = await app.evaluate(async ({ clipboard }) => {
    const pending = clipboard.readText();
    const isPromise = pending instanceof Promise;
    const text = await pending;
    if (
      text.startsWith("LUMA_SHAPES_V1\n") &&
      JSON.parse(text.slice(15)).surfaces[0].id === "clipboard-parent"
    )
      globalThis.__lumaClipboardTest.owned.add(text);
    return {
      isPromise,
      hasShape: text.startsWith("LUMA_SHAPES_V1\n"),
      shapeCount: text.startsWith("LUMA_SHAPES_V1\n")
        ? JSON.parse(text.slice(15)).surfaces.length
        : 0,
    };
  });
  expect(probe.isPromise).toBe(true);
  expect(probe.hasShape).toBe(true);
  expect(probe.shapeCount).toBe(2);
  const bridgeHasShape = await page.evaluate(async () =>
    (await window.luma.pasteShapes()).startsWith("LUMA_SHAPES_V1\n"),
  );
  if (expectBroken) {
    expect(bridgeHasShape).toBe(false);
    await click("Paste");
    await expect(page.locator(".toast")).toContainText(
      "Copy a Nox shape before pasting",
    );
    await expect(page.locator(".layer-row")).toHaveCount(2);
    console.log(
      "REPRODUCED: real clipboard contains two copied shapes; the 1.12.0 paste handler discards the asynchronous read and reports an empty clipboard.",
    );
  } else {
    expect(bridgeHasShape).toBe(true);
    await click("Paste");
    await expect(page.locator(".layer-row")).toHaveCount(4);
    await expect(page.locator(".toast")).toContainText(
      "Shape pasted into the active layer",
    );
    await page.keyboard.press("Control+z");
    await expect(page.locator(".layer-row")).toHaveCount(2);
    await click("Select Clipboard facade");
    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");
    await expect(page.locator(".layer-row")).toHaveCount(4);
    await page.keyboard.press("Control+Shift+v");
    await expect(page.locator(".layer-row")).toHaveCount(6);
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const p = JSON.parse(localStorage.getItem("luma-project-v1"));
          return (
            p?.surfaces.length === 6 && p.surfaces[0].id === "clipboard-parent"
          );
        }),
      )
      .toBe(true);
    const pasted = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("luma-project-v1")),
    );
    const [parent, child] = pasted.surfaces.slice(-2);
    expect(parent.points).toEqual(source.points);
    expect(parent.curves).toEqual(source.curves);
    expect(parent.effectId).toBe(source.effectId);
    expect(parent.id).not.toBe(source.id);
    expect(child.cutoutOf).toBe(parent.id);
    await page.keyboard.press("Control+z");
    await expect(page.locator(".layer-row")).toHaveCount(4);
    await page.keyboard.press("Control+y");
    await expect(page.locator(".layer-row")).toHaveCount(6);
    expect(errors).toEqual([]);
    console.log(
      "PASS: real Windows clipboard copy/paste buttons, immediate Ctrl+C/Ctrl+V, paste in place, curves, holes and undo/redo.",
    );
  }
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({
        path: path.join(artifacts, "clipboard-failure.png"),
        timeout: 5000,
      })
      .catch(() => {});
  throw error;
} finally {
  try {
    if (backedUp)
      restored = await app.evaluate(async ({ clipboard }) => {
        const saved = globalThis.__lumaClipboardTest;
        const current = await clipboard.readText();
        // If the user copied something else meanwhile, leave that new clipboard alone.
        if (!saved.owned.has(current)) return false;
        if (saved.backup.length) await clipboard.write(saved.backup);
        else clipboard.clear();
        delete globalThis.__lumaClipboardTest;
        return true;
      });
  } finally {
    await app.close();
  }
}
await writeFile(
  path.join(
    artifacts,
    `clipboard-workflow${expectBroken ? "-reproduced" : packaged ? "-packaged" : ""}.json`,
  ),
  JSON.stringify(
    {
      passed: true,
      reproduced: expectBroken,
      packaged,
      realWindowsClipboard: true,
      originalClipboardRestored: restored,
      errors,
      checkedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
