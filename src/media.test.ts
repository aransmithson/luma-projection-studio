import { describe, expect, it } from "vitest";
import { bindMedia, gifFrame, gifTiming, mediaRect, mediaTime } from "./media";
import { createProject, parseProject, serializeProject } from "./model";
import { copyShapeData, pastedShapes } from "./shapeClipboard";
import type { LibraryMedia } from "./types";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
// @ts-expect-error Small original binary fixture shared with the native workflow.
import { gifFixture } from "../scripts/media-fixtures.mjs";
const { createMediaLibrary, byteRange, projectAssets } = createRequire(
  import.meta.url,
)("../electron/media.cjs");
const asset: LibraryMedia = {
  id: "a".repeat(64),
  name: "Tiles.gif",
  format: "gif",
  bytes: 1024,
  width: 32,
  height: 24,
  duration: 1.3,
  thumbnail: "data:image/png;base64,AA==",
};
function project() {
  const p = createProject("blank");
  p.surfaces[0].effectId = "imported-media";
  p.surfaces[0].media = bindMedia(asset);
  return p;
}
describe("imported animation timing and project compatibility", () => {
  it("uses the shared elapsed time for looping, speed, trim, offset and hold", () => {
    const binding = {
      ...bindMedia(asset),
      trimStart: 0.2,
      trimEnd: 1.2,
      offset: 0.1,
    };
    expect(mediaTime(binding, 5.2, 1)).toBeCloseTo(0.5);
    expect(mediaTime(binding, 5.2, 0)).toBeCloseTo(0.3);
    expect(mediaTime(binding, 1.1, 2)).toBeCloseTo(0.5);
    expect(mediaTime({ ...binding, loop: false }, 100, 1)).toBeCloseTo(1.199);
    expect(mediaTime(binding, 0, 1)).toBeCloseTo(0.3);
  });
  it("calculates fill, fit and stretch without changing source aspect", () => {
    expect(mediaRect(100, 100, 200, 100, "contain")).toEqual({
      x: 0,
      y: 25,
      width: 100,
      height: 50,
    });
    expect(mediaRect(100, 100, 200, 100, "cover")).toEqual({
      x: -50,
      y: 0,
      width: 200,
      height: 100,
    });
    expect(mediaRect(100, 100, 200, 100, "stretch")).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  });
  it("reads variable GIF delays and finds exact frame boundaries", () => {
    const timing = gifTiming(gifFixture());
    expect(timing.duration).toBeCloseTo(1.3);
    expect(timing.ends).toHaveLength(3);
    expect(gifFrame(timing.ends, 0.299)).toBe(0);
    expect(gifFrame(timing.ends, 0.3)).toBe(1);
    expect(gifFrame(timing.ends, 0.91)).toBe(2);
    expect(() => gifTiming(gifFixture().subarray(0, 40))).toThrow();
    expect(() => gifTiming(new Uint8Array(20))).toThrow();
  });
  it("round-trips media in version 1 and preserves it when copying shapes", () => {
    const p = project();
    expect(parseProject(serializeProject(p))).toEqual(p);
    const pasted = pastedShapes(copyShapeData(p, p.surfaces[0].id), 1, 0);
    expect(pasted[0].media).toEqual(p.surfaces[0].media);
    expect(JSON.stringify(pasted)).not.toContain("thumbnail");
  });
  it.each([
    { asset: { ...asset, id: "../../secret" } },
    { trimStart: 2 },
    { trimEnd: 0 },
    { trimEnd: 2 },
    { offset: -1 },
    { fit: "anything" },
    { asset: { ...asset, duration: Infinity } },
    { asset: { ...asset, width: 5000 } },
  ])("rejects invalid media settings: %j", (change) => {
    const p = project();
    Object.assign(p.surfaces[0].media!, change);
    expect(() => parseProject(JSON.stringify(p))).toThrow();
  });
  it("rejects imported effects without an asset", () => {
    const p = project();
    delete p.surfaces[0].media;
    expect(() => parseProject(JSON.stringify(p))).toThrow();
  });
});
describe("native media store and portable companion files", () => {
  async function setup() {
    await mkdir("test-results", { recursive: true });
    const dir = await mkdtemp(path.resolve("test-results/media-unit-"));
    const library = createMediaLibrary(path.join(dir, "profile", "media"));
    const source = path.join(dir, "tiles.gif");
    await writeFile(source, gifFixture());
    return { dir, library, source };
  }
  it("copies an import, verifies it, persists metadata and serves ranged bytes", async () => {
    const { library, source } = await setup();
    const imported = await library.importFile(source);
    const item = await library.complete({ ...asset, ...imported });
    expect(await library.list()).toEqual([item]);
    const response = await library.serve(
      new Request(`luma-media://library/${item.id}.gif`, {
        headers: { range: "bytes=0-5" },
      }),
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(
      `bytes 0-5/${item.bytes}`,
    );
    expect(await response.text()).toBe("GIF89a");
    expect(
      (await library.serve(new Request("luma-media://library/secret.txt")))
        .status,
    ).toBe(404);
    expect(
      (
        await library.serve(
          new Request(`luma-media://elsewhere/${item.id}.gif`),
        )
      ).status,
    ).toBe(404);
  });
  it("moves projects and their companion folder to a different profile", async () => {
    const { library, source, dir } = await setup();
    const imported = await library.importFile(source),
      item = await library.complete({ ...asset, ...imported });
    const p = project();
    p.surfaces[0].media = bindMedia(item);
    const data = serializeProject(p),
      file = path.join(dir, "scene.luma");
    expect(await library.exportProject(data, file)).toEqual([]);
    const second = createMediaLibrary(path.join(dir, "other-profile", "media"));
    expect(await second.restoreProject(data, file)).toEqual([]);
    expect(await second.list()).toHaveLength(1);
    expect(
      await readFile(path.join(`${file}.media`, `${item.id}.gif`)),
    ).toEqual(gifFixture());
  });
  it("reports missing companions without blocking geometry and refuses different relink files", async () => {
    const { library, source, dir } = await setup();
    const p = project();
    expect(
      await library.restoreProject(
        serializeProject(p),
        path.join(dir, "missing.luma"),
      ),
    ).toEqual([asset.name]);
    await expect(library.importFile(source, asset.id)).rejects.toThrow(
      "different file",
    );
    const invalid = path.join(dir, "fake.mp4");
    await writeFile(invalid, "this is not an mp4 file");
    await expect(library.importFile(invalid)).rejects.toThrow("not a valid");
    await expect(library.complete(asset)).rejects.toThrow(
      "Choose an animation",
    );
    p.surfaces[0].media!.asset.id = "../secret";
    expect(() => projectAssets(JSON.stringify(p))).toThrow();
  });
  it.each([
    [null, { start: 0, end: 99, partial: false }],
    ["bytes=20-39", { start: 20, end: 39, partial: true }],
    ["bytes=90-", { start: 90, end: 99, partial: true }],
    ["bytes=-10", { start: 90, end: 99, partial: true }],
    ["bytes=100-", null],
    ["bytes=40-20", null],
    ["bytes=1-4,8-9", null],
    ["bytes=-0", null],
  ])("handles video range requests %s", (header, result) =>
    expect(byteRange(header, 100)).toEqual(result),
  );
});
