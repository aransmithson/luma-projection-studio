import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "linked-profile-"));
const fixture = JSON.parse(
  await readFile("examples/Linked-chase.luma", "utf8"),
);
const loose = { ...fixture, stacks: [], name: "Shapes to link" };
const fixturePath = path.join(profile, "loose.luma"),
  savedPath = path.join(profile, "linked.luma");
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
app.on("window", (page) => page.on("pageerror", (e) => errors.push(e.message)));
let page, output;
const contentOnly = {
  style:
    ".output-wireframe, .projection-pointer, .stage-overlay, .canvas-instruction, .stage-coordinate { visibility: hidden !important; }",
};
const pairs = [
  ["chase-cat-mouse", "Cat chases mouse", "Mouse chases cat"],
  ["chase-fox-rabbit", "Fox chases rabbit", "Rabbit chases fox"],
  ["chase-ghost-pumpkin", "Ghost chases pumpkin", "Pumpkin chases ghost"],
  ["chase-robot-alien", "Robot chases alien", "Alien chases robot"],
  ["chase-snowman-penguin", "Snowman chases penguin", "Penguin chases snowman"],
];
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  await expect(page.locator(".stage-overlay")).toBeVisible();
  const open = async (file) => {
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [filePath],
      });
    }, path.resolve(file));
    await page
      .getByRole("button", { name: "Open project", exact: true })
      .click();
  };
  const close = () =>
    page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await open(fixturePath);
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restart animation", exact: true })
    .click();
  await page.getByRole("tab", { name: "Effect", exact: true }).click();
  await expect(page.locator(".chase-role-note")).toContainText(
    "Cat chases mouse",
  );
  await page
    .getByLabel("Chase direction", { exact: true })
    .selectOption("right");
  await expect(page.locator(".chase-role-note")).toContainText(
    "Mouse chases cat",
  );
  await page
    .getByRole("button", { name: "Link this chase across shapes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Character chase", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Linked chase direction")).toHaveValue("right");
  for (const s of fixture.surfaces)
    await page.getByLabel(`Include ${s.name}`, { exact: true }).check();
  await page
    .getByLabel("Stack name", { exact: true })
    .fill("Around the windows");
  await page.getByLabel("Linked chase direction").selectOption("left");
  await page.getByRole("button", { name: "Save stack", exact: true }).click();
  await expect(page.locator(".stack-choice")).toHaveCount(1);
  await close();

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
  const opened = app.waitForEvent("window");
  await page
    .getByRole("button", { name: "Open output preview", exact: true })
    .click();
  output = await opened;
  await expect(output.locator(".projection-canvas")).toBeVisible();
  const state = () => output.evaluate(() => window.luma.getOutputState());
  const pixels = async () =>
    PNG.sync.read(
      await output.locator(".projection-canvas").screenshot(contentOnly),
    );
  // Drive exact timestamps through the real editor -> main -> output bridge.
  // UI pause/restart and editor/output equality are checked separately below.
  const atTime = async (base, seconds, filename) => {
    const offset = seconds * 1000;
    const next = {
      ...base,
      playback: { playing: false, offset, startedAt: 0 },
      alignment: { visible: false, selectedId: null, draft: [] },
      pointer: null,
    };
    await page.evaluate((value) => window.luma.updateOutput(value), next);
    await expect.poll(async () => (await state()).playback.offset).toBe(offset);
    await output.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await output.waitForTimeout(120);
    const buffer = await output
      .locator(".projection-canvas")
      .screenshot(contentOnly);
    if (filename) await writeFile(path.join(artifacts, filename), buffer);
    return PNG.sync.read(buffer);
  };
  await expect
    .poll(async () => (await state()).project.stacks[0].surfaceIds)
    .toEqual(fixture.stacks[0].surfaceIds);
  await page
    .getByRole("button", { name: "Edit linked chase", exact: true })
    .click();
  const sampleFrames = [];
  for (const [effectId, forwardLabel, reverseLabel] of pairs) {
    await page.getByLabel("Linked chase characters").selectOption(effectId);
    await page.getByLabel("Linked chase direction").selectOption("left");
    await expect(
      page.locator(".stack-settings .chase-role-note"),
    ).toContainText(forwardLabel);
    await page.getByRole("button", { name: "Save stack", exact: true }).click();
    await expect
      .poll(async () => (await state()).project.stacks[0].effectId)
      .toBe(effectId);
    const base = await state(),
      first = await atTime(base, 2.4, `${effectId}-linked.png`);
    const repeated = await atTime(
      base,
      14.4,
      `${effectId}-linked-repeated.png`,
    );
    expect(
      repeated.data.equals(first.data),
      `${effectId} repeats its entire shared loop exactly`,
    ).toBe(true);
    for (const prior of sampleFrames)
      expect(first.data.equals(prior)).toBe(false);
    sampleFrames.push(first.data);
    expect(
      (await atTime(base, 3.4)).data.equals(first.data),
      "shared chase moves",
    ).toBe(false);
    await page.getByLabel("Linked chase direction").selectOption("right");
    await expect(
      page.locator(".stack-settings .chase-role-note"),
    ).toContainText(reverseLabel);
    await page.getByRole("button", { name: "Save stack", exact: true }).click();
    await expect
      .poll(async () => (await state()).project.stacks[0].direction)
      .toBe("right");
    const reversed = await atTime(
      await state(),
      2.4,
      `${effectId}-linked-reversed.png`,
    );
    expect(
      reversed.data.equals(first.data),
      `${effectId} swaps and reverses on the projector`,
    ).toBe(false);
  }
  await page.getByLabel("Stack duration", { exact: true }).fill("18");
  await page.getByLabel("Linked character size").focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 7; i++) await page.keyboard.press("ArrowRight");
  await page
    .getByRole("button", {
      name: `Move ${fixture.surfaces[2].name} earlier`,
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Save stack", exact: true }).click();
  await expect
    .poll(async () => (await state()).project.stacks[0].surfaceIds)
    .toEqual([
      fixture.surfaces[0].id,
      fixture.surfaces[2].id,
      fixture.surfaces[1].id,
    ]);
  await page.screenshot({
    path: path.join(artifacts, "linked-chase-controls.png"),
  });
  await close();
  const saved = (await state()).project;
  expect(saved.stacks[0]).toMatchObject({
    duration: 18,
    scale: 0.8,
    direction: "right",
    kind: "chase",
  });
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, savedPath);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Project saved");
  expect(JSON.parse(await readFile(savedPath, "utf8"))).toEqual(saved);
  await page
    .getByRole("button", { name: "Edit linked chase", exact: true })
    .click();
  await page.getByRole("button", { name: "Unlink stack", exact: true }).click();
  await close();
  await expect.poll(async () => (await state()).project.stacks).toHaveLength(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(async () => (await state()).project).toEqual(saved);
  await open(savedPath);
  await page.reload();
  await expect(page.locator(".stage-overlay")).toBeVisible();
  await expect.poll(async () => (await state()).project).toEqual(saved);
  if (
    await page
      .getByRole("button", { name: "Pause animation", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Pause animation", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Restart animation", exact: true })
    .click();
  await expect.poll(async () => (await state()).playback.offset).toBe(0);
  const paused = await pixels();
  await page.waitForTimeout(150);
  expect((await pixels()).data.equals(paused.data)).toBe(true);
  const editor = PNG.sync.read(
    await page
      .locator(".mapping-workspace .projection-canvas")
      .screenshot(contentOnly),
  );
  let error = 0,
    samples = 0;
  for (let y = 1; y < 30; y++)
    for (let x = 1; x < 50; x++) {
      const a =
        (Math.floor((y / 30) * editor.height) * editor.width +
          Math.floor((x / 50) * editor.width)) *
        4;
      const b =
        (Math.floor((y / 30) * paused.height) * paused.width +
          Math.floor((x / 50) * paused.width)) *
        4;
      for (let c = 0; c < 3; c++) {
        error += Math.abs(editor.data[a + c] - paused.data[b + c]);
        samples++;
      }
    }
  expect(
    error / samples,
    "editor and projector share a chase phase",
  ).toBeLessThan(9);
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  expect((await pixels()).data.equals(paused.data)).toBe(false);
  await page
    .getByRole("button", { name: "Placement mesh", exact: true })
    .click();
  expect((await pixels()).data.equals(paused.data)).toBe(true);
  console.log(
    "PASS: linking existing shapes, all five pairs, reversed pursuers, shared loops, order/size/timing, save/open/recovery, Undo, pause, mesh and editor/output sync.",
  );

  // Join three windows edge-to-edge. At a handoff, the silhouette must cross
  // both sides of each seam, including the first/last edges of the circuit.
  const joined = structuredClone(fixture);
  joined.width = 1200;
  joined.height = 500;
  joined.surfaces.forEach((s, i) => {
    s.points = [
      { x: i / 3, y: 0 },
      { x: (i + 1) / 3, y: 0 },
      { x: (i + 1) / 3, y: 1 },
      { x: i / 3, y: 1 },
    ];
  });
  const n = Math.sin(31 * 127.1 + 123 * 31.7) * 43758.5453,
    offset = 0.35 + (n - Math.floor(n)) * 0.12;
  const near = (frame, x) => {
    let lit = 0;
    for (let y = Math.floor(frame.height * 0.3); y < frame.height * 0.85; y++)
      for (
        let col = Math.max(0, x - 3);
        col < Math.min(frame.width, x + 3);
        col++
      ) {
        const p = (y * frame.width + col) * 4;
        if (Math.max(frame.data[p], frame.data[p + 1], frame.data[p + 2]) > 85)
          lit++;
      }
    return lit;
  };
  for (const direction of ["left", "right"]) {
    joined.stacks[0].direction = direction;
    for (const seam of [1, 2, 3]) {
      const phase =
        ((((direction === "right" ? 1 - seam / 3 : seam / 3) - offset) % 1) +
          1) %
        1;
      const frame = await atTime(
        { ...(await state()), project: joined },
        phase * 12,
        `linked-seam-${direction}-${seam}.png`,
      );
      if (seam < 3) {
        const x = Math.round((frame.width * seam) / 3);
        expect(near(frame, x - 3), "silhouette before seam").toBeGreaterThan(
          15,
        );
        expect(near(frame, x + 3), "silhouette after seam").toBeGreaterThan(15);
      } else {
        expect(near(frame, 1), "wrap enters first window").toBeGreaterThan(15);
        expect(
          near(frame, frame.width - 2),
          "wrap leaves last window",
        ).toBeGreaterThan(15);
      }
    }
  }
  console.log(
    "PASS: rendered silhouettes cross both sides of all three seams, including the cyclic join, in both directions.",
  );

  const routeState = { ...(await state()), project: fixture };
  const cropSecond = (frame) => {
    const data = [];
    for (let y = Math.ceil(frame.height * 0.33); y < frame.height * 0.73; y++) {
      const start = (y * frame.width + Math.ceil(frame.width * 0.38)) * 4;
      data.push(
        frame.data.subarray(
          start,
          (y * frame.width + Math.floor(frame.width * 0.62)) * 4,
        ),
      );
    }
    return Buffer.concat(data);
  };
  const beforeResize = await atTime(routeState, 1.2);
  const resized = structuredClone(routeState);
  resized.project.surfaces[0].points.forEach((p) => {
    p.x = 0.055 + (p.x - 0.055) * 0.5;
  });
  const afterResize = await atTime(resized, 1.2);
  expect(
    cropSecond(afterResize).equals(cropSecond(beforeResize)),
    "resizing another member refreshes this shape's route content while paused",
  ).toBe(false);
  const hidden = structuredClone(routeState);
  hidden.project.layers = [
    { id: "hidden", name: "Hidden stop", visible: false, locked: false },
    { id: "visible", name: "Visible stops", visible: true, locked: false },
  ];
  hidden.project.surfaces.forEach((s, i) => {
    s.layerId = i ? "visible" : "hidden";
  });
  expect(
    cropSecond(await atTime(hidden, 1.2)).equals(cropSecond(beforeResize)),
    "hidden layers retain their place and do not retime other stops",
  ).toBe(true);
  console.log(
    "PASS: paused geometry edits refresh other route windows; hiding a layer preserves the shared phase.",
  );

  const styleFrames = [];
  for (const [file, style] of [
    ["Lava", "lava"],
    ["Potion", "potion"],
    ["Ice", "ice"],
  ]) {
    await open(`examples/${file}-cascade.luma`);
    await expect
      .poll(async () => (await state()).project.stacks[0]?.style)
      .toBe(style);
    const base = await state();
    const first = await atTime(base, 2.4, `linked-${style}-output.png`);
    expect((await atTime(base, 4.4)).data.equals(first.data)).toBe(false);
    // Identical tint/time/seed still produce distinct materials, not just recolours.
    const sameTint = structuredClone(base);
    sameTint.project.stacks[0].color = "#58d9e9";
    const material = await atTime(sameTint, 2.4);
    for (const prior of styleFrames)
      expect(material.data.equals(prior)).toBe(false);
    styleFrames.push(material.data);
    await page
      .getByRole("button", { name: "Stacked animations", exact: false })
      .click();
    await expect(page.getByLabel("Liquid style", { exact: true })).toHaveValue(
      style,
    );
    await close();
  }
  await page
    .getByRole("button", { name: "Stacked animations", exact: false })
    .click();
  for (const [label, style] of [
    ["Choose molten lava", "lava"],
    ["Choose glowing potion", "potion"],
    ["Choose icy water", "ice"],
  ]) {
    const before = (await state()).project;
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByLabel("Liquid style", { exact: true })).toHaveValue(
      style,
    );
    expect((await state()).project).toEqual(before);
    await page.getByRole("button", { name: "Save stack", exact: true }).click();
    await expect
      .poll(async () => (await state()).project.stacks.at(-1).style)
      .toBe(style);
    expect((await state()).project.surfaces.map((s) => s.id)).toEqual(
      before.surfaces.map((s) => s.id),
    );
  }
  await page.screenshot({
    path: path.join(artifacts, "linked-liquid-presets.png"),
  });
  await close();
  const liquidTargetPath = path.join(profile, "liquid-targets.luma");
  await writeFile(
    liquidTargetPath,
    JSON.stringify({
      ...loose,
      surfaces: loose.surfaces.map((s, i) =>
        i === 2 ? { ...s, locked: true } : s,
      ),
    }),
  );
  await open(liquidTargetPath);
  await page.getByRole("button", { name: "Ambient", exact: true }).click();
  await page
    .getByRole("button", { name: "Apply Liquid flow stack", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Liquid flow", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const existingShapes = (await state()).project.surfaces;
  await page
    .getByRole("button", { name: "Choose glowing potion", exact: true })
    .click();
  for (let i = 0; i < existingShapes.length; i++) {
    const checkbox = page.getByLabel(`Include ${existingShapes[i].name}`, {
      exact: true,
    });
    if (i < 2) await checkbox.check();
    else {
      await expect(checkbox).not.toBeChecked();
      await expect(checkbox).toBeDisabled();
    }
  }
  expect((await state()).project.surfaces).toEqual(existingShapes);
  expect((await state()).project.stacks).toHaveLength(0);
  await page
    .getByRole("button", {
      name: `Move ${existingShapes[1].name} earlier`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Apply to selected shapes", exact: true })
    .click();
  await expect.poll(async () => (await state()).project.stacks.length).toBe(1);
  const applied = (await state()).project;
  expect(applied.stacks[0].surfaceIds).toEqual([
    existingShapes[1].id,
    existingShapes[0].id,
  ]);
  expect(applied.stacks[0].style).toBe("potion");
  expect(
    applied.surfaces.map((s) => ({
      id: s.id,
      points: s.points,
      layerId: s.layerId,
      curves: s.curves,
      cutoutOf: s.cutoutOf,
    })),
  ).toEqual(
    existingShapes.map((s) => ({
      id: s.id,
      points: s.points,
      layerId: s.layerId,
      curves: s.curves,
      cutoutOf: s.cutoutOf,
    })),
  );
  expect(applied.surfaces[2]).toEqual(existingShapes[2]);
  await page.screenshot({
    path: path.join(artifacts, "liquid-existing-shapes.png"),
  });
  await close();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(async () => (await state()).project.surfaces)
    .toEqual(existingShapes);
  await expect.poll(async () => (await state()).project.stacks.length).toBe(0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect
    .poll(async () => (await state()).project.stacks[0]?.surfaceIds)
    .toEqual(applied.stacks[0].surfaceIds);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect
    .poll(
      async () =>
        JSON.parse(await readFile(savedPath, "utf8")).stacks[0]?.style,
    )
    .toBe("potion");
  await open(savedPath);
  await expect.poll(async () => (await state()).project).toEqual(applied);
  console.log(
    "PASS: liquid presets wait for selection; applying to two existing shapes preserves geometry and unselected shapes, with route order, Undo/Redo and native save/reopen",
  );
  await page
    .getByRole("button", { name: "Stacked animations", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Character chase", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create linked chase", exact: true })
    .click();
  await expect
    .poll(async () => (await state()).project.stacks.at(-1).kind)
    .toBe("chase");
  await close();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => !w.webContents.getURL().includes("output"))
      .setSize(1120, 760),
  );
  await page
    .getByRole("button", { name: "Stacked animations", exact: false })
    .click();
  await page.getByRole("button", { name: "Liquid flow", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Choose glowing potion", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(artifacts, "linked-small-window.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await close();
  await expect(page.locator(".render-error")).toHaveCount(0);
  await expect(output.locator(".render-error")).toHaveCount(0);
  expect(errors).toEqual([]);
  await writeFile(
    path.join(artifacts, `linked-workflow${packaged ? "-packaged" : ""}.json`),
    JSON.stringify(
      {
        passed: true,
        packaged,
        pairs: pairs.map((p) => p[0]),
        liquidStyles: ["lava", "potion", "ice"],
        seams: 6,
        errors,
        checkedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: three animated liquid materials, valid example files and style selection; liquid and chase groups coexist.",
  );
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({ path: path.join(artifacts, "linked-failure.png") })
      .catch(() => {});
  throw error;
} finally {
  await app.close();
}
