const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { photoInfo } = require("./scene-photos.cjs");

const API = "https://api.dev.runwayml.com/v1";
const taskId = {
  test: (value) =>
    typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value),
};
const active = (job) => ["PENDING", "RUNNING"].includes(job.status);
const prefix =
  "Locked camera. Preserve object positions, outlines and perspective. Animate surface details only. Return to the opening appearance for a repeating loop. No camera movement or cuts. ";
const ratios = [
  [1280, 720],
  [1104, 832],
  [960, 960],
  [832, 1104],
  [720, 1280],
];

function outputUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    !["cloudfront.net", "runwayml.com", "runway.com"].some((host) =>
      url.hostname.endsWith(`.${host}`),
    )
  )
    throw Error(
      "Runway returned an unsupported download host. Download the MP4 from your Runway account and import it into Nox.",
    );
  return url.href;
}
function preparePhoto(bytes, photo, nativeImage) {
  const [width, height] = ratios.reduce((best, next) =>
    Math.abs(Math.log(next[0] / next[1] / (photo.width / photo.height))) <
    Math.abs(Math.log(best[0] / best[1] / (photo.width / photo.height)))
      ? next
      : best,
  );
  // Deliberately resize the entire image to the requested frame. The inverse
  // photo mapping restores its original proportions; no crop may move props.
  const image = nativeImage
    .createFromBuffer(bytes)
    .resize({ width, height, quality: "best" });
  if (image.isEmpty())
    throw Error("The reference photo could not be prepared.");
  const promptImage = `data:image/jpeg;base64,${image.toJPEG(90).toString("base64")}`;
  if (promptImage.length > 5_000_000)
    throw Error(
      "The prepared photo exceeds Runway's image limit. Use a smaller photo.",
    );
  return { promptImage, ratio: `${width}:${height}` };
}
async function boundedBytes(response, limit) {
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body?.cancel();
    throw Error("The response is too large.");
  }
  const parts = [];
  let size = 0;
  for await (const chunk of response.body || []) {
    size += chunk.byteLength;
    if (size > limit) throw Error("The response is too large.");
    parts.push(Buffer.from(chunk));
  }
  return Buffer.concat(parts);
}

// Transport injection is for deterministic tests. IPC never accepts an
// endpoint, source URL, path, model name or credential-bearing job object.
function createSceneAi(
  root,
  {
    photos,
    media,
    nativeImage,
    fetch: request = (...args) => globalThis.fetch(...args),
    now = Date.now,
  },
) {
  let key = "",
    jobs = [],
    creating = false,
    writes = Promise.resolve();
  const operations = new Map(),
    lastPoll = new Map();
  const records = path.join(root, "jobs.json");
  const fileFor = (id) => {
    if (!taskId.test(id)) throw Error("Invalid generation identifier.");
    return path.join(root, `job-${id}.mp4`);
  };
  const ready = (async () => {
    try {
      const stat = await fs.lstat(records);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2_000_000)
        return;
      const saved = JSON.parse(await fs.readFile(records, "utf8"));
      if (!Array.isArray(saved)) return;
      jobs = saved
        .slice(-100)
        .filter(
          (j) =>
            j &&
            taskId.test(j.id) &&
            /^[a-f0-9]{64}$/.test(j.photoId) &&
            typeof j.prompt === "string" &&
            j.prompt.length <= 800 &&
            [5, 10].includes(j.duration) &&
            Number.isFinite(j.created) &&
            ["PENDING", "RUNNING", "READY", "FAILED", "CANCELED"].includes(
              j.status,
            ),
        )
        .map((j) => ({
          id: j.id,
          photoId: j.photoId,
          prompt: j.prompt,
          duration: j.duration,
          created: j.created,
          status: j.status,
          ...(typeof j.error === "string"
            ? { error: j.error.slice(0, 300) }
            : {}),
        }));
    } catch {
      /* A missing or invalid history must not block local mapping. */
    }
  })();
  function persist() {
    const content = JSON.stringify(jobs);
    const write = async () => {
      await fs.mkdir(root, { recursive: true });
      const temp = path.join(root, `${randomUUID()}.tmp`);
      try {
        await fs.writeFile(temp, content, { flag: "wx" });
        await fs.rename(temp, records);
      } finally {
        await fs.rm(temp, { force: true });
      }
    };
    writes = writes.catch(() => {}).then(write);
    return writes;
  }
  function find(id) {
    if (typeof id !== "string" || !taskId.test(id))
      throw Error("Invalid generation identifier.");
    const job = jobs.find((j) => j.id === id);
    if (!job) throw Error("This generation is not in the local history.");
    return job;
  }
  async function api(route, method = "GET", body) {
    if (!key)
      throw Error("Connect your Runway API key for this session first.");
    let response;
    try {
      response = await request(`${API}${route}`, {
        method,
        redirect: "error",
        signal: AbortSignal.timeout(45_000),
        headers: {
          Authorization: `Bearer ${key}`,
          "X-Runway-Version": "2024-11-06",
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw Error(
        method === "POST"
          ? "No confirmation from Runway. The request may have been accepted and charged. Check your Runway account before generating again; Nox has not retried it."
          : "Could not reach Runway. Reconnect and check this generation again; no new generation has been submitted.",
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      const messages = {
        401: "Runway rejected this API key. Reconnect with a valid key.",
        403: "Your Runway account cannot access this model.",
        402: "Your Runway account needs credits.",
        429: "Runway is busy or your account limit was reached. Wait before trying again.",
        404: "This Runway task is no longer available. Check your Runway account.",
      };
      const error = Error(
        messages[response.status] ||
          `Runway returned HTTP ${response.status}. Check your account and request settings before retrying.`,
      );
      error.httpStatus = response.status;
      throw error;
    }
    if (method === "DELETE") {
      await response.body?.cancel();
      return null;
    }
    try {
      return JSON.parse(
        (await boundedBytes(response, 128_000)).toString("utf8"),
      );
    } catch {
      throw Error(
        method === "POST"
          ? "Runway returned an unreadable confirmation. Check your account before generating again; the request may have been charged."
          : "Runway returned an unreadable task response. Check again shortly.",
      );
    }
  }
  async function download(job, value) {
    const url = outputUrl(value);
    let response;
    try {
      response = await request(url, {
        redirect: "error",
        signal: AbortSignal.timeout(180_000),
      });
    } catch {
      throw Error(
        "Could not download the generated MP4. Check again to retry the download without generating again.",
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw Error(
        "The generated clip could not be downloaded. Check again to get a fresh download link.",
      );
    }
    const bytes = await boundedBytes(response, 512 * 1024 * 1024);
    if (bytes.length < 12 || bytes.toString("ascii", 4, 8) !== "ftyp")
      throw Error(
        "Runway did not return an MP4 video. Download H.264 MP4 from your account and import it.",
      );
    await fs.mkdir(root, { recursive: true });
    const temp = path.join(root, `${randomUUID()}.tmp`);
    try {
      await fs.writeFile(temp, bytes, { flag: "wx" });
      await fs.rename(temp, fileFor(job.id));
    } finally {
      await fs.rm(temp, { force: true });
    }
  }
  function exclusive(id, action) {
    const previous = operations.get(id) || Promise.resolve();
    const next = previous.catch(() => {}).then(action);
    operations.set(id, next);
    void next
      .finally(() => {
        if (operations.get(id) === next) operations.delete(id);
      })
      .catch(() => {});
    return next;
  }
  return {
    async status() {
      await ready;
      return { configured: !!key, jobs: jobs.map((j) => ({ ...j })).reverse() };
    },
    setKey(value) {
      if (
        typeof value !== "string" ||
        value.length > 512 ||
        (value.trim() && !/^[\x21-\x7e]{20,512}$/.test(value.trim()))
      )
        throw Error("Enter a valid Runway API key.");
      key = value.trim();
    },
    async generate(input) {
      await ready;
      if (creating) throw Error("A generation is already being submitted.");
      if (
        !input ||
        typeof input.prompt !== "string" ||
        !input.prompt.trim() ||
        input.prompt.length > 800 ||
        ![5, 10].includes(input.duration)
      )
        throw Error(
          "Enter a prompt of up to 800 characters and choose 5 or 10 seconds.",
        );
      if (jobs.filter(active).length >= 2)
        throw Error(
          "Wait for one of your two active generations, or cancel it first.",
        );
      if (!key)
        throw Error("Connect your Runway API key for this session first.");
      const photo = photoInfo(input.photo);
      creating = true;
      try {
        const prepared = preparePhoto(
          await photos.read(photo),
          photo,
          nativeImage,
        );
        // No automatic POST retries: a lost confirmation can still be billable.
        const result = await api("/image_to_video", "POST", {
          model: "gen4.5",
          ...prepared,
          promptText: prefix + input.prompt.trim(),
          duration: input.duration,
        });
        if (!result || !taskId.test(result.id))
          throw Error(
            "Runway did not provide a usable task ID. Check your account before generating again; the request may have been charged.",
          );
        const job = {
          id: result.id,
          photoId: photo.id,
          prompt: input.prompt.trim(),
          duration: input.duration,
          created: now(),
          status: "PENDING",
        };
        jobs = [
          ...jobs.filter(active),
          ...jobs.filter((j) => !active(j)).slice(-97),
          job,
        ];
        try {
          await persist();
        } catch {
          throw Error(
            `Generation ${job.id} started, but its history could not be saved. Keep Nox open and check the generation; do not resubmit it.`,
          );
        }
        return { ...job };
      } finally {
        creating = false;
      }
    },
    async poll(id) {
      await ready;
      find(id);
      return exclusive(id, async () => {
        const job = find(id);
        if (!active(job) || now() - (lastPoll.get(id) ?? -Infinity) < 5000)
          return { ...job };
        lastPoll.set(id, now());
        try {
          const result = await api(`/tasks/${id}`);
          if (result?.id !== id)
            throw Error(
              "Runway returned an unexpected task. Check again shortly.",
            );
          if (result.status === "SUCCEEDED") {
            if (
              !Array.isArray(result.output) ||
              typeof result.output[0] !== "string"
            )
              throw Error(
                "Runway has not provided a clip yet. Check again shortly.",
              );
            await download(job, result.output[0]);
            job.status = "READY";
          } else if (result.status === "FAILED") {
            job.status = "FAILED";
            job.error =
              "Runway could not generate this variation. Check the task in your Runway account for its reason and credit status.";
          } else if (result.status === "CANCELLED") job.status = "CANCELED";
          else if (["PENDING", "THROTTLED"].includes(result.status))
            job.status = "PENDING";
          else if (result.status === "RUNNING") job.status = "RUNNING";
          else
            throw Error(
              "Runway returned an unknown task status. Check again shortly.",
            );
          if (job.status !== "FAILED") delete job.error;
        } catch (error) {
          job.error = error.message;
          if (error.httpStatus === 404) job.status = "FAILED";
        }
        await persist();
        return { ...job };
      });
    },
    async cancel(id) {
      await ready;
      find(id);
      return exclusive(id, async () => {
        const job = find(id);
        if (!active(job)) return { ...job };
        await api(`/tasks/${id}`, "DELETE");
        job.status = "CANCELED";
        delete job.error;
        await persist();
        return { ...job };
      });
    },
    async load(id) {
      await ready;
      const job = find(id);
      if (job.status !== "READY")
        throw Error("This generation is not ready to preview.");
      const file = fileFor(id),
        stat = await fs.lstat(file).catch(() => null);
      if (!stat?.isFile() || stat.isSymbolicLink()) {
        job.status = "RUNNING";
        await persist();
        throw Error(
          "The local clip is missing. Connect Runway and check this generation to download it again.",
        );
      }
      const asset = await media.importFile(file);
      return { ...asset, name: `Scene - ${job.prompt.slice(0, 80)}` };
    },
  };
}
module.exports = { createSceneAi, preparePhoto, outputUrl, boundedBytes };
