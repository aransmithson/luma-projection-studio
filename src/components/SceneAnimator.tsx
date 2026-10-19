import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  Film,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type {
  LibraryMedia,
  MediaBinding,
  Playback,
  Point,
  Project,
  SceneJob,
  SceneReference,
} from "../types";
import {
  applySceneClip,
  editableProp,
  fitPhoto,
  photoSurface,
  photoUrl,
  sceneBinding,
} from "../scene";
import { surfacePath, validSurfaceGeometry } from "../curves";
import { probeMedia } from "../mediaPlayback";
import { playbackTime } from "../renderer";
import { ProjectionCanvas } from "./ProjectionCanvas";
import { MediaControls } from "./MediaControls";

type Props = {
  project: Project;
  update: (change: Project | ((project: Project) => Project)) => void;
  begin: () => void;
  finish: () => void;
  library: LibraryMedia[];
  photoOutput: boolean;
  setPhotoOutput: (show: boolean) => void;
  onClose: () => void;
  notify: (message: string) => void;
};
const freshPlayback = (): Playback => ({
  playing: true,
  offset: 0,
  startedAt: Date.now(),
});
const working = (j: SceneJob) => ["PENDING", "RUNNING"].includes(j.status);
const cornerNames = ["Top left", "Top right", "Bottom right", "Bottom left"];

function Coordinate({
  label,
  value,
  max,
  change,
}: {
  label: string;
  value: number;
  max: number;
  change: (value: number) => void;
}) {
  const [text, setText] = useState(String(Math.round(value)));
  useEffect(() => setText(String(Math.round(value))), [value]);
  const commit = () => {
    const n = Number(text);
    if (text.trim() && Number.isFinite(n))
      change(Math.max(0, Math.min(max, n)));
    setText(String(Math.round(value)));
  };
  return (
    <input
      aria-label={label}
      type="number"
      min={0}
      max={max}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

export function SceneAnimator({
  project,
  update,
  begin,
  finish,
  library,
  photoOutput,
  setPhotoOutput,
  onClose,
  notify,
}: Props) {
  const [step, setStep] = useState<"align" | "animate" | "review">("align");
  const [ids, setIds] = useState(() =>
    project.surfaces.filter((s) => editableProp(project, s)).map((s) => s.id),
  );
  const [candidate, setCandidate] = useState<MediaBinding | null>(null);
  const [fullScene, setFullScene] = useState(false);
  const [playback, setPlayback] = useState(freshPlayback);
  const [key, setKey] = useState("");
  const [configured, setConfigured] = useState(false);
  const [duration, setDuration] = useState(5);
  const [jobs, setJobs] = useState<SceneJob[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoRevision, setPhotoRevision] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const busyRef = useRef(false),
    mounted = useRef(true),
    current = useRef(project);
  current.current = project;
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<number | null>(null);
  const controls = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (controls.current) controls.current.scrollTop = 0;
  }, [step]);
  const scene = project.scene;
  const selected = project.surfaces.filter(
    (s) => ids.includes(s.id) && editableProp(project, s),
  );
  const selectedIds = selected.map((s) => s.id);
  const photoId = scene?.photo.id;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      finish();
    };
  }, [finish]);
  useEffect(() => {
    setPhotoLoaded(false);
    setCandidate(null);
    setAcknowledged(false);
  }, [photoId]);
  useEffect(
    () => window.luma?.onMediaChanged(() => setPhotoRevision((n) => n + 1)),
    [],
  );
  useEffect(() => {
    if (!window.luma) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const status = await window.luma!.sceneAiStatus();
        if (stopped) return;
        setConfigured(status.configured);
        setJobs(status.jobs);
        if (status.configured) {
          for (const job of status.jobs.filter(working)) {
            if (stopped) break;
            const next = await window.luma!.pollScene(job.id);
            if (!stopped)
              setJobs((items) =>
                items.map((item) => (item.id === next.id ? next : item)),
              );
          }
        }
      } catch {
        if (!stopped)
          setMessage(
            "Could not refresh generation history. Close and reopen Scene Animator to reconnect.",
          );
      } finally {
        if (!stopped) timer = setTimeout(() => void refresh(), 5000);
      }
    };
    void refresh();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  async function run(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      if (mounted.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "This action could not be completed.",
        );
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function changeScene(change: Partial<SceneReference>) {
    update((p) => (p.scene ? { ...p, scene: { ...p.scene, ...change } } : p));
  }
  function changePoints(points: Point[]) {
    if (!validSurfaceGeometry({ kind: "quad", points })) {
      setMessage("Keep the four corners in order, without crossing edges.");
      return;
    }
    setMessage("");
    changeScene({ points });
  }
  async function importPhoto(locate = false) {
    const expected = locate ? current.current.scene?.photo.id : undefined;
    await run(async () => {
      const result = await window.luma!.importScenePhoto(expected);
      if (result.error) throw Error(result.error);
      if (!mounted.current || result.canceled || !result.photo) return;
      const photo = result.photo;
      if (locate) {
        setPhotoRevision((n) => n + 1);
        setMessage("Original photo restored.");
        return;
      }
      const points = fitPhoto(
        photo,
        current.current.width,
        current.current.height,
      );
      if (!validSurfaceGeometry({ kind: "quad", points }))
        throw Error(
          "This photo is too narrow for the canvas. Use a photo with a less extreme aspect ratio.",
        );
      update((p) => ({
        ...p,
        scene: {
          photo,
          points,
          opacity: 0.65,
          visible: true,
          prompt: p.scene?.prompt ?? "",
        },
      }));
      setPhotoOutput(false);
      setStep("align");
      setCandidate(null);
    });
  }
  function choose(asset: LibraryMedia) {
    const reference = current.current.scene;
    if (!reference) return;
    setCandidate(sceneBinding(asset, reference.points));
    setPlayback(freshPlayback());
    setStep("review");
  }
  async function importClip() {
    await run(async () => {
      const result = await window.luma!.importMedia();
      if (result.error) throw Error(result.error);
      if (!result.asset || result.canceled) return;
      const asset = await window.luma!.completeMedia(
        await probeMedia(result.asset),
      );
      if (mounted.current && current.current.scene?.photo.id === photoId)
        choose(asset);
    });
  }
  async function previewJob(job: SceneJob) {
    await run(async () => {
      const asset = await window.luma!.completeMedia(
        await probeMedia(await window.luma!.loadSceneClip(job.id)),
      );
      if (mounted.current && current.current.scene?.photo.id === job.photoId)
        choose(asset);
    });
  }
  const binding = useMemo(
    () =>
      candidate && scene
        ? { ...candidate, sceneMapping: scene.points.map((p) => ({ ...p })) }
        : null,
    [candidate, scene],
  );
  const preview = useMemo(() => {
    if (!binding || !scene || step !== "review")
      return { ...project, brightness: 1 };
    if (fullScene)
      return {
        ...project,
        brightness: 1,
        stacks: [],
        layers: undefined,
        surfaces: [{ ...photoSurface(project)!, opacity: 1, media: binding }],
      };
    const applied = applySceneClip(project, selectedIds, binding);
    return {
      ...applied,
      stacks: [],
      surfaces: applied.surfaces.filter(
        (s) =>
          selectedIds.includes(s.id) ||
          (s.cutoutOf && selectedIds.includes(s.cutoutOf)),
      ),
    };
  }, [project, binding, step, fullScene, ids]);
  function endDrag() {
    if (drag.current !== null) {
      drag.current = null;
      finish();
    }
  }
  const showPhoto = step !== "review" || !binding;
  const recent = jobs.filter((j) => j.photoId === photoId || working(j));

  return (
    <div className="scene-editor">
      <div className="scene-steps" aria-label="Scene Animator steps">
        {(
          [
            ["align", "1", "Align photo"],
            ["animate", "2", "Create animation"],
            ["review", "3", "Preview & apply"],
          ] as const
        ).map(([id, n, label]) => (
          <button
            key={id}
            className={step === id ? "active" : ""}
            aria-pressed={step === id}
            onClick={() => setStep(id)}
            disabled={id !== "align" && !scene}
          >
            <span>{n}</span>
            {label}
          </button>
        ))}
      </div>
      <div className="scene-layout">
        <div className="scene-visual">
          <div className="scene-canvas-heading">
            <span>
              {showPhoto
                ? "REFERENCE ALIGNMENT"
                : fullScene
                  ? "FULL SCENE PREVIEW"
                  : "SELECTED PROPS PREVIEW"}
            </span>
            <span>
              {project.width} × {project.height}
            </span>
          </div>
          <div
            className="scene-preview"
            style={{
              aspectRatio: `${project.width}/${project.height}`,
              width: `min(calc(100% - 28px), calc(var(--scene-preview-height, 38vh) * ${project.width / project.height}), ${(420 * project.width) / project.height}px)`,
            }}
          >
            <ProjectionCanvas
              state={{
                project: preview,
                playback,
                blackout: false,
                testPattern: false,
                scenePhoto: showPhoto,
              }}
            />
            {!scene && (
              <div className="scene-empty">
                <Camera size={36} />
                <h3>Start with your scene</h3>
                <p>
                  Photograph your props from near the projector lens. Keep the
                  camera and props still.
                </p>
                <button
                  className="primary-button"
                  disabled={!window.luma || busy}
                  onClick={() => void importPhoto()}
                >
                  Choose JPG or PNG photo
                </button>
              </div>
            )}
            {scene && (
              <>
                <img
                  className="scene-load-check"
                  key={`${photoId}-${photoRevision}`}
                  src={photoUrl(scene.photo)}
                  alt=""
                  onLoad={() => setPhotoLoaded(true)}
                  onError={() => setPhotoLoaded(false)}
                />
                <svg
                  ref={svg}
                  viewBox={`0 0 ${project.width} ${project.height}`}
                  className={`scene-alignment ${step === "align" ? "editable" : ""}`}
                  aria-label="Photo alignment editor"
                  onPointerMove={(e) => {
                    if (
                      drag.current === null ||
                      !svg.current ||
                      !current.current.scene
                    )
                      return;
                    const box = svg.current.getBoundingClientRect();
                    const p = {
                      x: Math.max(
                        0,
                        Math.min(1, (e.clientX - box.left) / box.width),
                      ),
                      y: Math.max(
                        0,
                        Math.min(1, (e.clientY - box.top) / box.height),
                      ),
                    };
                    changePoints(
                      current.current.scene.points.map((point, i) =>
                        i === drag.current ? p : point,
                      ),
                    );
                  }}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onLostPointerCapture={endDrag}
                >
                  {project.surfaces
                    .filter((s) => !s.cutoutOf)
                    .map((s) => (
                      <path
                        key={s.id}
                        d={surfacePath(s, project.width, project.height)}
                        className={ids.includes(s.id) ? "selected" : ""}
                      />
                    ))}
                  {step === "align" && (
                    <>
                      <polygon
                        points={scene.points
                          .map(
                            (p) =>
                              `${p.x * project.width},${p.y * project.height}`,
                          )
                          .join(" ")}
                      />
                      {scene.points.map((p, i) => (
                        <g key={i}>
                          <circle
                            cx={p.x * project.width}
                            cy={p.y * project.height}
                            r={project.width / 65}
                            aria-label={`${cornerNames[i]} photo handle`}
                            onPointerDown={(e) => {
                              e.preventDefault();
                              begin();
                              drag.current = i;
                              svg.current?.setPointerCapture(e.pointerId);
                            }}
                          />
                          <text
                            x={p.x * project.width}
                            y={p.y * project.height}
                            dy="0.35em"
                            fontSize={project.width / 70}
                          >
                            {i + 1}
                          </text>
                        </g>
                      ))}
                    </>
                  )}
                </svg>
              </>
            )}
          </div>
          <p className="scene-caption">
            {step === "align"
              ? "Drag the numbered corners, or enter exact projector coordinates. Outline and name each prop in the main editor."
              : step === "animate"
                ? "One full scene travels across every selected prop. Your shapes and holes determine where light appears."
                : "Preview uses its own clock. Apply switches the selected props to the main shared playback clock."}
          </p>
          {step === "review" && binding && (
            <div className="scene-preview-tools">
              <button
                className="secondary-button"
                onClick={() =>
                  setPlayback((p) => ({
                    playing: !p.playing,
                    offset: playbackTime(p) * 1000,
                    startedAt: Date.now(),
                  }))
                }
              >
                {playback.playing ? <Pause size={14} /> : <Play size={14} />}{" "}
                {playback.playing ? "Pause preview" : "Play preview"}
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  setPlayback((p) => ({
                    ...p,
                    offset: 0,
                    startedAt: Date.now(),
                  }))
                }
              >
                <RotateCcw size={14} /> Restart preview
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={fullScene}
                  onChange={(e) => setFullScene(e.target.checked)}
                />{" "}
                Show full scene
              </label>
            </div>
          )}
          {scene && (
            <div className="scene-props">
              <div className="scene-props-heading">
                <strong>
                  Mapped props <span>{selected.length} selected</span>
                </strong>
                <button
                  className="text-button"
                  onClick={() =>
                    setIds(
                      project.surfaces
                        .filter((s) => editableProp(project, s))
                        .map((s) => s.id),
                    )
                  }
                >
                  Select all
                </button>
                <button className="text-button" onClick={onClose}>
                  Outline props in editor
                </button>
              </div>
              <div className="scene-prop-list">
                {project.surfaces
                  .filter((s) => !s.cutoutOf)
                  .map((s) => (
                    <label key={s.id} title={s.name}>
                      <input
                        type="checkbox"
                        disabled={!editableProp(project, s)}
                        checked={selectedIds.includes(s.id)}
                        onChange={(e) =>
                          setIds((list) =>
                            e.target.checked
                              ? [...list, s.id]
                              : list.filter((id) => id !== s.id),
                          )
                        }
                      />
                      <span>
                        {s.name}
                        {!editableProp(project, s)
                          ? " · locked"
                          : !s.visible
                            ? " · hidden"
                            : ""}
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          )}
        </div>
        <div className="scene-controls" ref={controls}>
          {step === "align" && (
            <>
              <h3>
                <Camera size={17} /> Reference photo
              </h3>
              <p>Photo alignment stays local. AI is optional.</p>
              <button
                className="secondary-button full-width"
                disabled={!window.luma || busy}
                onClick={() => void importPhoto()}
              >
                {scene ? "Replace reference photo" : "Import reference photo"}
              </button>
              {!window.luma && (
                <p>
                  Photo import and generation are available in the Windows
                  desktop app.
                </p>
              )}
              {scene && (
                <>
                  <p className="scene-photo-name">
                    {scene.photo.name}
                    <small>
                      {scene.photo.width} × {scene.photo.height}
                    </small>
                  </p>
                  {!photoLoaded && (
                    <div className="scene-notice">
                      Photo loading or missing.{" "}
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => void importPhoto(true)}
                      >
                        Locate original photo
                      </button>
                    </div>
                  )}
                  <label className="scene-range">
                    Photo opacity{" "}
                    <span>{Math.round(scene.opacity * 100)}%</span>
                    <input
                      aria-label="Photo opacity"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={scene.opacity}
                      style={{
                        background: `linear-gradient(to right, #ad8cdc ${scene.opacity * 100}%, #47384f ${scene.opacity * 100}%)`,
                      }}
                      onPointerDown={begin}
                      onPointerUp={finish}
                      onPointerCancel={finish}
                      onBlur={finish}
                      onChange={(e) =>
                        changeScene({ opacity: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="scene-check">
                    <input
                      type="checkbox"
                      checked={scene.visible}
                      onChange={(e) =>
                        changeScene({ visible: e.target.checked })
                      }
                    />{" "}
                    Show photo in main editor
                  </label>
                  <label className="scene-check">
                    <input
                      type="checkbox"
                      checked={photoOutput}
                      onChange={(e) => setPhotoOutput(e.target.checked)}
                    />{" "}
                    Show photo on projector
                  </label>
                  <div className="scene-coordinates">
                    <div>
                      <span>Corner</span>
                      <span>X px</span>
                      <span>Y px</span>
                    </div>
                    {scene.points.map((p, i) => (
                      <div key={i}>
                        <span>
                          {i + 1}. {cornerNames[i]}
                        </span>
                        {(["x", "y"] as const).map((axis) => (
                          <Coordinate
                            key={axis}
                            label={`${cornerNames[i]} photo ${axis.toUpperCase()}`}
                            value={
                              p[axis] *
                              (axis === "x" ? project.width : project.height)
                            }
                            max={axis === "x" ? project.width : project.height}
                            change={(n) =>
                              changePoints(
                                scene.points.map((point, j) =>
                                  j === i
                                    ? {
                                        ...point,
                                        [axis]:
                                          n /
                                          (axis === "x"
                                            ? project.width
                                            : project.height),
                                      }
                                    : point,
                                ),
                              )
                            }
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <button
                    className="text-button"
                    onClick={() =>
                      changePoints(
                        fitPhoto(scene.photo, project.width, project.height),
                      )
                    }
                  >
                    Reset photo to fit
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      update((p) => ({ ...p, scene: undefined }));
                      setPhotoOutput(false);
                    }}
                  >
                    Remove reference photo
                  </button>
                  <p className="scene-note">
                    Four corners correct perspective on a flat plane. Props at
                    different depths need individual shape refinement. Mesh and
                    blackout override the photo.
                  </p>
                </>
              )}
            </>
          )}
          {step === "animate" && scene && (
            <>
              <h3>
                <Sparkles size={17} /> Animate your scene
              </h3>
              <label className="scene-prompt">
                Describe the animation
                <textarea
                  aria-label="Scene animation prompt"
                  maxLength={800}
                  rows={4}
                  value={scene.prompt}
                  placeholder="Tiny ghosts peek from the pumpkins, then float across the boxes and return. Keep all props still."
                  onFocus={begin}
                  onBlur={finish}
                  onChange={(e) => changeScene({ prompt: e.target.value })}
                />
                <small>
                  {scene.prompt.length}/800 · fixed camera requested
                  automatically
                </small>
              </label>
              <label className="select-field">
                <span>Clip duration</span>
                <select
                  aria-label="Scene clip duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                </select>
              </label>
              <div className="scene-connection">
                <strong>Runway · Gen-4.5</strong>
                {configured ? (
                  <>
                    <span>
                      <Check size={13} /> Key added for this session
                    </span>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await window.luma!.setSceneAiKey("");
                          setConfigured(false);
                        })
                      }
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      aria-label="Runway API key"
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={512}
                      value={key}
                      placeholder="Paste your Runway API key"
                      onChange={(e) => setKey(e.target.value)}
                    />
                    <button
                      className="secondary-button"
                      disabled={!key.trim() || busy || !window.luma}
                      onClick={() =>
                        void run(async () => {
                          const value = key;
                          setKey("");
                          await window.luma!.setSceneAiKey(value);
                          setConfigured(true);
                        })
                      }
                    >
                      Use key for this session
                    </button>
                  </>
                )}
              </div>
              <label className="scene-consent">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <span>
                  Send the whole reference photo and prompt to Runway.
                  Generating uses credits from my Runway API account. Shape
                  masks are applied locally.
                </span>
              </label>
              <div className="scene-external-links">
                <button
                  className="text-button"
                  onClick={() => void window.luma?.openSceneLink("account")}
                >
                  Runway account
                </button>
                <button
                  className="text-button"
                  onClick={() => void window.luma?.openSceneLink("pricing")}
                >
                  Current API pricing
                </button>
              </div>
              <button
                className="primary-button full-width"
                disabled={
                  busy ||
                  !configured ||
                  !acknowledged ||
                  !photoLoaded ||
                  !scene.prompt.trim() ||
                  !selected.length
                }
                onClick={() =>
                  void run(async () => {
                    const job = await window.luma!.generateScene({
                      photo: scene.photo,
                      prompt: scene.prompt,
                      duration,
                    });
                    if (mounted.current)
                      setJobs((list) => [
                        job,
                        ...list.filter((j) => j.id !== job.id),
                      ]);
                  })
                }
              >
                <Sparkles size={15} />
                {busy ? "Working…" : "Generate variation"}
              </button>
              <p className="scene-note">
                Review geometry and the loop seam before applying. AI can move
                details despite the prompt. Closing this panel does not cancel
                submitted tasks.
              </p>
              {recent.length > 0 && (
                <div className="scene-jobs">
                  <h4>Variations & active tasks</h4>
                  {recent.map((job) => (
                    <div className="scene-job" key={job.id}>
                      <div>
                        <strong>
                          {job.status === "READY"
                            ? "Ready to preview"
                            : job.status === "PENDING"
                              ? "Queued"
                              : job.status === "RUNNING"
                                ? "Generating / downloading"
                                : job.status === "FAILED"
                                  ? "Generation failed"
                                  : "Canceled"}{" "}
                          · {job.duration}s
                        </strong>
                        <p>
                          {job.photoId !== photoId ? "Another photo: " : ""}
                          {job.prompt}
                        </p>
                        {job.error && (
                          <p className="scene-error">{job.error}</p>
                        )}
                      </div>
                      {job.status === "READY" ? (
                        <button
                          className="secondary-button"
                          disabled={busy}
                          onClick={() => void previewJob(job)}
                        >
                          Preview
                        </button>
                      ) : working(job) ? (
                        <button
                          className="text-button"
                          disabled={busy || !configured}
                          onClick={() =>
                            void run(async () => {
                              const next = await window.luma!.cancelScene(
                                job.id,
                              );
                              if (mounted.current)
                                setJobs((list) =>
                                  list.map((j) =>
                                    j.id === next.id ? next : j,
                                  ),
                                );
                            })
                          }
                        >
                          Cancel task
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {step === "review" && (
            <>
              <h3>
                <Film size={17} /> Preview & apply
              </h3>
              <label className="select-field">
                <span>Use an existing animation</span>
                <select
                  aria-label="Scene animation library"
                  value={candidate?.asset.id ?? ""}
                  onChange={(e) => {
                    const asset = library.find((a) => a.id === e.target.value);
                    if (asset) choose(asset);
                  }}
                >
                  <option value="">Choose an animation…</option>
                  {library.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondary-button full-width"
                disabled={!window.luma || busy || !scene}
                onClick={() => void importClip()}
              >
                Import MP4 or GIF for this scene
              </button>
              <p className="scene-note">
                Use a full-scene clip with the same framing as your reference
                photo. One image is shared across all selected props.
              </p>
              {binding && (
                <>
                  <p className="scene-photo-name">{binding.asset.name}</p>
                  <MediaControls
                    surface={{ ...photoSurface(project)!, media: binding }}
                    update={(change) => {
                      if (change.media) {
                        setCandidate(change.media);
                        setPlayback(freshPlayback());
                      }
                    }}
                    locate={() => void importClip()}
                    importing={busy}
                    sceneMode
                  />
                  <p className="scene-note">
                    Applying replaces the selected props’ effects and resets
                    their animation rotation, offset and speed. Their shapes,
                    holes, layers and blending stay in place.
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <div className="scene-footer">
        <div role="status" className={message ? "scene-error" : "scene-note"}>
          {message ||
            (busy
              ? "Working…"
              : step === "review"
                ? "The candidate animation stays in preview until you apply it."
                : step === "align"
                  ? "The reference photo is saved with your project. Projector visibility is a session control."
                  : "Your API key is kept in memory for this app session only.")}
        </div>
        {step === "align" ? (
          <button
            className="primary-button"
            disabled={!scene}
            onClick={() => setStep("animate")}
          >
            Next: create animation
          </button>
        ) : step === "animate" ? (
          <button
            className="secondary-button"
            onClick={() => setStep("review")}
          >
            Use imported animation
          </button>
        ) : (
          <button
            className="primary-button"
            disabled={!binding || !selected.length || busy}
            onClick={() => {
              if (!binding) return;
              update((p) =>
                applySceneClip(
                  {
                    ...p,
                    scene: p.scene ? { ...p.scene, visible: false } : undefined,
                  },
                  selectedIds,
                  binding,
                ),
              );
              setPhotoOutput(false);
              notify(
                `Scene animation applied to ${selected.length} prop${selected.length === 1 ? "" : "s"}. Use Restart to play from the beginning.`,
              );
              onClose();
            }}
          >
            Apply to {selected.length} prop{selected.length === 1 ? "" : "s"}
          </button>
        )}
      </div>
    </div>
  );
}
