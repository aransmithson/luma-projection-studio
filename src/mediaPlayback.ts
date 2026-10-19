import { gifFrame, gifTiming, mediaRect, mediaTime, mediaUrl } from "./media";
import type { LibraryMedia, MediaAsset, MediaBinding } from "./types";

const statuses = new Map<string, string>();
const listeners = new Set<() => void>();
let generation = 0;
export const mediaStatus = (id: string) =>
  statuses.get(id) || "Loading animation...";
export const subscribeMedia = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function status(id: string, message: string) {
  if (statuses.get(id) === message) return;
  statuses.set(id, message);
  listeners.forEach((listener) => listener());
}
export function refreshMedia() {
  generation++;
  statuses.clear();
  listeners.forEach((listener) => listener());
}
if (typeof window !== "undefined") window.luma?.onMediaChanged(refreshMedia);

function videoElement(asset: Pick<MediaAsset, "id" | "format">) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  video.src = mediaUrl(asset);
  return video;
}
function closeVideo(video: HTMLVideoElement) {
  video.pause();
  video.removeAttribute("src");
  video.load();
}
function thumbnail(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 135;
  const ctx = canvas.getContext("2d")!;
  const rect = mediaRect(240, 135, width, height, "contain");
  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height);
  return canvas.toDataURL("image/png");
}
function checkDimensions(
  width: number,
  height: number,
  duration: number,
  gif = false,
) {
  if (
    !width ||
    !height ||
    width > 4096 ||
    height > 4096 ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 86400
  )
    throw new Error(
      "Use an animation up to 4096 pixels per side with a finite duration. 1080p MP4/H.264 is recommended.",
    );
  if (gif && width * height > 4194304)
    throw new Error(
      "This GIF is too large to decode efficiently. Use a GIF under 4 megapixels, or convert it to MP4/H.264.",
    );
}
async function readGif(
  asset: Pick<MediaAsset, "id" | "format">,
  signal?: AbortSignal,
) {
  if (typeof ImageDecoder === "undefined")
    throw new Error("GIF decoding requires the desktop version of Nox.");
  const response = await fetch(mediaUrl(asset), {
    signal: AbortSignal.any([
      signal || new AbortController().signal,
      AbortSignal.timeout(20000),
    ]),
  });
  if (!response.ok)
    throw new Error("Animation missing. Use Locate original to restore it.");
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.length > 50 * 1024 * 1024)
    throw new Error("GIF files must be under 50 MB.");
  const timing = gifTiming(data);
  const decoder = new ImageDecoder({
    data,
    type: "image/gif",
    preferAnimation: true,
  });
  try {
    await decoder.tracks.ready;
    if (decoder.tracks.selectedTrack?.frameCount !== timing.ends.length)
      throw new Error("The GIF frame directory is incomplete.");
    return { decoder, ...timing };
  } catch (error) {
    decoder.close();
    throw error;
  }
}
export async function probeMedia(
  descriptor: Pick<MediaAsset, "id" | "format" | "name" | "bytes">,
): Promise<LibraryMedia> {
  if (descriptor.format === "gif") {
    const gif = await readGif(descriptor);
    let frame: VideoFrame | undefined;
    try {
      frame = (await gif.decoder.decode({ frameIndex: 0 })).image;
      const width = frame.displayWidth,
        height = frame.displayHeight;
      checkDimensions(width, height, gif.duration, true);
      return {
        ...descriptor,
        width,
        height,
        duration: gif.duration,
        thumbnail: thumbnail(frame, width, height),
      };
    } finally {
      frame?.close();
      gif.decoder.close();
    }
  }
  const video = videoElement(descriptor);
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          finish(
            new Error(
              "Video decoding timed out. Try a 1080p MP4 encoded with H.264.",
            ),
          ),
        20000,
      );
      const finish = (error?: Error) => {
        clearTimeout(timer);
        video.onloadeddata = null;
        video.onerror = null;
        error ? reject(error) : resolve();
      };
      video.onloadeddata = () => finish();
      video.onerror = () =>
        finish(
          new Error(
            "This MP4 cannot be decoded. Export it with H.264 (AVC), then import again.",
          ),
        );
    });
    const width = video.videoWidth,
      height = video.videoHeight,
      duration = video.duration;
    checkDimensions(width, height, duration);
    return {
      ...descriptor,
      width,
      height,
      duration,
      thumbnail: thumbnail(video, width, height),
    };
  } finally {
    closeVideo(video);
  }
}

class MediaPlayer {
  private video?: HTMLVideoElement;
  private videoFrame?: HTMLCanvasElement;
  private capturedRevision = -1;
  private gif?: Awaited<ReturnType<typeof readGif>>;
  private frame?: VideoFrame;
  private frameIndex = -1;
  private desiredIndex = -1;
  private decoding = false;
  private disposed = false;
  private abort = new AbortController();
  private lastTime = -1;
  private playing = false;
  private failed = false;
  private timer?: ReturnType<typeof setTimeout>;
  private frameCallback?: number;
  private revision = 0;
  private painted = new WeakMap<CanvasRenderingContext2D, string>();
  constructor(
    readonly media: MediaBinding,
    readonly speed: number,
  ) {
    status(media.asset.id, "Loading animation...");
    if (media.asset.format === "mp4") {
      const video = (this.video = videoElement(media.asset));
      const presented = () => {
        if (this.disposed) return;
        this.revision++;
        this.frameCallback = video.requestVideoFrameCallback(presented);
      };
      this.frameCallback = video.requestVideoFrameCallback(presented);
      // A detached, paused video may finish seeking without a compositor
      // callback. Its newly decoded frame must still replace the cached texture.
      video.onseeked = () => {
        this.revision++;
      };
      this.timer = setTimeout(
        () =>
          this.fail(
            "Animation unavailable. Locate the original file or import an H.264 MP4.",
          ),
        20000,
      );
      video.onloadeddata = () => {
        clearTimeout(this.timer);
        this.revision++;
        status(media.asset.id, "Ready · video sound muted");
      };
      video.onerror = () =>
        this.fail(
          "Animation missing or unsupported. Use Locate original to restore it.",
        );
    } else {
      void readGif(media.asset, this.abort.signal)
        .then((gif) => {
          if (this.disposed) {
            gif.decoder.close();
            return;
          }
          this.gif = gif;
          void this.decode();
        })
        .catch((error) => {
          if (!this.disposed)
            this.fail(
              error instanceof Error ? error.message : "Could not decode GIF.",
            );
        });
    }
  }
  private fail(message: string) {
    this.failed = true;
    this.revision++;
    clearTimeout(this.timer);
    this.video?.pause();
    status(this.media.asset.id, message);
  }
  private async decode() {
    if (
      this.decoding ||
      !this.gif ||
      this.disposed ||
      this.failed ||
      this.desiredIndex < 0
    )
      return;
    this.decoding = true;
    try {
      while (!this.disposed && this.desiredIndex !== this.frameIndex) {
        const index = this.desiredIndex;
        const result = await this.gif.decoder.decode({ frameIndex: index });
        if (this.disposed) {
          result.image.close();
          break;
        }
        this.frame?.close();
        this.frame = result.image;
        this.frameIndex = index;
        this.revision++;
        status(this.media.asset.id, "Ready · transparent GIF supported");
      }
    } catch (error) {
      if (!this.disposed)
        this.fail(
          error instanceof Error ? error.message : "Could not decode GIF.",
        );
    } finally {
      this.decoding = false;
    }
  }
  draw(
    ctx: CanvasRenderingContext2D,
    binding: MediaBinding,
    elapsed: number,
    playing: boolean,
  ) {
    const target = mediaTime(binding, elapsed, this.speed);
    let source: CanvasImageSource | undefined;
    if (!this.failed && this.video) {
      const video = this.video;
      if (video.readyState >= 2) {
        // Freeze one decoded image for every shape using this player. Drawing
        // the live video separately can cross a frame or seek boundary mid-pass.
        if (this.capturedRevision !== this.revision) {
          const frame = (this.videoFrame ??= document.createElement("canvas"));
          const scale = Math.min(
            1,
            1920 / Math.max(video.videoWidth, video.videoHeight),
          );
          const width = Math.max(1, Math.round(video.videoWidth * scale)),
            height = Math.max(1, Math.round(video.videoHeight * scale));
          if (frame.width !== width || frame.height !== height) {
            frame.width = width;
            frame.height = height;
          }
          frame.getContext("2d")!.drawImage(video, 0, 0, width, height);
          this.capturedRevision = this.revision;
        }
        const active =
          playing &&
          this.speed >= 0.0625 &&
          (binding.loop ||
            elapsed * this.speed + binding.offset <
              binding.trimEnd - binding.trimStart);
        const discontinuity =
          Math.abs(target - this.lastTime) > 0.3 || this.playing !== active;
        if (!active) video.pause();
        if (
          !video.seeking &&
          Math.abs(video.currentTime - target) >
            (active && !discontinuity ? 0.08 : 0.012)
        )
          video.currentTime = target;
        if (active) {
          video.playbackRate = Math.max(0.0625, this.speed);
          if (video.paused)
            void video.play().catch(() => {
              /* Retry on the next shared render tick. */
            });
        }
        this.lastTime = target;
        this.playing = active;
      }
      source = this.videoFrame;
    } else if (this.gif && !this.failed) {
      this.desiredIndex = gifFrame(this.gif.ends, target);
      void this.decode();
      source = this.frame;
    }
    const paintKey = `${this.revision}:${binding.fit}:${ctx.canvas.width}:${ctx.canvas.height}`;
    if (this.painted.get(ctx) === paintKey) return false;
    this.painted.set(ctx, paintKey);
    ctx.resetTransform();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (source) {
      const rect = mediaRect(
        ctx.canvas.width,
        ctx.canvas.height,
        binding.asset.width,
        binding.asset.height,
        binding.fit,
      );
      ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height);
    }
    return true;
  }
  dispose() {
    this.disposed = true;
    this.abort.abort();
    clearTimeout(this.timer);
    if (this.video) {
      if (this.frameCallback !== undefined)
        this.video.cancelVideoFrameCallback(this.frameCallback);
      this.video.onerror = null;
      this.video.onloadeddata = null;
      this.video.onseeked = null;
      closeVideo(this.video);
    }
    this.gif?.decoder.close();
    this.frame?.close();
    if (this.videoFrame) {
      this.videoFrame.width = 0;
      this.videoFrame.height = 0;
    }
  }
}

export class MediaPlayers {
  private players = new Map<string, MediaPlayer>();
  private used = new Set<string>();
  private generation = generation;
  begin() {
    if (this.generation !== generation) {
      this.dispose();
      this.generation = generation;
    }
    this.used.clear();
  }
  draw(
    ctx: CanvasRenderingContext2D,
    binding: MediaBinding,
    elapsed: number,
    speed: number,
    playing: boolean,
  ) {
    const key = JSON.stringify([
      binding.asset.id,
      binding.trimStart,
      binding.trimEnd,
      binding.offset,
      binding.loop,
      speed,
    ]);
    this.used.add(key);
    let player = this.players.get(key);
    if (!player) {
      player = new MediaPlayer(binding, speed);
      this.players.set(key, player);
    }
    return player.draw(ctx, binding, elapsed, playing);
  }
  end() {
    for (const [key, player] of this.players)
      if (!this.used.has(key)) {
        player.dispose();
        this.players.delete(key);
      }
  }
  dispose() {
    for (const player of this.players.values()) player.dispose();
    this.players.clear();
  }
}
