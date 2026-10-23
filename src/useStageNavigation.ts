import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type Ref,
} from "react";
import { bounds } from "./geometry";
import { surfaceOutline } from "./curves";
import type { Point, Surface } from "./types";
import {
  anchoredScroll,
  clampCanvasZoom,
  selectionZoom,
  stepCanvasZoom,
  wheelCanvasZoom,
} from "./canvasView";

export type StageNavigation = {
  zoomTo: (value: number) => void;
  step: (direction: -1 | 1) => void;
  fit: () => void;
  fitSelection: () => void;
};
type Anchor = { point: Point; viewport: Point };

export function useStageNavigation({
  zoom,
  onZoom,
  aspect,
  selected,
  navigationRef,
  panMode,
  isEditing,
  clearPointer,
}: {
  zoom: number;
  onZoom: (zoom: number) => void;
  aspect: number;
  selected?: Surface | null;
  navigationRef: Ref<StageNavigation>;
  panMode: boolean;
  isEditing: () => boolean;
  clearPointer: () => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    board = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 800, height: 450 });
  const fitWidth = Math.max(
    64,
    Math.min(viewport.width - 64, (viewport.height - 64) * aspect),
  );
  const pending = useRef<Anchor | null>(null),
    center = useRef<Point>({ x: 0.5, y: 0.5 });
  const pan = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const [panning, setPanning] = useState(false);
  const latest = useRef({ zoom, onZoom, isEditing, clearPointer });
  latest.current = { zoom, onZoom, isEditing, clearPointer };
  const viewportCenter = (): Point => ({
    x: container.current!.clientWidth / 2,
    y: container.current!.clientHeight / 2,
  });
  const rememberCenter = () => {
    if (!container.current || !board.current) return;
    const outer = container.current.getBoundingClientRect(),
      inner = board.current.getBoundingClientRect(),
      anchor = viewportCenter();
    center.current = {
      x: (outer.left + anchor.x - inner.left) / inner.width,
      y: (outer.top + anchor.y - inner.top) / inner.height,
    };
  };
  const placeAnchor = (anchor: Anchor) => {
    if (!container.current || !board.current) return;
    const b = board.current;
    const scroll = anchoredScroll(anchor.point, anchor.viewport, {
      x: b.offsetLeft,
      y: b.offsetTop,
      width: b.offsetWidth,
      height: b.offsetHeight,
    });
    container.current.scrollLeft = scroll.x;
    container.current.scrollTop = scroll.y;
    rememberCenter();
  };
  const zoomAt = (value: number, anchor?: Anchor) => {
    if (
      !container.current ||
      !board.current ||
      latest.current.isEditing() ||
      pan.current
    )
      return;
    rememberCenter();
    const target = anchor ?? {
      point: center.current,
      viewport: viewportCenter(),
    };
    const next = clampCanvasZoom(value);
    latest.current.clearPointer();
    if (next === latest.current.zoom) {
      placeAnchor(target);
      return;
    }
    pending.current = target;
    latest.current.zoom = next;
    latest.current.onZoom(next);
  };
  useImperativeHandle(navigationRef, () => ({
    zoomTo: (value) => zoomAt(value),
    step: (direction) => zoomAt(stepCanvasZoom(latest.current.zoom, direction)),
    fit: () =>
      zoomAt(1, { point: { x: 0.5, y: 0.5 }, viewport: viewportCenter() }),
    fitSelection: () => {
      if (!selected || !container.current) return;
      const b = bounds(surfaceOutline(selected));
      zoomAt(
        selectionZoom(
          {
            width: container.current.clientWidth,
            height: container.current.clientHeight,
          },
          { width: fitWidth, height: fitWidth / aspect },
          b,
        ),
        {
          point: { x: b.x + b.width / 2, y: b.y + b.height / 2 },
          viewport: viewportCenter(),
        },
      );
    },
  }));
  useLayoutEffect(() => {
    placeAnchor(
      pending.current ?? { point: center.current, viewport: viewportCenter() },
    );
    pending.current = null;
  }, [zoom, fitWidth, aspect, viewport.width, viewport.height]);
  useEffect(() => {
    const element = container.current!;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewport((old) =>
        old.width === width && old.height === height ? old : { width, height },
      );
    });
    observer.observe(element);
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      // Non-passive listener prevents Chromium page zoom, including trackpad pinch.
      event.preventDefault();
      if (!board.current) return;
      const outer = element.getBoundingClientRect(),
        inner = board.current.getBoundingClientRect();
      zoomAt(
        wheelCanvasZoom(latest.current.zoom, event.deltaY, event.deltaMode),
        {
          point: {
            x: (event.clientX - inner.left) / inner.width,
            y: (event.clientY - inner.top) / inner.height,
          },
          viewport: {
            x: event.clientX - outer.left,
            y: event.clientY - outer.top,
          },
        },
      );
    };
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("scroll", rememberCenter);
    return () => {
      observer.disconnect();
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("scroll", rememberCenter);
    };
  }, []);
  const stopPan = () => {
    const id = pan.current?.id;
    pan.current = null;
    setPanning(false);
    if (id !== undefined && container.current?.hasPointerCapture(id))
      container.current.releasePointerCapture(id);
  };
  useEffect(() => {
    window.addEventListener("blur", stopPan);
    return () => window.removeEventListener("blur", stopPan);
  }, []);
  const endPan = (event: PointerEvent) => {
    if (!pan.current || event.pointerId !== pan.current.id) return;
    event.stopPropagation();
    stopPan();
  };
  return {
    container,
    board,
    viewport,
    fitWidth,
    panning,
    panEvents: {
      onPointerDownCapture: (event: PointerEvent<HTMLDivElement>) => {
        if (
          !(event.button === 1 || (panMode && event.button === 0)) ||
          latest.current.isEditing()
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        const element = container.current!;
        pan.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          left: element.scrollLeft,
          top: element.scrollTop,
        };
        element.setPointerCapture(event.pointerId);
        setPanning(true);
        latest.current.clearPointer();
      },
      onPointerMoveCapture: (event: PointerEvent) => {
        const start = pan.current;
        if (!start || event.pointerId !== start.id) return;
        event.preventDefault();
        event.stopPropagation();
        container.current!.scrollLeft = start.left - (event.clientX - start.x);
        container.current!.scrollTop = start.top - (event.clientY - start.y);
      },
      onPointerUpCapture: endPan,
      onPointerCancelCapture: endPan,
      onLostPointerCapture: endPan,
    },
  };
}
