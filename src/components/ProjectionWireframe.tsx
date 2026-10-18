import { surfacePath } from "../curves";
import type { RenderState } from "../types";
import { effectiveSolo, surfaceIsVisible } from "../cutouts";
import { renderedProject } from "../layers";

export function ProjectionWireframe({ state }: { state: RenderState }) {
  if (
    (!state.alignment?.visible && !state.placementMesh) ||
    state.blackout ||
    state.testPattern
  )
    return null;
  const { width, height, surfaces } = renderedProject(state.project),
    selectedId = state.alignment?.selectedId,
    soloId = effectiveSolo(surfaces, state.soloSurfaceId);
  return (
    <svg
      className={`output-wireframe ${state.placementMesh ? "placement-wireframe" : ""}`}
      viewBox={`0 0 ${width} ${height}`}
      aria-label="Projected alignment wireframe"
    >
      {surfaces
        .filter(
          (s) =>
            surfaceIsVisible(s, surfaces) &&
            (!soloId || (s.cutoutOf || s.id) === soloId),
        )
        .map((surface) => (
          <g
            key={surface.id}
            className={`${surface.id === selectedId ? "selected" : ""} ${surface.cutoutOf ? "cutout-guide" : ""}`}
          >
            <path
              className="wire-shadow"
              d={surfacePath(surface, width, height)}
            />
            <path d={surfacePath(surface, width, height)} />
            {surface.id === selectedId &&
              surface.kind !== "ellipse" &&
              surface.points.map((point, index) => (
                <g key={index}>
                  <circle
                    cx={point.x * width}
                    cy={point.y * height}
                    r={width / 400}
                  />
                  <text
                    x={point.x * width + width / 160}
                    y={point.y * height - height / 100}
                    fontSize={width / 115}
                  >
                    {index + 1}
                  </text>
                </g>
              ))}
          </g>
        ))}
      {!!state.alignment?.draft.length && (
        <polyline
          className="wire-draft"
          points={state.alignment.draft
            .map((p) => `${p.x * width},${p.y * height}`)
            .join(" ")}
        />
      )}
    </svg>
  );
}
