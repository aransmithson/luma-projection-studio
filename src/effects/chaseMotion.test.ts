import { describe, expect, it } from "vitest";
import { chaseLayout, chasePhase, CHASE_LOOP } from "./chaseMotion";
import { mod } from "./common";
import { chaseEffects } from "../chaseCatalog";
import {
  createProject,
  createSurface,
  parseProject,
  serializeProject,
} from "../model";

describe("character chase loops", () => {
  it("shares an exact phase and pose over repeated laps, including negative time", () => {
    for (const t of [-12.001, -0.001, 0, 0.17, 2.25, 7.75, 11.999, 12]) {
      expect(chasePhase(t + CHASE_LOOP * 100)).toBe(chasePhase(t));
      expect(chaseLayout(t + CHASE_LOOP, 1920, 1080, 42)).toEqual(
        chaseLayout(t, 1920, 1080, 42),
      );
    }
  });

  it.each([
    [1920, 1080],
    [1080, 1920],
    [1920, 240],
  ])(
    "moves both characters forwards, fully offscreen before re-entry at %i by %i",
    (width, height) => {
      for (const scale of [0.25, 1, 1.55, 3]) {
        const wraps = { leaderX: 0, chaserX: 0 },
          initial = chaseLayout(0, width, height, 137, scale);
        let previous = initial;
        for (let frame = 1; frame <= 720; frame++) {
          const current = chaseLayout(frame / 60, width, height, 137, scale);
          expect(current.unit).toBe(initial.unit);
          expect(
            mod(current.leaderX - current.chaserX, current.circuit),
          ).toBeCloseTo(current.gap, 6);
          // A clear space remains between the two silhouettes on the circuit.
          expect(current.gap).toBeGreaterThan(current.unit * 3.0);
          for (const key of ["leaderX", "chaserX"] as const) {
            const moved = mod(current[key] - previous[key], current.circuit);
            expect(moved).toBeGreaterThan(0);
            expect(moved).toBeLessThan(current.circuit * 0.002);
            if (current[key] < previous[key]) {
              wraps[key]++;
              expect(previous[key] - current.unit * 2.1).toBeGreaterThan(width);
              expect(current[key] + current.unit * 2.1).toBeLessThan(0);
            }
          }
          previous = current;
        }
        expect(wraps).toEqual({ leaderX: 1, chaserX: 1 });
      }
    },
  );

  it("resizes characters without zooming or cropping the canvas travel path", () => {
    const small = chaseLayout(2, 640, 360, 42, 0.45),
      large = chaseLayout(2, 640, 360, 42, 1.55);
    expect(large.unit).toBeGreaterThan(small.unit);
    expect(large.floor).toBe(small.floor);
    expect(large.unit * 3).toBeLessThanOrEqual(large.floor);
    expect(chaseLayout(2, 640, 360, 137).leaderX).not.toBe(
      chaseLayout(2, 640, 360, 42).leaderX,
    );
  });

  it.each(chaseEffects)(
    "preserves $name with reverse direction, size and speed in projects",
    (effect) => {
      const project = createProject("blank");
      project.surfaces = [
        {
          ...createSurface("quad", 1, undefined, effect.id),
          effectSide: "right",
          scale: 1.4,
          speed: 1.75,
        },
      ];
      expect(parseProject(serializeProject(project))).toEqual(project);
      expect(effect.loopSeconds).toBe(CHASE_LOOP);
      expect(effect.category).toBe("Chase scenes");
    },
  );
});
