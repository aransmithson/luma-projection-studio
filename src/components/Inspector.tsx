import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  Copy,
  Crosshair,
  Layers,
  Maximize2,
  Plus,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { effectById } from "../catalog";
import { chaseRoleLabel, isChaseEffect } from "../chaseConfig";
import { defaultContentTransform } from "../contentTransform";
import { layerFor, layerIdFor } from "../layers";
import {
  blendModes,
  defaultColorOverlay,
  overlayStyles,
  overlayPalettes,
} from "../compositing";
import type { BlendMode, ColorOverlay } from "../types";
import type { ContentTransform } from "../types";
import {
  bounds,
  clamp,
  moveVertex,
  resize,
  rotate,
  translate,
  validPoints,
} from "../geometry";
import type { AnimationStack, Project, Surface } from "../types";
import { EffectPreview } from "./EffectPreview";
import { MediaControls, MediaThumbnail } from "./MediaControls";
import type { LibraryMedia } from "../types";
import { CutoutControls, type CutoutActions } from "./CutoutControls";
import { editableOutline, smoothCorner } from "../shapePresets";
import {
  edgeCurve,
  hasCurves,
  insertSurfaceCorner,
  transformCurves,
  validSurfaceGeometry,
} from "../curves";

export function RangeControl({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  display,
  onChange,
  begin,
  finish,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  display: string;
  onChange: (n: number) => void;
  begin: () => void;
  finish: () => void;
}) {
  return (
    <label className="range-control">
      <span className="field-label">
        <span>{label}</span>
        <span className="field-value">{display}</span>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={
          {
            "--range-fill": `${((value - min) / (max - min)) * 100}%`,
          } as React.CSSProperties
        }
        onPointerDown={begin}
        onPointerUp={finish}
        onPointerCancel={finish}
        onKeyDown={begin}
        onKeyUp={finish}
        onBlur={finish}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
function BlendControl({
  value,
  onChange,
}: {
  value: BlendMode;
  onChange: (mode: BlendMode) => void;
}) {
  return (
    <div>
      <label className="select-field">
        <span>Blend mode</span>
        <span className="select-wrap">
          <select
            aria-label="Blend mode"
            value={value}
            onChange={(e) => onChange(e.target.value as BlendMode)}
          >
            {blendModes.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.name}
              </option>
            ))}
          </select>
          <ChevronDown size={13} />
        </span>
      </label>
      <p className="control-hint">
        {blendModes.find((m) => m.id === value)?.hint}
      </p>
    </div>
  );
}
function ColorOverlayControls({
  surface,
  update,
  begin,
  finish,
}: {
  surface: Surface;
  update: (change: Partial<Surface>) => void;
  begin: () => void;
  finish: () => void;
}) {
  const overlay = surface.colorOverlay ?? {
    ...defaultColorOverlay,
    enabled: false,
  };
  const change = (value: Partial<ColorOverlay>) =>
    update({ colorOverlay: { ...overlay, ...value } });
  const palette = overlayPalettes.find((p) => p.id === overlay.palette)!;
  return (
    <section className="inspector-section colour-overlay-controls">
      <h3>
        Colour overlay <Sparkles size={14} />
      </h3>
      <button
        className={`effect-cycle-control ${overlay.enabled ? "active" : ""}`}
        aria-label="Enable colour overlay"
        aria-pressed={overlay.enabled}
        onClick={() => change({ enabled: !overlay.enabled })}
      >
        <span>
          <strong>Cycle colours over the effect</strong>
          <small>
            {overlay.enabled
              ? "Independent colour animation"
              : "Add moving colour to any surface"}
          </small>
        </span>
        <span className="toggle-switch">
          <span />
        </span>
      </button>
      {overlay.enabled && (
        <>
          <label className="select-field">
            <span>Style</span>
            <span className="select-wrap">
              <select
                aria-label="Overlay style"
                value={overlay.style}
                onChange={(e) =>
                  change({ style: e.target.value as ColorOverlay["style"] })
                }
              >
                {overlayStyles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </span>
          </label>
          <label className="select-field">
            <span>Palette</span>
            <span className="select-wrap">
              <select
                aria-label="Overlay palette"
                value={overlay.palette}
                onChange={(e) =>
                  change({ palette: e.target.value as ColorOverlay["palette"] })
                }
              >
                {overlayPalettes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </span>
          </label>
          <div
            className="overlay-palette-strip"
            role="img"
            aria-label={`${palette.name} palette`}
            style={{
              background: `linear-gradient(90deg,${[...palette.colors, palette.colors[0]].join(",")})`,
            }}
          />
          <label className="select-field">
            <span>Overlay mix</span>
            <span className="select-wrap">
              <select
                aria-label="Overlay mix"
                value={overlay.blend}
                onChange={(e) => change({ blend: e.target.value as BlendMode })}
              >
                {blendModes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </span>
          </label>
          <RangeControl
            label="Overlay intensity"
            value={overlay.intensity}
            display={`${Math.round(overlay.intensity * 100)}%`}
            onChange={(intensity) => change({ intensity })}
            begin={begin}
            finish={finish}
          />
          <RangeControl
            label="Overlay speed"
            value={overlay.speed}
            max={3}
            step={0.05}
            display={
              overlay.speed === 0
                ? "Still"
                : `${(24 / overlay.speed).toFixed(1)}s / cycle`
            }
            onChange={(speed) => change({ speed })}
            begin={begin}
            finish={finish}
          />
          {overlay.style !== "wash" && (
            <RangeControl
              label="Overlay scale"
              value={overlay.scale}
              min={0.25}
              max={4}
              step={0.05}
              display={`${overlay.scale.toFixed(2)}×`}
              onChange={(scale) => change({ scale })}
              begin={begin}
              finish={finish}
            />
          )}
          <label className="overlay-reverse">
            <input
              type="checkbox"
              checked={overlay.reverse}
              onChange={(e) => change({ reverse: e.target.checked })}
            />
            Reverse colour motion
          </label>
          <p className="control-hint">
            Preview on the stage. Soft light preserves shading. Overlay timing
            follows Play, Pause and Restart, independently of effect speed.
          </p>
        </>
      )}
    </section>
  );
}
function NumberField({
  label,
  value,
  onChange,
  suffix = "px",
  disabled = false,
  precision = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  disabled?: boolean;
  precision?: number;
}) {
  const format = (n: number) => String(Number(n.toFixed(precision)));
  const [text, setText] = useState(format(value));
  const edited = useRef(false);
  useEffect(() => {
    setText(format(value));
    edited.current = false;
  }, [value, precision]);
  const commit = () => {
    const n = Number(text);
    // Merely tabbing through a rounded field must not change precise geometry
    // or add a history entry ahead of the edit the user intends to undo.
    if (edited.current && Number.isFinite(n) && text.trim()) onChange(n);
    edited.current = false;
    setText(format(value));
  };
  return (
    <label className={`number-field ${disabled ? "disabled" : ""}`}>
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        step={10 ** -precision}
        disabled={disabled}
        value={text}
        onChange={(e) => {
          edited.current = true;
          setText(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      <small>{suffix}</small>
    </label>
  );
}
function ContentTransformControls({
  surface,
  update,
  begin,
  finish,
}: {
  surface: Surface;
  update: (change: Partial<Surface>) => void;
  begin: () => void;
  finish: () => void;
}) {
  const value = surface.contentTransform ?? defaultContentTransform;
  const change = (key: keyof ContentTransform, n: number) =>
    update({ contentTransform: { ...value, [key]: n } });
  return (
    <section className="inspector-section content-transform-controls">
      <h3>
        Position inside shape <Crosshair size={14} />
      </h3>
      <p className="control-hint">
        Move and rotate the picture. The shape outline and holes stay fixed.
        Empty areas reveal the layers below.
      </p>
      {(
        [
          ["rotation", "Content rotation", 180, "°"],
          ["offsetX", "Horizontal offset", 100, "%"],
          ["offsetY", "Vertical offset", 100, "%"],
        ] as const
      ).map(([key, label, limit, suffix]) => {
        const factor = key === "rotation" ? 1 : 100;
        const set = (n: number) =>
          change(key, clamp(n, -limit, limit) / factor);
        return (
          <div className="content-transform-row" key={key}>
            <NumberField
              label={label}
              value={value[key] * factor}
              suffix={suffix}
              precision={2}
              onChange={set}
            />
            <RangeControl
              label={`${label} slider`}
              value={value[key] * factor}
              min={-limit}
              max={limit}
              step={0.1}
              display={`${Math.round(value[key] * factor)}${suffix}`}
              onChange={set}
              begin={begin}
              finish={finish}
            />
          </div>
        );
      })}
      <div className="content-transform-actions">
        <button
          className="secondary-button"
          aria-label="Rotate content left 90 degrees"
          onClick={() =>
            change("rotation", ((value.rotation - 90 + 540) % 360) - 180)
          }
        >
          <RotateCcw size={14} />
          90°
        </button>
        <button
          className="secondary-button"
          aria-label="Rotate content right 90 degrees"
          onClick={() =>
            change("rotation", ((value.rotation + 90 + 540) % 360) - 180)
          }
        >
          <RotateCw size={14} />
          90°
        </button>
        <button
          className="text-button"
          onClick={() => update({ contentTransform: undefined })}
        >
          Reset content position
        </button>
      </div>
    </section>
  );
}

type Props = CutoutActions & {
  mediaLibrary: LibraryMedia[];
  locateMedia: (id: string) => void;
  importing: boolean;
  project: Project;
  surface?: Surface;
  update: (change: Partial<Surface>) => void;
  begin: () => void;
  finish: () => void;
  duplicate: () => void;
  remove: () => void;
  reorder: (direction: number) => void;
  browse: () => void;
  notify: (text: string) => void;
  selectedPoint: number | null;
  selectPoint: (index: number | null) => void;
  removePoint: () => void;
  tab: "surface" | "effect";
  setTab: (tab: "surface" | "effect") => void;
  stack?: AnimationStack;
  editStack: () => void;
  openAudio: () => void;
};

export function Inspector({
  mediaLibrary,
  locateMedia,
  importing,
  project,
  surface,
  update,
  begin,
  finish,
  duplicate,
  remove,
  reorder,
  browse,
  notify,
  selectedPoint,
  selectPoint,
  removePoint,
  tab,
  setTab,
  stack,
  editStack,
  openAudio,
  addCutout,
  subtract,
  selectSurface,
  restoreCutout,
}: Props) {
  if (!surface)
    return (
      <aside className="inspector">
        <div className="panel-heading">
          INSPECTOR
          <SlidersHorizontal size={14} />
        </div>
        <div className="inspector-empty">
          <Layers size={30} />
          <h3>A little light, precisely placed.</h3>
          <p>Select a surface to adjust its shape, appearance and motion.</p>
        </div>
      </aside>
    );
  const b = bounds(surface.points),
    effect = effectById[surface.effectId];
  const imported = surface.effectId === "imported-media" && !!surface.media;
  const mediaItem = imported
    ? mediaLibrary.find((asset) => asset.id === surface.media?.asset.id)
    : undefined;
  const effectName = imported ? surface.media!.asset.name : effect.name;
  const layerLocked = layerFor(project, surface).locked;
  const peers = project.surfaces.filter(
    (s) =>
      !s.cutoutOf && layerIdFor(project, s) === layerIdFor(project, surface),
  );
  const index = peers.findIndex((s) => s.id === surface.id);
  const effectScale = ["Creatures", "Chase scenes", "Linked stories"].includes(
    effect.category,
  )
    ? clamp(surface.scale, 0.45, 1.55)
    : surface.effectId === "toy-train"
      ? clamp(surface.scale, 0.5, 1.7)
      : surface.scale;
  const point =
    selectedPoint !== null && surface.kind !== "ellipse"
      ? surface.points[selectedPoint]
      : undefined;
  const setPoint = (axis: "x" | "y", value: number) => {
    if (!point || selectedPoint === null || surface.locked) return;
    const points = moveVertex(surface.kind, surface.points, selectedPoint, {
      ...point,
      [axis]: value / (axis === "x" ? project.width : project.height),
    });
    if (points) update({ points });
    else
      notify(
        "That corner would cross another edge. The shape has been kept unchanged.",
      );
  };
  const setDimension = (key: "x" | "y" | "width" | "height", value: number) => {
    if (surface.locked) {
      notify("Unlock this surface to change its geometry.");
      return;
    }
    const n =
      value / (key === "x" || key === "width" ? project.width : project.height);
    let points;
    if (key === "x" || key === "y")
      points = translate(
        surface.points,
        key === "x" ? n - b.x : 0,
        key === "y" ? n - b.y : 0,
      );
    else
      points = resize(
        surface.points,
        key === "width" ? clamp(n, 0.01, 1 - b.x) : b.width,
        key === "height" ? clamp(n, 0.01, 1 - b.y) : b.height,
      );
    if (validPoints(surface.kind, points)) update({ points });
  };
  const turn = (degrees: number) => {
    if (surface.locked) {
      notify("Unlock this surface to rotate it.");
      return;
    }
    const points = rotate(
      surface.points,
      degrees,
      project.width / project.height,
    );
    const curves = transformCurves(surface.points, points, surface.curves);
    if (validSurfaceGeometry({ ...surface, points, curves }))
      update({ points, curves });
    else notify("Move this surface away from the canvas edge before rotating.");
  };
  return (
    <aside className="inspector">
      <div className="panel-heading">
        INSPECTOR
        <SlidersHorizontal size={14} />
      </div>
      <div className="inspector-name">
        <span className="surface-symbol">
          <Maximize2 size={17} />
        </span>
        <div>
          <input
            key={`${surface.id}:${surface.name}`}
            aria-label="Surface name"
            disabled={layerLocked}
            defaultValue={surface.name}
            maxLength={80}
            onBlur={(e) => {
              const name = e.target.value.trim();
              if (name) update({ name });
              else e.target.value = surface.name;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <small>
            {hasCurves(surface)
              ? `Curved ${surface.points.length}-corner surface`
              : surface.kind === "quad"
                ? "4-point perspective surface"
                : surface.kind === "ellipse"
                  ? "Ellipse surface"
                  : `${surface.points.length}-point ${surface.kind}`}
          </small>
        </div>
      </div>
      <div
        className="inspector-tabs"
        role="tablist"
        aria-label="Inspector view"
      >
        <button
          role="tab"
          aria-selected={tab === "surface"}
          className={tab === "surface" ? "active" : ""}
          onClick={() => setTab("surface")}
        >
          Surface
        </button>
        <button
          role="tab"
          aria-selected={tab === "effect"}
          disabled={!!surface.cutoutOf}
          className={tab === "effect" ? "active" : ""}
          onClick={() => setTab("effect")}
        >
          Effect <span className="tiny-dot" />
        </button>
      </div>
      {layerLocked && (
        <p className="layer-lock-note">
          Layer locked. Unlock it in the Layers panel to edit.
        </p>
      )}
      <fieldset className="inspector-scroll" disabled={layerLocked}>
        {tab === "surface" || surface.cutoutOf ? (
          <>
            {point && selectedPoint !== null ? (
              <section className="inspector-section corner-editor">
                <h3>
                  <span className="corner-heading">
                    <Crosshair size={14} />
                    Corner {selectedPoint + 1}
                  </span>
                  <select
                    aria-label="Selected corner"
                    value={selectedPoint}
                    onChange={(e) => selectPoint(Number(e.target.value))}
                  >
                    {surface.points.map((_, i) => (
                      <option value={i} key={i}>
                        Corner {i + 1}
                      </option>
                    ))}
                  </select>
                </h3>
                <div className="dimension-grid">
                  <NumberField
                    label="Corner X"
                    value={point.x * project.width}
                    onChange={(value) => setPoint("x", value)}
                    disabled={surface.locked}
                  />
                  <NumberField
                    label="Corner Y"
                    value={point.y * project.height}
                    onChange={(value) => setPoint("y", value)}
                    disabled={surface.locked}
                  />
                </div>
                <p className="corner-help">
                  Arrow keys move 1 px. Hold Shift for 10 px.
                </p>
                {surface.kind === "polygon" && (
                  <div className="corner-actions">
                    <button
                      disabled={surface.locked || surface.points.length >= 64}
                      onClick={() => {
                        const change = insertSurfaceCorner(
                          surface,
                          selectedPoint,
                        );
                        if (change) {
                          update(change);
                          selectPoint(selectedPoint + 1);
                        }
                      }}
                    >
                      <Plus size={13} />
                      Add corner
                    </button>
                    <button
                      disabled={surface.locked || surface.points.length <= 3}
                      onClick={removePoint}
                    >
                      <Trash2 size={13} />
                      Remove corner
                    </button>
                  </div>
                )}
                <button
                  className={`curve-toggle ${surface.curves?.[selectedPoint] ? "active" : ""}`}
                  aria-label="Curve this edge"
                  aria-pressed={!!surface.curves?.[selectedPoint]}
                  disabled={surface.locked}
                  onClick={() =>
                    update({
                      curves: edgeCurve(
                        surface,
                        selectedPoint,
                        !surface.curves?.[selectedPoint],
                      ),
                    })
                  }
                >
                  Bézier edge{" "}
                  <span>
                    {surface.curves?.[selectedPoint] ? "Curved" : "Straight"}
                  </span>
                </button>
                <button
                  className="refine-button"
                  disabled={surface.locked}
                  onClick={() => {
                    const change = smoothCorner(
                      surface,
                      selectedPoint,
                      project.width / project.height,
                    );
                    if (change) update(change);
                    else
                      notify(
                        "This corner needs more space around it before it can be smoothed.",
                      );
                  }}
                >
                  Smooth corner
                </button>
                {surface.curves?.[selectedPoint] && (
                  <div className="curve-fields">
                    <p>
                      Drag the teal handles or enter their positions. This edge
                      runs to corner{" "}
                      {((selectedPoint + 1) % surface.points.length) + 1}.
                    </p>
                    {(["control1", "control2"] as const).map(
                      (handle, index) => (
                        <div className="dimension-grid" key={handle}>
                          {(["x", "y"] as const).map((axis) => (
                            <NumberField
                              key={axis}
                              label={`Handle ${index + 1} ${axis.toUpperCase()}`}
                              value={
                                surface.curves![selectedPoint]![handle][axis] *
                                (axis === "x" ? project.width : project.height)
                              }
                              disabled={surface.locked}
                              onChange={(value) => {
                                const curves = surface.curves!.map((edge, i) =>
                                  i === selectedPoint && edge
                                    ? {
                                        ...edge,
                                        [handle]: {
                                          ...edge[handle],
                                          [axis]: clamp(
                                            value /
                                              (axis === "x"
                                                ? project.width
                                                : project.height),
                                          ),
                                        },
                                      }
                                    : edge,
                                );
                                if (
                                  validSurfaceGeometry({ ...surface, curves })
                                )
                                  update({ curves });
                                else
                                  notify(
                                    "That curve would cross another edge.",
                                  );
                              }}
                            />
                          ))}
                        </div>
                      ),
                    )}
                  </div>
                )}
                <button
                  className="text-button"
                  onClick={() => selectPoint(null)}
                >
                  <ArrowLeft size={12} />
                  Edit whole surface
                </button>
              </section>
            ) : null}
            {!point && (
              <section className="inspector-section">
                <h3>
                  Transform <span>PROJECTOR PIXELS</span>
                </h3>
                <div className="dimension-grid">
                  <NumberField
                    label="X"
                    disabled={surface.locked}
                    value={b.x * project.width}
                    onChange={(value) => setDimension("x", value)}
                  />
                  <NumberField
                    label="Y"
                    disabled={surface.locked}
                    value={b.y * project.height}
                    onChange={(value) => setDimension("y", value)}
                  />
                  <NumberField
                    label="Width"
                    disabled={surface.locked}
                    value={b.width * project.width}
                    onChange={(value) => setDimension("width", value)}
                  />
                  <NumberField
                    label="Height"
                    disabled={surface.locked}
                    value={b.height * project.height}
                    onChange={(value) => setDimension("height", value)}
                  />
                </div>
                <div className="transform-actions">
                  <button
                    onClick={() => turn(-15)}
                    disabled={surface.locked}
                    title="Rotate 15 degrees counterclockwise"
                  >
                    <RotateCcw size={13} /> −15°
                  </button>
                  <button
                    onClick={() => turn(15)}
                    disabled={surface.locked}
                    title="Rotate 15 degrees clockwise"
                  >
                    <RotateCw size={13} /> +15°
                  </button>
                  <button
                    title="Centre surface"
                    disabled={surface.locked}
                    onClick={() => {
                      if (!surface.locked)
                        update({
                          points: translate(
                            surface.points,
                            0.5 - b.x - b.width / 2,
                            0.5 - b.y - b.height / 2,
                          ),
                        });
                      else notify("Unlock this surface to move it.");
                    }}
                  >
                    <Maximize2 size={13} /> Centre
                  </button>
                </div>
                <NumberField
                  key={`rotation:${surface.id}`}
                  label="Rotate by"
                  value={0}
                  suffix="°"
                  disabled={surface.locked}
                  onChange={turn}
                />
                <div className="outline-actions">
                  {surface.kind !== "polygon" && (
                    <button
                      className="refine-button"
                      disabled={surface.locked}
                      onClick={() => {
                        const change = editableOutline(surface);
                        if (change) {
                          update(change);
                          selectPoint(0);
                        }
                      }}
                    >
                      Make outline editable
                    </button>
                  )}
                  {hasCurves(surface) && (
                    <button
                      className="refine-button"
                      disabled={surface.locked}
                      onClick={() => update({ curves: undefined })}
                    >
                      Straighten all edges
                    </button>
                  )}
                </div>
                {surface.kind === "quad" && (
                  <p className="corner-help">
                    Keep a rectangle for perspective skew. An editable outline
                    allows extra corners.
                  </p>
                )}
                {surface.kind !== "ellipse" && (
                  <button
                    className="text-button"
                    disabled={surface.locked}
                    onClick={() => selectPoint(0)}
                  >
                    <Crosshair size={13} />
                    Edit individual corners
                  </button>
                )}
              </section>
            )}
            <CutoutControls
              key={surface.id}
              project={project}
              surface={surface}
              addCutout={addCutout}
              subtract={subtract}
              selectSurface={selectSurface}
              restoreCutout={restoreCutout}
            />
            {!surface.cutoutOf && (
              <>
                <section className="inspector-section">
                  <h3>Appearance</h3>
                  <RangeControl
                    label="Opacity"
                    value={surface.opacity}
                    display={`${Math.round(surface.opacity * 100)}%`}
                    onChange={(opacity) => update({ opacity })}
                    begin={begin}
                    finish={finish}
                  />
                  <RangeControl
                    label="Edge feather"
                    value={surface.feather}
                    max={0.08}
                    step={0.001}
                    display={`${Math.round(surface.feather * project.height)} px`}
                    onChange={(feather) => update({ feather })}
                    begin={begin}
                    finish={finish}
                  />
                  <BlendControl
                    value={surface.blend}
                    onChange={(blend) => update({ blend })}
                  />
                </section>
                <section className="inspector-section">
                  <h3>
                    Assigned effect <Sparkles size={13} />
                  </h3>
                  <button
                    className="assigned-effect"
                    onClick={() => setTab("effect")}
                  >
                    <div className="assigned-thumb">
                      {imported ? (
                        <MediaThumbnail asset={mediaItem} />
                      ) : (
                        <EffectPreview effect={effect} />
                      )}
                    </div>
                    <div>
                      <strong>{effectName}</strong>
                      <small>{effect.category}</small>
                    </div>
                    <ChevronDown size={13} className="chevron-right" />
                  </button>
                  <button className="text-button" onClick={browse}>
                    Explore the effects library <span>↗</span>
                  </button>
                </section>
                <section className="inspector-section layer-order">
                  <h3>Layer order</h3>
                  <button
                    disabled={
                      surface.locked ||
                      index < 0 ||
                      index === peers.length - 1 ||
                      peers[index + 1]?.locked
                    }
                    onClick={() => reorder(1)}
                  >
                    <ArrowUp size={14} /> Bring forward
                  </button>
                  <button
                    disabled={
                      surface.locked || index <= 0 || peers[index - 1]?.locked
                    }
                    onClick={() => reorder(-1)}
                  >
                    <ArrowDown size={14} /> Send backward
                  </button>
                </section>
              </>
            )}
          </>
        ) : (
          <>
            <div className="effect-inspector-preview">
              {imported ? (
                <MediaThumbnail asset={mediaItem} />
              ) : (
                <EffectPreview effect={effect} active />
              )}
              <span>{effect.category}</span>
            </div>
            <section className="inspector-section effect-description">
              <h3>
                {effectName}
                <Sparkles size={14} />
              </h3>
              <p>{effect.description}</p>
              <button className="secondary-button full-width" onClick={browse}>
                Change effect
              </button>
              {effect.audioReactive && (
                <div className="music-effect-hint">
                  <p>
                    Reacts to the shared music input. Library previews use a
                    demo beat; your mapped shapes follow the live signal.
                  </p>
                  <button
                    className="secondary-button full-width"
                    onClick={openAudio}
                  >
                    Set up music input
                  </button>
                </div>
              )}
            </section>
            {imported && (
              <MediaControls
                surface={surface}
                update={update}
                locate={locateMedia}
                importing={importing}
              />
            )}
            <section className="inspector-section">
              <h3>Make it yours</h3>
              {stack && (
                <div className="stack-membership">
                  <strong>{stack.name}</strong>
                  <p>
                    Surface {stack.surfaceIds.indexOf(surface.id) + 1} of{" "}
                    {stack.surfaceIds.length} · {stack.duration}s shared loop
                  </p>
                  {stack.kind === "chase" && (
                    <p>{chaseRoleLabel(stack.effectId, stack.direction)}</p>
                  )}
                  <button className="secondary-button" onClick={editStack}>
                    {stack.kind === "chase"
                      ? "Edit linked chase"
                      : stack.kind === "portal"
                        ? "Edit portal journey"
                        : "Edit stack timing & colour"}
                  </button>
                  <small>
                    Applying another effect removes this surface from the stack.
                  </small>
                </div>
              )}
              {!stack && (
                <>
                  {!effect.still && !effect.audioReactive && (
                    <RangeControl
                      label="Speed"
                      value={surface.speed}
                      max={3}
                      step={0.05}
                      display={`${surface.speed.toFixed(2)}×`}
                      onChange={(speed) => update({ speed })}
                      begin={begin}
                      finish={finish}
                    />
                  )}
                  {effect.still && (
                    <p className="still-material-note">
                      Still material · stays fixed during playback.
                    </p>
                  )}
                  {effect.category === "Creatures" && (
                    <label className="select-field">
                      <span>Peek from</span>
                      <select
                        aria-label="Peek from"
                        value={surface.effectSide || "left"}
                        onChange={(e) =>
                          update({
                            effectSide: e.target.value as "left" | "right",
                          })
                        }
                      >
                        <option value="left">Left corner</option>
                        <option value="right">Right corner</option>
                      </select>
                    </label>
                  )}
                  {effect.category === "Chase scenes" && (
                    <>
                      <label className="select-field">
                        <span>Chase direction</span>
                        <select
                          aria-label="Chase direction"
                          value={surface.effectSide || "left"}
                          onChange={(e) =>
                            update({
                              effectSide: e.target.value as "left" | "right",
                            })
                          }
                        >
                          <option value="left">Left to right</option>
                          <option value="right">Right to left</option>
                        </select>
                      </label>
                      {isChaseEffect(surface.effectId) && (
                        <p className="chase-role-note">
                          <strong>
                            {chaseRoleLabel(
                              surface.effectId,
                              surface.effectSide,
                            )}
                          </strong>
                          <span>Reverse direction to swap who is chasing.</span>
                        </p>
                      )}
                      <button
                        className="secondary-button full-width"
                        onClick={editStack}
                      >
                        Link this chase across shapes
                      </button>
                    </>
                  )}
                  {!imported && (
                    <>
                      <RangeControl
                        label={
                          surface.effectId === "single-eyeball"
                            ? "Eye size"
                            : surface.effectId === "edge-runner"
                              ? "Light width"
                              : surface.effectId === "toy-train"
                                ? "Train size"
                                : ["Chase scenes", "Linked stories"].includes(
                                      effect.category,
                                    )
                                  ? "Character size"
                                  : effect.category === "Creatures"
                                    ? "Creature size"
                                    : effect.category === "Colour blocks"
                                      ? "Block size"
                                      : "Pattern scale"
                        }
                        value={effectScale}
                        min={
                          [
                            "Creatures",
                            "Chase scenes",
                            "Linked stories",
                          ].includes(effect.category)
                            ? 0.45
                            : surface.effectId === "toy-train"
                              ? 0.5
                              : 0.25
                        }
                        max={
                          [
                            "Creatures",
                            "Chase scenes",
                            "Linked stories",
                          ].includes(effect.category)
                            ? 1.55
                            : surface.effectId === "toy-train"
                              ? 1.7
                              : 3
                        }
                        step={0.05}
                        display={`${effectScale.toFixed(2)}×`}
                        onChange={(scale) => update({ scale })}
                        begin={begin}
                        finish={finish}
                      />
                      <label className="color-field">
                        <span>Accent colour</span>
                        <span>
                          <input
                            type="color"
                            aria-label="Accent colour"
                            value={surface.color}
                            onPointerDown={begin}
                            onBlur={finish}
                            onChange={(e) => {
                              update({ color: e.target.value });
                              finish();
                            }}
                          />
                          <code>{surface.color.toUpperCase()}</code>
                        </span>
                      </label>
                    </>
                  )}
                  {surface.effectId === "portal-hopper" && (
                    <>
                      <button
                        className="secondary-button full-width"
                        onClick={editStack}
                      >
                        Link portal tiles
                      </button>
                      <label className="select-field">
                        <span>Portal direction</span>
                        <select
                          aria-label="Portal direction"
                          value={surface.effectSide || "left"}
                          onChange={(e) =>
                            update({
                              effectSide: e.target.value as "left" | "right",
                            })
                          }
                        >
                          <option value="left">Left to right</option>
                          <option value="right">Right to left</option>
                        </select>
                      </label>
                    </>
                  )}
                </>
              )}
              {effect.category === "Geometric" && (
                <button
                  className={`effect-cycle-control ${surface.colorCycle ? "active" : ""}`}
                  aria-label="Colour cycling"
                  aria-pressed={surface.colorCycle}
                  onClick={() => update({ colorCycle: !surface.colorCycle })}
                >
                  <span>
                    <strong>Colour cycling</strong>
                    <small>
                      {surface.colorCycle
                        ? "Colours shift as the shapes move"
                        : "Use the chosen accent colour"}
                    </small>
                  </span>
                  <span className="toggle-switch">
                    <span />
                  </span>
                </button>
              )}
              {!imported && (
                <button
                  className="text-button"
                  onClick={() =>
                    update({ seed: Math.floor(Math.random() * 10000) })
                  }
                >
                  Shuffle variation <Sparkles size={12} />
                </button>
              )}
            </section>
            <ContentTransformControls
              surface={surface}
              update={update}
              begin={begin}
              finish={finish}
            />
            <ColorOverlayControls
              surface={surface}
              update={update}
              begin={begin}
              finish={finish}
            />
            <section className="inspector-section">
              <h3>Combine layers</h3>
              <BlendControl
                value={surface.blend}
                onChange={(blend) => update({ blend })}
              />
            </section>
            <section className="inspector-section tip">
              <span className="tiny-dot" />
              <p>
                Each surface has its own effect. Combine them to create a scene
                that’s entirely yours.
              </p>
            </section>
          </>
        )}
      </fieldset>
      <div className="inspector-footer">
        <button onClick={duplicate} disabled={layerLocked}>
          <Copy size={14} /> Duplicate
        </button>
        <button
          className="danger-icon"
          onClick={remove}
          title="Delete selected surface"
          aria-label="Delete selected surface"
          disabled={surface.locked}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </aside>
  );
}
