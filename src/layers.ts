import type { Layer, LiquidStack, Project, Surface } from "./types";

export const MAX_LAYERS = 16;
const baseLayer: Layer = {
  id: "base-layer",
  name: "Layer 1",
  visible: true,
  locked: false,
};
export const layersFor = (project: Project): Layer[] =>
  project.layers ?? [baseLayer];
export function layerIdFor(project: Project, surface: Surface): string {
  const parent =
    surface.cutoutOf && project.surfaces.find((s) => s.id === surface.cutoutOf);
  return (parent || surface).layerId ?? layersFor(project)[0].id;
}
export const layerFor = (project: Project, surface: Surface) =>
  layersFor(project).find(
    (layer) => layer.id === layerIdFor(project, surface),
  )!;

// Show holes with their parent, regardless of their position in the paint order.
export function layerRows(project: Project, id: string): Surface[] {
  const members = project.surfaces.filter((s) => layerIdFor(project, s) === id);
  return members
    .filter((s) => !s.cutoutOf)
    .reverse()
    .flatMap((parent) => [
      parent,
      ...members.filter((s) => s.cutoutOf === parent.id),
    ]);
}

export type ProjectionItem = { surface: Surface } | { stack: LiquidStack };
const itemCache = new WeakMap<Project, ProjectionItem[]>();
export function projectionItems(project: Project): ProjectionItem[] {
  const ordered = renderedProject(project);
  const cached = itemCache.get(ordered);
  if (cached) return cached;
  const linksAfter = new Map<string, LiquidStack[]>();
  for (const stack of ordered.stacks) {
    if (stack.kind === "chase" || stack.kind === "portal" || !stack.links)
      continue;
    const last = [...ordered.surfaces]
      .reverse()
      .find((s) => stack.surfaceIds.includes(s.id));
    if (last)
      linksAfter.set(last.id, [...(linksAfter.get(last.id) ?? []), stack]);
  }
  const items = ordered.surfaces.flatMap<ProjectionItem>((surface) => [
    { surface },
    ...(linksAfter.get(surface.id) ?? []).map((stack) => ({ stack })),
  ]);
  itemCache.set(ordered, items);
  return items;
}

// Materialize the implicit legacy layer only on a layer edit. Old files keep their format.
function materialize(project: Project): Project {
  return {
    ...project,
    layers: layersFor(project),
    surfaces: project.surfaces.map((s) => ({
      ...s,
      layerId: layerIdFor(project, s),
    })),
  };
}
export function addLayer(project: Project, id: string): Project {
  const next = materialize(project);
  if (next.layers!.length >= MAX_LAYERS) return project;
  let n = 1;
  while (next.layers!.some((l) => l.name === `Layer ${n}`)) n++;
  return {
    ...next,
    layers: [
      ...next.layers!,
      { id, name: `Layer ${n}`, visible: true, locked: false },
    ],
  };
}
export function changeLayer(
  project: Project,
  id: string,
  change: Partial<Omit<Layer, "id">>,
): Project {
  const next = materialize(project);
  return {
    ...next,
    layers: next.layers!.map((l) => (l.id === id ? { ...l, ...change } : l)),
  };
}
export function reorderLayer(
  project: Project,
  id: string,
  direction: number,
): Project {
  const next = materialize(project),
    layers = [...next.layers!],
    index = layers.findIndex((l) => l.id === id),
    target = index + direction;
  if (
    index < 0 ||
    target < 0 ||
    target >= layers.length ||
    layers[index].locked ||
    layers[target].locked
  )
    return project;
  [layers[index], layers[target]] = [layers[target], layers[index]];
  return { ...next, layers };
}
export function removeLayer(project: Project, id: string): Project {
  if (
    layersFor(project).length <= 1 ||
    layersFor(project).find((l) => l.id === id)?.locked ||
    project.surfaces.some((s) => layerIdFor(project, s) === id)
  )
    return project;
  const next = materialize(project);
  return { ...next, layers: next.layers!.filter((l) => l.id !== id) };
}
export function moveToLayer(
  project: Project,
  id: string,
  destination: string,
): Project {
  const surface = project.surfaces.find((s) => s.id === id),
    target = layersFor(project).find((l) => l.id === destination);
  if (!surface || !target || target.locked || layerFor(project, surface).locked)
    return project;
  const rootId = surface.cutoutOf || id;
  const members = project.surfaces.filter(
    (s) => s.id === rootId || s.cutoutOf === rootId,
  );
  if (members.some((s) => s.locked)) return project;
  const next = materialize(project);
  return {
    ...next,
    surfaces: [
      ...next.surfaces.filter((s) => s.id !== rootId && s.cutoutOf !== rootId),
      ...members.map((s) => ({ ...s, layerId: destination })),
    ],
  };
}
export function reorderSurface(
  project: Project,
  id: string,
  direction: number,
): Project {
  const source = project.surfaces.find((s) => s.id === id);
  if (
    !source ||
    source.cutoutOf ||
    source.locked ||
    layerFor(project, source).locked
  )
    return project;
  const peers = project.surfaces.filter(
    (s) =>
      !s.cutoutOf && layerIdFor(project, s) === layerIdFor(project, source),
  );
  const target = peers[peers.indexOf(source) + direction];
  if (!target || target.locked) return project;
  const surfaces = [...project.surfaces],
    a = surfaces.indexOf(source),
    b = surfaces.indexOf(target);
  [surfaces[a], surfaces[b]] = [surfaces[b], surfaces[a]];
  return { ...project, surfaces };
}

const renderCache = new WeakMap<Project, Project>();
export function renderedProject(project: Project): Project {
  if (!project.layers) return project;
  const cached = renderCache.get(project);
  if (cached) return cached;
  const surfaces = layersFor(project).flatMap((layer) =>
    project.surfaces
      .filter((s) => layerIdFor(project, s) === layer.id)
      .map((s) => ({
        ...s,
        visible: s.visible && layer.visible,
        locked: s.locked || layer.locked,
      })),
  );
  const result = { ...project, surfaces };
  renderCache.set(project, result);
  renderCache.set(result, result);
  return result;
}
