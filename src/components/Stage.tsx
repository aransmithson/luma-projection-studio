import { useEffect, useRef, useState } from "react";
import { Check, Crosshair, LockKeyhole, PenLine, Undo2, X } from "lucide-react";
import {
  bounds,
  clamp,
  moveVertex,
  resize,
  translate,
  validPoints,
} from "../geometry";
import type { Point, RenderState, Surface } from "../types";
import { ProjectionCanvas } from "./ProjectionCanvas";
import { effectiveSolo, surfaceIsVisible } from "../cutouts";
import { renderedProject } from "../layers";
import {
  frameFromDrag,
  presetGeometry,
  presetLabels,
  ringHoleGeometry,
  type ShapeFrame,
  type ShapePreset,
} from "../shapePresets";
import {
  cubicPoint,
  hasCurves,
  insertSurfaceCorner,
  surfaceOutline,
  surfacePath,
  transformCurves,
  validSurfaceGeometry,
} from "../curves";

type Props = {
  state: RenderState;
  selectedId: string | null;
  select: (id: string | null) => void;
  updateSurface: (id: string, change: Partial<Surface>) => void;
  begin: () => void;
  finish: () => void;
  grid: boolean;
  snap: boolean;
  zoom: number;
  drawing: boolean;
  placing: ShapePreset | null;
  cancelPlacement: () => void;
  placeShape: (frame: ShapeFrame) => void;
  setDrawing: (value: boolean) => void;
  addPolygon: (points: Point[]) => void;
  selectedPoint: number | null;
  selectPoint: (index: number | null) => void;
  labels: boolean;
  onFps: (fps: number) => void;
  notify: (message: string) => void;
  onMapping: () => void;
  onDragging: (active: boolean) => void;
  onDraft: (points: Point[]) => void;
  onPointerPosition: (point: Point | null) => void;
};
type Drag = {
  id: string;
  kind: "move" | "point" | "resize" | "control1" | "control2";
  index: number;
  start: Point;
  original: Point[];
  curves: Surface["curves"];
};

export function Stage({
  state,
  selectedId,
  select,
  updateSurface,
  begin,
  finish,
  grid,
  snap,
  zoom,
  drawing,
  placing,
  cancelPlacement,
  placeShape,
  setDrawing,
  addPolygon,
  selectedPoint,
  selectPoint,
  labels,
  onFps,
  notify,
  onMapping,
  onDragging,
  onDraft,
  onPointerPosition,
}: Props) {
  const project = renderedProject(state.project);
  const container = useRef<HTMLDivElement>(null),
    svg = useRef<SVGSVGElement>(null),
    drag = useRef<Drag | null>(null);
  const [fitWidth, setFitWidth] = useState(800),
    [draft, setDraft] = useState<Point[]>([]),
    [cursor, setCursor] = useState<Point | null>(null),
    [invalidDrag, setInvalidDrag] = useState(false);
  const placementStart = useRef<Point | null>(null);
  const [placementFrame, setPlacementFrame] = useState<ShapeFrame | null>(null);
  const aspect = project.width / project.height;
  const selected = project.surfaces.find((s) => s.id === selectedId);
  const soloId = effectiveSolo(project.surfaces, state.soloSurfaceId);
  useEffect(() => {
    if (
      placing &&
      placementFrame &&
      placementFrame.width &&
      placementFrame.height
    ) {
      const outline = surfaceOutline(presetGeometry(placing, placementFrame));
      onDraft([...outline, outline[0]]);
    } else onDraft(drawing ? [...draft, ...(cursor ? [cursor] : [])] : []);
  }, [draft, cursor, drawing, placing, placementFrame, onDraft]);
  useEffect(() => {
    placementStart.current = null;
    setPlacementFrame(null);
  }, [placing]);
  useEffect(() => {
    const cancel = () => {
      placementStart.current = null;
      setPlacementFrame(null);
    };
    window.addEventListener("blur", cancel);
    return () => window.removeEventListener("blur", cancel);
  }, []);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setFitWidth(Math.max(200, Math.min(width - 64, (height - 64) * aspect)));
    });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, [aspect]);
  useEffect(() => {
    const cancel = () => {
      if (drag.current) {
        drag.current = null;
        onDragging(false);
        onMapping();
        finish();
      }
    };
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("blur", cancel);
      cancel();
    };
  }, [finish, onDragging, onMapping]);
  useEffect(() => {
    if (!drawing) {
      setDraft([]);
      setCursor(null);
    }
  }, [drawing]);
  function finishPolygon() {
    if (draft.length < 3) {
      notify("Add at least three corners to finish your polygon.");
      return;
    }
    if (!validPoints("polygon", draft)) {
      notify("Edges cannot cross. Undo the last point with Backspace.");
      return;
    }
    addPolygon(draft);
    setDrawing(false);
    setDraft([]);
  }
  useEffect(() => {
    if (!drawing) return;
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "Enter") {
        e.preventDefault();
        finishPolygon();
      }
      if (e.key === "Escape") {
        setDrawing(false);
        setDraft([]);
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setDraft((points) => points.slice(0, -1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  const position = (event: React.PointerEvent): Point => {
    const rect = svg.current!.getBoundingClientRect();
    const p = {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    };
    if (snap) {
      p.x = clamp(
        (Math.round((p.x * project.width) / 10) * 10) / project.width,
      );
      p.y = clamp(
        (Math.round((p.y * project.height) / 10) * 10) / project.height,
      );
    }
    return p;
  };
  const trackPointer = (event: React.PointerEvent) => {
    const rect = svg.current!.getBoundingClientRect(),
      x = (event.clientX - rect.left) / rect.width,
      y = (event.clientY - rect.top) / rect.height;
    onPointerPosition(x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null);
  };
  const startDrag = (
    e: React.PointerEvent,
    surface: Surface,
    kind: Drag["kind"],
    index = 0,
  ) => {
    if (drawing || placing || e.button !== 0) return;
    e.stopPropagation();
    select(surface.id);
    if (surface.locked) return;
    selectPoint(
      kind === "point" || kind === "control1" || kind === "control2"
        ? index
        : null,
    );
    onMapping();
    onDragging(true);
    begin();
    drag.current = {
      id: surface.id,
      kind,
      index,
      start: position(e),
      original: surface.points,
      curves: surface.curves,
    };
    svg.current!.setPointerCapture(e.pointerId);
  };
  function onMove(e: React.PointerEvent) {
    trackPointer(e);
    const p = position(e);
    if (placing && placementStart.current) {
      setPlacementFrame(
        frameFromDrag(
          placementStart.current,
          p,
          e.shiftKey,
          project.width,
          project.height,
        ),
      );
      return;
    }
    if (drawing) setCursor(p);
    const d = drag.current;
    if (!d) return;
    const surface = project.surfaces.find((s) => s.id === d.id);
    if (!surface) return;
    if (d.kind === "control1" || d.kind === "control2") {
      const curves = (d.curves || []).map((edge, i) =>
        i === d.index && edge ? { ...edge, [d.kind]: p } : edge,
      );
      const valid = validSurfaceGeometry({ ...surface, curves });
      setInvalidDrag(!valid);
      if (valid) updateSurface(d.id, { curves });
      return;
    }
    let points: Point[];
    if (d.kind === "move")
      points = translate(d.original, p.x - d.start.x, p.y - d.start.y);
    else if (d.kind === "point") {
      const moved = moveVertex(surface.kind, d.original, d.index, p);
      if (!moved) {
        setInvalidDrag(true);
        return;
      }
      points = moved;
    } else {
      const b = bounds(d.original);
      const left = d.index === 0 || d.index === 3,
        top = d.index < 2;
      const x = left ? Math.min(p.x, b.x + b.width - 0.01) : b.x,
        y = top ? Math.min(p.y, b.y + b.height - 0.01) : b.y;
      const width = left ? b.x + b.width - x : Math.max(0.01, p.x - b.x),
        height = top ? b.y + b.height - y : Math.max(0.01, p.y - b.y);
      points = resize(d.original, width, height).map((point) => ({
        x: point.x + x - b.x,
        y: point.y + y - b.y,
      }));
    }
    const curves = transformCurves(d.original, points, d.curves);
    const valid = validSurfaceGeometry({ ...surface, points, curves });
    setInvalidDrag(!valid);
    if (valid) updateSurface(d.id, { points, curves });
  }
  function endDrag(e: React.PointerEvent) {
    if (placementStart.current) {
      const frame = frameFromDrag(
        placementStart.current,
        position(e),
        e.shiftKey,
        project.width,
        project.height,
      );
      placementStart.current = null;
      setPlacementFrame(null);
      if (e.type === "pointerup" && placing) {
        if (
          frame.width * project.width >= 8 &&
          frame.height * project.height >= 8
        )
          placeShape(frame);
        else
          notify(
            "Drag to draw a shape at least 8 projector pixels wide and high.",
          );
      }
      if (svg.current?.hasPointerCapture(e.pointerId))
        svg.current.releasePointerCapture(e.pointerId);
      return;
    }
    if (!drag.current) return;
    drag.current = null;
    onDragging(false);
    onMapping();
    setInvalidDrag(false);
    finish();
    if (svg.current?.hasPointerCapture(e.pointerId))
      svg.current.releasePointerCapture(e.pointerId);
  }
  function backgroundDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    // Shift-drawing must not start Chromium's text selection/native drag gesture.
    if (drawing || placing) e.preventDefault();
    if (placing) {
      placementStart.current = position(e);
      setPlacementFrame(null);
      svg.current!.setPointerCapture(e.pointerId);
      return;
    }
    if (!drawing) {
      select(null);
      selectPoint(null);
      return;
    }
    const p = position(e);
    if (
      draft.length >= 3 &&
      Math.hypot(
        (draft[0].x - p.x) * fitWidth * zoom,
        ((draft[0].y - p.y) * fitWidth * zoom) / aspect,
      ) < 14
    ) {
      finishPolygon();
      return;
    }
    if (draft.length >= 64) {
      notify("A surface can have up to 64 corners. Press Enter to finish.");
      return;
    }
    setDraft((points) => [...points, p]);
  }
  const coordinates = (points: Point[]) =>
    points
      .map((p) => `${p.x * project.width},${p.y * project.height}`)
      .join(" ");
  const pixel = project.width / (fitWidth * zoom);
  const handleRadius = 6 * pixel;
  const selectedBounds = selected && bounds(selected.points);
  const handles =
    selected?.kind === "ellipse" && selectedBounds
      ? [
          { x: selectedBounds.x, y: selectedBounds.y },
          { x: selectedBounds.x + selectedBounds.width, y: selectedBounds.y },
          {
            x: selectedBounds.x + selectedBounds.width,
            y: selectedBounds.y + selectedBounds.height,
          },
          { x: selectedBounds.x, y: selectedBounds.y + selectedBounds.height },
        ]
      : selected?.points;
  const labelPositions: { x: number; y: number; width: number }[] = [];
  return (
    <div
      className={`stage-scroll ${drawing || placing ? "is-drawing" : ""}`}
      ref={container}
    >
      <div
        className="stage-board"
        style={{ width: fitWidth * zoom, height: (fitWidth * zoom) / aspect }}
      >
        <div className="stage-coordinate coord-top-left">0, 0</div>
        <div className="stage-coordinate coord-top-right">{project.width}</div>
        <div className="stage-coordinate coord-bottom-left">
          {project.height}
        </div>
        <ProjectionCanvas state={state} onFps={onFps} />
        <svg
          className="stage-overlay"
          ref={svg}
          viewBox={`0 0 ${project.width} ${project.height}`}
          onPointerDown={backgroundDown}
          onPointerDownCapture={trackPointer}
          onPointerEnter={trackPointer}
          onPointerLeave={() => onPointerPosition(null)}
          onPointerMove={onMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          aria-label="Surface mapping editor"
        >
          {grid && (
            <g className="canvas-grid" pointerEvents="none">
              {Array.from({ length: 15 }, (_, i) => (
                <line
                  key={`x${i}`}
                  x1={((i + 1) * project.width) / 16}
                  x2={((i + 1) * project.width) / 16}
                  y1="0"
                  y2={project.height}
                />
              ))}
              {Array.from({ length: 8 }, (_, i) => (
                <line
                  key={`y${i}`}
                  y1={((i + 1) * project.height) / 9}
                  y2={((i + 1) * project.height) / 9}
                  x1="0"
                  x2={project.width}
                />
              ))}
            </g>
          )}
          {project.surfaces
            .filter((s) => surfaceIsVisible(s, project.surfaces))
            .sort((a, b) => Number(!!a.cutoutOf) - Number(!!b.cutoutOf))
            .map((surface) => (
              <path
                key={surface.id}
                data-surface-id={surface.id}
                d={surfacePath(surface, project.width, project.height)}
                className={`surface-outline ${surface.id === selectedId ? "selected" : ""} ${surface.locked ? "locked" : ""} ${surface.cutoutOf ? "cutout-outline" : ""} ${soloId && (surface.cutoutOf || surface.id) !== soloId ? "muted" : ""}`}
                fill="transparent"
                vectorEffect="non-scaling-stroke"
                pointerEvents={drawing || placing ? "none" : "all"}
                onPointerDown={(e) => startDrag(e, surface, "move")}
              />
            ))}
          {labels &&
            !drawing &&
            !placing &&
            project.surfaces
              .filter(
                (s) =>
                  surfaceIsVisible(s, project.surfaces) &&
                  (!soloId || (s.cutoutOf || s.id) === soloId),
              )
              .map((surface) => {
                const b = bounds(surfaceOutline(surface)),
                  name =
                    surface.name.length > 22
                      ? `${surface.name.slice(0, 20)}…`
                      : surface.name;
                const width = name.length * 6.2 + 18,
                  x = clamp(
                    b.x * project.width,
                    3 * pixel,
                    project.width - (width + 3) * pixel,
                  ),
                  initialY = Math.max(
                    3 * pixel,
                    b.y * project.height - 25 * pixel,
                  );
                let y = initialY;
                for (
                  let attempt = 0;
                  attempt < labelPositions.length;
                  attempt++
                ) {
                  const overlap = labelPositions.find(
                    (label) =>
                      x < label.x + (label.width + 4) * pixel &&
                      x + (width + 4) * pixel > label.x &&
                      y < label.y + 23 * pixel &&
                      y + 23 * pixel > label.y,
                  );
                  if (!overlap) break;
                  y = Math.min(
                    project.height - 23 * pixel,
                    overlap.y + 23 * pixel,
                  );
                }
                labelPositions.push({ x, y, width });
                return (
                  <g
                    className={`surface-label ${surface.id === selectedId ? "active" : ""}`}
                    key={surface.id}
                    transform={`translate(${x},${y}) scale(${pixel})`}
                    pointerEvents="none"
                  >
                    <rect width={width} height="20" rx="4" />
                    <text x="9" y="13.5">
                      {name}
                    </text>
                  </g>
                );
              })}
          {selected &&
            surfaceIsVisible(selected, project.surfaces) &&
            !drawing &&
            !placing && (
              <g className="selection-controls">
                <polygon
                  points={coordinates(selected.points)}
                  fill="none"
                  stroke={hasCurves(selected) ? "none" : "#b29aff"}
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
                {hasCurves(selected) && (
                  <path
                    className="selected-curve"
                    d={surfacePath(selected, project.width, project.height)}
                    fill="none"
                    stroke="#b29aff"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                )}
                {!selected.locked &&
                  selectedPoint !== null &&
                  selected.curves?.[selectedPoint] && (
                    <g className="bezier-controls">
                      {(["control1", "control2"] as const).map((handle, i) => {
                        const edge = selected.curves![selectedPoint]!,
                          p = edge[handle],
                          anchor =
                            selected.points[
                              (selectedPoint + i) % selected.points.length
                            ];
                        return (
                          <g key={handle}>
                            <line
                              x1={anchor.x * project.width}
                              y1={anchor.y * project.height}
                              x2={p.x * project.width}
                              y2={p.y * project.height}
                              vectorEffect="non-scaling-stroke"
                            />
                            <circle
                              role="button"
                              tabIndex={0}
                              aria-label={`Bézier handle ${i + 1}`}
                              cx={p.x * project.width}
                              cy={p.y * project.height}
                              r={6 * pixel}
                              vectorEffect="non-scaling-stroke"
                              onPointerDown={(e) =>
                                startDrag(e, selected, handle, selectedPoint)
                              }
                              onKeyDown={(e) => {
                                if (!e.key.startsWith("Arrow")) return;
                                e.preventDefault();
                                e.stopPropagation();
                                const step = e.shiftKey ? 10 : 1;
                                const position = {
                                  x: clamp(
                                    p.x +
                                      (e.key === "ArrowRight"
                                        ? step
                                        : e.key === "ArrowLeft"
                                          ? -step
                                          : 0) /
                                        project.width,
                                  ),
                                  y: clamp(
                                    p.y +
                                      (e.key === "ArrowDown"
                                        ? step
                                        : e.key === "ArrowUp"
                                          ? -step
                                          : 0) /
                                        project.height,
                                  ),
                                };
                                const curves = selected.curves!.map(
                                  (c, edgeIndex) =>
                                    edgeIndex === selectedPoint && c
                                      ? { ...c, [handle]: position }
                                      : c,
                                );
                                if (
                                  validSurfaceGeometry({ ...selected, curves })
                                )
                                  updateSurface(selected.id, { curves });
                              }}
                            />
                          </g>
                        );
                      })}
                    </g>
                  )}
                {!selected.locked &&
                  handles?.map((p, i) => (
                    <g key={i}>
                      <circle
                        data-vertex={i}
                        role="button"
                        aria-label={`Corner ${i + 1}`}
                        aria-pressed={selectedPoint === i}
                        tabIndex={0}
                        cx={p.x * project.width}
                        cy={p.y * project.height}
                        r={handleRadius}
                        fill={selectedPoint === i ? "#ad89ff" : "#ece5ff"}
                        stroke={selectedPoint === i ? "#ffffff" : "#9674f5"}
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        className="vertex-handle"
                        onPointerDown={(e) =>
                          startDrag(
                            e,
                            selected,
                            selected.kind === "ellipse" ? "resize" : "point",
                            i,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            if (selected.kind !== "ellipse") selectPoint(i);
                          }
                        }}
                      />
                      {selected.kind !== "ellipse" && (
                        <text
                          className="corner-number"
                          x={clamp(
                            p.x * project.width + 11 * pixel,
                            10 * pixel,
                            project.width - 10 * pixel,
                          )}
                          y={clamp(
                            p.y * project.height - 9 * pixel,
                            12 * pixel,
                            project.height - 8 * pixel,
                          )}
                          fontSize={10 * pixel}
                          pointerEvents="none"
                        >
                          {i + 1}
                        </text>
                      )}
                    </g>
                  ))}
                {!selected.locked &&
                  selected.kind === "polygon" &&
                  selected.points.length < 64 &&
                  selected.points.map((a, i) => {
                    const b = selected.points[(i + 1) % selected.points.length];
                    const insert = () => {
                      const change = insertSurfaceCorner(selected, i);
                      if (change) {
                        updateSurface(selected.id, change);
                        selectPoint(i + 1);
                      }
                    };
                    return (
                      <g
                        key={`edge${i}`}
                        className="edge-handle"
                        role="button"
                        tabIndex={0}
                        aria-label={`Add corner after ${i + 1}`}
                        transform={`translate(${(selected.curves?.[i] ? cubicPoint(a, selected.curves[i]!, b, 0.5).x : (a.x + b.x) / 2) * project.width},${(selected.curves?.[i] ? cubicPoint(a, selected.curves[i]!, b, 0.5).y : (a.y + b.y) / 2) * project.height}) scale(${pixel})`}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          insert();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            insert();
                          }
                        }}
                      >
                        <circle r="7" />
                        <path d="M-3 0H3M0-3V3" />
                      </g>
                    );
                  })}
              </g>
            )}
          {placing &&
            placementFrame &&
            placementFrame.width > 0 &&
            placementFrame.height > 0 && (
              <g
                className="placement-draft"
                pointerEvents="none"
                fill="#a389ff1c"
                stroke="#d4bfff"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              >
                <path
                  vectorEffect="non-scaling-stroke"
                  d={surfacePath(
                    presetGeometry(placing, placementFrame),
                    project.width,
                    project.height,
                  )}
                />
                {placing === "ring" && (
                  <path
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                    d={surfacePath(
                      ringHoleGeometry(placementFrame),
                      project.width,
                      project.height,
                    )}
                  />
                )}
                <text
                  x={
                    (placementFrame.x + placementFrame.width / 2) *
                    project.width
                  }
                  y={Math.max(
                    18 * pixel,
                    placementFrame.y * project.height - 10 * pixel,
                  )}
                  textAnchor="middle"
                  fill="#eee8ff"
                  stroke="none"
                  fontSize={12 * pixel}
                >
                  {Math.round(placementFrame.width * project.width)} ×{" "}
                  {Math.round(placementFrame.height * project.height)} px
                </text>
              </g>
            )}
          {drawing && draft.length > 0 && (
            <g pointerEvents="none">
              <polyline
                points={coordinates([...draft, ...(cursor ? [cursor] : [])])}
                fill="#a389ff1c"
                stroke="#b6a1ff"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="5 4"
              />
              {draft.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x * project.width}
                  cy={p.y * project.height}
                  r={handleRadius}
                  fill={i === 0 ? "#b4f5b4" : "#eee5ff"}
                />
              ))}
            </g>
          )}
        </svg>
        {state.blackout && (
          <div className="blackout-label" aria-hidden="true">
            OUTPUT BLACKED OUT
          </div>
        )}
        {project.surfaces.length === 0 && !drawing && !placing && (
          <div className="empty-canvas">
            <Crosshair size={30} />
            <strong>Your canvas is ready</strong>
            <span>Add a surface to start mapping.</span>
          </div>
        )}
      </div>
      {placing ? (
        <div className="draw-toolbar placement-toolbar">
          <span>
            <PenLine size={14} />
            Draw {presetLabels[placing].toLowerCase()} · Drag to size · Shift
            for equal sides
          </span>
          <button onClick={cancelPlacement}>
            <X size={13} />
            Cancel
          </button>
        </div>
      ) : drawing ? (
        <div className="draw-toolbar">
          <span>
            <PenLine size={14} />
            {draft.length} corners
          </span>
          <button
            disabled={!draft.length}
            onClick={() => setDraft((points) => points.slice(0, -1))}
            title="Remove last point · Backspace"
            aria-label="Undo polygon point"
          >
            <Undo2 size={14} />
          </button>
          <span className="tool-divider" />
          <button onClick={() => setDrawing(false)}>
            <X size={13} />
            Cancel
          </button>
          <button
            className="finish-polygon"
            disabled={draft.length < 3}
            onClick={finishPolygon}
          >
            <Check size={14} />
            Finish polygon
          </button>
        </div>
      ) : (
        <div
          className={`canvas-instruction ${invalidDrag ? "geometry-error" : ""}`}
        >
          {invalidDrag ? (
            <span>Corners must stay inside the canvas without crossing.</span>
          ) : selected?.locked ? (
            <>
              <LockKeyhole size={13} />
              <span>Surface locked · Unlock it to edit</span>
            </>
          ) : selectedPoint !== null ? (
            <>
              <Crosshair size={13} />
              <span>
                Corner {selectedPoint + 1} selected · Arrow keys to nudge ·
                Shift for 10 px
              </span>
            </>
          ) : (
            <>
              <Crosshair size={13} />
              <span>Drag to move · Select a corner for precise editing</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
