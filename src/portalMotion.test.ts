import { describe, expect, it } from "vitest";
import { portalPositions, portalTimeline } from "./portalMotion";
import { createPortalStack, pruneStacks, withStack } from "./stacks";
import { createProject, parseProject, serializeProject } from "./model";
import { addLayer, changeLayer } from "./layers";
import { chaseRoute } from "./chaseRoute";

describe("linked portal journeys", () => {
  it.each(["left", "right"] as const)(
    "visits every tile and closes the circuit going %s",
    (direction) => {
      for (let count = 2; count <= 8; count++) {
        const visited = new Set<number>();
        for (let leg = 0; leg < count; leg++) {
          const time = (24 * (leg + 0.5)) / count;
          const now = portalTimeline(time, 24, count, direction);
          visited.add(now.from);
          expect(now.to).toBe(
            (now.from + (direction === "left" ? 1 : -1) + count) % count,
          );
          const next = portalTimeline(
            (24 * (leg + 1)) / count + 0.001,
            24,
            count,
            direction,
          );
          expect(now.to).toBe(next.from);
          expect(portalTimeline(time + 24, 24, count, direction)).toEqual(now);
        }
        expect(visited.size).toBe(count);
        expect(portalTimeline(24, 24, count, direction)).toEqual(
          portalTimeline(0, 24, count, direction),
        );
      }
    },
  );
  it("fires, opens, traverses, closes, then rests in that order", () => {
    const frame = (phase: number) => portalTimeline(phase * 8, 24, 3);
    expect(frame(0.1).shot).toBe(-1);
    expect(frame(0.17).shot).toBeGreaterThan(0);
    expect(frame(0.17).travel).toBe(0);
    expect(frame(0.36).opening).toBe(1);
    expect(frame(0.36).travel).toBe(0);
    expect(frame(0.5).travel).toBeGreaterThan(0);
    expect(frame(0.5).travel).toBeLessThan(1);
    expect(frame(0.74).travel).toBe(1);
    expect(frame(0.74).opening).toBe(1);
    expect(frame(0.95).opening).toBe(0);
    expect(frame(0.95).walking).toBe(0);
  });
  it("matches both halves at the portal plane across unequal tiles", () => {
    for (const [a, b] of [
      [800, 240],
      [240, 800],
      [300, 300],
    ]) {
      for (let travel = 0; travel <= 1; travel += 0.02) {
        const p = portalPositions(travel, a, b);
        expect(p.sourceX - p.entry).toBeCloseTo(p.destinationX - p.exit, 10);
      }
      expect(portalPositions(0, a, b).sourceX).toBeCloseTo(a * 0.42, 10);
      expect(portalPositions(1, a, b).destinationX).toBeCloseTo(b * 0.42, 10);
      const next = portalPositions(0, b, a);
      expect(portalPositions(1, a, b).destinationX).toBeCloseTo(
        next.sourceX,
        10,
      );
    }
  });
  it.each(["robot", "alien", "cat"] as const)(
    "creates a portable %s journey with a shared actor size",
    (character) => {
      const p = addLayer(createProject("blank"), "portal-layer");
      const { project, stack } = createPortalStack(
        p,
        "portal-layer",
        character,
      )!;
      expect(stack.kind).toBe("portal");
      expect(stack.surfaceIds).toHaveLength(3);
      expect(stack.character).toBe(character);
      expect(project.stacks).toHaveLength(1);
      expect(
        project.surfaces
          .slice(-3)
          .every(
            (s) =>
              s.layerId === "portal-layer" && s.effectId === "portal-hopper",
          ),
      ).toBe(true);
      expect(parseProject(serializeProject(project))).toEqual(project);
      const route = chaseRoute(project, stack);
      expect(route.segments).toHaveLength(3);
      expect(route.unit).toBeGreaterThan(0);
      const hidden = changeLayer(project, "portal-layer", { visible: false });
      expect(chaseRoute(hidden, stack).segments).toEqual(route.segments);
    },
  );
  it("retains independent content placement when changing shared story settings", () => {
    const { project, stack } = createPortalStack(createProject("blank"))!;
    project.surfaces[1].contentTransform = {
      rotation: 15,
      offsetX: 0.1,
      offsetY: -0.1,
    };
    const changed = withStack(project, {
      ...stack,
      character: "alien" as const,
      direction: "right" as const,
    });
    expect(changed.surfaces[1].contentTransform).toEqual(
      project.surfaces[1].contentTransform,
    );
    expect(changed.surfaces[1].effectSide).toBe("right");
    expect(parseProject(serializeProject(changed))).toEqual(changed);
  });
  it("protects locked layers and prunes deleted or reassigned tiles", () => {
    const p = addLayer(createProject("blank"), "portal-layer");
    const { project, stack } = createPortalStack(p, "portal-layer")!;
    const locked = changeLayer(project, "portal-layer", { locked: true });
    expect(createPortalStack(locked, "portal-layer")).toBeNull();
    expect(withStack(locked, { ...stack, duration: 12 })).toBe(locked);
    const removed = {
      ...project,
      surfaces: project.surfaces.filter((s) => s.id !== stack.surfaceIds[1]),
    };
    expect(pruneStacks(removed).stacks[0].surfaceIds).toHaveLength(2);
    removed.surfaces = removed.surfaces.map((s) =>
      s.id === stack.surfaceIds[0] ? { ...s, effectId: "grid" as const } : s,
    );
    expect(pruneStacks(removed).stacks).toHaveLength(0);
  });
});
