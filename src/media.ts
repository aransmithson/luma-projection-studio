import type { MediaAsset, MediaBinding } from "./types";

export function mediaUrl(asset: Pick<MediaAsset, "id" | "format">) {
  return `luma-media://library/${asset.id}.${asset.format}`;
}
export function bindMedia(item: MediaAsset): MediaBinding {
  // Do not duplicate library thumbnails into project/clipboard/autosave data.
  const { id, name, format, bytes, width, height, duration } = item;
  return {
    asset: { id, name, format, bytes, width, height, duration },
    fit: "cover",
    loop: true,
    trimStart: 0,
    trimEnd: duration,
    offset: 0,
  };
}
export function mediaTime(media: MediaBinding, elapsed: number, speed: number) {
  const length = media.trimEnd - media.trimStart;
  const time = Math.max(0, elapsed * speed + media.offset);
  return (
    media.trimStart +
    (media.loop ? time % length : Math.min(time, Math.max(0, length - 0.001)))
  );
}
export function mediaRect(
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  fit: MediaBinding["fit"],
) {
  if (fit === "stretch") return { x: 0, y: 0, width, height };
  const scale = (fit === "cover" ? Math.max : Math.min)(
    width / sourceWidth,
    height / sourceHeight,
  );
  const w = sourceWidth * scale,
    h = sourceHeight * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}

// Read timing only. Chromium's ImageDecoder supplies fully composited frames,
// including GIF disposal, transparency and local colour tables.
export function gifTiming(data: Uint8Array) {
  if (
    data.length < 14 ||
    !/^GIF8[79]a$/.test(String.fromCharCode(...data.subarray(0, 6)))
  )
    throw new Error("Invalid GIF file.");
  const width = data[6] | (data[7] << 8),
    height = data[8] | (data[9] << 8);
  if (
    !width ||
    !height ||
    width > 4096 ||
    height > 4096 ||
    width * height > 4194304
  )
    throw new Error(
      "Use a GIF under 4 megapixels and 4096 pixels per side, or convert it to MP4.",
    );
  let offset = 13 + (data[10] & 128 ? 3 * 2 ** ((data[10] & 7) + 1) : 0);
  const ends: number[] = [];
  let duration = 0,
    delay = 0.1,
    complete = false;
  const skipBlocks = () => {
    while (offset < data.length) {
      const length = data[offset++];
      if (!length) return;
      offset += length;
    }
    throw new Error("The GIF is incomplete.");
  };
  while (offset < data.length) {
    const block = data[offset++];
    if (block === 0x3b) {
      complete = true;
      break;
    }
    if (block === 0x21) {
      const label = data[offset++];
      if (label === 0xf9) {
        if (data[offset] !== 4 || offset + 5 >= data.length)
          throw new Error("Invalid GIF frame control.");
        const centiseconds = data[offset + 2] | (data[offset + 3] << 8);
        delay = centiseconds < 2 ? 0.1 : centiseconds / 100;
      }
      skipBlocks();
    } else if (block === 0x2c) {
      if (offset + 9 >= data.length) throw new Error("Incomplete GIF frame.");
      const packed = data[offset + 8];
      offset += 9;
      if (packed & 128) offset += 3 * 2 ** ((packed & 7) + 1);
      offset++; // LZW minimum code size
      skipBlocks();
      duration += delay;
      ends.push(duration);
      delay = 0.1;
      if (ends.length > 1200 || duration > 86400)
        throw new Error(
          "GIFs support up to 1,200 frames. Use MP4 for longer animations.",
        );
    } else throw new Error("Invalid GIF block.");
  }
  if (!complete || !ends.length)
    throw new Error("The GIF is incomplete or contains no frames.");
  return { ends, duration };
}
export function gifFrame(ends: number[], time: number) {
  let low = 0,
    high = ends.length - 1;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (time < ends[mid]) high = mid;
    else low = mid + 1;
  }
  return low;
}
