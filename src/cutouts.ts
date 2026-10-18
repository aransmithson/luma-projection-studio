import { bounds, contains, translate } from "./geometry";
import {
  surfaceOutline,
  transformCurves,
  validSurfaceGeometry,
} from "./curves";
import type { Point, Project, Surface } from "./types";
import { renderedProject } from "./layers";

export const cutoutsFor = (surfaces: Surface[], parentId: string) =>
  surfaces.filter((s) => s.cutoutOf === parentId);
export function effectiveSolo(surfaces: Surface[], id?: string | null) {
  const surface = surfaces.find((s) => s.id === id);
  return surface && surfaceIsVisible(surface, surfaces)
    ? surface.cutoutOf || surface.id
    : null;
}
export function surfaceIsVisible(surface: Surface, surfaces: Surface[]) {
  return (
    surface.visible &&
    (!surface.cutoutOf ||
      !!surfaces.find((s) => s.id === surface.cutoutOf)?.visible)
  );
}
export function canSubtract(
  surfaces: Surface[],
  parentId: string,
  cutterId: string,
) {
  const parent = surfaces.find((s) => s.id === parentId),
    cutter = surfaces.find((s) => s.id === cutterId);
  return !!(
    parent &&
    cutter &&
    parent !== cutter &&
    !parent.cutoutOf &&
    !cutter.cutoutOf &&
    !parent.locked &&
    !cutter.locked &&
    !cutoutsFor(surfaces, cutterId).length
  );
}
export function subtractSurface(
  project: Project,
  parentId: string,
  cutterId: string,
): Project {
  if (!canSubtract(renderedProject(project).surfaces, parentId, cutterId))
    return project;
  const parent = project.surfaces.find((s) => s.id === parentId)!;
  return {
    ...project,
    surfaces: project.surfaces.map((s) =>
      s.id === cutterId
        ? { ...s, cutoutOf: parentId, layerId: parent.layerId }
        : s,
    ),
    stacks: project.stacks
      .map((stack) => ({
        ...stack,
        surfaceIds: stack.surfaceIds.filter((id) => id !== cutterId),
      }))
      .filter((stack) => stack.surfaceIds.length >= 2),
  };
}

// Whole-surface moves, resizes and rotations carry their cutouts with them.
// Individual corner edits keep each cutout independently aligned to the real object.
function affineMap(
  before: Point[],
  after: Point[],
): ((p: Point) => Point) | null {
  if (before.length !== after.length) return null;
  const a = before[0],
    b = after[0];
  for (let i = 1; i < before.length - 1; i++) {
    const u = { x: before[i].x - a.x, y: before[i].y - a.y },
      v = { x: before[i + 1].x - a.x, y: before[i + 1].y - a.y };
    const det = u.x * v.y - u.y * v.x;
    if (Math.abs(det) < 1e-8) continue;
    const map = (p: Point) => {
      const x = p.x - a.x,
        y = p.y - a.y,
        s = (x * v.y - y * v.x) / det,
        t = (u.x * y - u.y * x) / det;
      return {
        x: b.x + s * (after[i].x - b.x) + t * (after[i + 1].x - b.x),
        y: b.y + s * (after[i].y - b.y) + t * (after[i + 1].y - b.y),
      };
    };
    return before.every(
      (p, j) => Math.hypot(map(p).x - after[j].x, map(p).y - after[j].y) < 1e-7,
    )
      ? map
      : null;
  }
  return null;
}
function mapSurface(surface: Surface, map: (p: Point) => Point): Surface {
  return {
    ...surface,
    points: surface.points.map(map),
    curves: surface.curves?.map((edge) =>
      edge
        ? { control1: map(edge.control1), control2: map(edge.control2) }
        : null,
    ),
  };
}
export function changeSurface(
  surfaces: Surface[],
  id: string,
  change: Partial<Surface>,
): Surface[] {
  const before = surfaces.find((s) => s.id === id);
  if (!before) return surfaces;
  const after = { ...before, ...change };
  if (change.points && !("curves" in change))
    after.curves = transformCurves(before.points, change.points, before.curves);
  if (!validSurfaceGeometry(after)) return surfaces;
  const map = change.points ? affineMap(before.points, after.points) : null;
  const result = surfaces.map((s) =>
    s.id === id ? after : map && s.cutoutOf === id ? mapSurface(s, map) : s,
  );
  return result.every(validSurfaceGeometry) ? result : surfaces;
}
export function duplicateSurfaceGroup(
  surfaces: Surface[],
  selectedId: string,
  offset = 0.02,
): Surface[] {
  const selected = surfaces.find((s) => s.id === selectedId);
  if (!selected) return [];
  const members = [selected, ...cutoutsFor(surfaces, selected.id)];
  const parentId = crypto.randomUUID();
  const allPoints = members.flatMap((s) => [
    ...s.points,
    ...(s.curves?.flatMap((c) => (c ? [c.control1, c.control2] : [])) || []),
  ]);
  const shifted = translate(allPoints, offset, offset);
  const dx = shifted[0].x - allPoints[0].x,
    dy = shifted[0].y - allPoints[0].y;
  return members.map((s, i) => ({
    ...mapSurface(s, (p) => ({ x: p.x + dx, y: p.y + dy })),
    id: i ? crypto.randomUUID() : parentId,
    cutoutOf: i ? parentId : selected.cutoutOf,
    name: `${s.name.slice(0, 74)} copy`,
    locked: false,
  }));
}
export function defaultHole(
  parent: Surface,
  kind: "quad" | "ellipse",
): Point[] {
  const b = bounds(parent.points),
    outline = surfaceOutline(parent);
  const centers = [
    { x: b.x + b.width / 2, y: b.y + b.height / 2 },
    ...Array.from({ length: 25 }, (_, i) => ({
      x: b.x + (b.width * ((i % 5) + 0.5)) / 5,
      y: b.y + (b.height * (Math.floor(i / 5) + 0.5)) / 5,
    })),
  ];
  let fallback: Point[] = [];
  for (let attempt = 0; attempt < 7; attempt++)
    for (const center of centers) {
      const rx = b.width * 0.18 * 0.72 ** attempt,
        ry = b.height * 0.22 * 0.72 ** attempt,
        cx = center.x,
        cy = center.y;
      const points =
        kind === "ellipse"
          ? Array.from({ length: 48 }, (_, i) => ({
              x: cx + rx * Math.cos((i * Math.PI) / 24),
              y: cy + ry * Math.sin((i * Math.PI) / 24),
            }))
          : [
              { x: cx - rx, y: cy - ry },
              { x: cx + rx, y: cy - ry },
              { x: cx + rx, y: cy + ry },
              { x: cx - rx, y: cy + ry },
            ];
      if (!fallback.length) fallback = points;
      const samples = points.flatMap((a, i) =>
        Array.from({ length: 4 }, (_, j) => ({
          x: a.x + ((points[(i + 1) % points.length].x - a.x) * j) / 4,
          y: a.y + ((points[(i + 1) % points.length].y - a.y) * j) / 4,
        })),
      );
      if (samples.every((p) => contains(outline, p))) return points;
    }
  return fallback;
}
