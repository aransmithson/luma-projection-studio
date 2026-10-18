// A static texture for placement. The projection renderer warps and clips it
// using the same geometry as the content, without changing the assigned effect.
export function drawPlacementMesh(ctx: CanvasRenderingContext2D) {
  const { width, height } = ctx.canvas;
  const cell = Math.max(width, height) / 8;
  const columns = Math.max(2, Math.round(width / cell));
  const rows = Math.max(2, Math.round(height / cell));
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  ctx.lineWidth = Math.max(1, Math.min(width, height) / 220);
  ctx.strokeStyle = "#626f78";
  ctx.beginPath();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      ctx.moveTo((x * width) / columns, (y * height) / rows);
      ctx.lineTo(((x + 1) * width) / columns, ((y + 1) * height) / rows);
    }
  }
  ctx.stroke();
  ctx.strokeStyle = "#d8edf5";
  ctx.beginPath();
  for (let x = 0; x <= columns; x++) {
    ctx.moveTo((x * width) / columns, 0);
    ctx.lineTo((x * width) / columns, height);
  }
  for (let y = 0; y <= rows; y++) {
    ctx.moveTo(0, (y * height) / rows);
    ctx.lineTo(width, (y * height) / rows);
  }
  ctx.stroke();
  // A stronger centre cross helps find the centre of a distorted surface.
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth *= 1.7;
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  ctx.restore();
}
