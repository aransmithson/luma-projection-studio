import {
  Aperture,
  ArrowDown,
  ArrowUp,
  Check,
  Droplets,
  Footprints,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type {
  AnimationStack,
  ChaseEffectId,
  ChaseStack,
  PortalStack,
  PortalCharacter,
  LiquidStyle,
  Project,
  StoryEffectId,
  StoryStack,
} from "../types";
import {
  createChaseStack,
  createLiquidStack,
  createPortalStack,
  createStoryStack,
  withStack,
} from "../stacks";
import { layerFor, layersFor } from "../layers";
import { chaseIds, chaseRoleLabel, isChaseEffect } from "../chaseConfig";
import { chaseEffects } from "../chaseCatalog";
import {
  isStoryEffect,
  storyDefinition,
  storyEffects,
  storyIds,
} from "../storyCatalog";
import { EffectPreview } from "./EffectPreview";

type Props = {
  project: Project;
  selectedId: string | null;
  activeLayerId: string;
  update: (project: Project) => void;
  selectSurface: (id: string) => void;
  notify: (message: string) => void;
};
const liquids: {
  id: LiquidStyle;
  name: string;
  color: string;
  detail: string;
}[] = [
  {
    id: "water",
    name: "Water",
    color: "#58d9e9",
    detail: "Ripples and rising bubbles",
  },
  {
    id: "lava",
    name: "Molten lava",
    color: "#ff762b",
    detail: "Glowing fissures and drifting crust",
  },
  {
    id: "potion",
    name: "Glowing potion",
    color: "#a2ff72",
    detail: "Luminous bubbles and swirling ribbons",
  },
  {
    id: "ice",
    name: "Icy water",
    color: "#97dfff",
    detail: "Floating crystals and sparkling facets",
  },
];

export function StackEditor({
  project,
  selectedId,
  activeLayerId,
  update,
  selectSurface,
  notify,
}: Props) {
  const selected = project.surfaces.find(
    (s) => s.id === selectedId && !s.cutoutOf,
  );

  const selectedChase =
    selected && isChaseEffect(selected.effectId)
      ? selected.effectId
      : undefined;
  const selectedPortal = selected?.effectId === "portal-hopper";
  const selectedStory =
    selected && isStoryEffect(selected.effectId)
      ? selected.effectId
      : undefined;
  const first =
    project.stacks.find(
      (s) => selectedId && s.surfaceIds.includes(selectedId),
    ) ||
    (selectedChase || selectedPortal || selectedStory
      ? undefined
      : project.stacks[0]);
  const availableSelection =
    selected && !project.stacks.some((s) => s.surfaceIds.includes(selected.id))
      ? [selected.id]
      : [];
  type Mode = "liquid" | "chase" | "portal" | "story";
  const hasActors = (
    s?: AnimationStack,
  ): s is ChaseStack | PortalStack | StoryStack =>
    s?.kind === "chase" || s?.kind === "portal" || s?.kind === "story";
  const initialMode: Mode = first
    ? first.kind || "liquid"
    : selectedStory
      ? "story"
      : selectedPortal
        ? "portal"
        : selectedChase
          ? "chase"
          : "liquid";
  const title = (kind: Mode) =>
    kind === "story"
      ? "Linked story"
      : kind === "portal"
        ? "Portal journey"
        : kind === "chase"
          ? "Linked chase"
          : "Liquid loop";
  const seconds = (kind: Mode) =>
    kind === "portal" || kind === "story" ? 24 : kind === "chase" ? 12 : 18;
  const [mode, setMode] = useState<Mode>(initialMode);
  const [editingId, setEditingId] = useState<string | null>(first?.id || null);
  const [members, setMembers] = useState<string[]>(
    first?.surfaceIds || availableSelection,
  );
  const [name, setName] = useState(first?.name || title(initialMode));
  const [duration, setDuration] = useState(
    first?.duration || seconds(initialMode),
  );
  const [color, setColor] = useState(
    first?.color ||
      (initialMode !== "liquid" ? selected?.color : undefined) ||
      "#58d9e9",
  );
  const [links, setLinks] = useState(first?.links ?? true);
  const [style, setStyle] = useState<LiquidStyle>(
    !hasActors(first) ? first?.style || "water" : "water",
  );
  const [effectId, setEffectId] = useState<ChaseEffectId>(
    first?.kind === "chase" ? first.effectId : selectedChase || chaseIds[0],
  );
  const [character, setCharacter] = useState<PortalCharacter>(
    first?.kind === "portal" ? first.character : "robot",
  );
  const [storyId, setStoryId] = useState<StoryEffectId>(
    first?.kind === "story" ? first.effectId : selectedStory || storyIds[0],
  );
  const story = storyDefinition(storyId);
  const [direction, setDirection] = useState<"left" | "right">(
    hasActors(first) ? first.direction : selected?.effectSide || "left",
  );
  const [scale, setScale] = useState(
    hasActors(first)
      ? first.scale
      : Math.max(0.45, Math.min(1.55, selected?.scale || 1)),
  );
  const [seed, setSeed] = useState(
    hasActors(first) ? first.seed : selected?.seed || 0,
  );

  const load = (stack?: AnimationStack, nextMode = mode) => {
    const kind: Mode = stack ? stack.kind || "liquid" : nextMode;
    setMode(kind);
    setEditingId(stack?.id || null);
    setMembers(stack?.surfaceIds || availableSelection);
    setName(stack?.name || title(kind) + " " + (project.stacks.length + 1));
    setDuration(stack?.duration || seconds(kind));
    setColor(
      stack?.color ||
        (kind !== "liquid" ? selected?.color : undefined) ||
        "#58d9e9",
    );
    setLinks(stack?.links ?? true);
    setStyle(!hasActors(stack) ? stack?.style || "water" : "water");
    setEffectId(
      stack?.kind === "chase" ? stack.effectId : selectedChase || chaseIds[0],
    );
    setCharacter(stack?.kind === "portal" ? stack.character : "robot");
    setStoryId(
      stack?.kind === "story" ? stack.effectId : selectedStory || storyIds[0],
    );
    setDirection(
      hasActors(stack) ? stack.direction : selected?.effectSide || "left",
    );
    setScale(
      hasActors(stack)
        ? stack.scale
        : Math.max(0.45, Math.min(1.55, selected?.scale || 1)),
    );
    setSeed(hasActors(stack) ? stack.seed : selected?.seed || 0);
  };
  const locked = (ids: string[]) =>
    project.surfaces.some(
      (s) => ids.includes(s.id) && layerFor(project, s).locked,
    );
  const save = () => {
    const previous = project.stacks.find((s) => s.id === editingId);
    if (locked([...members, ...(previous?.surfaceIds || [])])) {
      notify("Unlock the layers containing this stack before changing it.");
      return;
    }
    const ids = members.filter((id) =>
      project.surfaces.some((s) => s.id === id && !s.cutoutOf),
    );
    if (ids.length < 2 || ids.length > 8) {
      notify("Choose between two and eight surfaces.");
      return;
    }
    if (!editingId && project.stacks.length >= 8) {
      notify("A project supports up to eight animation stacks.");
      return;
    }
    const base = {
      id: editingId || crypto.randomUUID(),
      name: name.trim() || title(mode),
      surfaceIds: ids,
      duration: Math.max(4, Math.min(120, duration)),
      color,
    };
    const stack: AnimationStack =
      mode === "story"
        ? {
            ...base,
            kind: "story",
            effectId: storyId,
            direction,
            scale,
            seed,
            links: false,
          }
        : mode === "portal"
          ? {
              ...base,
              kind: "portal",
              character,
              direction,
              scale,
              seed,
              links: false,
            }
          : mode === "chase"
            ? {
                ...base,
                kind: "chase",
                effectId,
                direction,
                scale,
                seed,
                links: false,
              }
            : { ...base, links, ...(style === "water" ? {} : { style }) };
    update(withStack(project, stack));
    load(stack);
    selectSurface(ids[0]);
    notify(
      mode === "story"
        ? "Story linked. Every tile now shares one journey and its arrival reactions."
        : mode === "portal"
          ? "Portal journey linked. Every tile follows the same story clock."
          : mode === "chase"
            ? "Chase linked. Characters now travel from shape to shape on one loop."
            : "Stack saved. All members now follow the same liquid cycle.",
    );
  };
  const create = (liquidStyle: LiquidStyle = "water") => {
    const result =
      mode === "story"
        ? createStoryStack(project, activeLayerId, storyId)
        : mode === "portal"
          ? createPortalStack(project, activeLayerId, character)
          : mode === "chase"
            ? createChaseStack(project, activeLayerId, effectId)
            : createLiquidStack(project, activeLayerId, liquidStyle);
    if (!result) {
      notify(
        "There is room for up to 32 surfaces and eight stacks. The active layer must be unlocked.",
      );
      return;
    }
    update(result.project);
    load(result.stack);
    selectSurface(result.stack.surfaceIds[0]);
    notify(
      `Three linked ${mode === "story" ? "story" : mode === "portal" ? "portal" : mode === "chase" ? "chase" : "liquid"} surfaces added. Close this panel to place them.`,
    );
  };
  return (
    <div className="stack-editor">
      <div className="stack-mode" aria-label="Linked animation type">
        <button
          aria-pressed={mode === "story"}
          onClick={() => mode !== "story" && load(undefined, "story")}
        >
          <Sparkles size={16} /> Linked stories
        </button>
        <button
          aria-pressed={mode === "liquid"}
          onClick={() => mode !== "liquid" && load(undefined, "liquid")}
        >
          <Droplets size={16} />
          Liquid flow
        </button>
        <button
          aria-pressed={mode === "chase"}
          onClick={() => mode !== "chase" && load(undefined, "chase")}
        >
          <Footprints size={16} />
          Character chase
        </button>
        <button
          aria-pressed={mode === "portal"}
          onClick={() => mode !== "portal" && load(undefined, "portal")}
        >
          <Aperture size={16} />
          Portal journey
        </button>
      </div>
      <div className="stack-editor-grid">
        <div className="stack-browser">
          <div className="stack-intro">
            {mode === "story" && (
              <div className="stack-story-preview">
                <EffectPreview effect={story} active />
              </div>
            )}
            <div
              className={`stack-flow-illustration ${mode !== "liquid" ? "chase-route-illustration" : ""}`}
              aria-hidden="true"
            >
              <span />
              <i>{mode !== "liquid" ? "→" : "↓"}</i>
              <span />
              <i>{mode !== "liquid" ? "→" : "↓"}</i>
              <span />
              <b>↻</b>
            </div>
            <div>
              <h3>
                {mode === "story"
                  ? story.name
                  : mode === "portal"
                    ? "Open a doorway to the next tile."
                    : mode === "chase"
                      ? "One chase across your shapes."
                      : "One flow. Every surface in time."}
              </h3>
              <p>
                {mode === "story"
                  ? story.description
                  : mode === "portal"
                    ? "Fire a portal, cross into the next tile, and repeat around the loop. Every tile follows the same clock."
                    : mode === "chase"
                      ? "Characters leave one shape and enter the next. Reverse direction to swap who is chasing."
                      : "Liquid flows between surfaces and returns to the start, with every reservoir and stream in sync."}
              </p>
              <button
                className="primary-button"
                disabled={
                  layersFor(project).find((l) => l.id === activeLayerId)?.locked
                }
                onClick={() => create()}
              >
                {mode === "story" ? (
                  <Sparkles size={16} />
                ) : mode === "portal" ? (
                  <Aperture size={16} />
                ) : mode === "chase" ? (
                  <Footprints size={15} />
                ) : (
                  <Droplets size={15} />
                )}
                {mode === "story"
                  ? "Create linked story"
                  : mode === "portal"
                    ? "Create portal journey"
                    : mode === "chase"
                      ? "Create linked chase"
                      : "Create liquid stack"}
              </button>
              <small>Adds three movable shapes, ready to place.</small>
            </div>
          </div>
          {mode === "liquid" && (
            <div className="liquid-presets">
              {liquids.slice(1).map((preset) => (
                <button
                  key={preset.id}
                  disabled={
                    layersFor(project).find((l) => l.id === activeLayerId)
                      ?.locked
                  }
                  onClick={() => create(preset.id)}
                  aria-label={`Add ${preset.name.toLowerCase()}`}
                >
                  <Droplets size={19} style={{ color: preset.color }} />
                  <strong>{preset.name}</strong>
                  <small>{preset.detail}</small>
                  <Plus size={14} />
                </button>
              ))}
            </div>
          )}
          <div className="stack-picker">
            <h3>
              Saved stacks{" "}
              <button
                className="icon-button small"
                aria-label="New stack from existing surfaces"
                onClick={() => load()}
              >
                <Plus size={15} />
              </button>
            </h3>
            <div className="stack-choices">
              {project.stacks.length ? (
                project.stacks.map((stack) => (
                  <button
                    key={stack.id}
                    className={`stack-choice ${editingId === stack.id ? "active" : ""}`}
                    onClick={() => load(stack)}
                  >
                    {stack.kind === "story" ? (
                      <Sparkles size={17} />
                    ) : stack.kind === "portal" ? (
                      <Aperture size={17} />
                    ) : stack.kind === "chase" ? (
                      <Footprints size={17} />
                    ) : (
                      <Droplets size={17} />
                    )}
                    <span>
                      <strong>{stack.name}</strong>
                      <small>
                        {stack.surfaceIds.length} surfaces · {stack.duration}s{" "}
                        {stack.kind === "story"
                          ? "story loop"
                          : stack.kind === "portal"
                            ? "portal loop"
                            : stack.kind === "chase"
                              ? "chase"
                              : "loop"}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <p className="muted-copy">
                  Create a ready-made stack, or choose your existing surfaces to
                  link.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="stack-settings">
          <h3>Stack settings</h3>
          <label className="stack-field">
            Stack name
            <input
              aria-label="Stack name"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {mode !== "liquid" ? (
            <>
              {mode === "story" ? (
                <label className="stack-field">
                  Story theme
                  <select
                    aria-label="Story theme"
                    value={storyId}
                    onChange={(e) => {
                      const definition = storyDefinition(
                        e.target.value as StoryEffectId,
                      );
                      setStoryId(definition.id);
                      setColor(definition.color);
                      if (!editingId) setName(definition.name);
                    }}
                  >
                    {storyEffects.map((effect) => (
                      <option key={effect.id} value={effect.id}>
                        {effect.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : mode === "chase" ? (
                <label className="stack-field">
                  Characters
                  <select
                    aria-label="Linked chase characters"
                    value={effectId}
                    onChange={(e) =>
                      setEffectId(e.target.value as ChaseEffectId)
                    }
                  >
                    {chaseEffects.map((effect) => (
                      <option key={effect.id} value={effect.id}>
                        {effect.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="stack-field">
                  Explorer
                  <select
                    aria-label="Portal character"
                    value={character}
                    onChange={(e) =>
                      setCharacter(e.target.value as PortalCharacter)
                    }
                  >
                    <option value="robot">Robot explorer</option>
                    <option value="alien">Alien courier</option>
                    <option value="cat">Space cat</option>
                  </select>
                </label>
              )}
              <label className="stack-field">
                Travel direction
                <select
                  aria-label={
                    mode === "story"
                      ? "Story direction"
                      : mode === "chase"
                        ? "Linked chase direction"
                        : "Portal direction"
                  }
                  value={direction}
                  onChange={(e) =>
                    setDirection(e.target.value as "left" | "right")
                  }
                >
                  <option value="left">Left to right · first to last</option>
                  <option value="right">Right to left · last to first</option>
                </select>
              </label>
              <p className="chase-role-note">
                <strong>
                  {mode === "story"
                    ? "One traveller, a reaction in every tile"
                    : mode === "portal"
                      ? "Aim, fire, step through, repeat"
                      : chaseRoleLabel(effectId, direction)}
                </strong>
                <span>
                  {mode === "story"
                    ? "Reversing changes the travel and arrival order. Hidden tiles keep their place in the loop."
                    : mode === "portal"
                      ? "One character travels through the entire loop. Hidden tiles keep their turn."
                      : "Reversing swaps the pursuer and reverses the route."}
                </span>
              </p>
              <label className="stack-field">
                {mode === "story" ? "Traveller size" : "Character size"} ·{" "}
                {Math.round(scale * 100)}%
                <input
                  aria-label={
                    mode === "story"
                      ? "Story traveller size"
                      : mode === "portal"
                        ? "Portal character size"
                        : "Linked character size"
                  }
                  type="range"
                  min="0.45"
                  max="1.55"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                />
              </label>
            </>
          ) : (
            <label className="stack-field">
              Liquid style
              <select
                aria-label="Liquid style"
                value={style}
                onChange={(e) => {
                  const preset = liquids.find((p) => p.id === e.target.value)!;
                  setStyle(preset.id);
                  setColor(preset.color);
                }}
              >
                {liquids.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="stack-options">
            <label className="stack-field">
              Full loop (seconds)
              <input
                type="number"
                aria-label="Stack duration"
                min="4"
                max="120"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </label>
            <label className="stack-field">
              {mode !== "liquid" ? "Accent colour" : "Liquid colour"}
              <input
                type="color"
                aria-label="Stack colour"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
          </div>
          {mode === "liquid" && (
            <label className="stack-check">
              <input
                type="checkbox"
                checked={links}
                onChange={(e) => setLinks(e.target.checked)}
              />
              Show connecting streams and return loop
            </label>
          )}
        </div>
        <div className="stack-routing">
          <h3>
            {mode !== "liquid" ? "Route order" : "Flow order"}
            <span>{members.length} / 8 surfaces</span>
          </h3>
          <p className="muted-copy">
            {mode === "story"
              ? "Choose two to eight shapes. Arrows set their order. The traveller crosses each edge into the next tile and returns from the last tile to the first."
              : mode === "portal"
                ? "Choose two to eight tiles. Arrows set the next destination. Reversing direction visits the tiles in reverse order."
                : mode === "chase"
                  ? `Choose shapes below. Arrows set their place in the route. ${direction === "right" ? "The chase currently follows this list backwards." : "The chase follows this list, then returns to the start."}`
                  : "Choose surfaces below. Use the arrows to set where the liquid goes next."}
          </p>
          <ol className="stack-order">
            {members.map((id, i) => {
              const surface = project.surfaces.find((s) => s.id === id);
              if (!surface) return null;
              const move = (offset: number) =>
                setMembers((ids) => {
                  const next = [...ids];
                  [next[i + offset], next[i]] = [next[i], next[i + offset]];
                  return next;
                });
              return (
                <li key={id}>
                  <span className="stack-number">{i + 1}</span>
                  <span title={surface.name}>{surface.name}</span>
                  <button
                    className="icon-button small"
                    aria-label={`Move ${surface.name} earlier`}
                    disabled={i === 0}
                    onClick={() => move(-1)}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    className="icon-button small"
                    aria-label={`Move ${surface.name} later`}
                    disabled={i === members.length - 1}
                    onClick={() => move(1)}
                  >
                    <ArrowDown size={13} />
                  </button>
                </li>
              );
            })}
          </ol>
          <h3 className="stack-members-heading">
            Available surfaces <span>Choose 2–8</span>
          </h3>
          <div
            className="stack-members"
            role="group"
            aria-label="Available surfaces"
          >
            {project.surfaces
              .filter((s) => !s.cutoutOf)
              .map((surface) => {
                const occupied = project.stacks.some(
                  (s) =>
                    s.id !== editingId && s.surfaceIds.includes(surface.id),
                );
                return (
                  <label
                    className={`stack-check ${occupied ? "occupied" : ""}`}
                    key={surface.id}
                  >
                    <input
                      aria-label={`Include ${surface.name}`}
                      type="checkbox"
                      checked={members.includes(surface.id)}
                      disabled={
                        occupied ||
                        layerFor(project, surface).locked ||
                        (!members.includes(surface.id) && members.length >= 8)
                      }
                      onChange={(e) =>
                        setMembers((ids) =>
                          e.target.checked
                            ? [...ids, surface.id]
                            : ids.filter((id) => id !== surface.id),
                        )
                      }
                    />
                    <span title={surface.name}>{surface.name}</span>
                    {occupied && <small>In another stack</small>}
                  </label>
                );
              })}
          </div>
        </div>
      </div>
      <div className="stack-save-actions">
        <p className="stack-clock-note">
          All stacks share Play, Pause and Restart. Hidden shapes keep their
          turn.
        </p>
        {editingId && (
          <button
            className="text-button"
            onClick={() => {
              if (
                locked(
                  project.stacks.find((s) => s.id === editingId)?.surfaceIds ||
                    [],
                )
              ) {
                notify(
                  "Unlock the layers containing this stack before unlinking it.",
                );
                return;
              }
              update({
                ...project,
                stacks: project.stacks.filter((s) => s.id !== editingId),
              });
              load();
              notify("Stack unlinked. Its surfaces remain in the project.");
            }}
          >
            <Trash2 size={13} />
            Unlink stack
          </button>
        )}
        <button
          className="primary-button"
          disabled={
            members.length < 2 ||
            !Number.isFinite(duration) ||
            duration < 4 ||
            duration > 120
          }
          onClick={save}
        >
          <Check size={14} />
          Save stack
        </button>
      </div>
    </div>
  );
}
