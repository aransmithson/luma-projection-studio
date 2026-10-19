import { bounds } from "./geometry";
import { surfaceOutline } from "./curves";
import { chaseRoles } from "./chaseConfig";
import { chasePhase, CHASE_LOOP } from "./effects/chaseMotion";
import { mod, random, TAU } from "./effects/common";
import type { ChaseStack, PortalStack, StoryStack, Project } from "./types";

export type ChaseRoute = {
  width: number;
  unit: number;
  key: string;
  segments: { id: string; start: number; width: number; height: number }[];
};
const cache = new WeakMap<Project, Map<string, ChaseRoute>>();
export function chaseRoute(
  project: Project,
  stack: ChaseStack | PortalStack | StoryStack,
): ChaseRoute {
  let routes = cache.get(project);
  if (!routes) {
    routes = new Map();
    cache.set(project, routes);
  }
  const cacheKey = JSON.stringify([
    stack.id,
    stack.kind,
    stack.surfaceIds,
    stack.scale,
  ]);
  const cached = routes.get(cacheKey);
  if (cached) return cached;
  let width = 0;
  const segments = stack.surfaceIds.flatMap((id) => {
    const surface = project.surfaces.find((s) => s.id === id);
    if (!surface) return [];
    const b = bounds(surfaceOutline(surface));
    const segment = {
      id,
      start: width,
      width: Math.max(1, b.width * project.width),
      height: Math.max(1, b.height * project.height),
    };
    width += segment.width;
    return [segment];
  });
  const height = Math.min(...segments.map((s) => s.height)),
    shortest = Math.min(...segments.map((s) => s.width));
  const unit =
    stack.kind === "story"
      ? Math.min(height * 0.245, shortest * 0.17) * stack.scale
      : Math.min(
          height * 0.245 * stack.scale,
          shortest * (stack.kind === "portal" ? 0.17 : 0.24) * stack.scale,
          height * 0.275,
          shortest * (stack.kind === "portal" ? 0.18 : 0.3),
        );
  const route = {
    width,
    unit,
    segments,
    key: JSON.stringify([segments, unit]),
  };
  routes.set(cacheKey, route);
  return route;
}

// One circular track, partitioned into shape windows. No extra offscreen gap
// exists at a handoff, including the last-to-first connection.
export function routeActors(
  time: number,
  stack: ChaseStack,
  route: ChaseRoute,
) {
  const phase = chasePhase((time / stack.duration) * CHASE_LOOP),
    pair = chaseRoles(stack.effectId, stack.direction);
  const lead = (phase + 0.35 + random(31, stack.seed) * 0.12) * route.width;
  const gap = route.width * (0.29 + 0.018 * Math.sin(phase * TAU));
  return {
    phase,
    actors: [
      { kind: pair.chaser, following: true, position: lead - gap },
      { kind: pair.leader, following: false, position: lead },
    ].map((actor) => ({
      ...actor,
      x: mod(
        stack.direction === "right"
          ? route.width - actor.position
          : actor.position,
        route.width,
      ),
    })),
  };
}
export function actorCopies(
  x: number,
  route: ChaseRoute,
  segment: ChaseRoute["segments"][number],
) {
  return [-route.width, 0, route.width]
    .map((lap) => x + lap - segment.start)
    .filter(
      (local) =>
        local + route.unit * 2.6 > 0 &&
        local - route.unit * 2.6 < segment.width,
    );
}
