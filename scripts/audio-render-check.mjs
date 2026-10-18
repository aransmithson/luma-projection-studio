import { _electron as electron, expect } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "audio-render-profile-"));
const server = await createServer({
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "error",
});
await server.listen();
const env = {
  ...process.env,
  VITE_DEV_SERVER_URL: `http://127.0.0.1:${server.httpServer.address().port}`,
};
delete env.ELECTRON_RUN_AS_NODE;
let app;
try {
  app = await electron.launch({
    args: [path.resolve("."), `--user-data-dir=${profile}`],
    env,
  });
  const page = await app.firstWindow();
  await expect(page.locator(".stage-overlay")).toBeVisible({ timeout: 20000 });
  const result = await page.evaluate(async () => {
    const { ProjectionRenderer } = await import("/src/renderer.ts"),
      { createProject, createSurface } = await import("/src/model.ts"),
      { musicIds, demoAudio, silentAudio } =
        await import("/src/audioAnalysis.ts"),
      { effectById } = await import("/src/catalog.ts");
    const w = 480,
      h = 270,
      canvas = document.createElement("canvas"),
      renderer = new ProjectionRenderer(canvas),
      gl = canvas.getContext("webgl");
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const base = {
      ...createProject("blank"),
      width: w,
      height: h,
      surfaces: [],
    };
    let sequence = 0;
    const metrics = [];
    const frame = (project, audio, options = {}) => {
      renderer.render(
        {
          project,
          playback: { playing: false, offset: 2250, startedAt: 0 },
          blackout: false,
          testPattern: false,
          audio: { ...audio, sequence: ++sequence },
          ...options,
        },
        w,
        h,
      );
      const p = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, p);
      if (gl.getError() !== gl.NO_ERROR) throw Error("WebGL failure");
      return p;
    };
    const diff = (a, b) =>
      a.reduce((sum, n, i) => sum + Math.abs(n - b[i]), 0) / a.length;
    const lit = (p) =>
      p.reduce((n, v, i) => n + (i % 4 !== 3 && v > 35 ? 1 : 0), 0) /
      (w * h * 3);
    const sheet = document.createElement("canvas");
    sheet.width = 3 * w;
    sheet.height = 2 * (h + 40);
    const sc = sheet.getContext("2d");
    sc.fillStyle = "#11121c";
    sc.fillRect(0, 0, sheet.width, sheet.height);
    const active = demoAudio(1.3, 1, Date.now());
    for (const [index, id] of musicIds.entries()) {
      const shape = { ...createSurface("quad", 1, points, id), seed: 42 };
      const project = { ...base, surfaces: [shape] };
      const idle = frame(project, silentAudio),
        busy = frame(project, active);
      const difference = diff(idle, busy);
      if (difference < 1 || lit(busy) < 0.01)
        throw Error(`${id}: no visible audio response ${difference}`);
      const x = (index % 3) * w,
        y = Math.floor(index / 3) * (h + 40);
      sc.drawImage(canvas, x, y);
      sc.fillStyle = "#e4d8f2";
      sc.font = "17px Segoe UI";
      sc.fillText(effectById[id].name, x + 15, y + h + 26);
      if (diff(busy, frame(project, active)) !== 0)
        throw Error(`${id}: non-deterministic frame`);
      if (
        diff(
          idle,
          frame(project, silentAudio, {
            playback: { playing: false, offset: 7000, startedAt: 0 },
          }),
        ) !== 0
      )
        throw Error(`${id}: fabricated activity in silence`);
      const frozen = { ...active, sequence: 9000 };
      const first = frame(project, active, { audioFrozen: frozen }),
        second = frame(project, silentAudio, { audioFrozen: frozen });
      if (diff(first, second) !== 0)
        throw Error(`${id}: pause does not freeze`);
      const stale = { ...active, capturedAt: Date.now() - 10000 };
      if (
        diff(
          idle,
          frame(project, stale, {
            playback: { playing: true, offset: 0, startedAt: Date.now() },
          }),
        ) !== 0
      )
        throw Error(`${id}: stale signal did not settle`);
      const mesh = frame(project, active, { placementMesh: true });
      if (
        diff(mesh, frame(project, silentAudio, { placementMesh: true })) !== 0
      )
        throw Error(`${id}: music affects placement mesh`);
      const calibration = frame(project, active, { testPattern: true });
      if (
        diff(
          calibration,
          frame(project, silentAudio, { testPattern: true }),
        ) !== 0
      )
        throw Error(`${id}: music affects calibration`);
      const black = frame(project, active, { blackout: true });
      if (lit(black) !== 0) throw Error(`${id}: blackout fails`);
      const moved = {
        ...project,
        surfaces: [
          {
            ...shape,
            contentTransform: { rotation: 36, offsetX: 0.2, offsetY: -0.15 },
          },
        ],
      };
      if (diff(busy, frame(moved, active)) < 1)
        throw Error(`${id}: content transform ignored`);
      const cutout = {
        ...createSurface("ellipse", 2, [
          { x: 0.38, y: 0.3 },
          { x: 0.62, y: 0.3 },
          { x: 0.62, y: 0.7 },
          { x: 0.38, y: 0.7 },
        ]),
        cutoutOf: shape.id,
      };
      const hole = frame({ ...project, surfaces: [shape, cutout] }, active);
      const center = (Math.floor(h / 2) * w + w / 2) * 4;
      if (hole.slice(center, center + 3).some((n) => n !== 0))
        throw Error(`${id}: hole not black`);
      metrics.push({
        id,
        difference,
        lit: lit(busy),
        checks: [
          "live response",
          "deterministic",
          "idle silence",
          "pause",
          "stale signal",
          "mesh",
          "calibration",
          "blackout",
          "content transform",
          "cutout",
        ],
      });
    }
    renderer.dispose();
    return { metrics, png: sheet.toDataURL("image/png").split(",")[1] };
  });
  await writeFile(
    path.join(artifacts, "music-contact-sheet.png"),
    Buffer.from(result.png, "base64"),
  );
  await writeFile(
    path.join(artifacts, "audio-render-verification.json"),
    JSON.stringify(result.metrics, null, 2),
  );
  console.log(JSON.stringify(result.metrics, null, 2));
} finally {
  await app?.close();
  await server.close();
}
