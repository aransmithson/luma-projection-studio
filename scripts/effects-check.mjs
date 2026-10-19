import { _electron as electron, expect } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";

const artifacts = path.resolve("test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(artifacts, "effects-profile-"));
const server = await createServer({
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "error",
});
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}`;
const env = { ...process.env, VITE_DEV_SERVER_URL: url };
delete env.ELECTRON_RUN_AS_NODE;
let app;
try {
  app = await electron.launch({
    args: [path.resolve("."), `--user-data-dir=${profile}`],
    env,
  });
  const page = await app.firstWindow();
  await expect(page.locator(".stage-overlay")).toBeVisible();
  const results = await page.evaluate(async () => {
    const { effects } = await import("/src/catalog.ts"),
      { drawEffect } = await import("/src/effects.ts");
    const { architecturalPainters, ARCHITECTURAL_LOOP } =
      await import("/src/effects/architectural.ts");
    const architecturalIds = Object.keys(architecturalPainters);
    const reports = [],
      groups = {
        imagination: effects.filter((e) =>
          e.searchTerms?.includes("imagination"),
        ),
        "imagination-motion": effects
          .filter((e) => e.searchTerms?.includes("imagination"))
          .flatMap((effect) =>
            [0, 3, 6, 9].map((previewTime) => ({
              ...effect,
              previewTime,
              name: `${effect.name} · ${previewTime}s`,
            })),
          ),
        "stick-figures": effects.filter((e) => e.category === "Stick figures"),
        "stick-motion": effects
          .filter((e) => e.category === "Stick figures")
          .flatMap((effect) =>
            [0, 3, 6, 9].map((previewTime) => ({
              ...effect,
              previewTime,
              name: `${effect.name} · ${previewTime}s`,
            })),
          ),
        music: effects.filter((e) => e.category === "Music"),
        chase: effects
          .filter((e) => e.category === "Chase scenes")
          .map((effect) => ({ ...effect, previewTime: 2.25 })),
        "chase-motion": effects
          .filter((e) => e.category === "Chase scenes")
          .flatMap((effect) =>
            [0, 2.25, 5, 7, 9, 11.999, 12, 14.25].map((previewTime) => ({
              ...effect,
              previewTime,
              name: `${effect.name} - ${previewTime}s`,
            })),
          ),
        stage: effects.filter((e) => e.category === "Stage & light"),
        "stage-led": effects.filter((e) =>
          e.searchTerms?.includes("Back Stage"),
        ),
        "stage-mapping": effects.filter((e) =>
          e.searchTerms?.includes("3D Video Mapping"),
        ),
        "single-eyeball-motion": effects
          .filter((e) => e.id === "single-eyeball")
          .flatMap((effect) =>
            [0, 2.25, 6, 9, 12, 15, 18, 21].map((previewTime) => ({
              ...effect,
              previewTime,
              name: `${effect.name} - ${previewTime}s`,
            })),
          ),
        "eyeball-motion": effects
          .filter((e) => e.id === "eyeball-swarm")
          .flatMap((effect) =>
            [0, 2.25, 6, 9, 12, 15, 18, 21].map((previewTime) => ({
              ...effect,
              previewTime,
              name: `${effect.name} - ${previewTime}s`,
            })),
          ),
        depth: effects.filter((e) => e.category === "3D illusions"),
        "masonry-motion": effects
          .filter((e) => ["flying-bricks", "tumbling-wall"].includes(e.id))
          .flatMap((effect) =>
            [2.25, 7.75, 12, 20].map((previewTime) => ({
              ...effect,
              previewTime,
              name: `${effect.name} - ${previewTime}s`,
            })),
          ),
        cosmic: effects.filter((e) => e.loopSeconds === 24),
        "planet-motion": effects
          .filter((e) =>
            [
              "lunar-orbit",
              "saturn-rings",
              "jupiter-storms",
              "iss-orbit",
            ].includes(e.id),
          )
          .flatMap((effect) =>
            [0, 6, 12, 18].map((previewTime) => ({
              ...effect,
              previewTime,
              name: `${effect.name} - ${previewTime}s`,
            })),
          ),
        storybook: effects.filter(
          (e) => e.loopSeconds === 20 && e.category !== "Shadow puppets",
        ),
        "shadow-puppets": effects.filter(
          (e) => e.category === "Shadow puppets",
        ),
        "puppet-motion": effects
          .filter((e) => e.category === "Shadow puppets")
          .flatMap((effect) =>
            [0, 5, 10, 15].map((previewTime) => ({
              ...effect,
              previewTime,
              name: `${effect.name} · ${previewTime}s`,
            })),
          ),
        creatures: effects.filter((e) => e.category === "Creatures"),
        "colour-blocks": effects.filter((e) => e.category === "Colour blocks"),
        "halloween-peeks": effects
          .filter((e) => ["corner-skeleton", "corner-witch"].includes(e.id))
          .flatMap((effect) =>
            [2.25, 5, 8.5, 14].map((previewTime) => ({
              ...effect,
              previewTime,
              name: `${effect.name} · ${previewTime}s`,
            })),
          ),
        materials: effects.filter(
          (e) => e.still || ["chromatic-bricks", "brick-ripple"].includes(e.id),
        ),
        architectural: effects.filter((e) => architecturalIds.includes(e.id)),
        "architecture-motion": effects
          .filter((e) => architecturalIds.includes(e.id))
          .flatMap((effect) =>
            [1, 4.275, 7.75, 12].map((previewTime) => ({
              ...effect,
              previewTime,
              name: `${effect.name} · ${previewTime}s`,
            })),
          ),
        halloween: effects.filter((e) => e.category === "Halloween").slice(4),
        scenery: effects.filter((e) =>
          ["Nature", "Space"].includes(e.category),
        ),
        abstract: effects.filter(
          (e) =>
            ["Ambient", "Geometric", "Celebration"].includes(e.category) &&
            ![
              "aurora",
              "ocean",
              "plasma",
              "starfield",
              "rings",
              "grid",
              "prism",
            ].includes(e.id),
        ),
      };
    for (const effect of effects) {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      drawEffect(
        ctx,
        effect.id,
        2.25,
        effect.color,
        42,
        1,
        effect.cycleByDefault,
      );
      const first = ctx.getImageData(0, 0, 320, 180).data;
      drawEffect(
        ctx,
        effect.id,
        7.75,
        effect.color,
        42,
        1,
        effect.cycleByDefault,
      );
      const next = ctx.getImageData(0, 0, 320, 180).data;
      let lit = 0,
        changed = 0;
      for (let i = 0; i < first.length; i += 4) {
        if (Math.max(next[i], next[i + 1], next[i + 2]) > 18) lit++;
        if (
          Math.abs(first[i] - next[i]) +
            Math.abs(first[i + 1] - next[i + 1]) +
            Math.abs(first[i + 2] - next[i + 2]) >
          6
        )
          changed++;
      }
      drawEffect(
        ctx,
        effect.id,
        7.75,
        effect.color,
        42,
        1,
        effect.cycleByDefault,
      );
      const repeat = ctx.getImageData(0, 0, 320, 180).data;
      const deterministic = next.every((v, i) => v === repeat[i]);
      let seamless = true;
      let boundaryDifference = 0,
        renderMs = 0;
      const loop =
        effect.loopSeconds ||
        (architecturalIds.includes(effect.id) ? ARCHITECTURAL_LOOP : 0);
      if (loop) {
        drawEffect(ctx, effect.id, 2.25, effect.color, 42, 1, false);
        const start = ctx.getImageData(0, 0, 320, 180).data;
        drawEffect(ctx, effect.id, 2.25 + loop, effect.color, 42, 1, false);
        const looped = ctx.getImageData(0, 0, 320, 180).data;
        seamless = start.every((value, i) => value === looped[i]);
        drawEffect(ctx, effect.id, loop - 0.001, effect.color, 42, 1, false);
        const before = ctx.getImageData(0, 0, 320, 180).data;
        drawEffect(ctx, effect.id, 0.001, effect.color, 42, 1, false);
        const after = ctx.getImageData(0, 0, 320, 180).data;
        boundaryDifference =
          before.reduce(
            (sum, value, i) => sum + Math.abs(value - after[i]),
            0,
          ) / before.length;
        const benchmark = document.createElement("canvas");
        benchmark.width = 640;
        benchmark.height = 360;
        const bc = benchmark.getContext("2d");
        drawEffect(bc, effect.id, 0, effect.color, 42);
        const startTime = performance.now();
        for (let i = 0; i < 5; i++)
          drawEffect(bc, effect.id, i / 10, effect.color, 42);
        renderMs = (performance.now() - startTime) / 5;
      }
      let variesWithSeed = null;
      if (effect.loopSeconds) {
        drawEffect(ctx, effect.id, 7.75, effect.color, 137, 1, false);
        const variant = ctx.getImageData(0, 0, 320, 180).data;
        variesWithSeed = variant.some(
          (value, i) => Math.abs(value - repeat[i]) > 6,
        );
      }
      reports.push({
        id: effect.id,
        still: !!effect.still,
        lit: lit / 57600,
        changed: changed / 57600,
        deterministic,
        seamless,
        boundaryDifference,
        renderMs,
        variesWithSeed,
      });
      // Exercise the widest and smallest legal pattern scales.
      drawEffect(ctx, effect.id, 3, effect.color, 999, 0.25, false);
      drawEffect(ctx, effect.id, 3, effect.color, 999, 3, true);
    }
    const sheets = [];
    for (const [name, collection] of Object.entries(groups)) {
      const columns = name === "halloween" ? 3 : 4,
        sheet = document.createElement("canvas");
      sheet.width = columns * 336;
      sheet.height = Math.ceil(collection.length / columns) * 224;
      const sc = sheet.getContext("2d");
      sc.fillStyle = "#11121c";
      sc.fillRect(0, 0, sheet.width, sheet.height);
      collection.forEach((effect, i) => {
        const tile = document.createElement("canvas");
        tile.width = 320;
        tile.height = 180;
        drawEffect(
          tile.getContext("2d"),
          effect.id,
          effect.previewTime ??
            (name === "architectural"
              ? effect.id === "stormfront"
                ? 4.275
                : effect.id === "shatter-rebuild"
                  ? 4.8
                  : 3.5
              : 8.5),
          effect.color,
          42,
          1,
          effect.cycleByDefault,
        );
        const x = (i % columns) * 336 + 8,
          y = Math.floor(i / columns) * 224 + 8;
        sc.drawImage(tile, x, y);
        sc.fillStyle = "#e4d8f2";
        sc.font = "14px Segoe UI";
        sc.fillText(effect.name, x + 3, y + 203);
      });
      sheets.push({ name, data: sheet.toDataURL("image/png") });
    }
    return { reports, sheets };
  });
  for (const r of results.reports) {
    if (r.variesWithSeed !== null)
      expect(r.variesWithSeed, `${r.id} responds to Shuffle variation`).toBe(
        true,
      );
    expect(r.lit, `${r.id} renders visible pixels`).toBeGreaterThan(0.002);
    if (r.still)
      expect(r.changed, `${r.id} remains static during playback`).toBe(0);
    else
      expect(r.changed, `${r.id} animates over time`).toBeGreaterThan(0.0002);
    expect(r.deterministic, `${r.id} uses deterministic playback time`).toBe(
      true,
    );
    expect(r.seamless, `${r.id} repeats after its complete movement loop`).toBe(
      true,
    );
    expect(
      r.boundaryDifference,
      `${r.id} crosses the loop boundary smoothly`,
    ).toBeLessThan(2);
  }
  for (const sheet of results.sheets)
    await writeFile(
      path.join(artifacts, `effects-${sheet.name}.png`),
      Buffer.from(sheet.data.split(",")[1], "base64"),
    );
  await writeFile(
    path.join(artifacts, "effect-render-checks.json"),
    JSON.stringify(results.reports, null, 2),
  );
  console.log(
    `PASS: all ${results.reports.length} effects render, animate or remain static as intended, repeat deterministically, and support scale extremes. Contact sheets saved.`,
  );
  console.log(
    results.reports
      .filter((r) => r.renderMs)
      .map((r) => `${r.id}: ${r.renderMs.toFixed(1)} ms/frame at 640×360`)
      .join("\n"),
  );
} finally {
  if (app) await app.close();
  await server.close();
}
