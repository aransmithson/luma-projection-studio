import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardPaste,
  Copy,
  Crosshair,
  Eye,
  EyeOff,
  Layers,
  LockKeyhole,
  Octagon,
  Plus,
  Square,
  Trash2,
  Triangle,
  UnlockKeyhole,
} from "lucide-react";
import { effectById } from "../catalog";
import {
  layerFor,
  layerIdFor,
  layerRows,
  layersFor,
  MAX_LAYERS,
} from "../layers";
import { surfaceIsVisible } from "../cutouts";
import type { Layer, Project, Surface } from "../types";

type Props = {
  project: Project;
  activeId: string;
  selectedId: string | null;
  soloId: string | null;
  selectLayer: (id: string) => void;
  selectSurface: (id: string) => void;
  solo: (id: string) => void;
  changeSurface: (id: string, change: Partial<Surface>) => void;
  add: () => void;
  change: (id: string, change: Partial<Layer>) => void;
  reorder: (id: string, direction: number) => void;
  remove: (id: string) => void;
  move: (id: string) => void;
  copy: () => void;
  paste: (inPlace: boolean) => void;
};
export function LayerPanel(p: Props) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const layers = layersFor(p.project),
    selected = p.project.surfaces.find((s) => s.id === p.selectedId);
  const active = layers.find((l) => l.id === p.activeId)!;
  const groupLocked =
    selected &&
    p.project.surfaces.some(
      (s) =>
        (s.id === (selected.cutoutOf || selected.id) ||
          s.cutoutOf === (selected.cutoutOf || selected.id)) &&
        s.locked,
    );
  return (
    <>
      <div className="layers-toolbar">
        <span>
          <Layers size={13} /> LAYERS <small>{layers.length}</small>
        </span>
        <button
          aria-label="Add layer"
          title="Add a layer"
          disabled={layers.length >= MAX_LAYERS}
          onClick={p.add}
        >
          <Plus size={15} />
        </button>
      </div>
      <div className="shape-clipboard">
        <button
          disabled={!selected}
          onClick={p.copy}
          title="Copy shape and holes · Ctrl+C"
        >
          <Copy size={13} /> Copy
        </button>
        <button
          disabled={active.locked}
          onClick={() => p.paste(false)}
          title="Paste into active layer · Ctrl+V"
        >
          <ClipboardPaste size={13} /> Paste
        </button>
        <button
          disabled={active.locked}
          onClick={() => p.paste(true)}
          aria-label="Paste in place"
          title="Paste at original position · Ctrl+Shift+V"
        >
          <Crosshair size={13} />
        </button>
      </div>
      {selected && (
        <label className="shape-layer-destination">
          Move to layer
          <select
            aria-label="Shape layer"
            value={layerIdFor(p.project, selected)}
            disabled={!!groupLocked || layerFor(p.project, selected).locked}
            onChange={(e) => p.move(e.target.value)}
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id} disabled={l.locked}>
                {l.name}
                {l.locked ? " (locked)" : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="layer-list">
        {[...layers].reverse().map((layer) => {
          const members = p.project.surfaces.filter(
              (s) => layerIdFor(p.project, s) === layer.id,
            ),
            index = layers.indexOf(layer),
            closed = collapsed.includes(layer.id);
          return (
            <section
              key={layer.id}
              className={`layer-group ${p.activeId === layer.id ? "active-layer" : ""} ${layer.visible ? "" : "hidden-layer"}`}
              aria-label={`Layer ${layer.name}`}
            >
              <div className="layer-group-heading">
                <button
                  aria-label={`${closed ? "Expand" : "Collapse"} layer ${layer.name}`}
                  onClick={() =>
                    setCollapsed((c) =>
                      closed
                        ? c.filter((id) => id !== layer.id)
                        : [...c, layer.id],
                    )
                  }
                >
                  {closed ? (
                    <ChevronRight size={13} />
                  ) : (
                    <ChevronDown size={13} />
                  )}
                </button>
                <button
                  className="layer-group-name"
                  aria-label={`Select layer ${layer.name}`}
                  aria-pressed={p.activeId === layer.id}
                  onClick={() => p.selectLayer(layer.id)}
                >
                  <Layers size={13} />
                  <span>{layer.name}</span>
                  <small>{members.length}</small>
                </button>
                <button
                  aria-label={`${layer.visible ? "Hide" : "Show"} layer ${layer.name}`}
                  title={layer.visible ? "Hide layer" : "Show layer"}
                  onClick={() =>
                    p.change(layer.id, { visible: !layer.visible })
                  }
                >
                  {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button
                  aria-label={`${layer.locked ? "Unlock" : "Lock"} layer ${layer.name}`}
                  title={layer.locked ? "Unlock layer" : "Lock layer"}
                  onClick={() => p.change(layer.id, { locked: !layer.locked })}
                >
                  {layer.locked ? (
                    <LockKeyhole size={12} />
                  ) : (
                    <UnlockKeyhole size={12} />
                  )}
                </button>
              </div>
              {p.activeId === layer.id && (
                <div className="layer-group-tools">
                  <input
                    key={`${layer.id}:${layer.name}`}
                    aria-label="Layer name"
                    defaultValue={layer.name}
                    maxLength={80}
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (name && name !== layer.name)
                        p.change(layer.id, { name });
                      else e.target.value = layer.name;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") {
                        e.currentTarget.value = layer.name;
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  <button
                    aria-label="Bring layer forward"
                    title="Bring layer forward"
                    disabled={
                      layer.locked ||
                      index === layers.length - 1 ||
                      layers[index + 1]?.locked
                    }
                    onClick={() => p.reorder(layer.id, 1)}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    aria-label="Send layer backward"
                    title="Send layer backward"
                    disabled={
                      layer.locked || index === 0 || layers[index - 1]?.locked
                    }
                    onClick={() => p.reorder(layer.id, -1)}
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    aria-label="Remove empty layer"
                    title="Remove empty layer"
                    disabled={
                      layer.locked || !!members.length || layers.length === 1
                    }
                    onClick={() => p.remove(layer.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
              {!closed &&
                layerRows(p.project, layer.id).map((surface) => {
                  const visible =
                    layer.visible &&
                    surfaceIsVisible(surface, p.project.surfaces);
                  const Icon =
                    surface.kind === "quad"
                      ? Square
                      : surface.kind === "triangle"
                        ? Triangle
                        : surface.kind === "ellipse"
                          ? Circle
                          : Octagon;
                  return (
                    <div
                      key={surface.id}
                      className={`layer-row ${p.selectedId === surface.id ? "selected" : ""} ${!visible ? "is-hidden" : ""} ${surface.cutoutOf ? "is-cutout" : ""}`}
                    >
                      <button
                        className="layer-select"
                        aria-label={`Select ${surface.name}`}
                        onClick={() => p.selectSurface(surface.id)}
                      >
                        <span className="layer-shape">
                          <Icon size={15} />
                        </span>
                        <span className="layer-title">
                          <strong>{surface.name}</strong>
                          <small>
                            {surface.cutoutOf
                              ? `Cutout · ${p.project.surfaces.find((s) => s.id === surface.cutoutOf)?.name}`
                              : effectById[surface.effectId].name}
                          </small>
                        </span>
                      </button>
                      <div className="layer-controls">
                        <button
                          className={p.soloId === surface.id ? "is-solo" : ""}
                          aria-label={`${p.soloId === surface.id ? "Stop solo" : "Solo"} ${surface.name}`}
                          aria-pressed={p.soloId === surface.id}
                          title="Solo: project only this surface"
                          disabled={!visible && p.soloId !== surface.id}
                          onClick={() => p.solo(surface.id)}
                        >
                          S
                        </button>
                        <button
                          aria-label={`${surface.locked ? "Unlock" : "Lock"} ${surface.name}`}
                          title={
                            layer.locked
                              ? "Unlock the layer first"
                              : surface.locked
                                ? "Unlock surface"
                                : "Lock surface"
                          }
                          className={
                            surface.locked || layer.locked ? "is-locked" : ""
                          }
                          disabled={layer.locked}
                          onClick={() =>
                            p.changeSurface(surface.id, {
                              locked: !surface.locked,
                            })
                          }
                        >
                          {surface.locked || layer.locked ? (
                            <LockKeyhole size={12} />
                          ) : (
                            <UnlockKeyhole size={12} />
                          )}
                        </button>
                        <button
                          aria-label={`${surface.visible ? "Hide" : "Show"} ${surface.name}`}
                          title={
                            surface.visible ? "Hide surface" : "Show surface"
                          }
                          disabled={layer.locked}
                          onClick={() =>
                            p.changeSurface(surface.id, {
                              visible: !surface.visible,
                            })
                          }
                        >
                          {surface.visible ? (
                            <Eye size={13} />
                          ) : (
                            <EyeOff size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              {!closed && !members.length && (
                <p className="layer-empty">
                  Select this layer, then add or paste shapes.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
