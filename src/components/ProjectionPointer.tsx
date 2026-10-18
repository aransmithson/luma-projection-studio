import type { Point, RenderState } from "../types";

export function ProjectionPointer({
  state,
  point,
}: {
  state: RenderState;
  point: Point | null;
}) {
  if (
    !point ||
    state.blackout ||
    state.testPattern ||
    (!state.placementMesh && !state.alignment?.visible)
  )
    return null;
  const { width, height } = state.project,
    r = width / 100,
    gap = r * 0.4,
    lines = `M ${-r * 1.5} 0 H ${-gap} M ${gap} 0 H ${r * 1.5} M 0 ${-r * 1.5} V ${-gap} M 0 ${gap} V ${r * 1.5}`;
  return (
    <svg
      className="output-pointer"
      viewBox={`0 0 ${width} ${height}`}
      aria-label="Projected editor cursor"
    >
      <g transform={`translate(${point.x * width} ${point.y * height})`}>
        <circle r={r} className="pointer-shadow" />
        <path d={lines} className="pointer-shadow" />
        <circle r={r} />
        <path d={lines} />
        <circle r={width / 900} className="pointer-centre" />
      </g>
    </svg>
  );
}
