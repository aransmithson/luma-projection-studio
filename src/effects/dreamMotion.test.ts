import { describe, expect, it } from "vitest";
import { bloomLife, dreamPhase, fractureLife } from "./dreamMotion";
import { dreamEffects } from "../dreamCatalog";

describe("dreamscape playback", () => {
  it.each([16, 24])(
    "repeats at arbitrary and negative times over %ss",
    (duration) => {
      for (const time of [-57.713, -0.001, 0, 2.25, 7.75, 139.333]) {
        expect(dreamPhase(time, duration)).toBe(
          dreamPhase(time + duration, duration),
        );
        expect(dreamPhase(time, duration)).toBeGreaterThanOrEqual(0);
        expect(dreamPhase(time, duration)).toBeLessThan(1);
      }
    },
  );
  it("keeps growth finite and makes every staggered flower disappear smoothly at its seam", () => {
    for (const delay of [0, 0.07, 0.29]) {
      for (let i = 0; i < 200; i++)
        for (const value of Object.values(bloomLife(i / 200, delay))) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      expect(bloomLife(delay, delay)).toEqual({ stem: 0, petals: 0 });
      expect(bloomLife(delay + 0.00001, delay).stem).toBeLessThan(0.0001);
      expect(bloomLife(delay - 0.00001, delay).stem).toBeLessThan(0.0001);
    }
  });
  it("extends cracks monotonically and fades to a fully clear loop seam", () => {
    expect(fractureLife(0).opacity).toBe(0);
    expect(fractureLife(1).opacity).toBe(0);
    expect(fractureLife(0.55)).toEqual({ reach: 1, opacity: 1 });
    let reach = 0;
    for (let i = 0; i <= 100; i++) {
      const state = fractureLife(i / 100);
      expect(state.reach).toBeGreaterThanOrEqual(reach);
      expect(state.opacity).toBeGreaterThanOrEqual(0);
      expect(state.opacity).toBeLessThanOrEqual(1);
      reach = state.reach;
    }
  });
  it("limits transparency to the three overlay effects and exposes all fifteen in search", () => {
    expect(dreamEffects).toHaveLength(15);
    expect(dreamEffects.filter((e) => e.transparent).map((e) => e.id)).toEqual([
      "cracks-glass",
      "cracks-stone",
      "cracks-frost",
    ]);
    expect(
      dreamEffects.every((e) => e.searchTerms?.includes("dreamscape")),
    ).toBe(true);
  });
});
