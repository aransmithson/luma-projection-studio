import { useState } from "react";
import { Circle, Square, Scissors, Undo2, ArrowUpRight } from "lucide-react";
import { canSubtract, cutoutsFor } from "../cutouts";
import type { Project, Surface } from "../types";

export type CutoutActions = {
  addCutout: (kind: "quad" | "ellipse") => void;
  subtract: (id: string) => void;
  selectSurface: (id: string) => void;
  restoreCutout: (id: string) => void;
};
export function CutoutControls({
  project,
  surface,
  addCutout,
  subtract,
  selectSurface,
  restoreCutout,
}: CutoutActions & { project: Project; surface: Surface }) {
  const [candidate, setCandidate] = useState("");
  const holes = cutoutsFor(project.surfaces, surface.id);
  const choices = project.surfaces.filter((s) =>
    canSubtract(project.surfaces, surface.id, s.id),
  );
  const selected = choices.some((s) => s.id === candidate) ? candidate : "";
  const parent = project.surfaces.find((s) => s.id === surface.cutoutOf);
  return (
    <section className="inspector-section cutout-controls">
      <h3>
        {parent ? "Editable cutout" : "Cutouts & holes"} <Scissors size={14} />
      </h3>
      {parent ? (
        <>
          <p>
            This shape removes content from <strong>{parent.name}</strong>. Its
            curves and corners remain editable.
          </p>
          <button
            className="secondary-button full-width"
            onClick={() => selectSurface(parent.id)}
          >
            <ArrowUpRight size={13} /> Edit parent surface
          </button>
          <button
            className="text-button"
            disabled={surface.locked || parent.locked}
            onClick={() => restoreCutout(surface.id)}
          >
            <Undo2 size={13} /> Restore as surface
          </button>
          <small>
            Hide this cutout to fill the hole. Cutouts have crisp edges and
            project no effect of their own.
          </small>
        </>
      ) : (
        <>
          <div className="cutout-add">
            <button disabled={surface.locked} onClick={() => addCutout("quad")}>
              <Square size={13} /> Rectangle hole
            </button>
            <button
              disabled={surface.locked}
              onClick={() => addCutout("ellipse")}
            >
              <Circle size={13} /> Ellipse hole
            </button>
          </div>
          {holes.map((hole) => (
            <div className="cutout-item" key={hole.id}>
              <button
                aria-label={`Edit cutout ${hole.name}`}
                onClick={() => selectSurface(hole.id)}
              >
                <Scissors size={12} />
                <span>{hole.name}</span>
              </button>
              <button
                title="Restore as surface"
                aria-label={`Restore ${hole.name} as surface`}
                disabled={surface.locked || hole.locked}
                onClick={() => restoreCutout(hole.id)}
              >
                <Undo2 size={13} />
              </button>
            </div>
          ))}
          <label className="select-field">
            <span>Subtract existing shape</span>
            <select
              aria-label="Shape to subtract"
              value={selected}
              disabled={!choices.length}
              onChange={(e) => setCandidate(e.target.value)}
            >
              <option value="">
                {choices.length ? "Choose a shape…" : "Add another shape first"}
              </option>
              {choices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary-button full-width"
            disabled={!selected}
            onClick={() => {
              subtract(selected);
              setCandidate("");
            }}
          >
            <Scissors size={13} /> Subtract shape
          </button>
          <small>
            Cutouts affect this surface only. They move, resize and rotate with
            it; corner edits leave each hole independently placed.
          </small>
        </>
      )}
    </section>
  );
}
