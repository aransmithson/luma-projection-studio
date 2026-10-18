import { cutoutsFor, duplicateSurfaceGroup } from "./cutouts";
import { MAX_SURFACES, parseProject, serializeProject } from "./model";
import type { Project, Surface } from "./types";

const PREFIX = "LUMA_SHAPES_V1\n";

export function copyShapeData(project: Project, id: string): string {
  const source = project.surfaces.find((s) => s.id === id);
  if (!source) throw new Error("Select a shape to copy.");
  const surfaces = [source, ...cutoutsFor(project.surfaces, id)].map(
    (s, i) => ({
      ...s,
      cutoutOf: i ? id : undefined,
      layerId: undefined,
    }),
  );
  return (
    PREFIX +
    serializeProject({
      version: 1,
      name: "Copied shapes",
      width: project.width,
      height: project.height,
      brightness: 1,
      surfaces,
      stacks: [],
    })
  );
}

export function pastedShapes(
  data: string,
  count: number,
  offset = 0.02,
): Surface[] {
  if (!data.startsWith(PREFIX))
    throw new Error("Copy a Luma shape before pasting.");
  let snapshot: Project;
  try {
    snapshot = parseProject(data.slice(PREFIX.length));
  } catch {
    throw new Error("The clipboard does not contain valid Luma shapes.");
  }
  const [root, ...holes] = snapshot.surfaces;
  if (
    !root ||
    root.cutoutOf ||
    snapshot.stacks.length ||
    holes.some((s) => s.cutoutOf !== root.id)
  )
    throw new Error("The clipboard does not contain a shape and its holes.");
  if (count + snapshot.surfaces.length > MAX_SURFACES)
    throw new Error(
      `A project supports up to ${MAX_SURFACES} shapes, including holes. Nothing was pasted.`,
    );
  return duplicateSurfaceGroup(snapshot.surfaces, root.id, offset).map((s) => ({
    ...s,
    layerId: undefined,
  }));
}
