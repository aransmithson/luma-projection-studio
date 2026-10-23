import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "cutouts-profile-"));
const original = JSON.parse(
  await readFile("examples/Edge-runner.luma", "utf8"),
);
const rect = (x, y, w, h) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];
const base = original.surfaces[0];
const surface = (id, name, points, effectId, color, kind = "quad") => ({
  ...base,
  id,
  name,
  points,
  effectId,
  color,
  kind,
  curves: undefined,
  opacity: 1,
  feather: 0,
  visible: true,
  locked: false,
  colorCycle: false,
  scale: 1,
  speed: 1,
});
const fixture = {
  version: 1,
  name: "Cutout verification",
  width: 1280,
  height: 720,
  brightness: 1,
  stacks: [],
  surfaces: [
    surface(
      "backdrop",
      "Backdrop",
      rect(0.03, 0.03, 0.94, 0.94),
      "limestone",
      "#65b5a1",
    ),
    surface(
      "facade",
      "Facade",
      rect(0.15, 0.12, 0.7, 0.76),
      "red-brick",
      "#b65c3c",
    ),
    surface(
      "window",
      "Window cutter",
      rect(0.28, 0.26, 0.2, 0.3),
      "concrete",
      "#c8cbd0",
    ),
    surface(
      "round",
      "Round cutter",
      Array.from({ length: 48 }, (_, i) => ({
        x: 0.65 + 0.11 * Math.cos((i * Math.PI) / 24),
        y: 0.4 + 0.15 * Math.sin((i * Math.PI) / 24),
      })),
      "slate",
      "#7182ad",
      "ellipse",
    ),
    surface(
      "overlap",
      "Overlap cutter",
      rect(0.4, 0.43, 0.24, 0.22),
      "timber",
      "#b19262",
    ),
  ],
};
const fixturePath = path.join(profile, "fixture.luma");
await writeFile(fixturePath, JSON.stringify(fixture));
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
let page, output;
const errors = [];
app.on("window", (p) =>
  p.on("pageerror", (error) => errors.push(error.message)),
);
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [filePath],
    });
  }, fixturePath);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
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
  const outputPromise = app.waitForEvent("window");
  await page
    .getByRole("button", { name: "Open output preview", exact: true })
    .click();
  output = await outputPromise;
  await expect(output.locator(".projection-canvas")).toBeVisible();
  const getState = () => output.evaluate(() => window.luma.getOutputState());
  const snapshot = async () =>
    PNG.sync.read(await output.locator(".projection-canvas").screenshot());
  const pixel = (png, x, y) => [
    ...png.data.subarray(
      (Math.floor(y * png.height) * png.width + Math.floor(x * png.width)) * 4,
      (Math.floor(y * png.height) * png.width + Math.floor(x * png.width)) * 4 +
        3,
    ),
  ];
  const blackAt = async (x, y) =>
    expect
      .poll(async () => pixel(await snapshot(), x, y).every((v) => v < 2))
      .toBe(true);
  const select = async (name) => {
    await page
      .getByRole("button", { name: `Select ${name}`, exact: true })
      .click();
    await page.getByRole("tab", { name: "Surface", exact: true }).click();
    await expect(
      page.getByRole("tab", { name: "Surface", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
  };
  await select("Facade");
  for (const id of ["window", "round", "overlap"]) {
    await page.getByLabel("Shape to subtract").selectOption(id);
    await page
      .getByRole("button", { name: "Subtract shape", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await getState()).project.surfaces.find((s) => s.id === id).cutoutOf,
      )
      .toBe("facade");
  }
  await expect(page.locator(".cutout-outline")).toHaveCount(3);
  const withBackground = await snapshot();
  await page.getByRole("button", { name: "Hide Facade", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await getState()).project.surfaces.find((s) => s.id === "facade")
          .visible,
    )
    .toBe(false);
  const backgroundOnly = await snapshot();
  expect(pixel(withBackground, 0.35, 0.36)).toEqual(
    pixel(backgroundOnly, 0.35, 0.36),
  );
  expect(pixel(withBackground, 0.65, 0.4)).toEqual(
    pixel(backgroundOnly, 0.65, 0.4),
  );
  await expect(page.locator(".cutout-outline")).toHaveCount(0);
  await page.getByRole("button", { name: "Show Facade", exact: true }).click();
  await page.getByRole("button", { name: "Solo Facade", exact: true }).click();
  await blackAt(0.35, 0.36);
  await blackAt(0.65, 0.4);
  await blackAt(0.45, 0.5);
  expect(Math.max(...pixel(await snapshot(), 0.2, 0.2))).toBeGreaterThan(30);
  console.log(
    "PASS: rectangular, elliptical and overlapping cutouts remove only their parent, revealing underlying content and remaining black when soloed.",
  );

  await select("Facade");
  await page.getByLabel("Blend mode").selectOption("add");
  await blackAt(0.35, 0.36);
  await page.getByLabel("Blend mode").selectOption("screen");
  await blackAt(0.35, 0.36);
  await page.getByLabel("Blend mode").selectOption("normal");
  await select("Window cutter");
  await page
    .getByRole("button", { name: "Edit individual corners", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Curve this edge", exact: true })
    .click();
  await page.getByLabel("Handle 1 Y", { exact: true }).fill("120");
  await page.getByLabel("Handle 1 Y", { exact: true }).press("Tab");
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  await expect(output.locator(".cutout-guide")).toHaveCount(3);
  await expect(
    output.locator(".cutout-guide.selected > path").last(),
  ).toHaveAttribute("d", /C/);
  await blackAt(0.35, 0.36);
  await blackAt(0.65, 0.4);
  await page.screenshot({
    path: path.join(artifacts, "luma-cutouts-editor.png"),
  });
  await output.screenshot({
    path: path.join(artifacts, "luma-cutouts-output.png"),
  });
  await output.bringToFront();
  await output.keyboard.press("m");
  await expect.poll(async () => (await getState()).placementMesh).toBe(false);
  await page.bringToFront();
  await select("Facade");
  const beforeMove = (await getState()).project;
  await page.getByLabel("X", { exact: true }).fill("224");
  await page.getByLabel("X", { exact: true }).press("Tab");
  await expect
    .poll(
      async () =>
        (await getState()).project.surfaces.find((s) => s.id === "facade")
          .points[0].x,
    )
    .toBe(0.175);
  const moved = (await getState()).project;
  expect(moved.surfaces.find((s) => s.id === "window").points[0].x).toBeCloseTo(
    beforeMove.surfaces.find((s) => s.id === "window").points[0].x + 0.025,
  );
  expect(
    moved.surfaces.find((s) => s.id === "window").curves[0].control1.x,
  ).toBeCloseTo(
    beforeMove.surfaces.find((s) => s.id === "window").curves[0].control1.x +
      0.025,
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(async () => (await getState()).project.surfaces)
    .toEqual(beforeMove.surfaces);
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect
    .poll(async () => (await getState()).project.surfaces.length)
    .toBe(9);
  const duplicated = (await getState()).project,
    copy = duplicated.surfaces.find((s) => s.name === "Facade copy");
  expect(
    duplicated.surfaces.filter((s) => s.cutoutOf === copy.id),
  ).toHaveLength(3);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await select("Facade");
  await page
    .getByRole("button", { name: "Delete selected surface", exact: true })
    .click();
  await expect
    .poll(async () => (await getState()).project.surfaces.length)
    .toBe(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await select("Window cutter");
  await page
    .getByRole("button", { name: "Restore as surface", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await getState()).project.surfaces.find((s) => s.id === "window")
          .cutoutOf,
    )
    .toBeUndefined();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  console.log(
    "PASS: curves, placement mesh, blending, group moves, duplicate, parent deletion and restore-as-surface all preserve editable cutouts and undo.",
  );

  // Keep adding while a cutout is selected, without returning to its parent.
  await page.getByRole("button", { name: "Solo Facade", exact: true }).click();
  await select("Window cutter");
  await blackAt(0.35, 0.36);
  const beforePresets = (await getState()).project;
  const beforePixels = await snapshot();
  const presetHoles = [];
  for (const name of ["Rectangle hole", "Ellipse hole", "Rectangle hole"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect
      .poll(async () => (await getState()).project.surfaces.length)
      .toBe(beforePresets.surfaces.length + presetHoles.length + 1);
    const hole = (await getState()).project.surfaces.at(-1);
    expect(hole.cutoutOf).toBe("facade");
    expect(presetHoles.every((other) => other.name !== hole.name)).toBe(true);
    presetHoles.push(hole);
    await expect(page.locator(".cutout-item")).toHaveCount(3 + presetHoles.length);
    await expect(
      page.getByRole("button", { name: `Edit cutout ${hole.name}`, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const xs = hole.points.map((p) => p.x),
      ys = hole.points.map((p) => p.y);
    const x = (Math.min(...xs) + Math.max(...xs)) / 2;
    const y = (Math.min(...ys) + Math.max(...ys)) / 2;
    expect(Math.max(...pixel(beforePixels, x, y))).toBeGreaterThan(30);
    await blackAt(x, y);
  }
  const sixHoles = (await getState()).project;
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(async () => (await getState()).project.surfaces.length)
    .toBe(7);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect
    .poll(async () => (await getState()).project.surfaces)
    .toEqual(sixHoles.surfaces);
  const firstHole = presetHoles[0];
  await page
    .getByRole("button", { name: `Edit cutout ${firstHole.name}`, exact: true })
    .click();
  const movedX =
    Math.round(Math.min(...firstHole.points.map((p) => p.x)) * fixture.width) + 4;
  await page.getByLabel("X", { exact: true }).fill(String(movedX));
  await page.getByLabel("X", { exact: true }).press("Tab");
  await expect
    .poll(async () =>
      (await getState()).project.surfaces.find((s) => s.id === firstHole.id).points,
    )
    .not.toEqual(firstHole.points);
  expect(
    (await getState()).project.surfaces.filter((s) => s.id !== firstHole.id),
  ).toEqual(sixHoles.surfaces.filter((s) => s.id !== firstHole.id));
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(async () => (await getState()).project.surfaces)
    .toEqual(sixHoles.surfaces);
  await page
    .getByRole("button", { name: "Delete selected surface", exact: true })
    .click();
  await expect
    .poll(async () => (await getState()).project.surfaces)
    .toEqual(sixHoles.surfaces.filter((s) => s.id !== firstHole.id));
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(async () => (await getState()).project.surfaces)
    .toEqual(sixHoles.surfaces);
  await select(presetHoles[1].name);
  await page.getByRole("button", { name: "Lock Facade", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Rectangle hole", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Ellipse hole", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Shape to subtract")).toBeDisabled();
  await page.getByRole("button", { name: "Unlock Facade", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Rectangle hole", exact: true }),
  ).toBeEnabled();
  console.log(
    "PASS: repeated preset holes and subtraction target the same parent; six independent cutouts render, edit, delete, undo/redo and respect parent locks.",
  );

  const savePath = path.join(profile, "cutouts-saved.luma");
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, savePath);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Project saved");
  const saved = JSON.parse(await readFile(savePath, "utf8"));
  expect(saved.surfaces.filter((s) => s.cutoutOf)).toHaveLength(6);
  await page
    .getByRole("button", { name: "Delete selected surface", exact: true })
    .click();
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [filePath],
    });
  }, savePath);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await expect
    .poll(async () => (await getState()).project.surfaces)
    .toEqual(saved.surfaces);
  await select("Facade");
  await page.getByRole("button", { name: "Creatures", exact: true }).click();
  await expect(page.locator(".effect-card")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Apply Fox around the corner", exact: true })
    .click();
  await page.getByLabel("Peek from").selectOption("right");
  await expect
    .poll(
      async () =>
        (await getState()).project.surfaces.find((s) => s.id === "facade")
          .effectSide,
    )
    .toBe("right");
  await page.getByRole("button", { name: "Textures", exact: true }).click();
  await expect(page.locator(".effect-card")).toHaveCount(12);
  await page
    .getByRole("button", { name: "Apply Castle stonework", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Speed", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  const still = await snapshot();
  await page.waitForTimeout(350);
  expect((await snapshot()).data.equals(still.data)).toBe(true);
  const window = await app.browserWindow(page);
  await window.evaluate((win) => win.setSize(1120, 760));
  await select("Facade");
  await page.waitForTimeout(250); // Allow the resize and tab highlight to finish painting.
  await page.screenshot({
    path: path.join(artifacts, "luma-cutouts-compact.png"),
  });
  expect(errors).toEqual([]);
  console.log(
    "PASS: native save/reopen preserves all six cutouts; creature direction, the still-material library and compact desktop layout remain intact.",
  );
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [filePath],
    });
  }, path.resolve("examples/Facade-with-cutouts.luma"));
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await expect
    .poll(async () => (await getState()).project.name)
    .toBe("Facade with creature windows");
  expect(
    (await getState()).project.surfaces.filter((s) => s.cutoutOf),
  ).toHaveLength(3);
  await page
    .getByRole("button", { name: "Restart animation", exact: true })
    .click();
  if (
    await page
      .getByRole("button", { name: "Play animation", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Play animation", exact: true })
      .click();
  await page.waitForTimeout(5200);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await output
    .locator(".projection-canvas")
    .screenshot({ path: path.join(artifacts, "facade-example.png") });
  expect(errors).toEqual([]);
  console.log(
    "PASS: bundled facade example opens with two creature windows and an editable arched doorway.",
  );

  const triangle = {
    ...surface("triangle", "Triangle", [
      { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.2, y: 0.8 },
    ], "limestone", "#65b5a1", "triangle"),
    layerId: "foreground",
  };
  const triangleHole = {
    ...surface("triangle-hole", "Triangle hole", rect(0.3, 0.3, 0.1, 0.1), "limestone", "#65b5a1"),
    cutoutOf: triangle.id,
  };
  const trianglePath = path.join(profile, "triangle.luma");
  await writeFile(trianglePath, JSON.stringify({
    ...fixture,
    layers: [
      { id: "background", name: "Background", visible: true, locked: false },
      { id: "foreground", name: "Foreground", visible: true, locked: false },
    ],
    surfaces: [triangle, triangleHole],
  }));
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] });
  }, trianglePath);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await select("Triangle");
  const triangleState = () => getState().then((state) => state.project.surfaces);
  await expect.poll(triangleState).toEqual([triangle, triangleHole]);
  const corner = page.getByRole("button", { name: "Corner 1", exact: true });
  for (const edit of ["numeric", "keyboard", "drag"]) {
    await corner.click();
    if (edit === "numeric") {
      await page.getByLabel("Corner X", { exact: true }).fill("272");
      await page.getByLabel("Corner X", { exact: true }).press("Tab");
    } else if (edit === "keyboard") await page.keyboard.press("ArrowRight");
    else {
      const box = await corner.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 5);
      await page.mouse.up();
    }
    await expect.poll(async () => (await triangleState())[0].points).not.toEqual(triangle.points);
    expect((await triangleState())[1]).toEqual(triangleHole);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect.poll(triangleState).toEqual([triangle, triangleHole]);
  }
  await page.getByRole("button", { name: "Lock Triangle hole", exact: true }).click();
  await select("Triangle");
  const locked = [triangle, { ...triangleHole, locked: true }];
  await expect.poll(triangleState).toEqual(locked);
  await page.getByLabel("X", { exact: true }).fill("280");
  await page.getByLabel("X", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "Delete selected surface", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Unlock the cutout holes");
  expect(await triangleState()).toEqual(locked);
  await page.getByRole("button", { name: "Unlock Triangle hole", exact: true }).click();
  await select("Triangle hole");
  await page.getByRole("button", { name: "Restore as surface", exact: true }).click();
  await expect.poll(async () => (await triangleState())[1].cutoutOf).toBeUndefined();
  expect((await triangleState())[1].layerId).toBe("foreground");
  expect(errors).toEqual([]);
  console.log("PASS: triangle corner inputs, nudges and drags keep holes fixed; locked holes protect parent moves/deletion and restored holes keep their layer.");
} catch (error) {
  if (page)
    await page
      .screenshot({ path: path.join(artifacts, "cutouts-failure.png") })
      .catch(() => {});
  throw error;
} finally {
  await app.close();
}
