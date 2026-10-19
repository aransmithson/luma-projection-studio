import { describe, expect, it } from "vitest";
import { imaginationEffects } from "../imaginationCatalog";
import { effects } from "../catalog";
import {
  createProject,
  createSurface,
  parseProject,
  serializeProject,
} from "../model";
import {
  bubbleLife,
  imaginationPhase,
  IMAGINATION_LOOP,
  rubberMotion,
  weaveHeight,
} from "./imaginationMotion";

describe("imagination animation clocks", () => {
  it.each(imaginationEffects)(
    "round-trips $name in an existing version-1 project",
    (effect) => {
      const project = createProject("blank");
      project.surfaces = [createSurface("quad", 1, undefined, effect.id)];
      expect(parseProject(serializeProject(project))).toEqual(project);
      expect(effect.loopSeconds).toBe(IMAGINATION_LOOP);
    },
  );
  it("repeats arbitrary and negative times without accumulated state", () => {
    for (const seed of [0, 42, 137])
      for (const time of [-100, -12, -0.5, 0, 2.25, 11.999, 140]) {
        expect(imaginationPhase(time, seed)).toBe(
          imaginationPhase(time + 12, seed),
        );
        expect(imaginationPhase(time, seed)).toBeGreaterThanOrEqual(0);
        expect(imaginationPhase(time, seed)).toBeLessThan(1);
      }
    expect(imaginationPhase(3, 42)).not.toBe(imaginationPhase(3, 137));
  });
  it("keeps inflation and confetti bounded and continuous at every bubble wrap", () => {
    for (let i = 0; i < 15; i++)
      for (let p = 0; p < 1; p += 0.005) {
        const b = bubbleLife(p, i, 42);
        for (const value of Object.values(b)) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
        const next = bubbleLife(p + 1e-6, i, 42);
        expect(Math.abs(next.size - b.size)).toBeLessThan(0.0001);
        expect(Math.abs(next.burst - b.burst)).toBeLessThan(0.0001);
      }
  });
  it("ties elastic wall contact to the ball and closes the weaving cycle", () => {
    expect(rubberMotion(0).right).toBeCloseTo(1);
    expect(rubberMotion(0.25).left).toBeCloseTo(1);
    const end = rubberMotion(1);
    for (const [key, value] of Object.entries(rubberMotion(0)))
      expect(value).toBeCloseTo(end[key as keyof typeof end], 12);
    expect(weaveHeight(0)).toBe(weaveHeight(1));
    expect(weaveHeight(0.5)).toBe(1);
    expect(
      effects.filter((e) => e.searchTerms?.includes("imagination")),
    ).toHaveLength(10);
  });
});
