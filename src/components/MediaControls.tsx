import { Film } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { LibraryMedia, MediaBinding, Surface } from "../types";
import { mediaStatus, subscribeMedia } from "../mediaPlayback";

export function MediaThumbnail({ asset }: { asset?: LibraryMedia }) {
  return (
    <div className="media-thumbnail">
      {asset?.thumbnail ? (
        <img src={asset.thumbnail} alt="" />
      ) : (
        <Film size={26} />
      )}
    </div>
  );
}
function SecondsInput({
  label,
  value,
  max,
  min = 0,
  change,
}: {
  label: string;
  value: number;
  max: number;
  min?: number;
  change: (value: number) => void;
}) {
  const [text, setText] = useState(String(Number(value.toFixed(3))));
  useEffect(() => setText(String(Number(value.toFixed(3)))), [value]);
  const commit = () => {
    const number = Number(text);
    if (!text.trim() || !Number.isFinite(number)) {
      setText(String(Number(value.toFixed(3))));
      return;
    }
    const next = Math.min(max, Math.max(min, number));
    change(next);
    setText(String(Number(next.toFixed(3))));
  };
  return (
    <label className="media-number">
      <span>{label}</span>
      <span>
        <input
          aria-label={label}
          type="number"
          min={min}
          max={max}
          step="0.01"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commit();
              event.currentTarget.blur();
            }
          }}
        />
        <small>s</small>
      </span>
    </label>
  );
}
export function MediaControls({
  surface,
  update,
  locate,
  importing,
  sceneMode = false,
}: {
  surface: Surface;
  update: (change: Partial<Surface>) => void;
  locate: (id: string) => void;
  importing: boolean;
  sceneMode?: boolean;
}) {
  const media = surface.media!;
  const message = useSyncExternalStore(subscribeMedia, () =>
    mediaStatus(media.asset.id),
  );
  const change = (values: Partial<MediaBinding>) =>
    update({ media: { ...media, ...values } });
  const gap = Math.min(0.01, media.asset.duration / 2);
  const error = !message.startsWith("Ready") && !message.startsWith("Loading");
  return (
    <section className="inspector-section media-controls">
      <h3>Animation playback</h3>
      <p className="media-file-info">
        {media.asset.format.toUpperCase()} · {media.asset.width} ×{" "}
        {media.asset.height} · {media.asset.duration.toFixed(2)}s<br />
        {(media.asset.bytes / 1024 / 1024).toFixed(1)} MB ·{" "}
        {media.asset.format === "mp4"
          ? "Sound muted"
          : "GIF transparency preserved"}
      </p>
      <p role="status" className={`media-status ${error ? "error" : ""}`}>
        {message}
      </p>
      {media.sceneMapping ? (
        <p className="media-help">
          This clip shares its scene alignment across mapped props.
          {!sceneMode && (
            <button
              className="text-button"
              onClick={() => change({ sceneMapping: undefined, fit: "cover" })}
            >
              Fit clip to this shape instead
            </button>
          )}
        </p>
      ) : (
        <label className="select-field">
          <span>Fit inside shape</span>
          <select
            aria-label="Animation fit"
            value={media.fit}
            onChange={(event) =>
              change({ fit: event.target.value as MediaBinding["fit"] })
            }
          >
            <option value="cover">Fill (crop edges)</option>
            <option value="contain">Fit (show all)</option>
            <option value="stretch">Stretch to shape</option>
          </select>
        </label>
      )}
      <label className="media-loop">
        <input
          type="checkbox"
          checked={media.loop}
          onChange={(event) => change({ loop: event.target.checked })}
        />
        Loop animation
      </label>
      <SecondsInput
        label="Trim start"
        value={media.trimStart}
        max={media.trimEnd - gap}
        change={(trimStart) => change({ trimStart })}
      />
      <SecondsInput
        label="Trim end"
        value={media.trimEnd}
        min={media.trimStart + gap}
        max={media.asset.duration}
        change={(trimEnd) => change({ trimEnd })}
      />
      <SecondsInput
        label="Time offset"
        value={media.offset}
        max={86400}
        change={(offset) => change({ offset })}
      />
      <p className="media-help">
        {sceneMode
          ? "Preview playback is independent of the projector. "
          : "Pause and Restart control every shape. "}
        Matching clips with the same speed, trim and offset stay together. Turn
        Loop off to hold the final frame.
      </p>
      {!sceneMode && (
        <button
          className="secondary-button full-width"
          disabled={!window.luma || importing}
          onClick={() => locate(media.asset.id)}
        >
          Locate original
        </button>
      )}
      <p className="media-help">
        For moving a project, keep its .luma file and .luma.media folder
        together.
      </p>
    </section>
  );
}
