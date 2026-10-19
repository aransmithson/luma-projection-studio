const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash, randomUUID } = require("node:crypto");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const idPattern = /^[a-f0-9]{64}$/;
const MAX = 64 * 1024 * 1024;
function photoInfo(p) {
  if (
    !p ||
    !idPattern.test(p.id) ||
    p.format !== "png" ||
    typeof p.name !== "string" ||
    !p.name.trim() ||
    p.name.length > 160 ||
    !Number.isInteger(p.bytes) ||
    p.bytes < 8 ||
    p.bytes > MAX ||
    !Number.isInteger(p.width) ||
    !Number.isInteger(p.height) ||
    p.width < 1 ||
    p.height < 1 ||
    p.width > 4096 ||
    p.height > 4096
  )
    throw Error("Invalid scene photo metadata.");
  const { id, name, format, bytes, width, height } = p;
  return { id, name, format, bytes, width, height };
}
// Read dimensions before decoding large compressed images.
function dimensions(b) {
  if (
    b.length > 24 &&
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b[0] === 255 && b[1] === 216) {
    let p = 2;
    while (p + 8 < b.length && b[p] === 255) {
      while (b[p] === 255) p++;
      if (p + 3 > b.length) break;
      const marker = b[p++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      const size = b.readUInt16BE(p);
      if (size < 2 || p + size > b.length) break;
      if (
        size >= 8 &&
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker)
      )
        return { width: b.readUInt16BE(p + 5), height: b.readUInt16BE(p + 3) };
      p += size;
    }
  }
  throw Error("Choose a valid JPG or PNG photo.");
}
function createPhotoLibrary(root, nativeImage) {
  const fileFor = (id) => {
    if (!idPattern.test(id)) throw Error("Invalid photo identifier.");
    return path.join(root, `${id}.png`);
  };
  async function read(photo) {
    photo = photoInfo(photo);
    const file = fileFor(photo.id),
      stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== photo.bytes)
      throw Error("Scene photo is missing. Locate the original photo.");
    const bytes = await fs.readFile(file);
    const size = dimensions(bytes);
    if (
      hash(bytes) !== photo.id ||
      size.width !== photo.width ||
      size.height !== photo.height
    )
      throw Error("Scene photo is damaged. Locate the original photo.");
    return bytes;
  }
  async function importFile(file, expectedId) {
    if (!/\.(jpe?g|png)$/i.test(file))
      throw Error("Choose a JPG or PNG photo.");
    if (expectedId !== undefined && !idPattern.test(expectedId))
      throw Error("Invalid photo identifier.");
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > 30 * 1024 * 1024)
      throw Error("Use a photo under 30 MB.");
    const bytes = await fs.readFile(file);
    if (bytes.length > 30 * 1024 * 1024)
      throw Error("Use a photo under 30 MB.");
    const size = dimensions(bytes);
    if (
      size.width < 1 ||
      size.height < 1 ||
      size.width > 16384 ||
      size.height > 16384 ||
      size.width * size.height > 32_000_000
    )
      throw Error("Use a photo under 32 megapixels.");
    let image = nativeImage.createFromBuffer(bytes);
    if (image.isEmpty()) throw Error("This photo could not be decoded.");
    const actual = image.getSize(),
      scale = Math.min(1, 4096 / actual.width, 4096 / actual.height);
    if (actual.width * actual.height > 32_000_000)
      throw Error("Use a photo under 32 megapixels.");
    if (scale < 1)
      image = image.resize({
        width: Math.max(1, Math.round(actual.width * scale)),
        height: Math.max(1, Math.round(actual.height * scale)),
        quality: "best",
      });
    const png = image.toPNG(),
      id = hash(png);
    if (png.length > MAX) throw Error("The decoded photo is too large.");
    if (expectedId && id !== expectedId)
      throw Error(
        "This is a different photo. Choose the original, or replace the reference photo.",
      );
    await fs.mkdir(root, { recursive: true });
    const target = fileFor(id),
      temp = path.join(root, `${randomUUID()}.tmp`);
    try {
      await fs.writeFile(temp, png, { flag: "wx" });
      await fs.rename(temp, target);
    } finally {
      await fs.rm(temp, { force: true });
    }
    return photoInfo({
      id,
      name: path.basename(file).slice(0, 160),
      format: "png",
      bytes: png.length,
      ...image.getSize(),
    });
  }
  async function serve(request) {
    const url = new URL(request.url),
      match = /^\/([a-f0-9]{64})\.png$/.exec(url.pathname);
    if (
      url.hostname !== "photos" ||
      url.username ||
      url.password ||
      url.port ||
      !match ||
      !["GET", "HEAD"].includes(request.method)
    )
      return new Response(null, { status: 404 });
    try {
      const file = fileFor(match[1]),
        stat = await fs.lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX)
        throw Error();
      return new Response(
        request.method === "HEAD" ? null : await fs.readFile(file),
        {
          headers: {
            "Content-Type": "image/png",
            "Content-Length": String(stat.size),
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
          },
        },
      );
    } catch {
      return new Response(null, { status: 404 });
    }
  }
  async function companion(data, projectPath, restore) {
    const value = JSON.parse(data).scene?.photo;
    if (!value) return [];
    const photo = photoInfo(value),
      directory = `${projectPath}.media`,
      file = path.join(directory, `photo-${photo.id}.png`);
    if (restore) {
      try {
        await read(photo);
        return [];
      } catch {}
    }
    let source;
    if (!restore) {
      try {
        source = await read(photo);
      } catch {
        return [photo.name];
      }
    }
    try {
      if (!restore) await fs.mkdir(directory, { recursive: true });
      if (
        (await fs.lstat(directory)).isSymbolicLink() ||
        (await fs.lstat(file).catch(() => null))?.isSymbolicLink()
      )
        throw Error("Photo companions cannot be symbolic links.");
      if (restore) {
        const stat = await fs.stat(file);
        if (stat.size !== photo.bytes) throw Error("Photo size mismatch.");
        const bytes = await fs.readFile(file),
          size = dimensions(bytes);
        if (
          hash(bytes) !== photo.id ||
          size.width !== photo.width ||
          size.height !== photo.height
        )
          throw Error("Photo checksum mismatch.");
        await fs.mkdir(root, { recursive: true });
        const temp = path.join(root, `${randomUUID()}.tmp`);
        try {
          await fs.writeFile(temp, bytes, { flag: "wx" });
          await fs.rename(temp, fileFor(photo.id));
        } finally {
          await fs.rm(temp, { force: true });
        }
      } else {
        const temp = `${file}.${randomUUID()}.tmp`;
        try {
          await fs.writeFile(temp, source, { flag: "wx" });
          await fs.rename(temp, file);
        } finally {
          await fs.rm(temp, { force: true });
        }
      }
      return [];
    } catch (error) {
      if (!restore) throw error;
      return [photo.name];
    }
  }
  return {
    importFile,
    read,
    serve,
    exportProject: (d, p) => companion(d, p, false),
    restoreProject: (d, p) => companion(d, p, true),
  };
}
module.exports = { createPhotoLibrary, photoInfo, dimensions };
