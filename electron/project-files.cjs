const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const writes = new Map();

function writeProjectFile(filePath, data, io = fs) {
  const resolved = path.resolve(filePath);
  const key = process.platform === "win32" ? resolved.toLowerCase() : resolved;
  // Windows can reject overlapping replacements of the same destination.
  const next = (writes.get(key) || Promise.resolve())
    .catch(() => {})
    .then(() => replaceProjectFile(resolved, data, io));
  writes.set(key, next);
  void next.finally(() => {
    if (writes.get(key) === next) writes.delete(key);
  }).catch(() => {});
  return next;
}

async function replaceProjectFile(filePath, data, io) {
  // A sibling keeps the final rename on the same filesystem. Never truncate
  // the last saved project before the replacement has been written and closed.
  const temp = path.join(path.dirname(filePath), `.nox-save-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await io.open(temp, "wx");
    try {
      await handle.writeFile(data, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await io.rename(temp, filePath);
  } finally {
    if (handle) await io.rm(temp, { force: true }).catch(() => {});
  }
}

module.exports = { writeProjectFile };
