import { describe, expect, it } from "vitest";
import {
  architecturalPhase,
  collapseAmount,
  lightningStrength,
} from "./effects/architectural";
import { effects } from "./catalog";

describe("architectural animation timing", () => {
  it("collapses the wall, holds the void, rebuilds, and returns to the intact wall", () => {
    expect(collapseAmount(0)).toBe(0);
    expect(collapseAmount(2)).toBe(0);
    expect(collapseAmount(5)).toBeGreaterThan(0.3);
    expect(collapseAmount(9)).toBe(1);
    expect(collapseAmount(12)).toBeLessThan(0.5);
    expect(collapseAmount(14.5)).toBe(0);
  });
  it("repeats the full cycle without accumulating simulation state", () => {
    for (const t of [0, 2.25, 4.5, 7.75, 12, 14.5]) {
      expect(architecturalPhase(t + 15 * 1000)).toBeCloseTo(
        architecturalPhase(t),
        10,
      );
      expect(collapseAmount(t + 15)).toBeCloseTo(collapseAmount(t), 10);
      expect(lightningStrength(t + 15)).toBeCloseTo(lightningStrength(t), 10);
    }
    expect(collapseAmount(15 - 0.0001)).toBe(collapseAmount(0.0001));
  });
  it("places two distinct lightning strikes within the cloud loop", () => {
    expect(lightningStrength(4.275)).toBeCloseTo(1);
    expect(lightningStrength(10.725)).toBeCloseTo(0.8);
    expect(lightningStrength(7.5)).toBeLessThan(0.001);
    expect(lightningStrength(0)).toBeLessThan(0.001);
  });
  it("makes each supplied reference discoverable under its original Nox effect name", () => {
    const references = [
      "Smart Reflection",
      "Falling Walls",
      "Liquid Fabrics",
      "ChromaticFlow",
      "Dawnlight",
      "LetThereBeLight",
      "MetalMadness",
    ];
    for (const term of references)
      expect(
        effects.filter((effect) => effect.searchTerms?.includes(term)),
      ).toHaveLength(1);
    expect(
      effects.filter((effect) =>
        effect.searchTerms?.some((term) => references.includes(term)),
      ),
    ).toHaveLength(7);
  });
});
