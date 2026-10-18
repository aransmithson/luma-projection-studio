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
  subtractSurface,
  surfaceIsVisible,
} from "./cutouts";
import { bounds, contains, resize, rotate, translate } from "./geometry";
import { edgeCurve } from "./curves";

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
  it("places preset holes inside a concave parent even when its center lies outside", () => {
    const parent = createSurface("polygon", 1, [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.3 },
      { x: 0.3, y: 0.3 },
      { x: 0.3, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ]);
    for (const kind of ["quad", "ellipse"] as const) {
      const points = defaultHole(parent, kind);
      expect(points.every((p) => contains(parent.points, p))).toBe(true);
      const hole = createSurface(kind, 2, points);
      expect(
        parseProject(
          serializeProject({
            ...createProject("blank"),
            surfaces: [parent, { ...hole, cutoutOf: parent.id }],
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
