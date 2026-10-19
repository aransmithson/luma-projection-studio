import { _electron as electron, expect } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "compositing-profile-"));
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
  page.on("console", (m) => {
    if (m.type() === "warning" || m.type() === "error") console.log(m.text());
  });
  await expect(page.locator(".stage-overlay")).toBeVisible();
  const report = await page.evaluate(async () => {
    const { ProjectionRenderer } = await import("/src/renderer.ts");
    const { createProject, createSurface } = await import("/src/model.ts");
    const { defaultColorOverlay, overlayStyles, overlayPalettes, blendModes } =
      await import("/src/compositing.ts");
    const canvas = document.createElement("canvas"),
      renderer = new ProjectionRenderer(canvas),
      gl = canvas.getContext("webgl");
    const quad = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const base = {
      ...createSurface("quad", 1, quad, "block-spectrum"),
      id: "base",
      seed: 42,
    };
    const top = {
      ...createSurface("quad", 2, quad, "brushed-aluminium"),
      id: "top",
      seed: 51,
    };
    const project = {
      ...createProject("blank"),
      width: 320,
      height: 240,
      surfaces: [],
    };
    const state = {
      project,
      playback: { playing: false, offset: 4300, startedAt: 0 },
      blackout: false,
      testPattern: false,
    };
    const render = (surfaces, time = 4.3, extra = {}) => {
      renderer.render(
        {
          ...state,
          ...extra,
          playback: { playing: false, offset: time * 1000, startedAt: 0 },
          project: { ...project, surfaces, ...(extra.project || {}) },
        },
        320,
        240,
      );
      const out = new Uint8Array(320 * 240 * 4);
      gl.readPixels(0, 0, 320, 240, gl.RGBA, gl.UNSIGNED_BYTE, out);
      const error = gl.getError();
      if (error !== gl.NO_ERROR)
        throw Error(
          `WebGL error ${error} during ${surfaces.map((s) => s.blend).join(",")}`,
        );
      return out;
    };
    const meanDiff = (a, b) =>
      a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / a.length;
    const lower = render([base]),
      upper = render([top]);
    // Independent CPU oracle; test across a spatially varying backdrop to catch
    // framebuffer orientation, opacity and stale-backdrop errors as well as math.
    const blend = (b, s, id) => {
      if (id === "add") return Math.min(1, b + s);
      if (id === "screen") return b + s - b * s;
      if (id === "multiply") return b * s;
      if (id === "overlay")
        return b <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s);
      if (id === "soft-light")
        return s <= 0.5
          ? b - (1 - 2 * s) * b * (1 - b)
          : b +
              (2 * s - 1) *
                ((b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b)) - b);
      if (id === "darken") return Math.min(b, s);
      if (id === "lighten") return Math.max(b, s);
      if (id === "difference") return Math.abs(b - s);
      if (id === "exclusion") return b + s - 2 * b * s;
      return s;
    };
    const blendReports = [];
    for (const mode of blendModes)
      for (const alpha of [1, 0.43]) {
        const pixels = render([
          base,
          { ...top, blend: mode.id, opacity: alpha },
        ]);
        let maxError = 0;
        for (let y = 8; y < 232; y += 11)
          for (let x = 8; x < 312; x += 13)
            for (let ch = 0; ch < 3; ch++) {
              const k = (y * 320 + x) * 4 + ch,
                b = lower[k] / 255,
                s = upper[k] / 255;
              const expected =
                mode.id === "add"
                  ? Math.min(1, b + s * alpha)
                  : b * (1 - alpha) + blend(b, s, mode.id) * alpha;
              maxError = Math.max(
                maxError,
                Math.abs(pixels[k] - expected * 255),
              );
            }
        if (maxError > 3)
          throw Error(`${mode.id} alpha ${alpha}: error ${maxError}`);
        blendReports.push({ mode: mode.id, alpha, maxError });
      }
    const hole = {
      ...createSurface("ellipse", 3),
      id: "hole",
      cutoutOf: top.id,
      points: Array.from({ length: 48 }, (_, i) => ({
        x: 0.5 + Math.cos((i / 48) * Math.PI * 2) * 0.12,
        y: 0.5 + Math.sin((i / 48) * Math.PI * 2) * 0.12,
      })),
    };
    for (const mode of blendModes) {
      const pixels = render([
        base,
        { ...top, blend: mode.id, colorOverlay: defaultColorOverlay },
        hole,
      ]);
      const k = (120 * 320 + 160) * 4;
      if (pixels.slice(k, k + 3).some((v, i) => Math.abs(v - lower[k + i]) > 1))
        throw Error(`Cutout failed for ${mode.id}`);
    }
    // Feathered advanced blend must fade to the untouched lower layer at edges.
    const feathered = render([
      base,
      { ...top, blend: "difference", feather: 0.08 },
    ]);
    const k = 120 * 320 * 4;
    if (
      feathered.slice(k, k + 3).some((v, i) => Math.abs(v - lower[k + i]) > 1)
    )
      throw Error("Feather lost in advanced blend");
    const black = render(
      [base, { ...top, blend: "overlay", colorOverlay: defaultColorOverlay }],
      4.3,
      { project: { brightness: 0 } },
    );
    if (black.some((v, i) => i % 4 !== 3 && v !== 0))
      throw Error("Master brightness does not black out blend");
    const sheets = document.createElement("canvas");
    sheets.width = 960;
    sheets.height = 640;
    const sc = sheets.getContext("2d");
    sc.fillStyle = "#101322";
    sc.fillRect(0, 0, 960, 640);
    const overlayReports = [];
    for (let i = 0; i < overlayStyles.length; i++) {
      const style = overlayStyles[i],
        surface = {
          ...top,
          colorOverlay: {
            ...defaultColorOverlay,
            style: style.id,
            palette: overlayPalettes[i].id,
          },
        };
      const first = render([surface], 2),
        next = render([surface], 8),
        repeat = render([surface], 8),
        loop = render([surface], 32);
      if (meanDiff(first, next) < 0.5)
        throw Error(`Overlay ${style.id} did not animate over a still texture`);
      if (meanDiff(next, repeat) !== 0 || meanDiff(next, loop) !== 0)
        throw Error(`Overlay ${style.id} pause/loop mismatch`);
      const zero = render(
        [
          {
            ...surface,
            colorOverlay: { ...surface.colorOverlay, intensity: 0 },
          },
        ],
        8,
      );
      if (meanDiff(zero, upper) !== 0)
        throw Error(`Overlay ${style.id} not neutral at zero intensity`);
      render([surface], 8);
      sc.drawImage(canvas, (i % 4) * 240, Math.floor(i / 4) * 320, 240, 280);
      sc.fillStyle = "#ffffff";
      sc.font = "14px Segoe UI";
      sc.fillText(style.name, (i % 4) * 240 + 8, Math.floor(i / 4) * 320 + 303);
      overlayReports.push({
        style: style.id,
        meanMotion: meanDiff(first, next),
      });
    }
    const s = { ...top, colorOverlay: defaultColorOverlay };
    const crackReports = [];
    for (const effectId of ["cracks-glass", "cracks-stone", "cracks-frost"]) {
      const crack = { ...top, effectId, color: "#d1efff", blend: "normal" };
      const backdrop = render([base], 7.75);
      for (const mode of blendModes) {
        const result = render([base, { ...crack, blend: mode.id }], 7.75);
        let untouched = 0;
        for (let k = 0; k < result.length; k += 4)
          if (
            result
              .slice(k, k + 3)
              .every((v, ch) => Math.abs(v - backdrop[k + ch]) <= 1)
          )
            untouched++;
        if (untouched / (320 * 240) < 0.65)
          throw Error(`${effectId}/${mode.id} covers transparent pixels`);
      }
      const active = render([base, crack], 7.75);
      if (meanDiff(active, backdrop) < 0.08)
        throw Error(`${effectId} has no visible cracks`);
      if (meanDiff(render([base, crack], 0), render([base], 0)) !== 0)
        throw Error(`${effectId} restart leaves stale pixels`);
      if (meanDiff(render([base, crack], 16), render([base], 16)) !== 0)
        throw Error(`${effectId} loop seam is opaque`);
      // Use a static base so its own animation duration cannot hide a loop mismatch.
      const stillBase = { ...base, effectId: "brushed-aluminium" };
      if (
        meanDiff(
          render([stillBase, crack], 7.75),
          render([stillBase, crack], 23.75),
        ) !== 0
      )
        throw Error(`${effectId} deterministic overlay loop failed`);
      const masked = render([base, crack, hole], 7.75),
        center = (120 * 320 + 160) * 4;
      if (
        masked
          .slice(center, center + 3)
          .some((v, ch) => Math.abs(v - backdrop[center + ch]) > 1)
      )
        throw Error(`${effectId} ignores shape holes`);
      // Same surface ID changes alpha mode twice: cached textures cannot retain a black pane.
      render([base, top], 7.75);
      if (meanDiff(active, render([base, crack], 7.75)) !== 0)
        throw Error(`${effectId} opaque-to-alpha reassignment failed`);
      const meshA = render([crack], 7.75, { placementMesh: true }),
        meshB = render([top], 7.75, { placementMesh: true });
      if (meanDiff(meshA, meshB) !== 0)
        throw Error(`${effectId} transparency affects placement mesh`);
      const coloured = { ...crack, colorOverlay: defaultColorOverlay };
      if (meanDiff(render([base, coloured], 0), render([base], 0)) !== 0)
        throw Error(`${effectId} colour overlay fills transparent pixels`);
      crackReports.push({
        effectId,
        allBlendModes: true,
        holes: true,
        restart: true,
        reassignment: true,
        mesh: true,
        colourOverlay: true,
      });
    }
    const meshes = [
      render([s], 1, { placementMesh: true }),
      render([top], 1, { placementMesh: true }),
    ];
    if (meanDiff(...meshes) !== 0)
      throw Error("Overlay leaked into placement mesh");
    if (
      meanDiff(
        render([s], 1, { testPattern: true }),
        render([top], 1, { testPattern: true }),
      ) !== 0
    )
      throw Error("Overlay leaked into calibration");
    // Still artwork stays cached even while its overlay animates.
    render([s], 2);
    let uploads = 0;
    const upload = gl.texSubImage2D.bind(gl);
    gl.texSubImage2D = (...args) => {
      uploads++;
      return upload(...args);
    };
    render([s], 3);
    render([s], 4);
    gl.texSubImage2D = upload;
    if (uploads !== 0)
      throw Error("Still texture was re-uploaded for overlay-only animation");
    const stacked = { ...s, effectId: "stacked-liquid" },
      second = { ...stacked, id: "liquid-2" };
    const stack = {
      id: "stack",
      name: "Test",
      surfaceIds: [stacked.id, second.id],
      duration: 12,
      color: "#65cdeb",
      links: false,
    };
    const liquidA = render([stacked, second], 2, {
        project: { stacks: [stack] },
      }),
      liquidB = render([stacked, second], 5, { project: { stacks: [stack] } });
    if (meanDiff(liquidA, liquidB) < 0.5)
      throw Error("Overlay did not work on stack members");
    const result = {
      crackReports,
      blendReports,
      overlayReports,
      cutouts: true,
      feather: true,
      brightness: true,
      meshBypass: true,
      calibrationBypass: true,
      stillTextureUploads: uploads,
      stacks: true,
      sheet: sheets.toDataURL(),
    };
    renderer.dispose();
    return result;
  });
  await writeFile(
    path.join(artifacts, "colour-overlays.png"),
    Buffer.from(report.sheet.split(",")[1], "base64"),
  );
  delete report.sheet;
  await writeFile(
    path.join(artifacts, "compositing-checks.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    "PASS: ten GPU blend modes match CPU compositing at full/partial opacity; three transparent crack effects preserve lower layers, holes, restart, alpha switching and mesh; feather, brightness, eight colour overlays, still caching and stacks.",
  );
} finally {
  if (app) await app.close();
  await server.close();
}
