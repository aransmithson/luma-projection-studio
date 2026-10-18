import { z } from "zod";
import { effects, effectById } from "./catalog";
import { makePoints } from "./geometry";
import { validSurfaceGeometry } from "./curves";
import { blendModes, overlayStyles, overlayPalettes } from "./compositing";
import { MAX_LAYERS } from "./layers";
import { chaseIds } from "./chaseConfig";
import type { BlendMode, ColorOverlay } from "./types";
import type { EffectId, Point, Project, ShapeKind, Surface } from "./types";

export const MAX_SURFACES = 32;
export function createSurface(
  kind: ShapeKind,
  index: number,
  points?: Point[],
  effectId: EffectId = "aurora",
): Surface {
  return {
    id: crypto.randomUUID(),
    name: `${kind === "quad" ? "Rectangle" : kind === "ellipse" ? "Ellipse" : kind === "triangle" ? "Triangle" : "Polygon"} ${index}`,
    kind,
    points: points || makePoints(kind),
    effectId,
    color: effectById[effectId].color,
    colorCycle: effectById[effectId].cycleByDefault ?? false,
    opacity: 1,
    speed: 1,
    scale: 1,
    feather: 0,
    visible: true,
    locked: false,
    blend: "normal",
    seed: Math.floor(Math.random() * 10000),
  };
}
export function createProject(
  template: "blank" | "winter" | "halloween" = "winter",
): Project {
  const project: Project = {
    version: 1,
    name:
      template === "blank"
        ? "Untitled mapping"
        : template === "winter"
          ? "A little winter magic"
          : "The haunted house",
    width: 1920,
    height: 1080,
    brightness: 1,
    surfaces: [],
    stacks: [],
  };
  if (template === "blank") {
    project.surfaces.push(createSurface("quad", 1));
    return project;
  }
  const winter = template === "winter";
  const add = (
    name: string,
    kind: ShapeKind,
    points: Point[],
    effect: EffectId,
  ) =>
    project.surfaces.push({
      ...createSurface(kind, project.surfaces.length + 1, points, effect),
      name,
    });
  add(
    "Main facade",
    "quad",
    [
      { x: 0.22, y: 0.38 },
      { x: 0.78, y: 0.38 },
      { x: 0.78, y: 0.85 },
      { x: 0.22, y: 0.85 },
    ],
    winter ? "snow" : "fog",
  );
  add(
    "Roofline",
    "triangle",
    [
      { x: 0.5, y: 0.1 },
      { x: 0.82, y: 0.38 },
      { x: 0.18, y: 0.38 },
    ],
    winter ? "aurora" : "embers",
  );
  add(
    "Left window",
    "quad",
    [
      { x: 0.28, y: 0.48 },
      { x: 0.4, y: 0.48 },
      { x: 0.4, y: 0.67 },
      { x: 0.28, y: 0.67 },
    ],
    winter ? "twinkle" : "eyes",
  );
  add(
    "Right window",
    "quad",
    [
      { x: 0.6, y: 0.48 },
      { x: 0.72, y: 0.48 },
      { x: 0.72, y: 0.67 },
      { x: 0.6, y: 0.67 },
    ],
    winter ? "twinkle" : "eyes",
  );
  add(
    "Doorway",
    "quad",
    [
      { x: 0.45, y: 0.53 },
      { x: 0.55, y: 0.53 },
      { x: 0.55, y: 0.85 },
      { x: 0.45, y: 0.85 },
    ],
    winter ? "candy" : "bats",
  );
  add(
    "Festive trim",
    "quad",
    [
      { x: 0.22, y: 0.38 },
      { x: 0.78, y: 0.38 },
      { x: 0.78, y: 0.45 },
      { x: 0.22, y: 0.45 },
    ],
    winter ? "lights" : "embers",
  );
  return project;
}
const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
const surfaceSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(80),
    kind: z.enum(["quad", "triangle", "ellipse", "polygon"]),
    points: z.array(pointSchema).min(3).max(64),
    effectId: z.enum(effects.map((e) => e.id) as [EffectId, ...EffectId[]]),
    curves: z
      .array(
        z.object({ control1: pointSchema, control2: pointSchema }).nullable(),
      )
      .max(64)
      .optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    opacity: z.number().min(0).max(1),
    speed: z.number().min(0).max(3),
    colorCycle: z.boolean().default(false),
    scale: z.number().min(0.25).max(3),
    feather: z.number().min(0).max(0.08),
    visible: z.boolean(),
    locked: z.boolean(),
    blend: z.enum(blendModes.map((b) => b.id) as [BlendMode, ...BlendMode[]]),
    colorOverlay: z
      .object({
        enabled: z.boolean(),
        style: z.enum(
          overlayStyles.map((s) => s.id) as [
            ColorOverlay["style"],
            ...ColorOverlay["style"][],
          ],
        ),
        palette: z.enum(
          overlayPalettes.map((p) => p.id) as [
            ColorOverlay["palette"],
            ...ColorOverlay["palette"][],
          ],
        ),
        blend: z.enum(
          blendModes.map((b) => b.id) as [BlendMode, ...BlendMode[]],
        ),
        intensity: z.number().min(0).max(1),
        speed: z.number().min(0).max(3),
        scale: z.number().min(0.25).max(4),
        reverse: z.boolean(),
      })
      .optional(),
    seed: z.number().int().min(0).max(100000),
    cutoutOf: z.string().min(1).max(100).optional(),
    effectSide: z.enum(["left", "right"]).optional(),
    layerId: z.string().min(1).max(100).optional(),
    contentTransform: z
      .object({
        rotation: z.number().min(-180).max(180),
        offsetX: z.number().min(-1).max(1),
        offsetY: z.number().min(-1).max(1),
      })
      .optional(),
  })
  .superRefine((surface, ctx) => {
    if (
      (surface.kind === "quad" && surface.points.length !== 4) ||
      (surface.kind === "triangle" && surface.points.length !== 3) ||
      !validSurfaceGeometry(surface)
    )
      ctx.addIssue({ code: "custom", message: "Surface geometry is invalid." });
  });
const stackBaseSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(80),
  surfaceIds: z.array(z.string()).min(2).max(8),
  duration: z.number().min(4).max(120),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  links: z.boolean(),
});
const stackSchema = z.union([
  stackBaseSchema.extend({
    kind: z.literal("liquid").optional(),
    style: z.enum(["water", "lava", "potion", "ice"]).optional(),
  }),
  stackBaseSchema.extend({
    kind: z.literal("chase"),
    effectId: z.enum(chaseIds),
    direction: z.enum(["left", "right"]),
    scale: z.number().min(0.45).max(1.55),
    seed: z.number().int().min(0).max(100000),
    links: z.literal(false),
  }),
  stackBaseSchema.extend({
    kind: z.literal("portal"),
    character: z.enum(["robot", "alien", "cat"]),
    direction: z.enum(["left", "right"]),
    scale: z.number().min(0.45).max(1.55),
    seed: z.number().int().min(0).max(100000),
    links: z.literal(false),
  }),
]);
const projectSchema = z
  .object({
    stacks: z.array(stackSchema).max(8).default([]),
    version: z.literal(1),
    name: z.string().min(1).max(100),
    width: z.number().int().min(320).max(7680),
    height: z.number().int().min(240).max(4320),
    brightness: z.number().min(0).max(1),
    audioSettings: z
      .object({
        gain: z.number().min(0.25).max(8),
        smoothing: z.number().min(0).max(0.95),
        noiseGate: z.number().min(0).max(0.05),
      })
      .optional(),
    surfaces: z.array(surfaceSchema).max(MAX_SURFACES),
    layers: z
      .array(
        z.object({
          id: z.string().min(1).max(100),
          name: z.string().trim().min(1).max(80),
          visible: z.boolean(),
          locked: z.boolean(),
        }),
      )
      .min(1)
      .max(MAX_LAYERS)
      .optional(),
  })
  .refine(
    (p) => new Set(p.surfaces.map((s) => s.id)).size === p.surfaces.length,
    "Duplicate surface IDs.",
  )
  .superRefine((p, ctx) => {
    if (p.layers && new Set(p.layers.map((l) => l.id)).size !== p.layers.length)
      ctx.addIssue({ code: "custom", message: "Duplicate layer IDs." });
    for (const surface of p.surfaces) {
      if (surface.layerId && !p.layers?.some((l) => l.id === surface.layerId))
        ctx.addIssue({
          code: "custom",
          message: "A shape must belong to an existing layer.",
        });
      const parent = p.surfaces.find((s) => s.id === surface.cutoutOf);
      if (
        parent &&
        surface.layerId &&
        surface.layerId !== (parent.layerId ?? p.layers?.[0].id)
      )
        ctx.addIssue({
          code: "custom",
          message: "A hole must belong to its parent's layer.",
        });
    }
    for (const surface of p.surfaces) {
      if (!surface.cutoutOf) continue;
      const parent = p.surfaces.find((s) => s.id === surface.cutoutOf);
      if (!parent || parent.id === surface.id || parent.cutoutOf)
        ctx.addIssue({
          code: "custom",
          message: "A cutout must belong to an existing, regular surface.",
        });
    }
    const members = p.stacks.flatMap((s) => s.surfaceIds);
    if (
      new Set(p.stacks.map((s) => s.id)).size !== p.stacks.length ||
      new Set(members).size !== members.length ||
      p.stacks.some((stack) =>
        stack.surfaceIds.some(
          (id) =>
            !p.surfaces.some(
              (s) =>
                s.id === id &&
                !s.cutoutOf &&
                s.effectId ===
                  (stack.kind === "chase"
                    ? stack.effectId
                    : stack.kind === "portal"
                      ? "portal-hopper"
                      : "stacked-liquid"),
            ),
        ),
      )
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Stack members must be unique, existing surfaces with the stack's effect.",
      });
  });
export function parseProject(data: string): Project {
  if (data.length > 2_000_000)
    throw new Error(
      "This project is too large. The maximum file size is 2 MB.",
    );
  const json: unknown = JSON.parse(data);
  const result = projectSchema.safeParse(json);
  if (!result.success)
    throw new Error(
      "This is not a valid Luma project. Check the file format and surface geometry.",
    );
  return result.data as Project;
}
// A half-edited title must never make the recovery file invalid.
export function serializeProject(project: Project) {
  return JSON.stringify(
    { ...project, name: project.name.trim() || "Untitled mapping" },
    null,
    2,
  );
}
export const AUTOSAVE_KEY = "luma-project-v1";
export const RECOVERY_KEY = "luma-recovery-v1";

export function readRecovery(
  storage: Pick<Storage, "getItem">,
): { project: Project; recovered: boolean } | null {
  for (const key of [AUTOSAVE_KEY, RECOVERY_KEY]) {
    try {
      const saved = storage.getItem(key);
      if (saved)
        return {
          project: parseProject(saved),
          recovered: key === RECOVERY_KEY,
        };
    } catch {
      /* Try the previous valid save. */
    }
  }
  return null;
}

export function persistProject(
  storage: Pick<Storage, "getItem" | "setItem">,
  project: Project,
) {
  const next = serializeProject(project);
  parseProject(next);
  const previous = storage.getItem(AUTOSAVE_KEY);
  if (previous && previous !== next) {
    let valid = false;
    try {
      parseProject(previous);
      valid = true;
    } catch {
      /* Preserve the existing valid backup. */
    }
    if (valid) storage.setItem(RECOVERY_KEY, previous);
  }
  storage.setItem(AUTOSAVE_KEY, next);
}
