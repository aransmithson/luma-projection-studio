import { describe, expect, it } from "vitest";
import { stackFlow } from "./stackFlow";
import { createLiquidStack, pruneStacks, withStack } from "./stacks";
import { createProject, parseProject, serializeProject } from "./model";
import { connectionPoints } from "./effects/stacked";
import { curtainOpening } from "./effects/halloween";
import { inverseQuadMap } from "./geometry";

describe("synchronised liquid stacks", () => {
  it("cannot apply or edit a linked loop through a locked shape", () => {
    const { project, stack } = createLiquidStack(createProject("blank"))!;
    const locked = {
      ...project,
      surfaces: project.surfaces.map((s) =>
        s.id === stack.surfaceIds[0] ? { ...s, locked: true } : s,
      ),
    };
    expect(withStack(locked, { ...stack, style: "lava" })).toBe(locked);
    const loose = { ...locked, stacks: [] };
    expect(withStack(loose, stack)).toBe(loose);
  });
  it("conserves liquid and transfers it only between adjacent members", () => {
    for (let count = 2; count <= 8; count++)
      for (let t = 0; t < 40; t += 0.17) {
        const flow = stackFlow(t, 18, count);
        expect(flow.levels.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
        expect(flow.to).toBe((flow.from + 1) % count);
        expect(flow.levels.filter((n) => n > 0).length).toBeLessThanOrEqual(2);
      }
  });
  it("loops continuously and repeats with exactly the same shared time", () => {
    for (const t of [0, 2, 6, 10, 14, 17.999])
      expect(stackFlow(t, 18, 3).levels).toEqual(
        stackFlow(t + 18, 18, 3).levels,
      );
    const before = stackFlow(18 - 0.00001, 18, 3),
      after = stackFlow(18 + 0.00001, 18, 3);
    before.levels.forEach((level, i) =>
      expect(level).toBeCloseTo(after.levels[i], 8),
    );
  });
  it("creates movable members, a return connection, and a portable project", () => {
    const { project, stack } = createLiquidStack(createProject("blank"))!;
    expect(stack.surfaceIds).toHaveLength(3);
    expect(project.surfaces).toHaveLength(4);
    expect(parseProject(serializeProject(project))).toEqual(project);
    for (let i = 0; i < 3; i++) {
      const path = connectionPoints(project, stack, i);
      expect(
        path.every(
          (p) =>
            Number.isFinite(p.x + p.y) &&
            p.x >= 0 &&
            p.x <= 1 &&
            p.y >= 0 &&
            p.y <= 1,
        ),
      ).toBe(true);
    }
    const returnPath = connectionPoints(project, stack, 2);
    expect(returnPath[0].y).toBeGreaterThan(returnPath.at(-1)!.y);
  });
  it("prunes deleted or reassigned members and rejects duplicate membership", () => {
    const { project, stack } = createLiquidStack(createProject("blank"))!;
    const edited = {
      ...project,
      surfaces: project.surfaces.filter((s) => s.id !== stack.surfaceIds[1]),
    };
    expect(pruneStacks(edited).stacks[0].surfaceIds).toHaveLength(2);
    const duplicate = withStack(project, { ...stack, id: "duplicate" });
    expect(() => parseProject(serializeProject(duplicate))).toThrow();
    const one = {
      ...project,
      surfaces: project.surfaces.filter(
        (s) => !stack.surfaceIds.slice(1).includes(s.id),
      ),
    };
    expect(pruneStacks(one).stacks).toHaveLength(0);
  });
  it("keeps streams attached to the texture ports on perspective-mapped surfaces", () => {
    const { project, stack } = createLiquidStack(createProject("blank"))!;
    const surface = project.surfaces.find((s) => s.id === stack.surfaceIds[0])!;
    surface.points = [
      { x: 0.31, y: 0.08 },
      { x: 0.7, y: 0.14 },
      { x: 0.6, y: 0.35 },
      { x: 0.34, y: 0.28 },
    ];
    const outlet = connectionPoints(project, stack, 0)[0],
      inlet = connectionPoints(project, stack, 2).at(-1)!;
    const m = inverseQuadMap(surface.points);
    for (const [point, v] of [
      [outlet, 1],
      [inlet, 0],
    ] as const) {
      const z = m[2] * point.x + m[5] * point.y + m[8];
      expect((m[0] * point.x + m[3] * point.y + m[6]) / z).toBeCloseTo(0.5, 6);
      expect((m[1] * point.x + m[4] * point.y + m[7]) / z).toBeCloseTo(v, 6);
    }
  });
});
describe("curtain reveal loop", () => {
  it("opens, holds the face, closes and loops smoothly", () => {
    expect(curtainOpening(0)).toBe(0);
    expect(curtainOpening(4)).toBeCloseTo(0.5);
    expect(curtainOpening(8)).toBe(1);
    expect(curtainOpening(12.5)).toBeCloseTo(0.5);
    expect(curtainOpening(15)).toBe(0);
    for (const t of [0, 3, 6, 9, 12, 15])
      expect(curtainOpening(t + 16)).toBe(curtainOpening(t));
  });
});
