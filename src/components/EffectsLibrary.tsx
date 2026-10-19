import {
  Check,
  ChevronDown,
  ChevronUp,
  Ghost,
  Pause,
  Play,
  Search,
  Snowflake,
  Sparkles,
  Star,
  Theater,
  X,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { effectCategories, effects } from "../catalog";
import type { EffectId, LibraryMedia, MediaAsset } from "../types";
import { MediaThumbnail } from "./MediaControls";
import { EffectPreview } from "./EffectPreview";

const categories = [
  "All effects",
  "Imported",
  ...effectCategories,
  "Favourites",
] as const;
type Props = {
  mediaLibrary: LibraryMedia[];
  selectedMediaId?: string;
  applyMedia: (asset: MediaAsset) => void;
  importMedia: () => void;
  importing: boolean;
  selectedEffect?: EffectId;
  selectedName?: string;
  hasSelection: boolean;
  apply: (effect: EffectId) => void;
  category: string;
  setCategory: (category: string) => void;
  expanded: boolean;
  toggleExpanded: () => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
  animate: boolean;
  toggleAnimate: () => void;
};

export function EffectsLibrary({
  mediaLibrary,
  selectedMediaId,
  applyMedia,
  importMedia,
  importing,
  selectedEffect,
  selectedName,
  hasSelection,
  apply,
  category,
  setCategory,
  expanded,
  toggleExpanded,
  collapsed,
  toggleCollapsed,
  animate,
  toggleAnimate,
}: Props) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    resultsRef.current?.scrollTo({ top: 0 });
  }, [category, search, sort]);
  const [hovered, setHovered] = useState<EffectId | null>(null);
  const [favourites, setFavourites] = useState<EffectId[]>(() => {
    try {
      const data: unknown = JSON.parse(
        localStorage.getItem("luma-favourites") || "[]",
      );
      return Array.isArray(data)
        ? data.filter((v): v is EffectId => effects.some((e) => e.id === v))
        : [];
    } catch {
      return [];
    }
  });
  const toggleFavourite = (id: EffectId) =>
    setFavourites((current) => {
      const next = current.includes(id)
        ? current.filter((v) => v !== id)
        : [...current, id];
      try {
        localStorage.setItem("luma-favourites", JSON.stringify(next));
      } catch {
        /* Still available for this session. */
      }
      return next;
    });
  const searchWords = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const visible = effects.filter(
    (effect) =>
      (category === "All effects" ||
        (category === "Favourites"
          ? favourites.includes(effect.id)
          : effect.category === category)) &&
      searchWords.every((word) =>
        `${effect.name} ${effect.description} ${effect.category} ${(effect.searchTerms || []).join(" ")}`
          .toLowerCase()
          .includes(word),
      ),
  );
  if (sort === "name") visible.sort((a, b) => a.name.localeCompare(b.name));
  const visibleMedia = mediaLibrary.filter(
    (asset) =>
      (category === "Imported" || category === "All effects") &&
      searchWords.every((word) =>
        `${asset.name} ${asset.format} imported animation`
          .toLowerCase()
          .includes(word),
      ),
  );
  const resultCount = visible.length + visibleMedia.length;
  const countFor = (name: string) =>
    name === "All effects"
      ? effects.length + mediaLibrary.length
      : name === "Imported"
        ? mediaLibrary.length
        : name === "Favourites"
          ? favourites.length
          : effects.filter((e) => e.category === name).length;

  return (
    <section
      className={`effects-library ${expanded ? "expanded" : ""} ${collapsed ? "collapsed" : ""}`}
      aria-label="Effects library"
    >
      <div className="library-heading">
        <div className="library-title">
          <Sparkles size={17} />
          <h2>Effects library</h2>
          <span className="count-badge">
            {effects.length + mediaLibrary.length}
          </span>
        </div>
        {hasSelection ? (
          <span className="effect-target">
            Apply to <strong>{selectedName}</strong>
          </span>
        ) : (
          <span className="effect-target">
            Select a surface to apply an effect
          </span>
        )}
        {!collapsed && (
          <>
            <button
              className="import-animation-button"
              onClick={importMedia}
              disabled={!window.luma || importing}
              title={
                window.luma
                  ? "Import MP4/H.264 video or animated GIF"
                  : "Open the desktop app to import animations"
              }
            >
              <Upload size={14} />
              {importing ? "Importing..." : "Import animation"}
            </button>
            <label className="search-field">
              <Search size={14} />
              <input
                aria-label="Search effects"
                placeholder="Search effects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  aria-label="Clear effect search"
                  onClick={() => setSearch("")}
                >
                  <X size={12} />
                </button>
              )}
            </label>
            <button
              className={`preview-motion-button ${animate ? "active" : ""}`}
              aria-label="Animate effect previews"
              aria-pressed={animate}
              title="Animate all previews. When off, hover a card to preview it."
              onClick={toggleAnimate}
            >
              {animate ? <Pause size={13} /> : <Play size={13} />}
              <span>Previews</span>
            </button>
            <button
              className="library-expand"
              onClick={toggleExpanded}
              aria-expanded={expanded}
              title="Expand or compact the effects browser"
            >
              {expanded ? "Compact view" : "View all"}{" "}
              <span>{expanded ? "↙" : "↗"}</span>
            </button>
          </>
        )}
        <button
          className="library-collapse"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? "Show effects library" : "Hide effects library"
          }
        >
          {collapsed ? (
            <>
              <Sparkles size={13} />
              <span>Browse effects</span>
              <ChevronUp size={14} />
            </>
          ) : (
            <ChevronDown size={16} />
          )}
        </button>
      </div>
      {!collapsed && (
        <div
          className="library-browser"
          onKeyDown={(event) => {
            if (
              [
                "ArrowDown",
                "ArrowUp",
                "ArrowLeft",
                "ArrowRight",
                "PageDown",
                "PageUp",
                "Home",
                "End",
              ].includes(event.key)
            )
              event.stopPropagation();
          }}
        >
          <div className="library-filters">
            <nav className="category-tabs" aria-label="Effect collections">
              {categories.map((name) => (
                <button
                  key={name}
                  aria-label={name}
                  aria-pressed={category === name}
                  className={`${category === name ? "active" : ""} ${name.toLowerCase()}`}
                  onClick={() => setCategory(name)}
                >
                  {name === "Halloween" && <Ghost size={13} />}
                  {name === "Christmas" && <Snowflake size={13} />}
                  {name === "Favourites" && <Star size={12} />}
                  {name === "Shadow puppets" && <Theater size={13} />}
                  <span className="category-name">{name}</span>
                  <span className="category-count">{countFor(name)}</span>
                </button>
              ))}
            </nav>
            <span className="apply-hint">
              {animate ? "Click to apply" : "Hover to preview · Click to apply"}
            </span>
          </div>
          <div className="library-results">
            <div className="library-results-heading">
              <span aria-live="polite">
                <strong>{category}</strong> · {resultCount}{" "}
                {resultCount === 1 ? "effect" : "effects"}
              </span>
              <span className="scroll-hint">Scroll to browse</span>
              <select
                aria-label="Sort effects"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="featured">Featured first</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
            <div
              className="effect-cards"
              ref={resultsRef}
              role="region"
              aria-label="Effect results"
              tabIndex={0}
            >
              {visibleMedia.map((asset) => (
                <div
                  key={asset.id}
                  className={`effect-card ${selectedMediaId === asset.id ? "applied" : ""}`}
                >
                  <button
                    className="effect-apply"
                    aria-label={`Apply ${asset.name}`}
                    disabled={!hasSelection}
                    onClick={() => applyMedia(asset)}
                    title={`${asset.name} · ${asset.width} × ${asset.height} · ${asset.duration.toFixed(2)}s`}
                  >
                    <div className="effect-thumbnail">
                      <MediaThumbnail asset={asset} />
                      <span className="effect-tag">
                        {asset.format.toUpperCase()} ·{" "}
                        {asset.duration.toFixed(1)}s
                      </span>
                      {selectedMediaId === asset.id && (
                        <span className="applied-badge">
                          <Check size={11} /> Applied
                        </span>
                      )}
                    </div>
                    <div className="effect-card-info">
                      <strong>{asset.name}</strong>
                      <span>
                        Imported · {asset.width} × {asset.height}
                      </span>
                    </div>
                  </button>
                </div>
              ))}
              {visible.map((effect) => (
                <div
                  key={effect.id}
                  className={`effect-card ${selectedEffect === effect.id ? "applied" : ""}`}
                  onMouseEnter={() => setHovered(effect.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(effect.id)}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget))
                      setHovered(null);
                  }}
                >
                  <button
                    className="effect-apply"
                    aria-label={`Apply ${effect.name}`}
                    title={effect.description}
                    disabled={!hasSelection}
                    onClick={() => apply(effect.id)}
                  >
                    <div className="effect-thumbnail">
                      <EffectPreview
                        effect={effect}
                        active={animate || hovered === effect.id}
                      />
                      <span
                        className={`effect-tag ${effect.category.toLowerCase()}`}
                      >
                        {effect.category === "Halloween" ? (
                          <Ghost size={10} />
                        ) : effect.category === "Christmas" ? (
                          <Snowflake size={10} />
                        ) : (
                          <Sparkles size={10} />
                        )}
                        {effect.tag}
                      </span>
                      {selectedEffect === effect.id && (
                        <span className="applied-badge">
                          <Check size={11} /> Applied
                        </span>
                      )}
                    </div>
                    <div className="effect-card-info">
                      <strong>{effect.name}</strong>
                      <span>{effect.category}</span>
                    </div>
                  </button>
                  <button
                    className={`favourite-button ${favourites.includes(effect.id) ? "is-favourite" : ""}`}
                    aria-label={`${favourites.includes(effect.id) ? "Unfavourite" : "Favourite"} ${effect.name}`}
                    onClick={() => toggleFavourite(effect.id)}
                  >
                    <Star
                      size={13}
                      fill={
                        favourites.includes(effect.id) ? "currentColor" : "none"
                      }
                    />
                  </button>
                </div>
              ))}
              {resultCount === 0 && (
                <div className="no-effects">
                  <Search size={22} />
                  <div>
                    <strong>
                      {category === "Imported" && !search
                        ? "Your animations, mapped to any shape"
                        : category === "Favourites" && !search
                          ? "Your favourite effects live here"
                          : "No effects found"}
                    </strong>
                    <p>
                      {category === "Imported" && !search
                        ? "Import MP4/H.264 video or animated GIF in the desktop app. Clips loop with the shared playback controls."
                        : category === "Favourites" && !search
                          ? "Use the star on any effect to save it here."
                          : `No matches${search ? ` for “${search}”` : ""} in ${category.toLowerCase()}.`}
                    </p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setSearch("");
                        setCategory("All effects");
                      }}
                    >
                      Browse all effects
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
