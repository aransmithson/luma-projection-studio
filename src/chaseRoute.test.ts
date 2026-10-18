import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { actorCopies, chaseRoute, routeActors } from "./chaseRoute";
import { chaseIds, chasePairs, chaseRoles } from "./chaseConfig";
import {
  createChaseStack,
  createLiquidStack,
  pruneStacks,
  withStack,
} from "./stacks";
import { createProject, parseProject, serializeProject } from "./model";
import { addLayer, changeLayer, layersFor, renderedProject } from "./layers";
import { mod, random } from "./effects/common";
import type { ChaseStack, Project } from "./types";

const fixture = () =>
  createChaseStack({ ...createProject("blank"), surfaces: [] })!;
const read = (project: Project) => parseProject(serializeProject(project));

describe("linked chase route", () => {
  it("partitions the whole circuit without gaps or repeated lanes", () => {
    const { project, stack } = fixture(),
      route = chaseRoute(project, stack);
    expect(route.segments).toHaveLength(3);
    expect(route.segments[0].start).toBe(0);
    for (let i = 1; i < route.segments.length; i++)
      expect(route.segments[i].start).toBe(
        route.segments[i - 1].start + route.segments[i - 1].width,
      );
    expect(route.width).toBe(
      route.segments.reduce((sum, s) => sum + s.width, 0),
    );
    const positions = routeActors(1, stack, route).actors;
    expect(positions).toHaveLength(2);
    expect(positions[0].x).not.toBe(positions[1].x);
  });

  for (const direction of ["left", "right"] as const) {
    it(`hands off at every boundary including the circular seam travelling ${direction}`, () => {
      const { project, stack: original } = fixture(),
        stack = { ...original, seed: 123, direction },
        route = chaseRoute(project, stack);
      for (let i = 0; i < route.segments.length; i++) {
        const previous = route.segments[i],
          next = route.segments[(i + 1) % route.segments.length];
        const boundary = previous.start + previous.width;
        const phase = mod(
          (direction === "right"
            ? 1 - boundary / route.width
            : boundary / route.width) -
            0.35 -
            random(31, stack.seed) * 0.12,
          1,
        );
        const time = phase * stack.duration,
          x = routeActors(time, stack, route).actors[1].x;
        expect(
          actorCopies(x, route, previous).some(
            (local) => Math.abs(local - previous.width) < 0.001,
          ),
        ).toBe(true);
        expect(
          actorCopies(x, route, next).some((local) => Math.abs(local) < 0.001),
        ).toBe(true);
        const before = routeActors(time - 0.001, stack, route).actors[1].x;
        const after = routeActors(time + 0.001, stack, route).actors[1].x;
        const delta = mod(
          direction === "right" ? before - after : after - before,
          route.width,
        );
        expect(delta).toBeCloseTo((route.width * 0.002) / stack.duration, 3);
      }
    });
  }

  for (const id of chaseIds) {
    it(`${id} swaps the pursuer and leader and preserves facing order`, () => {
      const { project, stack: initial } = fixture(),
        route = chaseRoute(project, initial);
      const forward = routeActors(
        2,
        { ...initial, effectId: id },
        route,
      ).actors;
      const backward = routeActors(
        2,
        { ...initial, effectId: id, direction: "right" },
        route,
      ).actors;
      expect(forward.map((a) => a.kind)).toEqual([
        chasePairs[id].chaser,
        chasePairs[id].leader,
      ]);
      expect(backward.map((a) => a.kind)).toEqual([
        chasePairs[id].leader,
        chasePairs[id].chaser,
      ]);
      expect(chaseRoles(id, "right").chaser).toBe(chaseRoles(id).leader);
      for (let i = 0; i < 2; i++)
        expect(backward[i].x).toBeCloseTo(
          mod(route.width - forward[i].x, route.width),
          8,
        );
      expect(mod(forward[1].x - forward[0].x, route.width)).toBeLessThan(
        route.width / 2,
      );
      expect(mod(backward[0].x - backward[1].x, route.width)).toBeLessThan(
        route.width / 2,
      );
    });
  }

  it("uses exactly the same poses after a complete shared loop, regardless of member speed", () => {
    const { project, stack } = fixture();
    project.surfaces.forEach((s, i) => {
      s.speed = i * 1.5;
      s.seed += i;
    });
    const route = chaseRoute(project, stack);
    for (const duration of [4, 12, 27, 120])
      for (const t of [0, 0.25, 2.8, 19.94]) {
        const settings = { ...stack, duration };
        expect(routeActors(t, settings, route)).toEqual(
          routeActors(t + duration, settings, route),
        );
      }
  });

  it("keeps physical actor size constant across unequal shapes and hidden layers", () => {
    const { project: base, stack } = fixture();
    const project = {
      ...base,
      surfaces: base.surfaces.map((s, i) => ({
        ...s,
        visible: i !== 1,
        points: s.points.map((p) => ({
          x: p.x * (0.5 + i * 0.2),
          y: p.y * (0.6 + i * 0.15),
        })),
      })),
    };
    const route = chaseRoute(project, stack);
    expect(new Set(route.segments.map((s) => s.width)).size).toBe(3);
    expect(new Set(route.segments.map((s) => s.height)).size).toBe(3);
    expect(route.unit).toBeGreaterThan(0);
    const layered = addLayer(project, "front"),
      id = layersFor(layered)[0].id;
    expect(
      chaseRoute(
        renderedProject(changeLayer(layered, id, { visible: false })),
        stack,
      ),
    ).toEqual(route);
  });

  it("invalidates all linked textures when any shape is resized, reordered or rescaled while paused", () => {
    const { project, stack } = fixture(),
      before = chaseRoute(project, stack);
    const resized = {
      ...project,
      surfaces: project.surfaces.map((s, i) =>
        i ? s : { ...s, points: s.points.map((p) => ({ ...p, x: p.x * 0.6 })) },
      ),
    };
    expect(chaseRoute(resized, stack).key).not.toBe(before.key);
    expect(
      chaseRoute(project, {
        ...stack,
        surfaceIds: [...stack.surfaceIds].reverse(),
      }).key,
    ).not.toBe(before.key);
    expect(chaseRoute(project, { ...stack, scale: 0.5 }).key).not.toBe(
      before.key,
    );
    expect(chaseRoute(project, stack)).toBe(before);
  });
});

describe("linked animation project lifecycle", () => {
  it("round trips every chase pair and synchronises member settings", () => {
    for (const effectId of chaseIds) {
      const { project, stack } = fixture();
      const changed: ChaseStack = {
        ...stack,
        effectId,
        direction: "right",
        duration: 27,
        scale: 0.8,
        color: "#abcdef",
      };
      const saved = withStack(project, changed);
      expect(read(saved)).toEqual(saved);
      for (const member of saved.surfaces)
        expect(member).toMatchObject({
          effectId,
          speed: 1,
          scale: 0.8,
          color: "#abcdef",
          effectSide: "right",
          seed: stack.seed,
        });
    }
  });
  it("prunes deleted and reassigned members, keeping two as the minimum", () => {
    const { project, stack } = fixture();
    const changed = {
      ...project,
      surfaces: project.surfaces.map((s, i) =>
        i ? s : { ...s, effectId: "aurora" as const },
      ),
    };
    expect(pruneStacks(changed).stacks[0].surfaceIds).toEqual(
      stack.surfaceIds.slice(1),
    );
    expect(
      pruneStacks({ ...changed, surfaces: changed.surfaces.slice(0, 2) })
        .stacks,
    ).toHaveLength(0);
    expect(() => read(changed)).toThrow();
    expect(() =>
      read(withStack(project, { ...stack, id: "duplicate" })),
    ).toThrow();
    expect(() =>
      read({
        ...project,
        stacks: [{ ...stack, surfaceIds: [stack.surfaceIds[0], "missing"] }],
      }),
    ).toThrow();
  });
  it("respects locked layers and capacity", () => {
    const { project, stack } = fixture(),
      layered = addLayer(project, "front"),
      locked = changeLayer(layered, layersFor(layered)[0].id, { locked: true });
    expect(withStack(locked, { ...stack, direction: "right" as const })).toBe(
      locked,
    );
    expect(createChaseStack(locked)).toBeNull();
    expect(
      createChaseStack({
        ...project,
        surfaces: Array.from({ length: 30 }, () => project.surfaces[0]),
      }),
    ).toBeNull();
    expect(
      createChaseStack({
        ...project,
        stacks: Array.from({ length: 8 }, () => stack),
      }),
    ).toBeNull();
  });
  it("rejects invalid shared settings instead of silently treating a chase as liquid", () => {
    const { project, stack } = fixture();
    for (const patch of [
      { kind: "unknown" },
      { direction: "up" },
      { effectId: "aurora" },
      { links: true },
      { scale: 0 },
      { seed: -1 },
      { duration: 0 },
    ])
      expect(() =>
        parseProject(
          JSON.stringify({ ...project, stacks: [{ ...stack, ...patch }] }),
        ),
      ).toThrow();
  });
  it("preserves the original liquid format and all three new styles", () => {
    const original = createLiquidStack(createProject("blank"))!;
    expect(original.stack).not.toHaveProperty("kind");
    expect(original.stack).not.toHaveProperty("style");
    expect(read(original.project)).toEqual(original.project);
    for (const style of ["lava", "potion", "ice"] as const) {
      const { project, stack } = createLiquidStack(
        createProject("blank"),
        undefined,
        style,
      )!;
      expect(stack.style).toBe(style);
      expect(read(project)).toEqual(project);
      expect(stack.surfaceIds).toHaveLength(3);
    }
  });
  for (const name of [
    "Linked-chase",
    "Lava-cascade",
    "Potion-cascade",
    "Ice-cascade",
  ]) {
    it(`opens the shipped ${name} example with three linked shapes`, () => {
      const project = parseProject(
        readFileSync(
          new URL(`../examples/${name}.luma`, import.meta.url),
          "utf8",
        ),
      );
      expect(project.surfaces).toHaveLength(3);
      expect(project.stacks).toHaveLength(1);
      expect(project.stacks[0].surfaceIds).toHaveLength(3);
      expect(read(project)).toEqual(project);
    });
  }
});
