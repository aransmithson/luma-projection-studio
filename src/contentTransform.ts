import type { ContentTransform } from "./types";

export const defaultContentTransform: ContentTransform = {
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
};
export const identityContentMatrix = new Float32Array([
  1, 0, 0, 0, 1, 0, 0, 0, 1,
]);

// Inverse sampling transform: positive rotation is clockwise, positive offsets
// move the picture right/down. Use physical aspect so rotations do not stretch.
export function contentMatrix(
  transform?: ContentTransform,
  aspect = 1,
): Float32Array {
  if (
    !transform ||
    (!transform.rotation && !transform.offsetX && !transform.offsetY)
  )
    return identityContentMatrix;
  const angle = (transform.rotation * Math.PI) / 180,
    c = Math.cos(angle),
    s = Math.sin(angle);
  const a = Math.max(0.0001, aspect),
    x = 0.5 + transform.offsetX,
    y = 0.5 + transform.offsetY;
  return new Float32Array([
    c,
    -s * a,
    0,
    s / a,
    c,
    0,
    0.5 - c * x - (s / a) * y,
    0.5 + s * a * x - c * y,
    1,
  ]);
}
