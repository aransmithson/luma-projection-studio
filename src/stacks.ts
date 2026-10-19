import { createSurface, MAX_SURFACES } from "./model";
import type {
  AnimationStack,
  ChaseEffectId,
  ChaseStack,
  LiquidStack,
  LiquidStyle,
  PortalCharacter,
  PortalStack,
  Project,
  StoryEffectId,
  StoryStack,
} from "./types";
import { layerFor, layersFor } from "./layers";
import { storyDefinition } from "./storyCatalog";

export function pruneStacks(project: Project): Project {
  const stacks = (project.stacks || [])
    .map((stack) => ({
      ...stack,
      surfaceIds: stack.surfaceIds.filter((id) =>
        project.surfaces.some(
          (s) =>
            s.id === id &&
            s.effectId ===
              (stack.kind === "chase" || stack.kind === "story"
                ? stack.effectId
                : stack.kind === "portal"
                  ? "portal-hopper"
                  : "stacked-liquid") &&
            !s.cutoutOf,
        ),
      ),
    }))
    .filter((stack) => stack.surfaceIds.length >= 2);
  return { ...project, stacks };
}
export function withStack(project: Project, stack: AnimationStack): Project {
  const members = new Set(stack.surfaceIds);
  const previous = project.stacks.find((s) => s.id === stack.id);
  if (
    project.surfaces.some(
      (s) =>
        (members.has(s.id) || previous?.surfaceIds.includes(s.id)) &&
        layerFor(project, s).locked,
    )
  )
    return project;
  return {
    ...project,
    surfaces: project.surfaces.map((s) =>
      members.has(s.id)
        ? {
            ...s,
            media: undefined,
            effectId:
              stack.kind === "chase" || stack.kind === "story"
                ? stack.effectId
                : stack.kind === "portal"
                  ? "portal-hopper"
                  : "stacked-liquid",
            color: stack.color,
            colorCycle: false,
            speed: 1,
            ...(stack.kind === "chase" ||
            stack.kind === "portal" ||
            stack.kind === "story"
              ? {
                  effectSide: stack.direction,
                  scale: stack.scale,
                  seed: stack.seed,
                }
              : {}),
          }
        : s,
    ),
    stacks: [...project.stacks.filter((s) => s.id !== stack.id), stack],
  };
}

export function createStoryStack(
  project: Project,
  layerId = layersFor(project)[0].id,
  effectId: StoryEffectId = "story-cosmic-courier",
): { project: Project; stack: StoryStack } | null {
  const created = createChaseStack(project, layerId);
  if (!created) return null;
  const definition = storyDefinition(effectId);
  const stack: StoryStack = {
    ...created.stack,
    kind: "story",
    effectId,
    name: `${definition.name} ${project.stacks.length + 1}`,
    duration: 24,
    color: definition.color,
  };
  const next = {
    ...created.project,
    surfaces: created.project.surfaces.map((s) => {
      const index = stack.surfaceIds.indexOf(s.id);
      return index < 0
        ? s
        : { ...s, name: `${definition.name} · Tile ${index + 1}` };
    }),
  };
  return { project: withStack(next, stack), stack };
}

export function createPortalStack(
  project: Project,
  layerId = layersFor(project)[0].id,
  character: PortalCharacter = "robot",
): { project: Project; stack: PortalStack } | null {
  const created = createChaseStack(project, layerId);
  if (!created) return null;
  const stack: PortalStack = {
    id: created.stack.id,
    kind: "portal",
    name: `Portal journey ${project.stacks.length + 1}`,
    surfaceIds: created.stack.surfaceIds,
    duration: 24,
    color: "#67e2ff",
    links: false,
    character,
    direction: "left",
    scale: 1,
    seed: created.stack.seed,
  };
  const next = {
    ...created.project,
    surfaces: created.project.surfaces.map((s, i) =>
      stack.surfaceIds.includes(s.id)
        ? {
            ...s,
            name: `Portal ${project.stacks.length + 1} · Tile ${i - project.surfaces.length + 1}`,
          }
        : s,
    ),
  };
  return { project: withStack(next, stack), stack };
}
export function createLiquidStack(
  project: Project,
  layerId = layersFor(project)[0].id,
  style: LiquidStyle = "water",
): { project: Project; stack: LiquidStack } | null {
  if (!layersFor(project).some((l) => l.id === layerId && !l.locked))
    return null;
  if (project.surfaces.length + 3 > MAX_SURFACES || project.stacks.length >= 8)
    return null;
  const stackId = crypto.randomUUID(),
    number = project.stacks.length + 1;
  const surfaces = Array.from({ length: 3 }, (_, i) => {
    const x = 0.35 + ((number - 1) % 3) * 0.035,
      y = 0.065 + i * 0.315;
    const surface = createSurface(
      "quad",
      project.surfaces.length + i + 1,
      [
        { x, y },
        { x: x + 0.3, y },
        { x: x + 0.3, y: y + 0.235 },
        { x, y: y + 0.235 },
      ],
      "stacked-liquid",
    );
    return {
      ...surface,
      ...(project.layers ? { layerId } : {}),
      name: `Flow ${number} · ${["Upper", "Middle", "Lower"][i]}`,
    };
  });
  const stack: LiquidStack = {
    id: stackId,
    name: `${style === "lava" ? "Molten lava" : style === "potion" ? "Glowing potion" : style === "ice" ? "Icy water" : "Liquid loop"} ${number}`,
    surfaceIds: surfaces.map((s) => s.id),
    duration: 18,
    color: {
      water: "#58d9e9",
      lava: "#ff762b",
      potion: "#a2ff72",
      ice: "#97dfff",
    }[style],
    links: true,
    ...(style === "water" ? {} : { style }),
  };
  return {
    project: withStack(
      { ...project, surfaces: [...project.surfaces, ...surfaces] },
      stack,
    ),
    stack,
  };
}

export function createChaseStack(
  project: Project,
  layerId = layersFor(project)[0].id,
  effectId: ChaseEffectId = "chase-cat-mouse",
): { project: Project; stack: ChaseStack } | null {
  if (
    !layersFor(project).some((l) => l.id === layerId && !l.locked) ||
    project.surfaces.length + 3 > MAX_SURFACES ||
    project.stacks.length >= 8
  )
    return null;
  const number = project.stacks.length + 1;
  const surfaces = Array.from({ length: 3 }, (_, i) => {
    const x = 0.055 + i * 0.315;
    return {
      ...createSurface(
        "quad",
        project.surfaces.length + i + 1,
        [
          { x, y: 0.32 },
          { x: x + 0.26, y: 0.32 },
          { x: x + 0.26, y: 0.74 },
          { x, y: 0.74 },
        ],
        effectId,
      ),
      name: `Chase ${number} · Stop ${i + 1}`,
      ...(project.layers ? { layerId } : {}),
    };
  });
  const stack: ChaseStack = {
    id: crypto.randomUUID(),
    kind: "chase",
    name: `Linked chase ${number}`,
    surfaceIds: surfaces.map((s) => s.id),
    duration: 12,
    color: surfaces[0].color,
    links: false,
    effectId,
    direction: "left",
    scale: 1,
    seed: surfaces[0].seed,
  };
  return {
    project: withStack(
      { ...project, surfaces: [...project.surfaces, ...surfaces] },
      stack,
    ),
    stack,
  };
}
