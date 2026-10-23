import { describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  rename,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const {
  createSceneAi,
  outputUrl,
  preparePhoto,
} = require("../electron/scene-ai.cjs");
const {
  createPhotoLibrary,
  dimensions,
} = require("../electron/scene-photos.cjs");
const { PNG } = require("pngjs");
const png = PNG.sync.write(new PNG({ width: 32, height: 24 }));
const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const photo = {
  id: hash(png),
  name: "Props.png",
  format: "png",
  bytes: png.length,
  width: 32,
  height: 24,
};
const nativeImage = {
  createFromBuffer: () => ({
    isEmpty: () => false,
    getSize: () => ({ width: 32, height: 24 }),
    toPNG: () => png,
    resize: () => ({
      isEmpty: () => false,
      toJPEG: () => Buffer.from("reference"),
    }),
  }),
};
const mp4 = Buffer.from([
  0, 0, 0, 16, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0,
]);
const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });
const secret = "private_test_key_never_saved";
const input = { photo, prompt: "Ghosts around pumpkins", duration: 5 };
async function temporary() {
  await mkdir("test-results", { recursive: true });
  return mkdtemp(path.resolve("test-results/scene-unit-"));
}
async function setup() {
  const root = await temporary();
  let time = 10000;
  const fetch = vi.fn(),
    media = {
      importFile: vi.fn(async (file: string) => {
        expect(await readFile(file)).toEqual(mp4);
        return {
          id: "a".repeat(64),
          name: "task.mp4",
          format: "mp4",
          bytes: mp4.length,
        };
      }),
    };
  const dependencies = {
    photos: { read: vi.fn(async () => png) },
    nativeImage,
    media,
    fetch,
    now: () => time,
  };
  const ai = createSceneAi(root, dependencies);
  ai.setKey(secret);
  return {
    root,
    ai,
    fetch,
    media,
    dependencies,
    advance: () => (time += 6000),
  };
}
describe("native scene photo storage", () => {
  it("imports, serves, exports and restores a hash-verified photo", async () => {
    const root = await temporary(),
      source = path.join(root, "Props.png"),
      saved = path.join(root, "Show.luma");
    await writeFile(source, png);
    const a = createPhotoLibrary(path.join(root, "a"), nativeImage);
    expect(await a.importFile(source)).toEqual(photo);
    const response = await a.serve(
      new Request(`luma-media://photos/${photo.id}.png`),
    );
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(png);
    expect(
      (await a.serve(new Request("luma-media://photos/../../secret"))).status,
    ).toBe(404);
    const data = JSON.stringify({ scene: { photo } });
    expect(await a.exportProject(data, saved)).toEqual([]);
    const b = createPhotoLibrary(path.join(root, "b"), nativeImage);
    expect(await b.restoreProject(data, saved)).toEqual([]);
    expect(await b.read(photo)).toEqual(png);
    await writeFile(
      path.join(root, "b", `${photo.id}.png`),
      Buffer.alloc(png.length),
    );
    await expect(b.read(photo)).rejects.toThrow();
    await writeFile(
      path.join(`${saved}.media`, `photo-${photo.id}.png`),
      Buffer.alloc(png.length),
    );
    expect(await b.restoreProject(data, saved)).toEqual([photo.name]);
  });
  it("rejects huge headers, malformed images, unsupported formats and wrong originals before writing", async () => {
    const root = await temporary(),
      library = createPhotoLibrary(path.join(root, "photos"), nativeImage);
    const bad = path.join(root, "bad.png"),
      huge = Buffer.from(png);
    huge.writeUInt32BE(100000, 16);
    await writeFile(bad, huge);
    await expect(library.importFile(bad)).rejects.toThrow("32 megapixels");
    await writeFile(bad, png);
    await expect(library.importFile(bad, "f".repeat(64))).rejects.toThrow(
      "different photo",
    );
    await expect(library.importFile(path.join(root, "x.webp"))).rejects.toThrow(
      "JPG or PNG",
    );
    expect(() =>
      dimensions(Buffer.from([255, 216, ...Array(40).fill(255)])),
    ).toThrow("valid JPG or PNG");
    await expect(library.read({ ...photo, id: "../secret" })).rejects.toThrow();
  });
});
describe("Runway scene job lifecycle", () => {
  async function retainedHistory(root: string) {
    const jobs = Array.from({ length: 100 }, (_, i) => ({
      id: `old-${i}`, photoId: photo.id, prompt: input.prompt,
      duration: 5, created: i, status: "READY",
    }));
    await writeFile(path.join(root, "jobs.json"), JSON.stringify(jobs));
    await Promise.all(jobs.map((job) => writeFile(path.join(root, `job-${job.id}.mp4`), mp4)));
    return jobs;
  }
  it("prunes old downloads after saving history and waits for a pending import", async () => {
    const { root, fetch, dependencies, media } = await setup();
    const jobs = await retainedHistory(root);
    const ai = createSceneAi(root, dependencies);
    await ai.status();
    ai.setKey(secret);
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    media.importFile.mockImplementationOnce(async (file: string) => {
      await barrier;
      expect(await readFile(file)).toEqual(mp4);
      return { id: "a".repeat(64), name: "task.mp4", format: "mp4", bytes: mp4.length };
    });
    const loading = ai.load(jobs[0].id);
    await vi.waitFor(() => expect(media.importFile).toHaveBeenCalledTimes(1));
    fetch.mockResolvedValueOnce(json({ id: "new-job" }));
    const generating = ai.generate(input);
    await vi.waitFor(async () => expect(await readFile(path.join(root, "jobs.json"), "utf8")).toContain("new-job"));
    expect(await readFile(path.join(root, `job-${jobs[0].id}.mp4`))).toEqual(mp4);
    release();
    await loading;
    await generating;
    const retained = (await ai.status()).jobs;
    const downloads = (await readdir(root)).filter((name) => name.endsWith(".mp4"));
    expect(downloads).toHaveLength(97);
    expect(downloads.every((name) => retained.some((job: { id: string }) => name === `job-${job.id}.mp4`))).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("cleans managed orphans at startup but preserves other files and retained clips", async () => {
    const { root, dependencies } = await setup();
    await retainedHistory(root);
    await writeFile(path.join(root, "job-orphan.mp4"), mp4);
    await writeFile(path.join(root, "imported.mp4"), mp4);
    await mkdir(path.join(root, "job-folder.mp4"));
    const ai = createSceneAi(root, dependencies);
    expect((await ai.status()).jobs).toHaveLength(100);
    const names = await readdir(root);
    expect(names).not.toContain("job-orphan.mp4");
    expect(names).toContain("imported.mp4");
    expect(names).toContain("job-folder.mp4");
    expect(await readFile(path.join(root, "job-old-0.mp4"))).toEqual(mp4);
  });
  it("preserves downloads if the new history cannot be saved and never resubmits", async () => {
    const { root, fetch, dependencies } = await setup();
    await retainedHistory(root);
    const ai = createSceneAi(root, dependencies);
    await ai.status();
    ai.setKey(secret);
    await rename(path.join(root, "jobs.json"), path.join(root, "last-history.json"));
    await mkdir(path.join(root, "jobs.json"));
    fetch.mockResolvedValueOnce(json({ id: "started-task" }));
    await expect(ai.generate(input)).rejects.toThrow("do not resubmit");
    expect((await readdir(root)).filter((name) => name.endsWith(".mp4"))).toHaveLength(100);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("submits once, resumes after restart and downloads without disclosing the key", async () => {
    const { root, ai, fetch, dependencies, advance } = await setup();
    fetch.mockResolvedValueOnce(json({ id: "task-one" }));
    const job = await ai.generate(input);
    expect(job.status).toBe("PENDING");
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://api.dev.runwayml.com/v1/image_to_video");
    expect(options.headers.Authorization).toBe(`Bearer ${secret}`);
    const body = JSON.parse(options.body);
    expect(body.model).toBe("gen4.5");
    expect(body.promptImage).toMatch(/^data:image\/jpeg;base64,/);
    expect(body.promptText.length).toBeLessThanOrEqual(1000);
    expect(body.promptText).toContain(input.prompt);
    const saved = await readFile(path.join(root, "jobs.json"), "utf8");
    expect(saved).not.toContain(secret);
    expect(saved).not.toContain("base64");
    expect(saved).not.toContain("Authorization");
    const resumed = createSceneAi(root, dependencies);
    expect((await resumed.status()).configured).toBe(false);
    expect((await resumed.status()).jobs[0]).toEqual(job);
    resumed.setKey(secret);
    fetch.mockResolvedValueOnce(json({ id: job.id, status: "RUNNING" }));
    expect((await resumed.poll(job.id)).status).toBe("RUNNING");
    await resumed.poll(job.id);
    expect(fetch).toHaveBeenCalledTimes(2); // minimum poll interval
    advance();
    fetch.mockResolvedValueOnce(
      json({
        id: job.id,
        status: "SUCCEEDED",
        output: ["https://example.cloudfront.net/result.mp4?token=signed"],
      }),
    );
    fetch.mockResolvedValueOnce(new Response(mp4));
    expect((await resumed.poll(job.id)).status).toBe("READY");
    expect(fetch.mock.calls[3][1].headers).toBeUndefined();
    const descriptor = await resumed.load(job.id);
    expect(descriptor.format).toBe("mp4");
    expect(
      fetch.mock.calls.filter((call) => call[1].method === "POST"),
    ).toHaveLength(1);
    expect(await readFile(path.join(root, "jobs.json"), "utf8")).not.toContain(
      "signed",
    );
    resumed.setKey("");
    expect((await resumed.status()).configured).toBe(false);
    await resumed.load(job.id); // completed local clips work offline
    await rename(
      path.join(root, `job-${job.id}.mp4`),
      path.join(root, "moved.mp4"),
    );
    await expect(resumed.load(job.id)).rejects.toThrow("local clip is missing");
    expect((await resumed.status()).jobs[0].status).toBe("RUNNING");
  });
  it("never retries an ambiguous billable submission or exposes transport errors", async () => {
    const { ai, fetch } = await setup();
    fetch.mockRejectedValueOnce(Error(secret));
    await expect(ai.generate(input)).rejects.toThrow(
      "may have been accepted and charged",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(await ai.status())).not.toContain(secret);
  });
  it("cancels only known active tasks and handles failed tasks without inventing output", async () => {
    const { ai, fetch, advance } = await setup();
    fetch.mockResolvedValueOnce(json({ id: "canceled-task" }));
    const j = await ai.generate(input);
    fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect((await ai.cancel(j.id)).status).toBe("CANCELED");
    await ai.cancel(j.id);
    expect(fetch).toHaveBeenCalledTimes(2);
    await expect(ai.cancel("../unknown")).rejects.toThrow();
    fetch.mockResolvedValueOnce(json({ id: "failed-task" }));
    const failed = await ai.generate(input);
    advance();
    fetch.mockResolvedValueOnce(
      json({ id: failed.id, status: "FAILED", failure: secret }),
    );
    expect((await ai.poll(failed.id)).status).toBe("FAILED");
    expect(JSON.stringify(await ai.status())).not.toContain(secret);
    await expect(ai.load(failed.id)).rejects.toThrow("not ready");
  });
  it("blocks invalid inputs and duplicate concurrent submissions before network access", async () => {
    const { ai, fetch, dependencies } = await setup();
    ai.setKey("");
    await expect(ai.generate(input)).rejects.toThrow("Connect");
    ai.setKey(secret);
    for (const change of [
      { duration: 60 },
      { prompt: "" },
      { prompt: "x".repeat(801) },
      { photo: { ...photo, id: "../private" } },
    ])
      await expect(ai.generate({ ...input, ...change })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
    let release: (value: Buffer) => void = () => {};
    dependencies.photos.read.mockImplementationOnce(
      () =>
        new Promise<Buffer>((resolve) => {
          release = resolve;
        }),
    );
    const first = ai.generate(input);
    await Promise.resolve();
    await expect(ai.generate(input)).rejects.toThrow("already being submitted");
    fetch.mockResolvedValueOnce(json({ id: "single" }));
    release(png);
    await first;
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    "http://example.cloudfront.net/x",
    "https://localhost/a",
    "https://127.0.0.1/a",
    "https://evil.com/a",
    "https://cloudfront.net.evil.com/a",
    "https://user:pass@a.cloudfront.net/a",
    "https://a.cloudfront.net:444/a",
  ])("rejects unsafe output URL %s", (url) =>
    expect(() => outputUrl(url)).toThrow(),
  );
  it("keeps a task retryable when its output is unsafe or oversized", async () => {
    const { ai, fetch, advance, root } = await setup();
    fetch.mockResolvedValueOnce(json({ id: "bad-output" }));
    const j = await ai.generate(input);
    fetch.mockResolvedValueOnce(
      json({
        id: j.id,
        status: "SUCCEEDED",
        output: ["https://localhost/private"],
      }),
    );
    expect((await ai.poll(j.id)).error).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
    advance();
    fetch.mockResolvedValueOnce(
      json({
        id: j.id,
        status: "SUCCEEDED",
        output: ["https://a.cloudfront.net/a"],
      }),
    );
    fetch.mockResolvedValueOnce(
      new Response(mp4, {
        headers: { "content-length": String(513 * 1024 * 1024) },
      }),
    );
    expect((await ai.poll(j.id)).status).toBe("PENDING");
    expect((await readdir(root)).some((file) => file.endsWith(".mp4"))).toBe(
      false,
    );
  });
  it("prepares all of the photo, without exposing an original filesystem path", () => {
    const result = preparePhoto(png, photo, nativeImage);
    expect(result.ratio).toBe("1104:832");
    expect(Object.keys(result).sort()).toEqual(["promptImage", "ratio"]);
  });
  it("releases an unavailable task so it cannot block new generations forever", async () => {
    const { ai, fetch } = await setup();
    fetch.mockResolvedValueOnce(json({ id: "expired" }));
    const job = await ai.generate(input);
    fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect((await ai.poll(job.id)).status).toBe("FAILED");
    fetch.mockResolvedValueOnce(json({ id: "replacement" }));
    expect((await ai.generate(input)).id).toBe("replacement");
  });
});
