import { _electron as electron, expect } from "@playwright/test";
import { createServer } from "vite";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  readdir,
  rename,
} from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { recordVideoFixture } from "./media-fixtures.mjs";

await mkdir("test-results", { recursive: true });
const artifacts = await mkdtemp(path.resolve("test-results/scene-workflow-"));
const profile = path.join(artifacts, "profile"),
  packaged = process.argv.includes("--packaged");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.VITE_DEV_SERVER_URL;
let app, server, page, output;
const checks = [],
  errors = [];
const check = (message) => {
  checks.push(message);
  console.log(`PASS: ${message}`);
};
const rect = (x, y, w, h) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];
const surface = (id, name, points) => ({
  id,
  name,
  kind: "quad",
  points,
  effectId: "aurora",
  color: "#ffffff",
  colorCycle: false,
  opacity: 1,
  speed: 1,
  scale: 1,
  feather: 0,
  visible: true,
  locked: false,
  blend: "normal",
  seed: 0,
});
const fixture = {
  version: 1,
  name: "Scene alignment test",
  width: 640,
  height: 360,
  brightness: 1,
  stacks: [],
  surfaces: [
    surface("left", "Left box", rect(0, 0, 0.5, 1)),
    surface("right", "Right box", rect(0.5, 0, 0.5, 1)),
    {
      ...surface("hole", "Window hole", rect(0.2, 0.4, 0.1, 0.2)),
      cutoutOf: "left",
    },
  ],
};
const fixturePath = path.join(artifacts, "Props.luma"),
  photoPath = path.join(artifacts, "Reference props.png"),
  clipPath = path.join(artifacts, "Original split scene.mp4"),
  savePath = path.join(artifacts, "Animated props.luma");
await writeFile(fixturePath, JSON.stringify(fixture));
const png = new PNG({ width: 320, height: 180 });
for (let i = 0; i < png.data.length; i += 4) {
  png.data[i] = 210;
  png.data[i + 1] = 160;
  png.data[i + 2] = 40;
  png.data[i + 3] = 255;
}
await writeFile(photoPath, PNG.sync.write(png));
const choose = (file) =>
  app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({
      canceled: !file,
      filePaths: file ? [file] : [],
    });
  }, file);
const openScene = () =>
  page.getByRole("button", { name: /^Scene Animator/ }).click();
const closeScene = () =>
  page.getByRole("button", { name: "Close dialog", exact: true }).click();
const getState = () => output.evaluate(() => window.luma.getOutputState());
const frame = async (target) =>
  PNG.sync.read(await target.locator(".projection-canvas").screenshot());
const pixel = (image, x, y) => [
  ...image.data.subarray(
    (Math.round(y * (image.height - 1)) * image.width +
      Math.round(x * (image.width - 1))) *
      4,
    (Math.round(y * (image.height - 1)) * image.width +
      Math.round(x * (image.width - 1))) *
      4 +
      3,
  ),
];
const save = async () => {
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, savePath);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("Project saved");
  return JSON.parse(await readFile(savePath, "utf8"));
};
const launch = async () => {
  app = await electron.launch({
    ...(packaged
      ? {
          executablePath: path.resolve(
            process.env.LUMA_RELEASE_DIR || "release/1.19.0",
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
  app.on("window", (p) => p.on("pageerror", (e) => errors.push(e.message)));
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  await expect(page.locator(".stage-overlay")).toBeVisible({ timeout: 30000 });
};
try {
  if (!packaged) {
    server = await createServer({
      server: { host: "127.0.0.1", port: 0 },
      logLevel: "error",
    });
    await server.listen();
    env.VITE_DEV_SERVER_URL = `http://127.0.0.1:${server.httpServer.address().port}`;
  }
  await launch();
  await choose(fixturePath);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("Scene alignment test");
  await writeFile(clipPath, await recordVideoFixture(page, true));
  const jpegPath = path.join(artifacts, "Reference props.jpg");
  const prepared = await app.evaluate(
    ({ app, nativeImage }, { photoPath, jpegPath }) => {
      const fs = process.getBuiltinModule("node:fs"),
        path = process.getBuiltinModule("node:path");
      const require = process
        .getBuiltinModule("node:module")
        .createRequire(path.join(app.getAppPath(), "package.json"));
      const source = nativeImage
        .createFromPath(photoPath)
        .resize({ width: 317, height: 191 });
      fs.writeFileSync(jpegPath, source.toJPEG(90));
      const prepared = require("./electron/scene-ai.cjs").preparePhoto(
        source.toPNG(),
        { width: 317, height: 191 },
        nativeImage,
      );
      const actual = nativeImage
        .createFromBuffer(
          Buffer.from(prepared.promptImage.split(",")[1], "base64"),
        )
        .getSize();
      return { ratio: prepared.ratio, actual };
    },
    { photoPath, jpegPath },
  );
  expect(`${prepared.actual.width}:${prepared.actual.height}`).toBe(
    prepared.ratio,
  );
  await choose(jpegPath);
  const jpegImport = await page.evaluate(() => window.luma.importScenePhoto());
  expect(jpegImport.photo).toMatchObject({
    width: 317,
    height: 191,
    format: "png",
  });
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await openScene();
  await choose(photoPath);
  await page.getByRole("button", { name: "Choose JPG or PNG photo" }).click();
  await expect(page.locator(".scene-photo-name")).toContainText(
    "Reference props.png",
  );
  await expect
    .poll(() =>
      page.locator(".scene-load-check").evaluate((img) => img.naturalWidth),
    )
    .toBe(320);
  await page.getByLabel("Top left photo X", { exact: true }).fill("25");
  await page.getByLabel("Top left photo X", { exact: true }).press("Tab");
  await closeScene();
  await page.keyboard.press("Control+z");
  await openScene();
  await expect(
    page.getByLabel("Top left photo X", { exact: true }),
  ).toHaveValue("0");
  const handle = page.getByLabel("Top left photo handle"),
    box = await handle.boundingBox();
  await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2 + 3);
  await page.mouse.down();
  await page.mouse.move(box.x + 35, box.y + 20, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () =>
      Number(
        await page.getByLabel("Top left photo X", { exact: true }).inputValue(),
      ),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Reset photo to fit" }).click();
  check(
    "Native JPG/PNG reference import, numeric alignment, drag handles and undo work",
  );
  const nativeWindow = await app.browserWindow(page);
  await nativeWindow.evaluate((win) => win.setSize(1120, 760));
  await expect(
    page.getByRole("button", { name: "Next: create animation" }),
  ).toBeInViewport();
  await expect(page.locator(".scene-prop-list input").first()).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: path.join(artifacts, "scene-align-1120.png") });
  await closeScene();

  const referenceRow = page.getByRole("button", {
    name: "Select reference photo",
    exact: true,
  });
  await expect(referenceRow).toContainText("Reference props.png");
  await referenceRow.click();
  await expect(
    page.getByRole("complementary", { name: "Reference photo properties" }),
  ).toBeVisible();
  await expect(page.locator(".vertex-handle")).toHaveCount(4);
  const setPhotoField = async (name, value) => {
    await page.getByLabel(name, { exact: true }).fill(String(value));
    await page.getByLabel(name, { exact: true }).press("Enter");
  };
  await setPhotoField("Photo width", 512);
  await setPhotoField("Photo height", 288);
  await setPhotoField("Photo X", 64);
  await setPhotoField("Photo Y", 36);
  const stageArea = await page.locator(".stage-overlay").boundingBox();
  await page.mouse.move(
    stageArea.x + stageArea.width * 0.5,
    stageArea.y + stageArea.height * 0.5,
  );
  await page.mouse.down();
  await page.mouse.move(
    stageArea.x + stageArea.width * 0.54,
    stageArea.y + stageArea.height * 0.54,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect
    .poll(async () =>
      Number(await page.getByLabel("Photo X", { exact: true }).inputValue()),
    )
    .toBeGreaterThan(64);
  await page.keyboard.press("Control+z");
  await expect(page.getByLabel("Photo X", { exact: true })).toHaveValue("64");
  await expect(page.getByLabel("Photo Y", { exact: true })).toHaveValue("36");
  await page.getByRole("button", { name: "Corner 1", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Photo corner X", { exact: true })).toHaveValue(
    "65",
  );
  await page.keyboard.press("Control+z");
  await expect(page.getByLabel("Photo corner X", { exact: true })).toHaveValue(
    "64",
  );
  await page
    .getByRole("button", { name: "Hide reference photo", exact: true })
    .click();
  await expect(page.locator(".reference-photo-outline")).toHaveCount(0);
  await expect(referenceRow).toBeVisible();
  await page
    .getByRole("button", { name: "Show reference photo", exact: true })
    .click();
  await expect(page.locator(".vertex-handle")).toHaveCount(4);
  await page.getByLabel("Reference photo opacity", { exact: true }).fill("0.4");
  await page
    .getByRole("button", { name: "Remove reference photo", exact: true })
    .click();
  await expect(referenceRow).toHaveCount(0);
  await page.keyboard.press("Control+z");
  await referenceRow.click();
  await expect(
    page.getByLabel("Reference photo opacity", { exact: true }),
  ).toHaveValue("0.4");
  await page
    .getByRole("button", { name: "Fit photo to canvas", exact: true })
    .click();
  await expect(page.getByLabel("Photo width", { exact: true })).toHaveValue(
    "640",
  );
  await page.screenshot({
    path: path.join(artifacts, "reference-photo-properties-1120.png"),
  });
  await page
    .getByRole("button", { name: "Select Left box", exact: true })
    .click();
  check(
    "Reference photo appears in the object list with canvas dragging, corner nudging, size, opacity, visibility, removal and undo",
  );

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
  const opening = app.waitForEvent("window");
  await page
    .getByRole("button", { name: "Open output preview", exact: true })
    .click();
  output = await opening;
  await expect(output.locator(".projection-canvas")).toBeVisible();
  await openScene();
  await page.getByLabel("Show photo on projector", { exact: true }).check();
  await expect.poll(async () => (await getState()).scenePhoto).toBe(true);
  await page.getByLabel("Photo opacity", { exact: true }).fill("1");
  await expect
    .poll(async () => pixel(await frame(output), 0.7, 0.5)[0])
    .toBeGreaterThan(190);
  await page.getByLabel("Show photo on projector", { exact: true }).uncheck();
  await expect.poll(async () => (await getState()).scenePhoto).toBe(false);
  check(
    "Photo projector toggle reaches the real output independently of editor visibility",
  );

  // Inject only the transport in the real native generation controller. No
  // production test flags, paid calls or third-party assets are involved.
  await app.evaluate(
    async (_electron, { clipPath }) => {
      const fs = process.getBuiltinModule("node:fs/promises");
      const bytes = await fs.readFile(clipPath);
      globalThis.fetch = async (url, options) => {
        if (options.method === "POST") {
          const body = JSON.parse(options.body);
          if (
            body.model !== "gen4.5" ||
            !body.promptImage.startsWith("data:image/jpeg;base64,") ||
            body.promptText.length > 1000
          )
            throw Error("Invalid provider request");
          return new Response(JSON.stringify({ id: "native-mocked-task" }));
        }
        if (url.includes("/tasks/"))
          return new Response(
            JSON.stringify({
              id: "native-mocked-task",
              status: "SUCCEEDED",
              output: ["https://fixture.cloudfront.net/output.mp4"],
            }),
          );
        if (options.headers)
          throw Error("API credentials must not reach download hosts");
        return new Response(bytes);
      };
    },
    { profile, clipPath },
  );
  await page.getByRole("button", { name: "Next: create animation" }).click();
  await page
    .getByLabel("Scene animation prompt", { exact: true })
    .fill("Little ghosts move from the left box to the right box and return.");
  await page
    .getByLabel("Runway API key", { exact: true })
    .fill("scene_workflow_fake_key_only");
  await page.getByRole("button", { name: "Use key for this session" }).click();
  await expect(page.locator(".scene-connection")).toContainText(
    "Key added for this session",
  );
  const generate = page.getByRole("button", {
    name: "Generate variation",
    exact: true,
  });
  await expect(generate).toBeDisabled();
  await page.locator(".scene-consent input").check();
  await expect(generate).toBeEnabled();
  await page.screenshot({
    path: path.join(artifacts, "scene-create-1120.png"),
  });
  await generate.click();
  await expect(page.locator(".scene-jobs")).toContainText("Ready to preview", {
    timeout: 25000,
  });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator(".scene-controls .media-status")).toContainText(
    "Ready",
    { timeout: 25000 },
  );
  await page
    .getByRole("button", { name: "Pause preview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restart preview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply to 2 props" }),
  ).toBeInViewport();
  const preview = page.locator(".scene-preview");
  await expect
    .poll(async () => pixel(await frame(preview), 0.1, 0.5)[0], {
      timeout: 15000,
    })
    .toBeGreaterThan(210);
  expect(pixel(await frame(preview), 0.75, 0.5)[2]).toBeGreaterThan(210);
  expect(Math.max(...pixel(await frame(preview), 0.25, 0.5))).toBeLessThan(4);
  expect((await getState()).project.surfaces[0].effectId).toBe("aurora");
  await page.screenshot({
    path: path.join(artifacts, "scene-review-1120.png"),
  });
  check(
    "Mocked Runway transport exercises real prompt, consent, key, generation, local MP4 download and preview without applying live",
  );
  await page.getByRole("button", { name: "Apply to 2 props" }).click();
  await expect
    .poll(async () => (await getState()).project.surfaces[0].effectId)
    .toBe("imported-media");
  await page
    .getByRole("button", { name: "Restart animation", exact: true })
    .click();
  await expect
    .poll(async () => pixel(await frame(output), 0.1, 0.5)[0], {
      timeout: 15000,
    })
    .toBeGreaterThan(210);
  expect(pixel(await frame(output), 0.75, 0.5)[2]).toBeGreaterThan(210);
  expect(Math.max(...pixel(await frame(output), 0.25, 0.5))).toBeLessThan(4);
  const before = await frame(output);
  await new Promise((r) => setTimeout(r, 350));
  const after = await frame(output);
  expect(pixel(before, 0.1, 0.5)).toEqual(pixel(after, 0.1, 0.5));
  expect((await getState()).scenePhoto).toBe(false);
  await output.screenshot({ path: path.join(artifacts, "scene-output.png") });
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  await expect
    .poll(async () => pixel(await frame(output), 0.1, 0.5)[1], {
      timeout: 12000,
    })
    .toBeGreaterThan(210);
  expect(pixel(await frame(output), 0.75, 0.5)[0]).toBeGreaterThan(210);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restart animation", exact: true })
    .click();
  check(
    "Two props show different sections of one animated scene, holes remain black, pause and restart agree in the real projector",
  );
  await page.getByRole("button", { name: "Blackout B", exact: true }).click();
  await expect
    .poll(async () => Math.max(...pixel(await frame(output), 0.1, 0.5)))
    .toBe(0);
  await page.getByRole("button", { name: "Blackout B", exact: true }).click();
  let saved = await save();
  expect(saved.version).toBe(1);
  expect(saved.surfaces[0].media.sceneMapping).toEqual(
    saved.surfaces[1].media.sceneMapping,
  );
  expect(await readdir(`${savePath}.media`)).toHaveLength(2);
  expect(JSON.stringify(saved)).not.toContain("scene_workflow_fake_key_only");
  expect(JSON.stringify(saved)).not.toContain(profile);
  expect(
    await readFile(path.join(profile, "scene-jobs/jobs.json"), "utf8"),
  ).not.toContain("scene_workflow_fake_key_only");

  await openScene();
  await page.getByRole("button", { name: "3 Preview & apply" }).click();
  await choose(clipPath);
  await page
    .getByRole("button", { name: "Import MP4 or GIF for this scene" })
    .click();
  await expect(page.locator(".scene-controls .media-status")).toContainText(
    "Ready",
  );
  await closeScene();
  await openScene();
  await page.getByLabel("Show photo on projector", { exact: true }).check();
  await closeScene();
  await save();
  await choose(savePath);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await expect.poll(async () => (await getState()).scenePhoto).toBe(false);
  check(
    "External clip import uses the same shared mapping; project reopen resets the session-only photo output toggle",
  );
  await app.close();
  app = null;
  // Rename only directories owned by this unique test, preserving evidence.
  await rename(
    path.join(profile, "scene-photos"),
    path.join(profile, "scene-photos-backup"),
  );
  await rename(path.join(profile, "media"), path.join(profile, "media-backup"));
  await launch();
  expect(
    (await page.evaluate(() => window.luma.sceneAiStatus())).configured,
  ).toBe(false);
  await choose(savePath);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await openScene();
  await expect
    .poll(() =>
      page.locator(".scene-load-check").evaluate((img) => img.naturalWidth),
    )
    .toBe(320);
  expect(await page.evaluate(() => window.luma.listMedia())).toHaveLength(1);
  await expect(
    page.getByLabel("Show photo on projector", { exact: true }),
  ).not.toBeChecked();
  check(
    "Photo and animation companion files restore into a missing local library; API keys do not survive restart",
  );
  expect(errors).toEqual([]);
  await writeFile(
    path.join(artifacts, "report.json"),
    JSON.stringify({ packaged, checks, errors, liveRunway: false }, null, 2),
  );
  console.log(`Scene workflow passed. Artifacts: ${artifacts}`);
} finally {
  if (app) {
    const child = app.process(),
      timer = setTimeout(() => {
        if (child.exitCode === null) child.kill();
      }, 10000);
    try {
      await app.close();
    } finally {
      clearTimeout(timer);
    }
  }
  if (server) await server.close();
}
