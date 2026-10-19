import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import {
  AUTOSAVE_KEY,
  RECOVERY_KEY,
  createProject,
  createSurface,
  MAX_SURFACES,
  parseProject,
  persistProject,
  readRecovery,
  serializeProject,
} from "./model";
import { effects } from "./catalog";
import { playbackTime } from "./renderer";

describe("portable projects", () => {
  it.each(readdirSync("examples").filter((name) => name.endsWith(".luma")))(
    "opens the bundled %s example without repairs",
    (name) => {
      const data = JSON.parse(readFileSync(`examples/${name}`, "utf8"));
      expect(parseProject(JSON.stringify(data))).toEqual(data);
    },
  );
  it.each(["blank", "winter", "halloween"] as const)(
    "round-trips the %s scene including effect parameters and corners",
    (template) => {
      const project = createProject(template);
      expect(parseProject(serializeProject(project))).toEqual(project);
    },
  );
  it("rejects duplicate IDs and unknown versions", () => {
    const project = createProject();
    project.surfaces[1].id = project.surfaces[0].id;
    expect(() => parseProject(serializeProject(project))).toThrow();
    expect(() =>
      parseProject(JSON.stringify({ ...createProject(), version: 2 })),
    ).toThrow();
  });
  it("rejects dangerous dimensions, invalid colours, and unavailable effects", () => {
    const project = createProject();
    expect(() =>
      parseProject(JSON.stringify({ ...project, width: 1000000 })),
    ).toThrow();
    project.surfaces[0].color = "url(https://example.com)";
    expect(() => parseProject(serializeProject(project))).toThrow();
    const unknown = JSON.parse(serializeProject(createProject()));
    unknown.surfaces[0].effectId = "missing";
    expect(() => parseProject(JSON.stringify(unknown))).toThrow();
  });
  it("rejects excessive sizes and unsafe geometry without mutating a valid project", () => {
    const project = createProject("blank");
    project.surfaces = Array.from({ length: MAX_SURFACES + 1 }, (_, i) =>
      createSurface("quad", i),
    );
    expect(() => parseProject(serializeProject(project))).toThrow();
    expect(() => parseProject(" ".repeat(2_000_001))).toThrow(/too large/);
    const invalid = createProject("blank");
    invalid.surfaces[0].points[0].x = -1;
    expect(() => parseProject(serializeProject(invalid))).toThrow();
  });
  it("includes the expanded seasonal collection and unique effect IDs", () => {
    expect(effects.filter((e) => e.category === "Halloween")).toHaveLength(12);
    expect(effects.filter((e) => e.category === "Christmas")).toHaveLength(4);
    expect(new Set(effects.map((e) => e.id)).size).toBe(effects.length);
    expect(effects).toHaveLength(176);
    expect(effects.filter((e) => e.category === "Chase scenes")).toHaveLength(
      5,
    );
    expect(effects.filter((e) => e.category === "Architecture")).toHaveLength(
      10,
    );
    expect(effects.filter((e) => e.category === "Creatures")).toHaveLength(6);
    expect(effects.filter((e) => e.category === "Colour blocks")).toHaveLength(
      5,
    );
    expect(effects.filter((e) => e.still)).toHaveLength(12);
    expect(effects.filter((e) => e.category === "Shadow puppets")).toHaveLength(
      6,
    );
  });
  it.each(effects)(
    "saves and restores $name with its colour-cycling choice",
    (effect) => {
      const project = createProject("blank");
      project.surfaces = [createSurface("quad", 1, undefined, effect.id)];
      expect(parseProject(serializeProject(project))).toEqual(project);
    },
  );
  it("migrates older projects without curves, stacks or colour cycling", () => {
    const old = JSON.parse(serializeProject(createProject()));
    delete old.stacks;
    old.surfaces.forEach((s: { colorCycle?: boolean }) => {
      delete s.colorCycle;
    });
    const project = parseProject(JSON.stringify(old));
    expect(project.stacks).toEqual([]);
    expect(project.surfaces.every((s) => s.colorCycle === false)).toBe(true);
  });
});
describe("synchronised playback", () => {
  it("holds a paused frame and resumes without jumping", () => {
    expect(
      playbackTime({ playing: false, offset: 3700, startedAt: 1000 }, 99999),
    ).toBe(3.7);
    expect(
      playbackTime({ playing: true, offset: 3700, startedAt: 10000 }, 11000),
    ).toBe(4.7);
  });
  it("gives the same time to editor and projector independent of render frame rate", () => {
    const playback = { playing: true, offset: 0, startedAt: 10000 };
    expect(playbackTime(playback, 13650)).toBe(3.65);
    expect(playbackTime(playback, 14000)).toBe(4);
  });
});

describe("project recovery", () => {
  const memory = () => {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
  };
  it("keeps recovery valid while the user clears the project title", () => {
    const storage = memory(),
      project = createProject();
    project.name = "";
    persistProject(storage, project);
    expect(readRecovery(storage)?.project.name).toBe("Untitled mapping");
    expect(project.name).toBe("");
  });
  it("recovers the previous valid save after the current save is damaged", () => {
    const storage = memory(),
      previous = createProject("winter"),
      next = createProject("halloween");
    persistProject(storage, previous);
    persistProject(storage, next);
    expect(readRecovery(storage)).toEqual({ project: next, recovered: false });
    storage.setItem(AUTOSAVE_KEY, "{broken");
    expect(readRecovery(storage)).toEqual({
      project: previous,
      recovered: true,
    });
    persistProject(storage, next);
    expect(parseProject(storage.getItem(RECOVERY_KEY)!)).toEqual(previous);
  });
  it("does not overwrite a good save with invalid geometry", () => {
    const storage = memory(),
      previous = createProject();
    persistProject(storage, previous);
    const invalid = createProject();
    invalid.surfaces[0].points[0].x = -1;
    expect(() => persistProject(storage, invalid)).toThrow();
    expect(readRecovery(storage)?.project).toEqual(previous);
  });
  it("handles unavailable storage and damage to both recovery copies", () => {
    const storage = memory();
    storage.setItem(AUTOSAVE_KEY, "null");
    storage.setItem(RECOVERY_KEY, "{}");
    expect(readRecovery(storage)).toBeNull();
    expect(
      readRecovery({
        getItem: () => {
          throw new Error("Unavailable");
        },
      }),
    ).toBeNull();
  });
});
