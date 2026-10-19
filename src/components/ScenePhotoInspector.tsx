import { Camera, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { bounds, clamp, resize, translate } from "../geometry";
import { fitPhoto, type PhotoChange } from "../scene";
import type { Point, SceneReference } from "../types";
import { NumberField, RangeControl } from "./Inspector";

type Props = {
  scene: SceneReference;
  width: number;
  height: number;
  hidden: boolean;
  change: (change: PhotoChange) => void;
  begin: () => void;
  finish: () => void;
  remove: () => void;
  openAnimator: () => void;
  selectedPoint: number | null;
  photoOutput: boolean;
  setPhotoOutput: (value: boolean) => void;
};

export function ScenePhotoInspector({
  scene,
  width,
  height,
  hidden,
  change,
  begin,
  finish,
  remove,
  openAnimator,
  selectedPoint,
  photoOutput,
  setPhotoOutput,
}: Props) {
  const b = bounds(scene.points);
  const setFrame = (key: "x" | "y" | "width" | "height", value: number) => {
    const n = value / (key === "x" || key === "width" ? width : height);
    const points =
      key === "x" || key === "y"
        ? translate(
            scene.points,
            key === "x" ? n - b.x : 0,
            key === "y" ? n - b.y : 0,
          )
        : resize(
            scene.points,
            key === "width" ? clamp(n, 0.01, 1 - b.x) : b.width,
            key === "height" ? clamp(n, 0.01, 1 - b.y) : b.height,
          );
    change({ points });
  };
  const corner =
    selectedPoint === null ? undefined : scene.points[selectedPoint];
  const setCorner = (axis: keyof Point, value: number) =>
    change({
      points: scene.points.map((p, i) =>
        i === selectedPoint
          ? { ...p, [axis]: clamp(value / (axis === "x" ? width : height)) }
          : p,
      ),
    });
  return (
    <aside
      id="properties-panel"
      className="inspector reference-photo-inspector"
      aria-label="Reference photo properties"
      hidden={hidden}
    >
      <div className="panel-heading">
        REFERENCE PHOTO <Camera size={14} />
      </div>
      <div className="reference-photo-details">
        <strong>{scene.photo.name}</strong>
        <small>
          {scene.photo.width} × {scene.photo.height} · Scene alignment
        </small>
      </div>
      <div className="inspector-scroll">
        <section className="inspector-section">
          <h3>Position & size</h3>
          <div className="field-row">
            <NumberField
              label="Photo X"
              value={b.x * width}
              onChange={(n) => setFrame("x", n)}
            />
            <NumberField
              label="Photo Y"
              value={b.y * height}
              onChange={(n) => setFrame("y", n)}
            />
          </div>
          <div className="field-row">
            <NumberField
              label="Photo width"
              value={b.width * width}
              onChange={(n) => setFrame("width", n)}
            />
            <NumberField
              label="Photo height"
              value={b.height * height}
              onChange={(n) => setFrame("height", n)}
            />
          </div>
          <p className="control-hint">
            Drag the photo to move it, or a corner to align its perspective.
            Arrow keys nudge by one pixel; Shift moves ten.
          </p>
          {corner && (
            <>
              <h3>Corner {selectedPoint! + 1}</h3>
              <div className="field-row">
                <NumberField
                  label="Photo corner X"
                  value={corner.x * width}
                  onChange={(n) => setCorner("x", n)}
                />
                <NumberField
                  label="Photo corner Y"
                  value={corner.y * height}
                  onChange={(n) => setCorner("y", n)}
                />
              </div>
            </>
          )}
          <button
            className="secondary-button full-width"
            onClick={() =>
              change({ points: fitPhoto(scene.photo, width, height) })
            }
          >
            <RotateCcw size={14} /> Fit photo to canvas
          </button>
        </section>
        <section className="inspector-section">
          <h3>Visibility</h3>
          <RangeControl
            label="Reference photo opacity"
            value={scene.opacity}
            display={`${Math.round(scene.opacity * 100)}%`}
            onChange={(opacity) => change({ opacity })}
            begin={begin}
            finish={finish}
          />
          <label className="scene-check">
            <input
              type="checkbox"
              checked={scene.visible}
              onChange={(e) => change({ visible: e.target.checked })}
            />{" "}
            Show reference in editor
          </label>
          <label className="scene-check">
            <input
              type="checkbox"
              checked={photoOutput}
              onChange={(e) => setPhotoOutput(e.target.checked)}
            />{" "}
            Show reference on projector
          </label>
        </section>
        <section className="inspector-section">
          <button
            className="secondary-button full-width"
            onClick={openAnimator}
          >
            <Sparkles size={14} /> Open Scene Animator
          </button>
          <p className="control-hint">
            Reference alignment guide. Applied animations keep their saved
            alignment until you reapply them in Scene Animator.
          </p>
        </section>
      </div>
      <div className="inspector-footer">
        <button onClick={remove}>
          <Trash2 size={14} /> Remove reference photo
        </button>
      </div>
    </aside>
  );
}
