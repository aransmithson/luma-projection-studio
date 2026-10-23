import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import * as fs from "node:fs/promises";
import path from "node:path";

const { writeProjectFile } = createRequire(import.meta.url)("../electron/project-files.cjs");

async function fixture() {
  await fs.mkdir("test-results", { recursive: true });
  const root = await fs.mkdtemp(path.resolve("test-results/project-save-"));
  const file = path.join(root, "Show.luma");
  await fs.writeFile(file, "last valid project");
  return { root, file };
}

describe("project file replacement", () => {
  it("replaces an existing project with the complete UTF-8 document", async () => {
    const { root, file } = await fixture();
    const data = JSON.stringify({ name: "Façade", surfaces: [1, 2, 3] });
    await writeProjectFile(file, data);
    expect(await fs.readFile(file, "utf8")).toBe(data);
    expect(await fs.readdir(root)).toEqual(["Show.luma"]);
  });
  it.each(["write", "sync", "rename"])("preserves the previous save after a %s failure", async (failure) => {
    const { root, file } = await fixture();
    const io = {
      ...fs,
      open: async (target: string, flags: string) => {
        const handle = await fs.open(target, flags);
        return {
          writeFile: async (data: string, encoding: BufferEncoding) => {
            await handle.writeFile(failure === "write" ? data.slice(0, 5) : data, encoding);
            if (failure === "write") throw Error("Disk full during write");
          },
          sync: async () => {
            if (failure === "sync") throw Error("Disk flush failed");
            await handle.sync();
          },
          close: () => handle.close(),
        };
      },
      rename: async (from: string, to: string) => {
        if (failure === "rename") throw Error("Destination is in use");
        await fs.rename(from, to);
      },
    };
    await expect(writeProjectFile(file, "replacement project", io)).rejects.toThrow();
    expect(await fs.readFile(file, "utf8")).toBe("last valid project");
    expect(await fs.readdir(root)).toEqual(["Show.luma"]);
  });
  it("serializes concurrent saves to the same destination", async () => {
    const { root, file } = await fixture();
    const data = Array.from({ length: 8 }, (_, i) => String(i).repeat(100_000));
    await Promise.all(data.map((value) => writeProjectFile(file, value)));
    expect(await fs.readFile(file, "utf8")).toBe(data.at(-1));
    expect(await fs.readdir(root)).toEqual(["Show.luma"]);
  });
  it("allows a later save after an earlier replacement fails", async () => {
    const { root, file } = await fixture();
    const result = await Promise.allSettled([
      writeProjectFile(file, "failed save", { ...fs, rename: async () => { throw Error("Destination busy"); } }),
      writeProjectFile(file, "later complete save"),
    ]);
    expect(result.map((r) => r.status)).toEqual(["rejected", "fulfilled"]);
    expect(await fs.readFile(file, "utf8")).toBe("later complete save");
    expect(await fs.readdir(root)).toEqual(["Show.luma"]);
  });
});
