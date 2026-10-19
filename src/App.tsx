import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import brandMark from "./assets/brand-mark.svg";
import {
  ArrowUpRight,
  AlertCircle,
  AudioLines,
  Check,
  ChevronDown,
  Circle,
  CircleHelp,
  EyeOff,
  FilePlus2,
  FolderOpen,
  Ghost,
  Grid2X2,
  Info,
  Layers,
  Magnet,
  Maximize2,
  Minimize2,
  Monitor,
  MousePointer2,
  Octagon,
  Pause,
  PenLine,
  Play,
  Plus,
  Projector,
  Redo2,
  RefreshCw,
  Save,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Square,
  Tags,
  Sun,
  Triangle,
  Undo2,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  AudioFrame,
  EffectId,
  LibraryMedia,
  MediaAsset,
  DisplayInfo,
  OutputStatus,
  Playback,
  Point,
  RenderState,
  ShapeKind,
  Surface,
} from "./types";
import {
  createProject,
  createSurface,
  MAX_SURFACES,
  parseProject,
  persistProject,
  serializeProject,
} from "./model";
import { effectById } from "./catalog";
import { bindMedia } from "./media";
import { probeMedia, refreshMedia } from "./mediaPlayback";
import { moveVertex, translate } from "./geometry";
import {
  removeSurfaceCorner,
  surfacePath,
  validSurfaceGeometry,
} from "./curves";
import { PREFERENCES_KEY, readPreferences } from "./preferences";
import { playbackTime } from "./renderer";
import { useProject } from "./useProject";
import { useOutputPointer } from "./useOutputPointer";
import { copyShapeData, pastedShapes } from "./shapeClipboard";
import {
  addLayer,
  changeLayer,
  layerFor,
  layerIdFor,
  layersFor,
  moveToLayer,
  removeLayer,
  renderedProject,
  reorderLayer,
  reorderSurface,
} from "./layers";
import { LayerPanel } from "./components/LayerPanel";
import { Stage } from "./components/Stage";
import { Inspector, RangeControl } from "./components/Inspector";
import {
  changeSurface,
  cutoutsFor,
  defaultHole,
  duplicateSurfaceGroup,
  effectiveSolo,
  subtractSurface,
} from "./cutouts";
import { EffectsLibrary } from "./components/EffectsLibrary";
import { Modal } from "./components/Modal";
import { StackEditor } from "./components/StackEditor";
import { AudioPanel } from "./components/AudioPanel";
import { useAudioInput } from "./useAudioInput";
import { getAudioFrame } from "./audioStore";
import {
  extraPresets,
  presetGeometry,
  presetLabels,
  ringHoleGeometry,
  type ShapeFrame,
  type ShapePreset,
} from "./shapePresets";

const ShapeIcon = ({ kind, size = 16 }: { kind: ShapeKind; size?: number }) =>
  kind === "quad" ? (
    <Square size={size} />
  ) : kind === "triangle" ? (
    <Triangle size={size} />
  ) : kind === "ellipse" ? (
    <Circle size={size} />
  ) : (
    <Octagon size={size} />
  );
const shapeLabels: Record<ShapeKind, string> = {
  quad: "Rectangle",
  triangle: "Triangle",
  ellipse: "Ellipse",
  polygon: "Custom polygon",
};
function PresetIcon({ preset }: { preset: ShapePreset }) {
  const shape = presetGeometry(preset, { x: 2, y: 2, width: 16, height: 16 });
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
    >
      <path d={surfacePath(shape, 1, 1)} />
      {preset === "ring" && <ellipse cx="10" cy="10" rx="4.5" ry="4.5" />}
    </svg>
  );
}
const resolutions = [
  [1920, 1080],
  [1280, 720],
  [1920, 1200],
  [1024, 768],
  [3840, 2160],
];

function Logo({ size = 30 }: { size?: number }) {
  return (
    <img src={brandMark} alt="" width={size} height={size} aria-hidden="true" />
  );
}

function TemplateIllustration({
  theme,
}: {
  theme: "winter" | "halloween" | "blank";
}) {
  const color = theme === "halloween" ? "#e99d67" : "#b2a0ee";
  return (
    <svg viewBox="0 0 260 135" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id={`gradient-${theme}`}
          x1="55"
          y1="20"
          x2="200"
          y2="130"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={theme === "halloween" ? "#734487" : "#535283"} />
          <stop
            offset="1"
            stopColor={theme === "halloween" ? "#2b172f" : "#1e3e5b"}
          />
        </linearGradient>
      </defs>
      {theme === "blank" ? (
        <>
          <rect
            x="55"
            y="30"
            width="150"
            height="78"
            rx="1"
            stroke={color}
            strokeDasharray="4 4"
          />
          <path d="M130 53v32m-16-16h32" stroke={color} strokeWidth="1.5" />
        </>
      ) : (
        <>
          <path
            d="m64 59 66-44 66 44"
            fill={`url(#gradient-${theme})`}
            stroke={color}
            strokeWidth="1"
          />
          <path
            d="M72 59h116v63H72z"
            fill={`url(#gradient-${theme})`}
            stroke={`${color}77`}
          />
          <path
            d="M88 76h24v23H88zm61 0h24v23h-24z"
            fill={theme === "halloween" ? "#132116" : "#493d38"}
            stroke={color}
            strokeWidth=".7"
          />
          <path
            d="M121 86h19v36h-19z"
            fill={theme === "halloween" ? "#511e43" : "#b56b7b"}
          />
          {Array.from({ length: 12 }, (_, i) => (
            <circle
              key={i}
              cx={77 + i * 9.6}
              cy={60 + Math.sin(i) * 1.4}
              r="1.5"
              fill={["#ebba84", "#e285a3", "#7bb9ad"][i % 3]}
            />
          ))}
          {Array.from({ length: 24 }, (_, i) => (
            <circle
              key={i}
              cx={30 + ((i * 73) % 200)}
              cy={12 + ((i * 19) % 115)}
              r={i % 3 === 0 ? 1.4 : 0.7}
              fill={color}
              opacity=".5"
            />
          ))}
        </>
      )}
    </svg>
  );
}

export default function App() {
  const {
    project,
    current,
    update,
    begin,
    finish,
    undo,
    redo,
    canUndo,
    canRedo,
    recovered,
  } = useProject();
  const [selectedId, setSelectedId] = useState<string | null>(
    project.surfaces[1]?.id || project.surfaces[0]?.id || null,
  );
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [activeLayerId, setActiveLayerId] = useState(() => {
    const initial = project.surfaces.find((s) => s.id === selectedId);
    return initial ? layerIdFor(project, initial) : layersFor(project)[0].id;
  });
  const activeLayer =
    layersFor(project).find((l) => l.id === activeLayerId) ??
    layersFor(project)[0];
  const clipboardData = useRef("");
  const pasteSequence = useRef({ data: "", count: 0 });
  const pasting = useRef(false);
  const [soloSurfaceId, setSoloSurfaceId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"surface" | "effect">(
    "surface",
  );
  const [preferences, setPreferences] = useState(readPreferences);
  const { libraryCollapsed, labels, animatePreviews, grid, snap } = preferences;
  const [playback, setPlayback] = useState<Playback>({
    playing: true,
    offset: 0,
    startedAt: Date.now(),
  });
  const [blackout, setBlackout] = useState(false),
    [testPattern, setTestPattern] = useState(false);
  const [placementMesh, setPlacementMesh] = useState(false);
  const togglePlacementMesh = useCallback(() => {
    setPlacementMesh((value) => !value);
    setTestPattern(false);
  }, []);
  const [wireframeMode, setWireframeMode] = useState<
    "editing" | "always" | "off"
  >("editing");
  const [mappingActive, setMappingActive] = useState(false);
  const [mappingDragging, setMappingDragging] = useState(false);
  const [alignmentDraft, setAlignmentDraft] = useState<Point[]>([]);
  const mappingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [zoom, setZoom] = useState(1),
    [drawing, setDrawing] = useState(false);
  const [placing, setPlacing] = useState<ShapePreset | null>(null);
  const [drawToSize, setDrawToSize] = useState(false);
  const [shapeMenu, setShapeMenu] = useState(false),
    [modal, setModal] = useState<
      "output" | "templates" | "help" | "stacks" | "audio" | null
    >(null);
  const [category, setCategory] = useState("All effects"),
    [expandedLibrary, setExpandedLibrary] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState<LibraryMedia[]>([]);
  const [importing, setImporting] = useState(false);
  const importBusy = useRef(false);
  const [toast, setToast] = useState<{
      message: string;
      tone: "success" | "info" | "error";
    } | null>(null),
    [autosave, setAutosave] = useState<"saved" | "saving" | "error">("saved"),
    [saving, setSaving] = useState(false);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]),
    [displayId, setDisplayId] = useState<number | null>(null),
    [outputStatus, setOutputStatus] = useState<OutputStatus>({
      open: false,
      displayId: null,
    });
  const [openingOutput, setOpeningOutput] = useState(false),
    [displayError, setDisplayError] = useState(""),
    [fps, setFps] = useState(0),
    [clock, setClock] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null),
    outputWindow = useRef<Window | null>(null),
    channel = useRef<BroadcastChannel | null>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sendAudio = useCallback((audio: AudioFrame | null) => {
    window.luma?.updateAudioFrame(audio);
    channel.current?.postMessage({ type: "audio", audio });
  }, []);
  const audioInput = useAudioInput(project.audioSettings, sendAudio);
  // Capture once per playback change so every window freezes the same frame.
  const audioFrozen = useMemo(
    () => (playback.playing ? null : getAudioFrame()),
    [playback],
  );
  const sendPointer = useCallback((pointer: Point | null) => {
    window.luma?.updateOutputPointer(pointer);
    channel.current?.postMessage({ type: "pointer", pointer });
  }, []);
  const guidesVisible =
    placementMesh ||
    wireframeMode === "always" ||
    (wireframeMode === "editing" &&
      (mappingActive || mappingDragging || drawing || !!placing));
  const projectedPointer = useOutputPointer(
    guidesVisible && !blackout && !testPattern,
    sendPointer,
  );
  const state: RenderState = {
      project,
      playback,
      blackout,
      testPattern,
      placementMesh,
      audio: getAudioFrame(),
      audioFrozen,
      pointer: projectedPointer.current.current,
      alignment: {
        visible: guidesVisible,
        selectedId,
        draft: alignmentDraft,
      },
      soloSurfaceId,
    },
    latest = useRef(state);
  latest.current = state;
  const viewProject = renderedProject(project);
  const selected = viewProject.surfaces.find((s) => s.id === selectedId);
  const selectedDisplay = displays.find((d) => d.id === displayId);
  const runningDisplay = displays.find((d) => d.id === outputStatus.displayId);
  const outputLabel = outputStatus.open
    ? !window.luma || runningDisplay?.primary
      ? "Preview running"
      : "Projector live"
    : "Output offline";
  const notify = useCallback(
    (message: string, tone: "success" | "info" | "error" = "info") => {
      setToast({ message, tone });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 4200);
    },
    [],
  );
  const closeModal = useCallback(() => setModal(null), []);
  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      void window.luma
        ?.listMedia()
        .then((items) => {
          if (mounted) setMediaLibrary(items);
        })
        .catch(() => {
          if (mounted)
            notify("Could not read the imported animations library.", "error");
        });
    };
    refresh();
    const unsubscribe = window.luma?.onMediaChanged(refresh);
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [notify]);
  const markMapping = useCallback(() => {
    setMappingActive(true);
    clearTimeout(mappingTimer.current);
    mappingTimer.current = setTimeout(() => setMappingActive(false), 2400);
  }, []);
  useEffect(() => () => clearTimeout(mappingTimer.current), []);
  useEffect(() => {
    if (recovered)
      notify(
        "Recovered the previous valid save because the latest autosave could not be read.",
      );
  }, [recovered, notify]);
  const selectSurface = (id: string | null) => {
    const surface = project.surfaces.find((s) => s.id === id);
    if (surface) setActiveLayerId(layerIdFor(project, surface));
    setSelectedId(id);
    setSelectedPoint(null);
    if (project.surfaces.find((s) => s.id === id)?.cutoutOf)
      setInspectorTab("surface");
    if (soloSurfaceId) setSoloSurfaceId(id);
  };
  const selectPoint = (index: number | null) => {
    setSelectedPoint(index);
    if (index !== null) setInspectorTab("surface");
  };
  const toggleLibrary = () => {
    setPreferences((p) => ({ ...p, libraryCollapsed: !p.libraryCollapsed }));
    setExpandedLibrary(false);
  };

  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      /* Preferences remain usable for this session. */
    }
  }, [preferences]);
  useEffect(() => {
    setSelectedPoint(null);
    document
      .querySelector(".layer-row.selected")
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);
  useEffect(() => {
    window.addEventListener("blur", finish);
    return () => window.removeEventListener("blur", finish);
  }, [finish]);
  useEffect(() => {
    if (soloSurfaceId && !effectiveSolo(viewProject.surfaces, soloSurfaceId))
      setSoloSurfaceId(null);
    if (
      selectedPoint !== null &&
      (!selected || selectedPoint >= selected.points.length)
    )
      setSelectedPoint(null);
  }, [project, selectedId, selectedPoint, soloSurfaceId]);

  useEffect(() => {
    setAutosave("saving");
    const timer = setTimeout(() => {
      try {
        persistProject(localStorage, project);
        setAutosave("saved");
      } catch {
        setAutosave("error");
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [project]);
  useEffect(() => {
    const persist = () => {
      try {
        persistProject(localStorage, current.current);
      } catch {
        /* Save-to-file remains available. */
      }
    };
    window.addEventListener("beforeunload", persist);
    return () => window.removeEventListener("beforeunload", persist);
  }, [current]);
  useEffect(() => {
    if (!selectedId) return;
    const selected = project.surfaces.find((s) => s.id === selectedId);
    const next = selected ?? project.surfaces.at(-1);
    if (!selected) {
      setSelectedId(next?.id ?? null);
      setSelectedPoint(null);
    }
    if (next) setActiveLayerId(layerIdFor(project, next));
  }, [project, selectedId]);
  const refreshDisplays = useCallback(async () => {
    if (!window.luma) return;
    try {
      const list = await window.luma.getDisplays();
      setDisplays(list);
      setDisplayError("");
      setDisplayId((previous) =>
        list.some((d) => d.id === previous)
          ? previous
          : ((list.find((d) => !d.primary) || list[0])?.id ?? null),
      );
    } catch (error) {
      setDisplayError(
        error instanceof Error ? error.message : "Unable to detect displays.",
      );
    }
  }, []);
  useEffect(() => {
    void refreshDisplays();
    return window.luma?.onOutputStatus(setOutputStatus);
  }, [refreshDisplays]);
  useEffect(
    () =>
      window.luma?.onOutputControl?.((action) => {
        if (action === "mesh") togglePlacementMesh();
      }),
    [togglePlacementMesh],
  );
  useEffect(() => {
    if (window.luma) return;
    const bc = new BroadcastChannel("luma-output");
    channel.current = bc;
    bc.onmessage = (event) => {
      if (event.data.type === "ready")
        bc.postMessage({
          type: "state",
          state: {
            ...latest.current,
            audio: getAudioFrame(),
            pointer: projectedPointer.current.current,
          },
        });
      if (event.data.type === "toggle-mesh") togglePlacementMesh();
    };
    const interval = setInterval(() => {
      if (outputWindow.current?.closed) {
        outputWindow.current = null;
        setOutputStatus({ open: false, displayId: null });
      }
    }, 500);
    return () => {
      bc.close();
      channel.current = null;
      clearInterval(interval);
      outputWindow.current?.close();
    };
  }, [togglePlacementMesh]);
  useEffect(() => {
    const next = {
      ...state,
      audio: getAudioFrame(),
      pointer: projectedPointer.current.current,
    };
    window.luma?.updateOutput(next);
    channel.current?.postMessage({ type: "state", state: next });
  }, [
    project,
    playback,
    blackout,
    testPattern,
    placementMesh,
    soloSurfaceId,
    selectedId,
    wireframeMode,
    mappingActive,
    mappingDragging,
    drawing,
    placing,
    alignmentDraft,
  ]);
  useEffect(() => {
    const timer = setInterval(
      () => setClock(playbackTime(latest.current.playback)),
      250,
    );
    return () => {
      clearInterval(timer);
      clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!shapeMenu) return;
    const close = () => setShapeMenu(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [shapeMenu]);

  const updateSurface = (id: string, change: Partial<Surface>) => {
    const surface = current.current.surfaces.find((s) => s.id === id);
    if (surface && layerFor(current.current, surface).locked) {
      notify("Unlock the layer before editing its shapes.");
      return;
    }
    if (change.points || "curves" in change) markMapping();
    update((p) => ({
      ...p,
      surfaces: changeSurface(p.surfaces, id, change),
    }));
  };
  function addSurface(kind: ShapeKind, points?: Point[]) {
    if (activeLayer.locked) {
      notify("Unlock the active layer or select another layer first.");
      return;
    }
    if (project.surfaces.length >= MAX_SURFACES) {
      notify(`A project supports up to ${MAX_SURFACES} surfaces.`);
      return;
    }
    if (kind === "polygon" && !points) {
      setPlacing(null);
      setDrawing(true);
      setShapeMenu(false);
      notify("Click around your shape, then press Enter to finish.");
      return;
    }
    if (kind !== "polygon" && drawToSize && !points) {
      addPreset(kind);
      return;
    }
    const surface = createSurface(kind, project.surfaces.length + 1, points);
    if (project.layers) surface.layerId = activeLayer.id;
    update((p) => ({ ...p, surfaces: [...p.surfaces, surface] }));
    selectSurface(surface.id);
    markMapping();
    setInspectorTab("surface");
    setDrawing(false);
    setPlacing(null);
    setShapeMenu(false);
  }
  function addPreset(preset: ShapePreset, frame?: ShapeFrame) {
    if (activeLayer.locked) {
      notify("Unlock the active layer or select another layer first.");
      return;
    }
    const count = preset === "ring" ? 2 : 1;
    if (project.surfaces.length + count > MAX_SURFACES) {
      notify(
        `This shape needs ${count} available surface ${count === 1 ? "slot" : "slots"}. A project supports ${MAX_SURFACES}, including holes.`,
      );
      return;
    }
    setShapeMenu(false);
    setDrawing(false);
    if (drawToSize && !frame) {
      setPlacing(preset);
      markMapping();
      return;
    }
    const area = frame || { x: 0.32, y: 0.28, width: 0.36, height: 0.44 };
    const geometry = presetGeometry(preset, area);
    const surface = {
      ...createSurface(geometry.kind, project.surfaces.length + 1),
      ...geometry,
      name: `${presetLabels[preset]} ${project.surfaces.length + 1}`,
    };
    const additions = [surface];
    if (preset === "ring") {
      const hole = ringHoleGeometry(area);
      additions.push({
        ...createSurface(hole.kind, project.surfaces.length + 2),
        ...hole,
        name: `${surface.name} hole`,
        cutoutOf: surface.id,
      });
    }
    if (!additions.every(validSurfaceGeometry)) {
      notify("Draw a larger shape inside the canvas.");
      return;
    }
    if (project.layers)
      additions.forEach((s: Surface) => {
        s.layerId = activeLayer.id;
      });
    update((p) => ({ ...p, surfaces: [...p.surfaces, ...additions] }));
    selectSurface(surface.id);
    setInspectorTab("surface");
    setPlacing(null);
    markMapping();
  }
  function duplicate() {
    if (!selected) return;
    if (layerFor(project, selected).locked) {
      notify("Unlock this layer before duplicating its shapes.");
      return;
    }
    const copies = duplicateSurfaceGroup(project.surfaces, selected.id);
    if (project.surfaces.length + copies.length > MAX_SURFACES) {
      notify(`A project supports up to ${MAX_SURFACES} surfaces.`);
      return;
    }
    update((p) => ({ ...p, surfaces: [...p.surfaces, ...copies] }));
    selectSurface(copies[0].id);
    notify(
      copies.length > 1
        ? "Surface and its cutouts duplicated."
        : "Surface duplicated.",
    );
  }
  async function copyShape() {
    if (!selectedId) {
      notify("Select a shape to copy.");
      return;
    }
    try {
      const data = copyShapeData(current.current, selectedId);
      if (window.luma) await window.luma.copyShapes(data);
      else {
        try {
          await navigator.clipboard.writeText(data);
        } catch {
          /* Keep a local clipboard in browser previews. */
        }
      }
      clipboardData.current = data;
      pasteSequence.current = { data, count: 0 };
      notify("Shape copied, including its effects, curves and holes.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to copy this shape.",
        "error",
      );
    }
  }
  async function pasteShape(inPlace = false) {
    if (pasting.current) return;
    if (activeLayer.locked) {
      notify("Unlock the active layer or select another layer first.");
      return;
    }
    pasting.current = true;
    try {
      let data: string;
      if (window.luma) data = await window.luma.pasteShapes();
      else {
        try {
          data = await navigator.clipboard.readText();
        } catch {
          data = clipboardData.current;
        }
      }
      const p = current.current,
        destination = layersFor(p).find((l) => l.id === activeLayer.id);
      if (!destination || destination.locked)
        throw new Error("Select an unlocked layer before pasting.");
      const sequence =
        pasteSequence.current.data === data ? pasteSequence.current.count : 0;
      const copies = pastedShapes(
        data,
        p.surfaces.length,
        inPlace ? 0 : 0.02 * (sequence + 1),
      ).map((s) => ({ ...s, layerId: p.layers ? destination.id : undefined }));
      update({ ...p, surfaces: [...p.surfaces, ...copies] });
      pasteSequence.current = {
        data,
        count: inPlace ? sequence : sequence + 1,
      };
      selectSurface(copies[0].id);
      setActiveLayerId(destination.id);
      setInspectorTab("surface");
      markMapping();
      notify(
        inPlace
          ? "Shape pasted at its original position."
          : "Shape pasted into the active layer.",
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to paste this shape.",
        "error",
      );
    } finally {
      pasting.current = false;
    }
  }
  function removeSelected() {
    if (!selected) return;
    if (selected.locked) {
      notify("Unlock this surface before deleting it.");
      return;
    }
    update((p) => ({
      ...p,
      surfaces: p.surfaces.filter(
        (s) => s.id !== selected.id && s.cutoutOf !== selected.id,
      ),
    }));
    notify("Surface removed. Undo with Ctrl+Z.");
  }
  function removeSelectedPoint() {
    if (!selected || selectedPoint === null || selected.locked) return;
    if (selected.kind !== "polygon") {
      notify("Rectangles and triangles have a fixed number of corners.");
      return;
    }
    const change = removeSurfaceCorner(selected, selectedPoint);
    if (!change) {
      notify(
        "A polygon needs at least three corners and its edges cannot cross.",
      );
      return;
    }
    updateSurface(selected.id, change);
    setSelectedPoint(Math.min(selectedPoint, change.points!.length - 1));
  }
  function addCutout(kind: "quad" | "ellipse") {
    if (!selected || selected.cutoutOf || selected.locked) return;
    if (project.surfaces.length >= MAX_SURFACES) {
      notify(
        `A project supports up to ${MAX_SURFACES} surfaces, including cutouts.`,
      );
      return;
    }
    const hole = createSurface(
      kind,
      project.surfaces.length + 1,
      defaultHole(selected, kind),
    );
    if (!validSurfaceGeometry(hole)) {
      notify(
        "This surface is too small for a preset hole. Subtract an existing shape instead.",
      );
      return;
    }
    hole.cutoutOf = selected.id;
    hole.layerId = project.surfaces.find((s) => s.id === selected.id)?.layerId;
    hole.name = `${selected.name.slice(0, 55)} cutout ${cutoutsFor(project.surfaces, selected.id).length + 1}`;
    update((p) => ({ ...p, surfaces: [...p.surfaces, hole] }));
    selectSurface(hole.id);
    setInspectorTab("surface");
    markMapping();
    notify("Cutout added. Move or reshape it to place the hole.");
  }
  function subtract(cutterId: string) {
    if (!selected) return;
    update((p) => subtractSurface(p, selected.id, cutterId));
    selectSurface(cutterId);
    setInspectorTab("surface");
    markMapping();
    notify("Shape subtracted. Its outline remains editable as a cutout.");
  }
  function reorder(direction: number) {
    if (selectedId) update((p) => reorderSurface(p, selectedId, direction));
  }
  function applyEffect(effectId: EffectId) {
    if (selected && layerFor(project, selected).locked) {
      notify("Unlock the layer before changing its effects.");
      return;
    }
    if (selected?.cutoutOf) {
      notify(
        "This shape is a cutout. Select its parent surface to change the effect.",
      );
      return;
    }
    if (effectId === "stacked-liquid") {
      setModal("stacks");
      return;
    }
    if (!selected) {
      notify("Select a surface first.");
      return;
    }
    updateSurface(selected.id, {
      effectId,
      media: undefined,
      color: effectById[effectId].color,
      colorCycle: effectById[effectId].cycleByDefault ?? false,
    });
    setInspectorTab("effect");
    notify(`${effectById[effectId].name} applied to ${selected.name}.`);
  }
  function applyMedia(asset: MediaAsset, targetId = selectedId) {
    const target = current.current.surfaces.find(
      (surface) => surface.id === targetId,
    );
    if (!target || target.cutoutOf) {
      notify(
        "Animation added to Imported. Select a surface, then click its card to apply it.",
      );
      return;
    }
    if (target.locked || layerFor(current.current, target).locked) {
      notify("Unlock the surface and its layer before changing the animation.");
      return;
    }
    updateSurface(target.id, {
      effectId: "imported-media",
      media: bindMedia(asset),
      speed: 1,
      colorCycle: false,
    });
    setInspectorTab("effect");
    notify(`${asset.name} applied to ${target.name}.`, "success");
  }
  async function importAnimation(expectedId?: string) {
    if (!window.luma || importBusy.current) return;
    const targetId = selectedId;
    importBusy.current = true;
    setImporting(true);
    try {
      const result = await window.luma.importMedia(expectedId);
      if (result.error) throw new Error(result.error);
      if (result.canceled || !result.asset) return;
      notify("Checking animation and creating a preview...");
      const item = await window.luma.completeMedia(
        await probeMedia(result.asset),
      );
      refreshMedia();
      setMediaLibrary(await window.luma.listMedia());
      setCategory("Imported");
      setPreferences((p) => ({ ...p, libraryCollapsed: false }));
      if (expectedId)
        notify(
          "Original animation restored. Existing timing and mapping are preserved.",
          "success",
        );
      else applyMedia(item, targetId);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Could not import this animation.",
        "error",
      );
    } finally {
      importBusy.current = false;
      setImporting(false);
    }
  }
  function togglePlayback() {
    const previous = latest.current.playback,
      offset = playbackTime(previous) * 1000;
    setClock(offset / 1000);
    setPlayback({ playing: !previous.playing, offset, startedAt: Date.now() });
  }
  async function saveProject() {
    setSaving(true);
    try {
      const data = serializeProject(current.current);
      if (window.luma) {
        const result = await window.luma.saveProject(
          data,
          current.current.name,
        );
        if (result.error) throw new Error(result.error);
        if (!result.canceled)
          notify(
            result.missing?.length
              ? `Project saved, but ${result.missing.length} animation(s) are missing. Locate the originals before sharing.`
              : current.current.surfaces.some(
                    (s) => s.effectId === "imported-media",
                  )
                ? "Project saved to file. Keep its companion media folder with it."
                : "Project saved to file.",
            result.missing?.length ? "error" : "success",
          );
      } else {
        const url = URL.createObjectURL(
          new Blob([data], { type: "application/json" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `${current.current.name.replace(/[^a-z0-9 _-]/gi, "") || "Luma project"}.luma`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        notify("Project downloaded.", "success");
      }
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to save this project.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }
  function loadProject(data: string) {
    try {
      const loaded = parseProject(data);
      update(loaded);
      setActiveLayerId(
        loaded.surfaces[0]
          ? layerIdFor(loaded, loaded.surfaces[0])
          : layersFor(loaded)[0].id,
      );
      selectSurface(loaded.surfaces[0]?.id || null);
      setSoloSurfaceId(null);
      setInspectorTab("surface");
      setDrawing(false);
      setPlacing(null);
      setZoom(1);
      notify(`Opened “${loaded.name}”.`);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to open this project.",
        "error",
      );
    }
  }
  async function openProject() {
    if (!window.luma) {
      fileInput.current?.click();
      return;
    }
    try {
      const result = await window.luma.openProject();
      if (result.error) throw new Error(result.error);
      if (result.data) {
        refreshMedia();
        loadProject(result.data);
        if (result.missing?.length)
          notify(
            `Project opened. ${result.missing.length} animation(s) are missing; use Locate original in the Effect inspector.`,
            "error",
          );
      }
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to open this project.",
        "error",
      );
    }
  }
  async function openOutput() {
    setOpeningOutput(true);
    try {
      if (window.luma) {
        if (displayId === null)
          throw new Error("Select a connected display first.");
        setOutputStatus(
          await window.luma.openOutput(displayId, latest.current),
        );
      } else {
        const url = new URL(location.href);
        url.search = "?output=1";
        outputWindow.current = window.open(
          url.toString(),
          "luma-projector",
          "popup,width=1100,height=680",
        );
        if (!outputWindow.current)
          throw new Error(
            "Allow pop-ups for this page to open the projector preview.",
          );
        setOutputStatus({ open: true, displayId: null });
      }
      setModal(null);
      notify(
        selectedDisplay?.primary || !window.luma
          ? "Output preview opened. Press F in that window for fullscreen; Esc to close."
          : "Projector output is live. Press Esc in the output window to close it.",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Unable to open projector output.",
        "error",
      );
    } finally {
      setOpeningOutput(false);
    }
  }
  async function closeOutput() {
    try {
      if (window.luma) setOutputStatus(await window.luma.closeOutput());
      else {
        outputWindow.current?.close();
        outputWindow.current = null;
        setOutputStatus({ open: false, displayId: null });
      }
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to close output.",
        "error",
      );
    }
  }
  function applyTemplate(template: "blank" | "winter" | "halloween") {
    const next = createProject(template);
    update(next);
    setActiveLayerId(layersFor(next)[0].id);
    selectSurface(next.surfaces[1]?.id || next.surfaces[0]?.id || null);
    setSoloSurfaceId(null);
    setInspectorTab("surface");
    setZoom(1);
    setDrawing(false);
    setPlacing(null);
    setTestPattern(false);
    setCategory(
      template === "winter"
        ? "Christmas"
        : template === "halloween"
          ? "Halloween"
          : "All effects",
    );
    setModal(null);
    notify("New scene ready. Ctrl+Z restores your previous scene.");
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]'))
        return;
      if (
        e.key.toLowerCase() === "m" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        if (!e.repeat) togglePlacementMesh();
        return;
      }
      if (modal) return;
      const control = e.ctrlKey || e.metaKey;
      if (control) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
        if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          redo();
        }
        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          void saveProject();
        }
        if (e.key.toLowerCase() === "o") {
          e.preventDefault();
          void openProject();
        }
        if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          duplicate();
        }
        if (e.key.toLowerCase() === "c") {
          e.preventDefault();
          void copyShape();
        }
        if (e.key.toLowerCase() === "v") {
          e.preventDefault();
          void pasteShape(e.shiftKey);
        }
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        togglePlayback();
      }
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        setBlackout((v) => !v);
      }
      if (placing) {
        if (e.key === "Escape") {
          e.preventDefault();
          setPlacing(null);
        }
        return;
      }
      if (drawing) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedPoint !== null) removeSelectedPoint();
        else removeSelected();
      }
      if (e.key.toLowerCase() === "r") addSurface("quad");
      if (e.key.toLowerCase() === "t") addSurface("triangle");
      if (e.key.toLowerCase() === "e") addSurface("ellipse");
      if (e.key.toLowerCase() === "p") addSurface("polygon");
      if (e.key === "Escape") {
        setShapeMenu(false);
        if (selectedPoint !== null) setSelectedPoint(null);
        else selectSurface(null);
      }
      if (e.key.startsWith("Arrow") && selected && !selected.locked) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        if (selectedPoint !== null && selected.kind !== "ellipse") {
          const original = selected.points[selectedPoint];
          if (!original) return;
          const points = moveVertex(
            selected.kind,
            selected.points,
            selectedPoint,
            {
              x:
                original.x +
                (e.key === "ArrowLeft"
                  ? -step
                  : e.key === "ArrowRight"
                    ? step
                    : 0) /
                  project.width,
              y:
                original.y +
                (e.key === "ArrowUp"
                  ? -step
                  : e.key === "ArrowDown"
                    ? step
                    : 0) /
                  project.height,
            },
          );
          if (points) updateSurface(selected.id, { points });
          return;
        }
        updateSurface(selected.id, {
          points: translate(
            selected.points,
            e.key === "ArrowLeft"
              ? -step / project.width
              : e.key === "ArrowRight"
                ? step / project.width
                : 0,
            e.key === "ArrowUp"
              ? -step / project.height
              : e.key === "ArrowDown"
                ? step / project.height
                : 0,
          ),
        });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const timecode = `${Math.floor(clock / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(clock % 60)
    .toString()
    .padStart(2, "0")}`;
  const browseEffects = () => {
    setCategory(
      selected ? effectById[selected.effectId].category : "All effects",
    );
    setExpandedLibrary(true);
    setPreferences((p) => ({ ...p, libraryCollapsed: false }));
  };

  return (
    <div
      className={`app ${expandedLibrary && !libraryCollapsed ? "library-is-expanded" : ""} ${libraryCollapsed ? "library-is-collapsed" : ""}`}
    >
      <header className="app-header">
        <div
          className="brand"
          aria-label="Luma projection studio"
          title="Luma — Bring surfaces to life."
        >
          <Logo />
          <span>
            luma<span className="brand-period">.</span>
          </span>
          <small>PROJECTION STUDIO</small>
        </div>
        <div className="header-divider" />
        <div className="project-title">
          <input
            aria-label="Project name"
            value={project.name}
            maxLength={100}
            onFocus={begin}
            onBlur={() => {
              if (!project.name.trim())
                update((p) => ({ ...p, name: "Untitled mapping" }));
              finish();
            }}
            onChange={(e) => update((p) => ({ ...p, name: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <span className={`autosave ${autosave}`}>
            {autosave === "saved" ? <Check size={11} /> : <Circle size={7} />}
            {autosave === "saved"
              ? "Saved on this device"
              : autosave === "saving"
                ? "Saving…"
                : "Autosave unavailable · save to file"}
          </span>
        </div>
        <div className="header-actions">
          <button
            className={`secondary-button music-input-button ${audioInput.status.state}`}
            aria-label="Music input"
            title={audioInput.status.message}
            onClick={() => setModal("audio")}
          >
            <AudioLines size={17} />
            <span>Music input</span>
            <i aria-hidden="true" />
          </button>
          <button
            className="icon-button"
            aria-label="New scene"
            title="New scene"
            onClick={() => setModal("templates")}
          >
            <FilePlus2 size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Open project"
            title="Open project · Ctrl+O"
            onClick={() => void openProject()}
          >
            <FolderOpen size={17} />
          </button>
          <button
            className="secondary-button save-button"
            onClick={() => void saveProject()}
            disabled={saving}
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save project"}
          </button>
          <div className="header-divider short" />
          <button
            className={`primary-button output-button ${outputStatus.open ? "live" : ""}`}
            aria-label={outputStatus.open ? "Manage output" : "Launch output"}
            onClick={() => {
              void refreshDisplays();
              setModal("output");
            }}
          >
            <Projector size={16} />
            {outputStatus.open ? outputLabel : "Launch output"}
            {outputStatus.open ? (
              <span className="live-dot" />
            ) : (
              <ArrowUpRight size={15} />
            )}
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="surfaces-panel">
          <div className="panel-heading">
            <span>
              SURFACES{" "}
              <span className="count-badge">
                {project.surfaces.length.toString().padStart(2, "0")}
              </span>
            </span>
            <button
              className="icon-button small"
              title="Add surface"
              aria-label="Add surface"
              onClick={(e) => {
                e.stopPropagation();
                setShapeMenu((v) => !v);
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="add-surface-wrap">
            <button
              className="add-surface-button"
              onClick={(e) => {
                e.stopPropagation();
                setShapeMenu((v) => !v);
              }}
            >
              <Plus size={15} /> Add surface <ChevronDown size={13} />
            </button>
            {shapeMenu && (
              <div className="shape-menu" onClick={(e) => e.stopPropagation()}>
                <label className="draw-size-option">
                  <input
                    type="checkbox"
                    checked={drawToSize}
                    onChange={(e) => setDrawToSize(e.target.checked)}
                  />
                  Draw new shapes to size
                </label>
                <div className="shape-menu-label">BASIC SHAPES</div>
                {(
                  ["quad", "triangle", "ellipse", "polygon"] as ShapeKind[]
                ).map((kind, i) => (
                  <button key={kind} onClick={() => addSurface(kind)}>
                    <ShapeIcon kind={kind} />
                    {shapeLabels[kind]}
                    <kbd>{["R", "T", "E", "P"][i]}</kbd>
                  </button>
                ))}
                <div className="shape-menu-label">SHAPE PRESETS</div>
                {extraPresets.map((preset) => (
                  <button key={preset} onClick={() => addPreset(preset)}>
                    <PresetIcon preset={preset} />
                    {presetLabels[preset]}
                    {preset === "ring" && <small>with hole</small>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="stack-launch" onClick={() => setModal("stacks")}>
            <Layers size={14} />
            Stacked animations<span>{project.stacks.length || "+"}</span>
          </button>
          <LayerPanel
            project={project}
            activeId={activeLayer.id}
            selectedId={selectedId}
            soloId={soloSurfaceId}
            selectLayer={(id) => {
              setActiveLayerId(id);
              selectSurface(null);
              setDrawing(false);
              setPlacing(null);
            }}
            selectSurface={(id) => {
              selectSurface(id);
              setDrawing(false);
              setPlacing(null);
            }}
            solo={(id) => {
              selectSurface(id);
              setSoloSurfaceId(soloSurfaceId === id ? null : id);
            }}
            changeSurface={updateSurface}
            add={() => {
              const id = crypto.randomUUID();
              update((p) => addLayer(p, id));
              setActiveLayerId(id);
              selectSurface(null);
            }}
            change={(id, change) => update((p) => changeLayer(p, id, change))}
            reorder={(id, direction) =>
              update((p) => reorderLayer(p, id, direction))
            }
            remove={(id) => update((p) => removeLayer(p, id))}
            move={(id) => {
              if (selectedId) {
                update((p) => moveToLayer(p, selectedId, id));
                setActiveLayerId(id);
              }
            }}
            copy={() => void copyShape()}
            paste={(inPlace) => void pasteShape(inPlace)}
          />
          <div className="layer-list-footer">
            <Layers size={12} />
            <span>Top layers project in front</span>
          </div>
          <div className="sidebar-bottom">
            <button
              className="starter-card"
              onClick={() => setModal("templates")}
            >
              <span className="starter-icon">
                <Sparkles size={17} />
              </span>
              <span>
                <strong>Start with a little magic</strong>
                <small>Explore seasonal scenes</small>
              </span>
              <ArrowUpRight size={14} />
            </button>
            <div className="projector-card">
              <div className="projector-card-heading">
                <Monitor size={15} />
                <span>PROJECTOR</span>
                <span
                  className={`status-dot ${outputStatus.open ? "online" : ""}`}
                />
              </div>
              <strong>{outputLabel}</strong>
              <p>
                {selectedDisplay
                  ? `${selectedDisplay.label}${selectedDisplay.primary ? " · Primary display" : ""}`
                  : window.luma
                    ? "Connect your projector to get started"
                    : "Browser preview mode"}
              </p>
              <button
                onClick={() => {
                  void refreshDisplays();
                  setModal("output");
                }}
              >
                Output settings <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        </aside>

        <section className="mapping-workspace">
          <div className="canvas-heading">
            <div>
              <span className="eyebrow">WORKSPACE</span>
              <h1>
                Map your space<span>.</span>
              </h1>
            </div>
            <div className="canvas-view-controls">
              <button
                className={`placement-mesh-button ${placementMesh ? "active" : ""}`}
                aria-label="Placement mesh"
                aria-keyshortcuts="M"
                aria-pressed={placementMesh}
                title={
                  placementMesh
                    ? "Return to animations · M"
                    : "Replace animations with a placement mesh · M"
                }
                onClick={togglePlacementMesh}
              >
                <Grid2X2 size={15} />
                <span>Placement mesh</span>
                <kbd>M</kbd>
              </button>
              <button
                className={`tool-button ${wireframeMode === "always" ? "active" : ""}`}
                aria-label="Keep projection wireframe"
                aria-pressed={wireframeMode === "always"}
                disabled={placementMesh}
                title="Keep alignment wireframe on the projector · automatically shown during edits"
                onClick={() =>
                  setWireframeMode((v) =>
                    v === "always" ? "editing" : "always",
                  )
                }
              >
                <Octagon size={16} />
              </button>
              <button
                className={`tool-button ${labels ? "active" : ""}`}
                aria-label="Surface labels"
                aria-pressed={labels}
                title="Show surface names on the editor"
                onClick={() =>
                  setPreferences((p) => ({ ...p, labels: !p.labels }))
                }
              >
                <Tags size={16} />
              </button>
              <button
                className="tool-button"
                aria-label={libraryCollapsed ? "Show effects" : "Expand canvas"}
                title={
                  libraryCollapsed
                    ? "Show effects library"
                    : "Expand canvas · hide effects library"
                }
                onClick={toggleLibrary}
              >
                {libraryCollapsed ? (
                  <Minimize2 size={16} />
                ) : (
                  <Maximize2 size={16} />
                )}
              </button>
              <button
                className="canvas-resolution"
                onClick={() => setModal("output")}
              >
                <Monitor size={13} />
                {project.width} × {project.height}
                <ChevronDown size={11} />
              </button>
            </div>
          </div>
          <div className="canvas-toolbar">
            <div className="tool-group">
              <button
                className={`tool-button ${!drawing && !placing ? "active" : ""}`}
                title="Select & move"
                aria-label="Select & move"
                onClick={() => {
                  setDrawing(false);
                  setPlacing(null);
                }}
              >
                <MousePointer2 size={16} />
              </button>
              <button
                className={`tool-button ${drawing ? "active" : ""}`}
                title="Draw custom polygon · P"
                aria-label="Draw custom polygon"
                onClick={() => addSurface("polygon")}
              >
                <PenLine size={16} />
              </button>
              <span className="tool-divider" />
              <button
                className="tool-button"
                title="Add rectangle · R"
                aria-label="Add rectangle"
                onClick={() => addSurface("quad")}
              >
                <Square size={15} />
              </button>
              <button
                className="tool-button"
                title="Add ellipse · E"
                aria-label="Add ellipse"
                onClick={() => addSurface("ellipse")}
              >
                <Circle size={16} />
              </button>
              <button
                className="tool-button"
                title="Add triangle · T"
                aria-label="Add triangle"
                onClick={() => addSurface("triangle")}
              >
                <Triangle size={16} />
              </button>
            </div>
            <div className="tool-group">
              <button
                className="tool-button"
                disabled={!canUndo}
                onClick={undo}
                title="Undo · Ctrl+Z"
                aria-label="Undo"
              >
                <Undo2 size={15} />
              </button>
              <button
                className="tool-button"
                disabled={!canRedo}
                onClick={redo}
                title="Redo · Ctrl+Shift+Z"
                aria-label="Redo"
              >
                <Redo2 size={15} />
              </button>
              <span className="tool-divider" />
              <button
                className={`tool-button ${grid ? "active" : ""}`}
                onClick={() => setPreferences((p) => ({ ...p, grid: !p.grid }))}
                title="Toggle alignment grid"
                aria-label="Toggle alignment grid"
                aria-pressed={grid}
              >
                <Grid2X2 size={15} />
              </button>
              <button
                className={`tool-button ${snap ? "active" : ""}`}
                onClick={() => setPreferences((p) => ({ ...p, snap: !p.snap }))}
                title="Snap to 10-pixel grid"
                aria-label="Snap to grid"
                aria-pressed={snap}
              >
                <Magnet size={15} />
              </button>
              <span className="tool-divider" />
              <button
                className="tool-button"
                aria-label="Zoom out"
                title="Zoom out"
                disabled={zoom <= 0.5}
                onClick={() => setZoom((v) => Math.max(0.5, v - 0.25))}
              >
                <ZoomOut size={15} />
              </button>
              <button
                className="zoom-value"
                title="Fit canvas"
                onClick={() => setZoom(1)}
              >
                {zoom === 1 ? "Fit" : `${Math.round(zoom * 100)}%`}
              </button>
              <button
                className="tool-button"
                aria-label="Zoom in"
                title="Zoom in"
                disabled={zoom >= 2}
                onClick={() => setZoom((v) => Math.min(2, v + 0.25))}
              >
                <ZoomIn size={15} />
              </button>
            </div>
          </div>
          <Stage
            state={state}
            selectedId={selectedId}
            select={selectSurface}
            selectedPoint={selectedPoint}
            selectPoint={selectPoint}
            labels={labels}
            updateSurface={updateSurface}
            begin={begin}
            finish={finish}
            grid={grid}
            snap={snap}
            zoom={zoom}
            drawing={drawing}
            setDrawing={setDrawing}
            placing={placing}
            cancelPlacement={() => setPlacing(null)}
            placeShape={(frame) => {
              if (placing) addPreset(placing, frame);
            }}
            addPolygon={(points) => addSurface("polygon", points)}
            onFps={setFps}
            notify={notify}
            onMapping={markMapping}
            onDragging={setMappingDragging}
            onDraft={setAlignmentDraft}
            onPointerPosition={projectedPointer.track}
          />
          <div className="transport">
            <div className="playback-controls">
              <button
                className={`play-button ${playback.playing ? "" : "paused"}`}
                aria-label={
                  playback.playing ? "Pause animation" : "Play animation"
                }
                title="Play / pause · Space"
                onClick={togglePlayback}
              >
                {playback.playing ? (
                  <Pause size={14} fill="currentColor" />
                ) : (
                  <Play size={14} fill="currentColor" />
                )}
              </button>
              <button
                className="tool-button"
                title="Restart animation"
                aria-label="Restart animation"
                onClick={() =>
                  setPlayback((p) => ({
                    ...p,
                    offset: 0,
                    startedAt: Date.now(),
                  }))
                }
              >
                <RotateIcon />
              </button>
              <span className="timecode">
                {timecode}
                <small> LOOP</small>
              </span>
            </div>
            <div className="transport-right">
              {soloSurfaceId && (
                <button
                  className="mode-chip"
                  title="Show all surfaces"
                  onClick={() => setSoloSurfaceId(null)}
                >
                  Solo <X size={12} />
                </button>
              )}
              {testPattern && (
                <button
                  className="mode-chip calibration-chip"
                  onClick={() => setTestPattern(false)}
                >
                  Calibration <X size={12} />
                </button>
              )}
              {!soloSurfaceId && !testPattern && (
                <span className="preview-label">
                  <span
                    className={`tiny-dot ${playback.playing ? "green" : ""}`}
                  />
                  {placementMesh
                    ? "Placement view"
                    : playback.playing
                      ? "Live preview"
                      : "Preview paused"}
                </span>
              )}
              <button
                className={`blackout-button ${blackout ? "blacked-out" : ""}`}
                onClick={() => setBlackout((v) => !v)}
                title="Toggle blackout · B"
                aria-pressed={blackout}
              >
                {blackout ? <EyeOff size={13} /> : <Square size={12} />}Blackout
                <kbd>B</kbd>
              </button>
            </div>
          </div>
        </section>
        <Inspector
          mediaLibrary={mediaLibrary}
          locateMedia={(id) => void importAnimation(id)}
          importing={importing}
          project={viewProject}
          surface={selected}
          update={(change) => selected && updateSurface(selected.id, change)}
          begin={begin}
          finish={finish}
          duplicate={duplicate}
          remove={removeSelected}
          reorder={reorder}
          browse={browseEffects}
          notify={notify}
          selectedPoint={selectedPoint}
          stack={project.stacks.find((stack) =>
            stack.surfaceIds.includes(selectedId || ""),
          )}
          editStack={() => setModal("stacks")}
          openAudio={() => setModal("audio")}
          selectPoint={selectPoint}
          removePoint={removeSelectedPoint}
          tab={inspectorTab}
          setTab={setInspectorTab}
          addCutout={addCutout}
          subtract={subtract}
          selectSurface={selectSurface}
          restoreCutout={(id) => {
            updateSurface(id, { cutoutOf: undefined });
            markMapping();
          }}
        />
      </main>

      <EffectsLibrary
        mediaLibrary={mediaLibrary}
        selectedMediaId={
          selected?.effectId === "imported-media"
            ? selected.media?.asset.id
            : undefined
        }
        applyMedia={applyMedia}
        importMedia={() => void importAnimation()}
        importing={importing}
        selectedEffect={selected?.cutoutOf ? undefined : selected?.effectId}
        selectedName={selected?.name}
        hasSelection={!!selected && !selected.cutoutOf}
        apply={applyEffect}
        category={category}
        setCategory={setCategory}
        expanded={expandedLibrary}
        toggleExpanded={() => setExpandedLibrary((v) => !v)}
        collapsed={libraryCollapsed}
        toggleCollapsed={toggleLibrary}
        animate={animatePreviews}
        toggleAnimate={() =>
          setPreferences((p) => ({ ...p, animatePreviews: !p.animatePreviews }))
        }
      />
      <footer className="status-bar">
        <div>
          <span className={`status-dot ${outputStatus.open ? "online" : ""}`} />
          <span>{outputLabel}</span>
          <span className="status-separator" />
          <span>
            {soloSurfaceId
              ? "1 surface isolated"
              : `${project.surfaces.filter((s) => s.visible && !s.cutoutOf).length} active surfaces`}
          </span>
        </div>
        <div>
          <span className="performance">
            <Zap size={11} />
            {fps} fps
          </span>
          <span className="status-separator" />
          <span>Single projector · Local & offline</span>
          <button
            aria-label="Help and keyboard shortcuts"
            onClick={() => setModal("help")}
          >
            <CircleHelp size={13} />
            <span>Quick guide</span>
          </button>
        </div>
      </footer>
      {toast && (
        <div
          className={`toast ${toast.tone}`}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          {toast.tone === "error" ? (
            <AlertCircle size={16} />
          ) : toast.tone === "success" ? (
            <Check size={16} />
          ) : (
            <Info size={16} />
          )}
          <span>{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        hidden
        accept=".luma,.json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            try {
              if (file.size > 2_000_000)
                throw new Error("Project files must be smaller than 2 MB.");
              loadProject(await file.text());
            } catch (error) {
              notify(
                error instanceof Error
                  ? error.message
                  : "Unable to read the selected file.",
                "error",
              );
            }
          }
          e.target.value = "";
        }}
      />

      {modal === "audio" && (
        <Modal
          title="Music input"
          subtitle="Bring your shapes to life with sound."
          onClose={closeModal}
        >
          <AudioPanel
            input={audioInput}
            settings={project.audioSettings}
            change={(audioSettings) => update((p) => ({ ...p, audioSettings }))}
            begin={begin}
            finish={finish}
          />
        </Modal>
      )}
      {modal === "stacks" && (
        <Modal
          title="Stacked animations"
          subtitle="Link shapes for liquid flows, character chases and portal journeys."
          onClose={closeModal}
          className="stack-modal"
        >
          <StackEditor
            project={project}
            selectedId={selectedId}
            activeLayerId={activeLayer.id}
            update={update}
            selectSurface={selectSurface}
            notify={notify}
          />
        </Modal>
      )}
      {modal === "output" && (
        <Modal
          title="Your light. Your space."
          subtitle="Set up one projector and bring your mapping to life."
          onClose={closeModal}
        >
          <div className="output-diagram">
            <div>
              <Monitor size={35} />
              <span>Control display</span>
            </div>
            <div className="signal-line">
              <span />
              <span />
              <span />
            </div>
            <div className="projector-diagram">
              <Projector size={40} />
              <span>Your projector</span>
            </div>
          </div>
          <div className="output-settings">
            <div className="section-label">
              OUTPUT DISPLAY
              <button onClick={() => void refreshDisplays()}>
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
            {displayError && <p className="inline-error">{displayError}</p>}
            {window.luma ? (
              <div className="display-options">
                {displays.map((display) => (
                  <button
                    key={display.id}
                    className={`display-option ${displayId === display.id ? "selected" : ""}`}
                    onClick={() => setDisplayId(display.id)}
                  >
                    <Monitor size={21} />
                    <span>
                      <strong>{display.label}</strong>
                      <small>
                        {Math.round(display.width * display.scaleFactor)} ×{" "}
                        {Math.round(display.height * display.scaleFactor)} ·{" "}
                        {display.primary
                          ? "Primary display"
                          : "External display"}
                      </small>
                    </span>
                    <span className="radio-indicator">
                      {displayId === display.id && <span />}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="notice">
                <Monitor size={18} />
                <p>
                  This browser preview opens a separate output window. The
                  desktop app detects your connected projector automatically.
                </p>
              </div>
            )}
            {selectedDisplay?.primary && (
              <p className="output-note">
                With one display, output opens in a preview window. Connect your
                projector in Windows <strong>Extend</strong> mode, refresh, then
                select it for fullscreen output.
              </p>
            )}
            <label className="select-field output-resolution">
              <span>Canvas resolution</span>
              <span className="select-wrap">
                <select
                  aria-label="Canvas resolution"
                  value={`${project.width}x${project.height}`}
                  onChange={(e) => {
                    const [width, height] = e.target.value
                      .split("x")
                      .map(Number);
                    update((p) => ({ ...p, width, height }));
                  }}
                >
                  {!resolutions.some(
                    ([w, h]) => w === project.width && h === project.height,
                  ) && (
                    <option value={`${project.width}x${project.height}`}>
                      {project.width} × {project.height}
                    </option>
                  )}
                  {resolutions.map(([w, h]) => (
                    <option key={w + "x" + h} value={`${w}x${h}`}>
                      {w} × {h}
                      {w === 1920 && h === 1080
                        ? " · Full HD"
                        : w === 3840
                          ? " · 4K"
                          : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </span>
            </label>
            <RangeControl
              label="Master brightness"
              value={project.brightness}
              display={`${Math.round(project.brightness * 100)}%`}
              onChange={(brightness) => update((p) => ({ ...p, brightness }))}
              begin={begin}
              finish={finish}
            />
            <button
              className={`calibration-toggle ${testPattern ? "active" : ""}`}
              aria-pressed={testPattern}
              onClick={() => {
                setTestPattern((v) => !v);
                setPlacementMesh(false);
              }}
            >
              <Grid2X2 size={17} />
              <span>
                <strong>Calibration grid</strong>
                <small>Align the projector before mapping your surfaces</small>
              </span>
              <span className="toggle-switch">
                <span />
              </span>
            </button>
            <button
              className={`calibration-toggle ${placementMesh ? "active" : ""}`}
              aria-label="Project placement mesh"
              aria-pressed={placementMesh}
              onClick={togglePlacementMesh}
            >
              <Grid2X2 size={17} />
              <span>
                <strong>
                  Placement mesh <kbd>M</kbd>
                </strong>
                <small>
                  Replace animations with a static mesh on each shape
                </small>
              </span>
              <span className="toggle-switch">
                <span />
              </span>
            </button>
            <label className="select-field wireframe-setting">
              <span>Projection wireframe</span>
              <span className="select-wrap">
                <select
                  aria-label="Projection wireframe"
                  value={wireframeMode}
                  disabled={placementMesh}
                  onChange={(e) =>
                    setWireframeMode(e.target.value as typeof wireframeMode)
                  }
                >
                  <option value="editing">During edits</option>
                  <option value="always">Always on</option>
                  <option value="off">Off</option>
                </select>
                <ChevronDown size={13} />
              </span>
            </label>
            <p className="output-note">
              During animations, outlines appear while editing and hide after
              2.4 seconds. Placement mesh keeps edges and numbered corners
              visible, even on dim or feathered surfaces. Effects keep their
              playback timing. Blackout hides all guides.
            </p>
          </div>
          <div className="output-key-hint">
            <ShieldCheck size={13} />
            Alignment guides follow your wireframe setting.
            <span>
              <kbd>M</kbd> Mesh <kbd>F</kbd> Fullscreen <kbd>Esc</kbd> Close
            </span>
          </div>
          <div className="modal-actions">
            {outputStatus.open && (
              <button
                className="secondary-button"
                onClick={() => void closeOutput()}
              >
                Stop output
              </button>
            )}
            <button
              className="primary-button"
              disabled={openingOutput || (!!window.luma && displayId === null)}
              onClick={() => void openOutput()}
            >
              <Projector size={16} />
              {openingOutput
                ? "Opening…"
                : outputStatus.open
                  ? "Update output"
                  : selectedDisplay?.primary || !window.luma
                    ? "Open output preview"
                    : "Start projector"}
              <ArrowUpRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {modal === "templates" && (
        <Modal
          title="Every space has a little magic."
          subtitle="Start fresh or make one of these seasonal scenes your own."
          onClose={closeModal}
          wide
        >
          <div className="template-grid">
            {(
              [
                {
                  id: "blank",
                  title: "A blank canvas",
                  subtitle: "Your space. Your imagination.",
                  icon: <Plus size={14} />,
                  label: "ESSENTIAL",
                },
                {
                  id: "winter",
                  title: "A little winter magic",
                  subtitle: "Snow, starlight and candy cane stripes.",
                  icon: <Snowflake size={14} />,
                  label: "CHRISTMAS",
                },
                {
                  id: "halloween",
                  title: "The haunted house",
                  subtitle: "Glowing eyes, eerie fog and witchfire.",
                  icon: <Ghost size={14} />,
                  label: "HALLOWEEN",
                },
              ] as const
            ).map((template) => (
              <button
                key={template.id}
                className={`template-card ${template.id}`}
                onClick={() => applyTemplate(template.id)}
              >
                <TemplateIllustration theme={template.id} />
                <div>
                  <span>
                    {template.icon}
                    {template.label}
                  </span>
                  <h3>{template.title}</h3>
                  <p>{template.subtitle}</p>
                  <strong>
                    Use this scene <ArrowUpRight size={14} />
                  </strong>
                </div>
              </button>
            ))}
          </div>
          <p className="template-note">
            <Undo2 size={13} />
            Your current scene remains available with Undo.
          </p>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="From screen to scene."
          subtitle="A quick guide to your first projection."
          onClose={closeModal}
          wide
        >
          <div className="guide-steps">
            <div>
              <span>01</span>
              <h3>Connect & align</h3>
              <p>
                Connect a projector and choose Extend in Windows display
                settings. Select that display in Output settings. Use the
                calibration grid to focus and align it.
              </p>
            </div>
            <div>
              <span>02</span>
              <h3>Map your surfaces</h3>
              <p>
                Add rectangles, triangles, ellipses or custom polygons, or
                choose a rounded rectangle, arch, hexagon, star, diamond or
                ring. Enable Draw new shapes to size in Add surface, then drag
                on the canvas; hold Shift for equal projector-pixel sides. Drag
                corners to match real objects. Select a corner and enable Bézier
                edge to bend its next edge. Alignment wireframes appear on the
                projector as you edit; pin them using the wireframe button.
                Click Placement mesh or press M to replace animations with a
                static mesh while aligning shapes. Press M again to return. In
                Surface → Cutouts &amp; holes, add a rectangle or ellipse hole,
                or subtract an existing shape. Edit its orange outline just like
                any other shape, including curved edges. Smooth corner aligns
                its curve handles; Straighten all edges removes curves. Rotate
                by accepts precise angles. Make outline editable adds corner
                editing to ellipses and frees rectangles and triangles from
                fixed corners.
              </p>
            </div>
            <div>
              <span>03</span>
              <h3>Make it yours</h3>
              <p>
                Select a surface and click an effect. Use the Effect tab to
                change colour, speed and scale. Position inside shape rotates
                and offsets the picture while keeping the outline and holes
                fixed. Stacked animations creates water, lava, potion and icy
                water loops, or links a character chase across two to eight
                shapes. Portal journey sends a robot, alien or space cat through
                glowing doorways from tile to tile, then back to the first. Set
                one duration for the entire stack, then use the shared play,
                pause and restart controls. Chase scenes has five pairs of
                characters that race across a surface and return at the opposite
                edge. Link them to run from shape to shape; reversing direction
                swaps who is chasing. Choose size and direction in the Effect
                tab. Creatures contains four animals, a skeleton and a witch
                that peek from either side. Colour blocks offers five tile
                animations. Architecture includes animated colour-changing
                brickwork and glowing temple glyphs. Space includes the Moon,
                Saturn, Jupiter, ISS, warp speed, a spiral galaxy, a nebula,
                solar prominences, a comet and an asteroid belt. Textures
                contains twelve still materials, including metals and carved
                sandstone pillars. 3D illusions adds flying brick builders,
                collapsing masonry and ten kinetic depth scenes. Enable Colour
                overlay in the Effect tab to add moving palettes to any effect
                or still texture. Choose its style, palette, mix, intensity,
                speed and direction. Blend mode combines a surface with the
                layers underneath; use Bring forward and Send backward to change
                the order.
              </p>
            </div>
          </div>
          <div className="shortcuts">
            <h3>Keep your hands on the keys</h3>
            <div>
              {[
                ["Space", "Play / pause"],
                ["B", "Blackout"],
                ["M", "Placement mesh / animations (editor or output)"],
                ["R / T / E", "Add a shape"],
                ["P", "Draw a polygon"],
                ["Enter", "Finish polygon"],
                ["Backspace", "Remove last polygon point"],
                ["Arrows", "Nudge surface or corner 1 px (Shift: 10 px)"],
                ["Ctrl + D", "Duplicate surface"],
                ["Ctrl + Z", "Undo"],
                ["Ctrl + Shift + Z", "Redo"],
                ["Ctrl + C / V", "Copy / paste shape and holes"],
                ["Ctrl + Shift + V", "Paste at the original position"],
                ["Ctrl + S", "Save project"],
                ["Delete", "Remove selected polygon corner or surface"],
              ].map(([key, label]) => (
                <p key={key}>
                  <span>{label}</span>
                  <kbd>{key}</kbd>
                </p>
              ))}
            </div>
          </div>
          <div className="notice">
            <Sun size={17} />
            <p>
              For the sharpest results, turn off the projector’s automatic
              keystone correction and fit each surface in Luma. Black areas
              project no added light; your projector’s own black level still
              applies.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
function RotateIcon() {
  return <RefreshCw size={13} />;
}
