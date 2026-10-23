import { describe, expect, it } from "vitest";
import {
  anchoredScroll,
  clampCanvasZoom,
  editorPreviewSize,
  selectionZoom,
  stepCanvasZoom,
  wheelCanvasZoom,
} from "./canvasView";

describe("canvas navigation", () => {
  it("steps out of arbitrary wheel zoom values and reaches both limits", () => {
    expect(stepCanvasZoom(3.71, 1)).toBe(4);
    expect(stepCanvasZoom(3.71, -1)).toBe(3);
    expect(stepCanvasZoom(16, 1)).toBe(16);
    expect(stepCanvasZoom(0.25, -1)).toBe(0.25);
    expect(clampCanvasZoom(Infinity)).toBe(1);
    expect(clampCanvasZoom(-10)).toBe(0.25);
  });
  it("normalizes pixel, line and page wheel units and clamps long gestures", () => {
    expect(wheelCanvasZoom(2, -48, 0)).toBe(wheelCanvasZoom(2, -3, 1));
    expect(wheelCanvasZoom(2, -240, 0)).toBe(wheelCanvasZoom(2, -1, 2));
    expect(wheelCanvasZoom(16, -10000, 0)).toBe(16);
    expect(wheelCanvasZoom(0.25, 10000, 0)).toBe(0.25);
    expect(wheelCanvasZoom(wheelCanvasZoom(2, -120, 0), 120, 0)).toBeCloseTo(
      2,
      10,
    );
  });
  it("keeps the same scene coordinate under the cursor after zooming", () => {
    const point = { x: 0.73, y: 0.27 },
      cursor = { x: 310, y: 120 };
    for (const zoom of [1, 3.75, 8, 16]) {
      const board = { x: 32, y: 32, width: 600 * zoom, height: 337.5 * zoom };
      const scroll = anchoredScroll(point, cursor, board);
      expect((cursor.x + scroll.x - board.x) / board.width).toBeCloseTo(
        point.x,
        12,
      );
      expect((cursor.y + scroll.y - board.y) / board.height).toBeCloseTo(
        point.y,
        12,
      );
    }
  });
  it("fits wide or tall selected bounds with a margin and caps tiny selections", () => {
    const view = { width: 900, height: 600 },
      board = { width: 800, height: 450 };
    const wide = { width: 0.8, height: 0.1 },
      tall = { width: 0.1, height: 0.9 };
    for (const bounds of [wide, tall]) {
      const zoom = selectionZoom(view, board, bounds);
      expect(zoom * bounds.width * board.width).toBeLessThanOrEqual(
        view.width - 96 + 1e-9,
      );
      expect(zoom * bounds.height * board.height).toBeLessThanOrEqual(
        view.height - 96 + 1e-9,
      );
    }
    expect(selectionZoom(view, board, { width: 0.001, height: 0.001 })).toBe(
      16,
    );
  });
});

describe("editor preview memory", () => {
  it("keeps normal-size previews at native display density", () => {
    expect(editorPreviewSize(960, 540, 1920, 1080)).toEqual({
      width: 960,
      height: 540,
    });
  });
  it.each([
    [1920, 1080],
    [3840, 2160],
    [1024, 768],
    [8192, 8192],
  ])("bounds high zoom buffers for a %i × %i project", (width, height) => {
    const size = editorPreviewSize(width * 32, height * 32, width, height);
    expect(size.width).toBeLessThanOrEqual(Math.min(width, 4096));
    expect(size.height).toBeLessThanOrEqual(Math.min(height, 4096));
    expect(size.width / size.height).toBeCloseTo(width / height, 2);
  });
});
