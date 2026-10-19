import { describe, expect, it } from "vitest";
import { stickEffects } from "../stickCatalog";
import {
  createProject,
  createSurface,
  parseProject,
  serializeProject,
} from "../model";
import { STICK_LOOP, stickJoint, stickPhase, stickPose } from "./stickMotion";

describe("boxed stick figures", () => {
  it.each(stickEffects)(
    "$name repeats its poses on the shared clock, with a smooth seam",
    (effect) => {
      for (const seed of [0, 42, 137]) {
        for (const time of [0, 0.37, 2.25, 7.75, 11.999]) {
          const phase = stickPhase(time, seed);
          expect(stickPose(effect.id, phase)).toEqual(
            stickPose(effect.id, stickPhase(time + STICK_LOOP, seed)),
          );
        }
      }
      for (const partner of [false, true]) {
        const before = stickPose(effect.id, 1 - 1e-6, partner);
        const after = stickPose(effect.id, 1e-6, partner);
        for (const key of Object.keys(before) as (keyof typeof before)[])
          expect(Math.abs(before[key] - after[key])).toBeLessThan(0.001);
      }
      const p = createProject("blank");
      p.surfaces = [createSurface("quad", 1, undefined, effect.id)];
      expect(parseProject(serializeProject(p))).toEqual(p);
      expect(effect.loopSeconds).toBe(STICK_LOOP);
    },
  );
  it("keeps joints finite for stretched and collapsed limbs", () => {
    for (const [x, y] of [
      [0, 0],
      [0.00001, 0],
      [1, 1],
      [1e5, 2],
      [-0.8, -0.4],
    ]) {
      const p = stickJoint(0, 0, x, y, 0.6, 1);
      expect(Object.values(p).every(Number.isFinite)).toBe(true);
      expect(Math.hypot(p.endX, p.endY)).toBeLessThanOrEqual(1.2);
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(0.6, 8);
      expect(Math.hypot(p.endX - p.x, p.endY - p.y)).toBeCloseTo(0.6, 8);
    }
  });
  it("gives the two buddies complementary poses and each variation a repeatable phase", () => {
    expect(stickPose("stick-box-buddies", 0.42).lift).toBe(0);
    expect(stickPose("stick-box-buddies", 0.42, true).lift).toBe(1.25);
    expect(stickPhase(3, 42)).not.toBe(stickPhase(3, 137));
    expect(stickEffects).toHaveLength(6);
  });
});
