import { describe, expect, it } from "vitest";
import {
  createProject,
  createSurface,
  parseProject,
  serializeProject,
} from "./model";
import {
  canSubtract,
  changeSurface,
  cutoutsFor,
  defaultHole,
  duplicateSurfaceGroup,
  effectiveSolo,
  restoreCutout,
  subtractSurface,
  surfaceIsVisible,
} from "./cutouts";
import { bounds, contains, resize, rotate, translate } from "./geometry";
import { edgeCurve, surfaceOutline, validSurfaceGeometry } from "./curves";
import type { Surface } from "./types";
import { layerIdFor } from "./layers";

function fixture() {
  const project = createProject("blank"),
    parent = project.surfaces[0];
  parent.points = [
    { x: 0.2, y: 0.2 },
    { x: 0.8, y: 0.2 },
    { x: 0.8, y: 0.8 },
    { x: 0.2, y: 0.8 },
  ];
  const cutter = createSurface("quad", 2, defaultHole(parent, "quad"));
  cutter.curves = edgeCurve(cutter, 0, true);
  project.surfaces.push(cutter);
  return { project, parent, cutter };
}
describe("editable subtractive shapes", () => {
  it("places successive preset holes separately inside the same parent", () => {
    const { project, parent } = fixture();
    const holes: Surface[] = [];
    for (const kind of ["quad", "ellipse", "quad", "ellipse"] as const) {
      const hole = {
        ...createSurface(
          kind,
          holes.length + 2,
          defaultHole(parent, kind, holes),
        ),
        cutoutOf: parent.id,
      };
      expect(validSurfaceGeometry(hole)).toBe(true);
      expect(hole.points.every((p) => contains(parent.points, p))).toBe(true);
      const b = bounds(hole.points);
      for (const previous of holes) {
        const other = bounds(surfaceOutline(previous));
        expect(
          b.x + b.width < other.x ||
            b.x > other.x + other.width ||
            b.y + b.height < other.y ||
            b.y > other.y + other.height,
        ).toBe(true);
      }
      holes.push(hole);
    }
    const result = { ...project, surfaces: [parent, ...holes] };
    expect(parseProject(serializeProject(result))).toEqual(result);
    const copies = duplicateSurfaceGroup(result.surfaces, parent.id);
    expect(copies).toHaveLength(5);
    expect(copies.slice(1).every((s) => s.cutoutOf === copies[0].id)).toBe(true);
  });
  it("keeps a valid inside placement when existing holes fill the parent", () => {
    const { parent } = fixture();
    const filled = { ...parent, id: "filled", cutoutOf: parent.id };
    for (const kind of ["quad", "ellipse"] as const) {
      const points = defaultHole(parent, kind, [filled]);
      expect(points).toEqual(defaultHole(parent, kind));
      expect(validSurfaceGeometry({ kind, points })).toBe(true);
    }
  });
  it("places preset holes inside a concave parent even when its center lies outside", () => {
    const parent = createSurface("polygon", 1, [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.3 },
      { x: 0.3, y: 0.3 },
      { x: 0.3, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ]);
    const holes: Surface[] = [];
    for (const kind of ["quad", "ellipse", "quad"] as const) {
      const points = defaultHole(parent, kind, holes);
      expect(points.every((p) => contains(parent.points, p))).toBe(true);
      const hole = createSurface(kind, 2, points);
      for (const previous of holes) expect(points).not.toEqual(previous.points);
      holes.push({ ...hole, cutoutOf: parent.id });
      expect(
        parseProject(
          serializeProject({
            ...createProject("blank"),
            surfaces: [parent, ...holes],
          }),
        ),
      ).toBeTruthy();
    }
  });
  it("stores a curved cutter without changing its geometry or the parent effect", () => {
    const { project, parent, cutter } = fixture();
    const result = subtractSurface(project, parent.id, cutter.id);
    expect(result.surfaces[0]).toEqual(parent);
    expect(result.surfaces[1]).toEqual({ ...cutter, cutoutOf: parent.id });
    expect(project.surfaces[1].cutoutOf).toBeUndefined();
    expect(parseProject(serializeProject(result))).toEqual(result);
  });
  it("restores an inherited cutout to its parent's layer", () => {
    const { project, parent, cutter } = fixture();
    project.layers = [
      { id: "background", name: "Background", visible: true, locked: false },
      { id: "foreground", name: "Foreground", visible: true, locked: false },
    ];
    parent.layerId = "foreground";
    cutter.cutoutOf = parent.id;
    const next = restoreCutout(project, cutter.id);
    expect(next.surfaces[1].cutoutOf).toBeUndefined();
    expect(layerIdFor(next, next.surfaces[1])).toBe("foreground");
    expect(next.surfaces[1].points).toBe(cutter.points);
    expect(parseProject(serializeProject(next))).toEqual(next);
    for (const locked of [parent, cutter, project.layers[1]]) {
      locked.locked = true;
      expect(restoreCutout(project, cutter.id)).toBe(project);
      locked.locked = false;
    }
  });
  it("rejects missing targets, self-reference and nested or cyclic cutouts on import", () => {
    const { project, parent, cutter } = fixture();
    for (const id of ["missing", cutter.id]) {
      cutter.cutoutOf = id;
      expect(() => parseProject(serializeProject(project))).toThrow();
    }
    cutter.cutoutOf = parent.id;
    parent.cutoutOf = cutter.id;
    expect(() => parseProject(serializeProject(project))).toThrow();
  });
  it("prevents subtracting a parent with children, a locked shape or another cutout", () => {
    const { project, parent, cutter } = fixture();
    const result = subtractSurface(project, parent.id, cutter.id);
    const other = createSurface("quad", 3);
    result.surfaces.push(other);
    expect(canSubtract(result.surfaces, other.id, parent.id)).toBe(false);
    expect(canSubtract(result.surfaces, parent.id, cutter.id)).toBe(false);
    other.locked = true;
    expect(canSubtract(result.surfaces, parent.id, other.id)).toBe(false);
  });
  it("permits overlapping holes and cutouts extending beyond the parent for notches", () => {
    const { project, parent, cutter } = fixture();
    cutter.points = translate(cutter.points, -0.25, 0);
    cutter.curves = undefined;
    const result = subtractSurface(project, parent.id, cutter.id);
    result.surfaces.push({ ...result.surfaces[1], id: crypto.randomUUID() });
    expect(parseProject(serializeProject(result)).surfaces).toHaveLength(3);
  });
  it("moves, scales and rotates cutout anchors and Bezier handles with the whole surface", () => {
    const { project, parent, cutter } = fixture();
    const surfaces = subtractSurface(project, parent.id, cutter.id).surfaces;
    const moved = changeSurface(surfaces, parent.id, {
      points: translate(parent.points, 0.05, 0.03),
    });
    expect(moved[1].points[0].x).toBeCloseTo(cutter.points[0].x + 0.05);
    expect(moved[1].curves![0]!.control1.y).toBeCloseTo(
      cutter.curves![0]!.control1.y + 0.03,
    );
    const scaled = changeSurface(surfaces, parent.id, {
      points: resize(parent.points, 0.3, 0.3),
    });
    expect(bounds(scaled[1].points).width).toBeCloseTo(
      bounds(cutter.points).width / 2,
    );
    const turned = changeSurface(surfaces, parent.id, {
      points: rotate(parent.points, 15, 1),
    });
    expect(turned[1].points).not.toEqual(cutter.points);
    expect(
      parseProject(serializeProject({ ...project, surfaces: turned })),
    ).toBeTruthy();
  });
  it("keeps holes independently placed while warping one parent corner", () => {
    const { project, parent, cutter } = fixture();
    const surfaces = subtractSurface(project, parent.id, cutter.id).surfaces;
    const points = parent.points.map((p, i) =>
      i ? p : { x: p.x + 0.03, y: p.y + 0.04 },
    );
    expect(changeSurface(surfaces, parent.id, { points })[1]).toEqual(
      surfaces[1],
    );
  });
  it("rejects a group transform if a protruding cutout would leave the canvas", () => {
    const { project, parent, cutter } = fixture();
    cutter.points = translate(cutter.points, 0.42, 0);
    cutter.curves = undefined;
    const surfaces = subtractSurface(project, parent.id, cutter.id).surfaces;
    expect(
      changeSurface(surfaces, parent.id, {
        points: translate(parent.points, 0.15, 0),
      }),
    ).toBe(surfaces);
  });
  it("rejects parent transforms when any child cutout is locked", () => {
    const { project, parent, cutter } = fixture();
    const surfaces = subtractSurface(project, parent.id, cutter.id).surfaces;
    surfaces[1] = { ...surfaces[1], locked: true };
    for (const points of [
      translate(parent.points, 0.03, 0),
      resize(parent.points, 0.5, 0.5),
      rotate(parent.points, 10, 1),
    ]) expect(changeSurface(surfaces, parent.id, { points })).toBe(surfaces);
    const editable = changeSurface(surfaces, parent.id, {
      kind: "polygon", points: parent.points,
    });
    expect(editable[0].kind).toBe("polygon");
    expect(editable[1]).toBe(surfaces[1]);
  });
  it("distinguishes a triangle corner edit from a whole-shape resize", () => {
    const { project, parent, cutter } = fixture();
    parent.kind = "triangle";
    parent.points = [parent.points[0], parent.points[1], parent.points[3]];
    const surfaces = subtractSurface(project, parent.id, cutter.id).surfaces;
    // Both operations move only the rightmost anchor of this triangle.
    const points = resize(parent.points, 0.5, 0.6);
    const corner = changeSurface(surfaces, parent.id, { points }, false);
    expect(corner[0].points).toEqual(points);
    expect(corner[1]).toBe(surfaces[1]);
    const resized = changeSurface(surfaces, parent.id, { points });
    expect(bounds(resized[1].points).width).toBeCloseTo(bounds(cutter.points).width * 5 / 6);
    surfaces[1] = { ...surfaces[1], locked: true };
    expect(changeSurface(surfaces, parent.id, { points }, false)[1]).toBe(surfaces[1]);
  });
  it("duplicates a parent and all holes with independent IDs and links", () => {
    const { project, parent, cutter } = fixture();
    const surfaces = subtractSurface(project, parent.id, cutter.id).surfaces;
    const copies = duplicateSurfaceGroup(surfaces, parent.id);
    expect(copies).toHaveLength(2);
    expect(copies[1].cutoutOf).toBe(copies[0].id);
    expect(copies[0].id).not.toBe(parent.id);
    expect(cutoutsFor([...surfaces, ...copies], parent.id)).toHaveLength(1);
    expect(
      parseProject(
        serializeProject({ ...project, surfaces: [...surfaces, ...copies] }),
      ),
    ).toBeTruthy();
  });
  it("duplicates an individual cutter into the same parent", () => {
    const { project, parent, cutter } = fixture();
    const surfaces = subtractSurface(project, parent.id, cutter.id).surfaces;
    const [copy] = duplicateSurfaceGroup(surfaces, cutter.id);
    expect(copy.cutoutOf).toBe(parent.id);
  });
  it("solos a cutout with its parent and suppresses guides for a hidden parent", () => {
    const { project, parent, cutter } = fixture();
    const surfaces = subtractSurface(project, parent.id, cutter.id).surfaces;
    expect(effectiveSolo(surfaces, cutter.id)).toBe(parent.id);
    surfaces[0] = { ...parent, visible: false };
    expect(surfaceIsVisible(surfaces[1], surfaces)).toBe(false);
  });
  it("removes a converted cutter from a liquid stack", () => {
    const { project, parent, cutter } = fixture();
    const another = createSurface("quad", 3, undefined, "stacked-liquid");
    cutter.effectId = "stacked-liquid";
    project.surfaces.push(another);
    project.stacks = [
      {
        id: "stack",
        name: "Flow",
        surfaceIds: [cutter.id, another.id],
        duration: 18,
        color: "#ffffff",
        links: true,
      },
    ];
    const result = subtractSurface(project, parent.id, cutter.id);
    expect(result.stacks).toEqual([]);
    expect(parseProject(serializeProject(result))).toBeTruthy();
  });
});
