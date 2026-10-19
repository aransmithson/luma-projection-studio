import { describe, expect, it } from "vitest";
import { chaseRoute } from "./chaseRoute";
import {
  createProject,
  createSurface,
  parseProject,
  serializeProject,
} from "./model";
import { createStoryStack, pruneStacks, withStack } from "./stacks";
import { storyIds } from "./storyCatalog";
import { storyCopies, storyMotion, storyVisit } from "./storyMotion";
import { addLayer, changeLayer } from "./layers";
import { copyShapeData, pastedShapes } from "./shapeClipboard";
import type { ChaseRoute } from "./chaseRoute";
import type { StoryStack } from "./types";

function routeOf(count: number): ChaseRoute {
  let width = 0;
  const segments = Array.from({ length: count }, (_, i) => {
    const segment = {
      id: `tile-${i}`,
      start: width,
      width: 170 + i * 51,
      height: 200 + i * 20,
    };
    width += segment.width;
    return segment;
  });
  return { width, segments, unit: 28, key: "test" };
}

describe("travelling linked stories", () => {
  it.each(["wide", "tall"])(
    "scales travellers proportionally from 45% to 155% on unequal %s tiles without changing the shared route or timing",
    (aspect) => {
      const created = createStoryStack(createProject("blank"))!;
      const project = {
        ...created.project,
        surfaces: created.project.surfaces.map((s, i) => ({
          ...s,
          points: s.points.map((p) => ({
            x: p.x * (aspect === "wide" ? 1 : 0.25) * (1 - i * 0.1),
            y: p.y * (aspect === "wide" ? 0.25 : 1) * (1 - i * 0.05),
          })),
        })),
      };
      const normal = chaseRoute(project, created.stack);
      for (const scale of [0.45, 0.8, 1, 1.15, 1.3, 1.55]) {
        const stack = { ...created.stack, scale };
        const scaled = withStack(project, stack);
        const route = chaseRoute(scaled, stack);
        expect(route.unit / normal.unit).toBeCloseTo(scale, 8);
        expect(route.segments).toEqual(normal.segments);
        expect(route.width).toBe(normal.width);
        expect(storyMotion(7.25, stack, route)).toEqual(
          storyMotion(7.25, created.stack, normal),
        );
        expect(
          scaled.surfaces
            .filter((s) => stack.surfaceIds.includes(s.id))
            .every((s) => s.scale === scale),
        ).toBe(true);
        expect(parseProject(serializeProject(scaled)).stacks[0]).toEqual(stack);
      }
    },
  );
  it.each(["left", "right"] as const)(
    "visits unequal tiles once, with continuous handoffs and a closed loop: %s",
    (direction) => {
      for (let count = 2; count <= 8; count++) {
        const route = routeOf(count),
          stack = { duration: 24, direction };
        for (let index = 0; index < count; index++) {
          const tile = route.segments[index];
          const arrival = (tile.start + tile.width * 0.52) / route.width;
          const t =
            (direction === "right" ? 1 - arrival : arrival) * stack.duration;
          const motion = storyMotion(t, stack, route);
          expect(motion.x).toBeCloseTo(tile.start + tile.width * 0.52, 4);
          expect(
            storyVisit(motion.phase, route, index, direction).glow,
          ).toBeCloseTo(1, 5);
          expect(storyMotion(t + 24, stack, route)).toEqual(motion);
          const edge = tile.start + tile.width;
          const x = edge % route.width;
          const here = storyCopies(x, route, index).find(
            (p) => Math.abs(p - tile.width) < 0.001,
          );
          const next = storyCopies(x, route, (index + 1) % count).find(
            (p) => Math.abs(p) < 0.001,
          );
          expect(here).toBeCloseTo(tile.width, 8);
          expect(next).toBeCloseTo(0, 8);
        }
        expect(storyMotion(24, stack, route)).toEqual(
          storyMotion(0, stack, route),
        );
        const before = storyMotion(24 - 1e-6, stack, route),
          after = storyMotion(1e-6, stack, route);
        const distance = Math.abs(before.x - after.x);
        expect(Math.min(distance, route.width - distance)).toBeLessThan(0.001);
        for (let i = 0; i < count; i++) {
          const a = storyVisit(before.phase, route, i, direction),
            b = storyVisit(after.phase, route, i, direction);
          expect(a.glow).toBeCloseTo(b.glow, 5);
          expect(a.bloom).toBeCloseTo(b.bloom, 5);
        }
      }
    },
  );
  it.each(storyIds)(
    "creates, saves, copies and prunes %s without changing the v1 format",
    (id) => {
      const p = addLayer(createProject("blank"), "stories");
      const { project, stack } = createStoryStack(p, "stories", id)!;
      expect(stack.surfaceIds).toHaveLength(3);
      expect(
        project.surfaces
          .slice(-3)
          .every((s) => s.layerId === "stories" && s.effectId === id),
      ).toBe(true);
      expect(parseProject(serializeProject(project))).toEqual(project);
      const copied = pastedShapes(
        copyShapeData(project, stack.surfaceIds[0]),
        0,
      );
      expect(copied[0].effectId).toBe(id);
      expect(copied[0].id).not.toBe(stack.surfaceIds[0]);
      const hidden = changeLayer(project, "stories", { visible: false });
      expect(chaseRoute(hidden, stack)).toEqual(chaseRoute(project, stack));
      const removed = {
        ...project,
        surfaces: project.surfaces.filter((s) => s.id !== stack.surfaceIds[1]),
      };
      expect(pruneStacks(removed).stacks[0].surfaceIds).toHaveLength(2);
      expect(
        pruneStacks({
          ...removed,
          surfaces: removed.surfaces.filter(
            (s) => s.id !== stack.surfaceIds[2],
          ),
        }).stacks,
      ).toHaveLength(0);
    },
  );
  it("keeps holes and content transforms while changing theme, direction and order", () => {
    const { project, stack } = createStoryStack(createProject("blank"))!;
    const parent = project.surfaces.find((s) => s.id === stack.surfaceIds[0])!;
    parent.contentTransform = { rotation: 27, offsetX: 0.12, offsetY: -0.08 };
    const hole = { ...createSurface("ellipse", 9), cutoutOf: parent.id };
    const next = withStack(
      { ...project, surfaces: [...project.surfaces, hole] },
      {
        ...stack,
        effectId: "story-reef-relay",
        direction: "right",
        surfaceIds: [...stack.surfaceIds].reverse(),
      } satisfies StoryStack,
    );
    expect(
      next.surfaces.find((s) => s.id === parent.id)?.contentTransform,
    ).toEqual(parent.contentTransform);
    expect(next.surfaces.at(-1)).toEqual(hole);
    expect(parseProject(serializeProject(next))).toEqual(next);
  });
  it("protects locked layers, membership and capacity", () => {
    const { project, stack } = createStoryStack(
      addLayer(createProject("blank"), "stories"),
      "stories",
    )!;
    const locked = changeLayer(project, "stories", { locked: true });
    expect(createStoryStack(locked, "stories")).toBeNull();
    expect(withStack(locked, { ...stack, duration: 10 })).toBe(locked);
    expect(
      createStoryStack({
        ...project,
        surfaces: Array.from({ length: 30 }, (_, i) =>
          createSurface("quad", i),
        ),
      }),
    ).toBeNull();
    for (const change of [
      { effectId: "aurora" },
      { direction: "up" },
      { surfaceIds: [stack.surfaceIds[0], stack.surfaceIds[0]] },
      { scale: 8 },
      { duration: 0 },
    ])
      expect(() =>
        parseProject(
          JSON.stringify({ ...project, stacks: [{ ...stack, ...change }] }),
        ),
      ).toThrow();
    const reassigned = {
      ...project,
      surfaces: project.surfaces.map((s) =>
        s.id === stack.surfaceIds[0]
          ? { ...s, effectId: "aurora" as const }
          : s,
      ),
    };
    expect(pruneStacks(reassigned).stacks[0].surfaceIds).toHaveLength(2);
  });
});
