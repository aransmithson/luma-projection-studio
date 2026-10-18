import { describe, expect, it } from "vitest";
import {
  blendModes,
  defaultColorOverlay,
  overlayPhase,
  overlayStyles,
  overlayPalettes,
} from "./compositing";
import { createProject, parseProject, serializeProject } from "./model";

describe("saved surface compositing", () => {
  it("opens old projects with no overlay and keeps their existing blend", () => {
    const p = createProject("winter");
    p.surfaces[0].blend = "screen";
    const restored = parseProject(serializeProject(p));
    expect(restored).toEqual(p);
    expect(restored.surfaces[0].colorOverlay).toBeUndefined();
  });
  it.each(blendModes)(
    "round trips $name with independent colour settings",
    ({ id }) => {
      const p = createProject("blank");
      p.surfaces[0].blend = id;
      p.surfaces[0].colorOverlay = {
        ...defaultColorOverlay,
        blend: id,
        speed: 0.35,
        reverse: true,
      };
      expect(parseProject(serializeProject(p))).toEqual(p);
    },
  );
  it("round trips every overlay style and palette", () => {
    const p = createProject("blank");
    for (const style of overlayStyles)
      for (const palette of overlayPalettes) {
        p.surfaces[0].colorOverlay = {
          ...defaultColorOverlay,
          style: style.id,
          palette: palette.id,
        };
        expect(parseProject(serializeProject(p))).toEqual(p);
      }
  });
  it.each([
    { style: "missing" },
    { palette: "url(bad)" },
    { blend: "missing" },
    { speed: 4 },
    { scale: 0 },
    { intensity: 1.1 },
    { speed: -1 },
    { reverse: "yes" },
  ])("rejects invalid overlay data %j", (change) => {
    const p = createProject("blank");
    const invalid = {
      ...p,
      surfaces: [
        {
          ...p.surfaces[0],
          colorOverlay: { ...defaultColorOverlay, ...change },
        },
      ],
    };
    expect(() => parseProject(JSON.stringify(invalid))).toThrow();
  });
  it("keeps timing bounded and periodic, including reverse and stopped overlays", () => {
    expect(overlayPhase(6, defaultColorOverlay)).toBe(0.25);
    expect(overlayPhase(30, defaultColorOverlay)).toBe(0.25);
    expect(overlayPhase(6, { ...defaultColorOverlay, reverse: true })).toBe(
      0.75,
    );
    expect(overlayPhase(1e8, { ...defaultColorOverlay, speed: 0 })).toBe(0);
    expect(overlayPhase(12, { ...defaultColorOverlay, speed: 0.5 })).toBe(0.25);
    expect(overlayPhase(-6, defaultColorOverlay)).toBe(0.75);
  });
});
