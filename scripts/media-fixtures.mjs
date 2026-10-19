// Tiny original test artwork: transparent colour tiles and a generated H.264 clip.
// No third-party footage or codec executable is required.
export function gifFixture() {
  const bytes = [
    ...Buffer.from("GIF89a"),
    32,
    0,
    24,
    0,
    0x81,
    0,
    0,
    0,
    0,
    0,
    255,
    24,
    24,
    24,
    255,
    24,
    24,
    24,
    255,
  ];
  for (const [colour, delay] of [
    [1, 30],
    [2, 60],
    [3, 40],
  ]) {
    bytes.push(0x21, 0xf9, 4, 9, delay, 0, 0, 0); // disposal=background, transparent palette entry 0
    bytes.push(0x2c, 0, 0, 0, 0, 32, 0, 24, 0, 0, 2);
    const codes = [];
    for (let y = 0; y < 24; y++)
      for (let x = 0; x < 32; x++)
        codes.push(4, x > 5 && x < 26 && y > 4 && y < 20 ? colour : 0);
    codes.push(5);
    const data = [];
    let buffer = 0,
      bits = 0;
    for (const code of codes) {
      buffer |= code << bits;
      bits += 3;
      while (bits >= 8) {
        data.push(buffer & 255);
        buffer >>>= 8;
        bits -= 8;
      }
    }
    if (bits) data.push(buffer & 255);
    for (let i = 0; i < data.length; i += 255) {
      const chunk = data.slice(i, i + 255);
      bytes.push(chunk.length, ...chunk);
    }
    bytes.push(0);
  }
  return Buffer.from([...bytes, 0x3b]);
}

export async function recordVideoFixture(page, spatial = false) {
  return Buffer.from(
    await page.evaluate(async (spatial) => {
      const mimeType = "video/mp4;codecs=avc1.42001E";
      if (!MediaRecorder.isTypeSupported(mimeType))
        throw new Error(
          "Native test requires the H.264 MediaRecorder encoder.",
        );
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      const stream = canvas.captureStream(30),
        recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 800000,
        });
      const chunks = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      const done = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = reject;
      });
      const draw = (index) => {
        ctx.fillStyle = ["#ff1818", "#18ff18", "#1818ff"][index];
        ctx.fillRect(0, 0, 320, 180);
        if (spatial) {
          ctx.fillStyle = ["#1818ff", "#ff1818", "#18ff18"][index];
          ctx.fillRect(160, 0, 160, 180);
        }
      };
      draw(0);
      recorder.start();
      const start = performance.now();
      const timer = setInterval(
        () => draw(Math.min(2, Math.floor((performance.now() - start) / 1000))),
        25,
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
      clearInterval(timer);
      recorder.stop();
      await done;
      stream.getTracks().forEach((track) => track.stop());
      return Array.from(
        new Uint8Array(
          await new Blob(chunks, { type: "video/mp4" }).arrayBuffer(),
        ),
      );
    }, spatial),
  );
}
