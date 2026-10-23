import type { Point } from "./types";

export const MIN_CANVAS_ZOOM = 0.25;
export const MAX_CANVAS_ZOOM = 16;
export const CANVAS_ZOOM_STEPS = [
  0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8, 12, 16,
];

export function clampCanvasZoom(value: number) {
  return Number.isFinite(value)
    ? Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, value))
    : 1;
}

export function stepCanvasZoom(value: number, direction: -1 | 1) {
  return direction > 0
    ? (CANVAS_ZOOM_STEPS.find((step) => step > value + 0.0001) ??
        MAX_CANVAS_ZOOM)
    : ([...CANVAS_ZOOM_STEPS].reverse().find((step) => step < value - 0.0001) ??
        MIN_CANVAS_ZOOM);
}

export function wheelCanvasZoom(value: number, delta: number, mode: number) {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? 240 : 1);
  return clampCanvasZoom(
    value * Math.exp(-Math.max(-600, Math.min(600, pixels)) * 0.0025),
  );
}

export function anchoredScroll(
  point: Point,
  anchor: Point,
  board: { x: number; y: number; width: number; height: number },
) {
  return {
    x: board.x + point.x * board.width - anchor.x,
    y: board.y + point.y * board.height - anchor.y,
  };
}

export function selectionZoom(
  view: { width: number; height: number },
  board: { width: number; height: number },
  bounds: { width: number; height: number },
) {
  return clampCanvasZoom(
    Math.min(
      Math.max(1, view.width - 96) / Math.max(1, board.width * bounds.width),
      Math.max(1, view.height - 96) / Math.max(1, board.height * bounds.height),
    ),
  );
}

// Editor zoom must not allocate a zoom-sized GPU framebuffer. Render up to the
// projector resolution (and a 4096px side); SVG mapping handles stay vector sharp.
export function editorPreviewSize(
  width: number,
  height: number,
  projectWidth: number,
  projectHeight: number,
) {
  const scale = Math.min(
    1,
    projectWidth / width,
    projectHeight / height,
    4096 / Math.max(width, height),
  );
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
