// Managed local assets. Project data never supplies a filesystem path.
const fs = require("node:fs/promises");
const { createReadStream } = require("node:fs");
const path = require("node:path");
const { createHash, randomUUID } = require("node:crypto");
const { Readable } = require("node:stream");

const limits = { mp4: 512 * 1024 * 1024, gif: 50 * 1024 * 1024 };
const idPattern = /^[a-f0-9]{64}$/;
function assetInfo(value) {
  if (
    !value ||
    !idPattern.test(value.id) ||
    !Object.hasOwn(limits, value.format) ||
    !Number.isInteger(value.bytes) ||
    value.bytes < 6 ||
    value.bytes > limits[value.format] ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 160 ||
    !Number.isInteger(value.width) ||
    value.width < 1 ||
    value.width > 4096 ||
    !Number.isInteger(value.height) ||
    value.height < 1 ||
    value.height > 4096 ||
    !Number.isFinite(value.duration) ||
    value.duration <= 0 ||
    value.duration > 86400
  )
    throw new Error("Invalid animation metadata.");
  const { id, format, bytes, name, width, height, duration } = value;
  return { id, format, bytes, name, width, height, duration };
}
function projectAssets(data) {
  const project = JSON.parse(data);
  if (
    project?.version !== 1 ||
    !Array.isArray(project.surfaces) ||
    project.surfaces.length > 32
  )
    throw new Error("This is not a valid Nox project.");
  return [
    ...new Map(
      project.surfaces
        .filter((s) => s.effectId === "imported-media")
        .map((s) => {
          const asset = assetInfo(s.media?.asset);
          return [asset.id, asset];
        }),
    ).values(),
  ];
}
async function inspectFile(filePath, format, expectedId) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size > limits[format] || stat.size < 6)
    throw new Error(
      `${format.toUpperCase()} files must be under ${limits[format] / 1024 / 1024} MB.`,
    );
  const handle = await fs.open(filePath, "r");
  let header;
  try {
    header = Buffer.alloc(12);
    await handle.read(header, 0, 12, 0);
  } finally {
    await handle.close();
  }
  if (
    format === "gif"
      ? !/^GIF8[79]a$/.test(header.toString("ascii", 0, 6))
      : header.toString("ascii", 4, 8) !== "ftyp"
  )
    throw new Error(
      `This file is not a valid ${format.toUpperCase()} animation.`,
    );
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(filePath)) {
    bytes += chunk.length;
    if (bytes > limits[format])
      throw new Error("Animation exceeds the size limit.");
    hash.update(chunk);
  }
  const id = hash.digest("hex");
  if (expectedId && id !== expectedId)
    throw new Error(
      "This is a different file. Locate the original animation, or import it as a new animation.",
    );
  return { id, bytes };
}
function byteRange(header, size) {
  if (!header) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]));
  const end =
    match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  return Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start >= 0 &&
    start <= end &&
    start < size
    ? { start, end, partial: true }
    : null;
}
function createMediaLibrary(root) {
  const fileFor = (id, format) => {
    if (!idPattern.test(id) || !Object.hasOwn(limits, format))
      throw new Error("Invalid animation identifier.");
    return path.join(root, `${id}.${format}`);
  };
  const pending = new Map();
  async function importFile(source, expectedId) {
    const format = path.extname(source).slice(1).toLowerCase();
    if (!Object.hasOwn(limits, format))
      throw new Error("Choose an MP4 video or an animated GIF.");
    if (expectedId !== undefined && !idPattern.test(expectedId))
      throw new Error("Invalid animation identifier.");
    await fs.mkdir(root, { recursive: true });
    const temporary = path.join(root, `${randomUUID()}.tmp`);
    try {
      // Inspect before copying; inspect the copy again to catch a changing source.
      await inspectFile(source, format, expectedId);
      await fs.copyFile(source, temporary);
      const info = await inspectFile(temporary, format, expectedId);
      const descriptor = {
        ...info,
        format,
        name: path.basename(source).slice(0, 160),
      };
      const destination = fileFor(info.id, format);
      const existing = await inspectFile(destination, format, info.id).catch(
        () => null,
      );
      if (!existing) await fs.rename(temporary, destination);
      pending.set(info.id, descriptor);
      return descriptor;
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }
  async function complete(value) {
    const asset = assetInfo(value);
    const imported = pending.get(asset.id);
    if (
      !imported ||
      imported.format !== asset.format ||
      imported.bytes !== asset.bytes
    )
      throw new Error("Choose an animation before adding it to the library.");
    const thumbnail =
      typeof value.thumbnail === "string" &&
      value.thumbnail.length < 180000 &&
      /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value.thumbnail)
        ? value.thumbnail
        : undefined;
    const item = { ...asset, thumbnail };
    const target = path.join(root, `${asset.id}.json`),
      temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(item), { flag: "wx" });
      await fs.rename(temporary, target);
    } finally {
      await fs.rm(temporary, { force: true });
    }
    pending.delete(asset.id);
    return item;
  }
  async function list() {
    const entries = await fs.readdir(root).catch(() => []),
      assets = [];
    for (const entry of entries) {
      if (!/^[a-f0-9]{64}\.json$/.test(entry)) continue;
      try {
        const file = path.join(root, entry);
        if ((await fs.stat(file)).size > 200000) continue;
        const value = JSON.parse(await fs.readFile(file, "utf8"));
        const asset = assetInfo(value);
        if (
          (await fs.stat(fileFor(asset.id, asset.format))).size !== asset.bytes
        )
          continue;
        assets.push({
          ...asset,
          thumbnail:
            typeof value.thumbnail === "string" &&
            value.thumbnail.startsWith("data:image/png;base64,")
              ? value.thumbnail
              : undefined,
        });
      } catch {
        /* An incomplete or damaged library entry must not prevent startup. */
      }
    }
    return assets.sort((a, b) => a.name.localeCompare(b.name));
  }
  async function serve(request) {
    const url = new URL(request.url);
    const match = /^\/([a-f0-9]{64})\.(mp4|gif)$/.exec(url.pathname);
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    };
    if (
      url.hostname !== "library" ||
      url.username ||
      url.password ||
      url.port ||
      !match
    )
      return new Response(null, { status: 404, headers });
    if (!["GET", "HEAD"].includes(request.method))
      return new Response(null, { status: 405, headers });
    try {
      const file = fileFor(match[1], match[2]),
        stat = await fs.stat(file);
      if (!stat.isFile() || stat.size > limits[match[2]])
        throw new Error("Invalid media file.");
      const range = byteRange(request.headers.get("range"), stat.size);
      if (!range)
        return new Response(null, {
          status: 416,
          headers: { ...headers, "Content-Range": `bytes */${stat.size}` },
        });
      const { start, end, partial } = range;
      Object.assign(headers, {
        "Content-Type": match[2] === "mp4" ? "video/mp4" : "image/gif",
        "Content-Length": String(end - start + 1),
      });
      if (partial)
        headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
      return new Response(
        request.method === "HEAD"
          ? null
          : Readable.toWeb(createReadStream(file, { start, end })),
        { status: partial ? 206 : 200, headers },
      );
    } catch {
      return new Response(null, { status: 404, headers });
    }
  }
  async function exportProject(data, projectPath) {
    const assets = projectAssets(data),
      missing = [];
    if (assets.length)
      await fs.mkdir(`${projectPath}.media`, { recursive: true });
    for (const asset of assets) {
      const source = fileFor(asset.id, asset.format);
      try {
        await inspectFile(source, asset.format, asset.id);
      } catch {
        missing.push(asset.name);
        continue;
      }
      const target = path.join(
        `${projectPath}.media`,
        `${asset.id}.${asset.format}`,
      );
      // Never follow an existing symlink when copying project companions.
      const existing = await fs.lstat(target).catch(() => null);
      if (existing?.isSymbolicLink())
        throw new Error(
          "The project media destination is a symbolic link. Choose another project location.",
        );
      const directory = await fs.lstat(`${projectPath}.media`);
      if (directory.isSymbolicLink())
        throw new Error(
          "The project media folder is a symbolic link. Choose another project location.",
        );
      const valid = await inspectFile(target, asset.format, asset.id).catch(
        () => null,
      );
      if (!valid) {
        const temporary = `${target}.${randomUUID()}.tmp`;
        try {
          await fs.copyFile(source, temporary);
          await fs.rename(temporary, target);
        } finally {
          await fs.rm(temporary, { force: true });
        }
      }
    }
    return missing;
  }
  async function restoreProject(data, projectPath) {
    const assets = projectAssets(data),
      missing = [];
    for (const asset of assets) {
      try {
        await inspectFile(
          fileFor(asset.id, asset.format),
          asset.format,
          asset.id,
        );
      } catch {
        try {
          const directory = `${projectPath}.media`,
            source = path.join(directory, `${asset.id}.${asset.format}`);
          if (
            (await fs.lstat(directory)).isSymbolicLink() ||
            (await fs.lstat(source)).isSymbolicLink()
          )
            throw new Error("Symbolic links are not project media.");
          await importFile(source, asset.id);
        } catch {
          missing.push(asset.name);
          continue;
        }
      }
      // Recover the library entry too; the project contains safe metadata only.
      pending.set(asset.id, asset);
      const existing = await fs
        .readFile(path.join(root, `${asset.id}.json`), "utf8")
        .then(JSON.parse)
        .catch(() => ({}));
      await complete({ ...asset, thumbnail: existing.thumbnail });
    }
    return missing;
  }
  return { importFile, complete, list, serve, exportProject, restoreProject };
}
module.exports = { createMediaLibrary, assetInfo, byteRange, projectAssets };
