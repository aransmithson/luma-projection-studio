import { _electron as electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "audio-workflow-profile-"));
const savedPath = path.join(profile, "saved.luma"),
  fixturePath = path.resolve("examples/Music-spectrum.luma");
// A generated PCM input exercises Chromium's actual capture and Web Audio graph.
// No microphone content or user's sound is recorded by this test.
const rate = 48000,
  seconds = 8,
  samples = rate * seconds,
  wav = Buffer.alloc(44 + samples * 2);
wav.write("RIFF");
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(samples * 2, 40);
for (let i = 0; i < samples; i++) {
  const t = i / rate,
    amp = 0.07 + 0.035 * Math.sin(t * 3);
  wav.writeInt16LE(
    Math.round(
      32767 *
        amp *
        (Math.sin(2 * Math.PI * 94 * t) +
          Math.sin(2 * Math.PI * 1000 * t) +
          Math.sin(2 * Math.PI * 8000 * t)),
    ),
    44 + i * 2,
  );
}
const wavPath = path.join(profile, "generated-music.wav");
await writeFile(wavPath, wav);
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
    "--use-fake-device-for-media-stream",
    `--use-file-for-fake-audio-capture=${wavPath}`,
  ],
  env,
  timeout: 60000,
});

const errors = [];
app.on("window", (p) => p.on("pageerror", (e) => errors.push(e.message)));
const report = { packaged, checks: [] };
let page;
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  await expect(page.locator(".stage-overlay")).toBeVisible({ timeout: 20000 });
  await app.evaluate(
    ({ dialog }, { fixturePath, savedPath }) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [fixturePath],
      });
      dialog.showSaveDialog = async () => ({
        canceled: false,
        filePath: savedPath,
      });
    },
    { fixturePath, savedPath },
  );
  const click = (name) =>
    page.getByRole("button", { name, exact: true }).click();
  await click("Open project");
  await expect(page.locator(".effect-card")).toHaveCount(176);
  await click("Music");
  await expect(page.locator(".effect-card")).toHaveCount(6);
  await click("Select Spectrum towers");
  await click("Apply Spectrum towers");
  await page.getByRole("tab", { name: "Effect", exact: true }).click();
  await expect(page.getByLabel("Speed", { exact: true })).toHaveCount(0);
  await click("Set up music input");
  report.checks.push(
    "Music collection, effect application and input shortcut in the inspector",
  );
  await expect(page.locator(".audio-input-status")).toHaveText("Audio is off");
  await click("Microphone / line-in");
  await click("Start audio");
  await expect(page.locator(".audio-input-status")).toContainText("Listening");
  await expect
    .poll(async () =>
      Number(await page.getByRole("meter").getAttribute("aria-valuenow")),
    )
    .toBeGreaterThan(5);
  await page.screenshot({
    path: path.join(artifacts, "audio-input-panel.png"),
  });
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
  const output = await opened;
  await expect(output.locator(".projection-canvas")).toBeVisible({
    timeout: 20000,
  });
  const state = () => output.evaluate(() => window.luma.getOutputState());
  await expect
    .poll(async () => {
      const a = (await state()).audio;
      return !!a && a.bass > 0.03 && a.mid > 0.015 && a.treble > 0.01;
    })
    .toBe(true);
  const startSequence = (await state()).audio.sequence;
  await expect
    .poll(async () => (await state()).audio.sequence)
    .toBeGreaterThan(startSequence + 5);
  report.checks.push(
    "Native microphone capture, three frequency ranges, input meter, compact output IPC, opening output retains capture",
  );
  const shot = async () =>
    PNG.sync.read(await output.locator(".projection-canvas").screenshot());
  await click("Pause animation");
  await expect.poll(async () => (await state()).playback.playing).toBe(false);
  const frozen = (await state()).audioFrozen;
  expect(frozen.level).toBeGreaterThan(0.05);
  const paused = await shot();
  await expect
    .poll(async () => (await state()).audio.sequence)
    .toBeGreaterThan(frozen.sequence + 10);
  expect((await state()).audioFrozen).toEqual(frozen);
  expect((await shot()).data.equals(paused.data)).toBe(true);
  await output.screenshot({
    path: path.join(artifacts, "music-native-output.png"),
  });
  await click("Play animation");
  await expect.poll(async () => (await state()).audioFrozen).toBeNull();
  expect((await shot()).data.equals(paused.data)).toBe(false);
  report.checks.push(
    "Pause freezes one shared frame while capture continues; resume follows current audio",
  );
  await click("Music input");
  await click("Stop audio");
  await expect.poll(async () => (await state()).audio).toBeNull();
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
  await click("Demo signal");
  await click("Start demo");
  await expect(page.locator(".audio-input-status")).toHaveText(
    "Demo signal · no audio input",
  );
  await expect
    .poll(async () => (await state()).audio?.level ?? 0)
    .toBeGreaterThan(0.05);
  const sensitivity = page.getByLabel("Audio sensitivity", { exact: true });
  await sensitivity.fill("2.5");
  await page.getByLabel("Audio smoothing", { exact: true }).fill("0.7");
  await page.getByLabel("Audio noise gate", { exact: true }).fill("0.01");
  await click("Close dialog");
  await click("Save project");
  await expect
    .poll(
      async () => JSON.parse(await readFile(savedPath, "utf8")).audioSettings,
    )
    .toEqual({ gain: 2.5, smoothing: 0.7, noiseGate: 0.01 });
  const saved = JSON.parse(await readFile(savedPath, "utf8"));
  expect(saved.audio).toBeUndefined();
  expect(saved.audioSource).toBeUndefined();
  await page.reload();
  await expect(page.locator(".stage-overlay")).toBeVisible({ timeout: 20000 });
  await expect.poll(async () => (await state()).audio).toBeNull();
  await click("Music input");
  await expect(page.locator(".audio-input-status")).toHaveText("Audio is off");
  await expect(
    page.getByLabel("Audio sensitivity", { exact: true }),
  ).toHaveValue("2.5");
  report.checks.push(
    "Stop clears both windows; explicit Demo works; tuning saves/recovers without auto-starting capture",
  );

  // Test Windows loopback using real getDisplayMedia (fake-microphone flags do
  // not substitute for desktop audio). We inspect only metrics, not recordings.
  await click("Computer audio");
  await click("Start audio");
  await expect(page.locator(".audio-input-status")).toHaveText(
    "Listening to computer audio",
  );
  await expect.poll(async () => !!(await state()).audio).toBe(true);
  await page.evaluate(async () => {
    const c = new AudioContext();
    await c.resume();
    const osc = c.createOscillator(),
      gain = c.createGain();
    osc.frequency.value = 1000;
    gain.gain.value = 0.025;
    osc.connect(gain).connect(c.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      void c.close();
    }, 1800);
  });
  await expect
    .poll(async () => (await state()).audio?.mid ?? 0, { timeout: 8000 })
    .toBeGreaterThan(0.01);
  await click("Stop audio");
  await expect.poll(async () => (await state()).audio).toBeNull();
  report.checks.push(
    "Windows computer-audio loopback supplies real frames and detects a quiet generated 1 kHz test tone",
  );

  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => !w.webContents.getURL().includes("output=1"))
      .setSize(1120, 760),
  );
  await page.screenshot({
    path: path.join(artifacts, "audio-minimum-layout.png"),
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
  await expect(
    page.getByRole("button", { name: "Start audio", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await click("Close dialog");
  await expect(
    page.getByRole("button", { name: "Music input", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  expect(errors).toEqual([]);
  report.checks.push("Minimum window layout; no renderer exceptions");
  await writeFile(
    path.join(
      artifacts,
      `audio-${packaged ? "packaged" : "development"}-verification.json`,
    ),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (page)
    await page
      .screenshot({ path: path.join(artifacts, "audio-workflow-failure.png") })
      .catch(() => {});
  throw error;
} finally {
  await app.close();
}
