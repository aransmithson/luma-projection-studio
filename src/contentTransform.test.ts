import { describe, expect, it } from "vitest";
import { contentMatrix } from "./contentTransform";
import { createProject, parseProject, serializeProject } from "./model";
import { copyShapeData, pastedShapes } from "./shapeClipboard";

describe("content placement", () => {
  it("keeps legacy content in place", () => {
    expect(Array.from(contentMatrix())).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const p = createProject("blank");
    expect(parseProject(serializeProject(p))).toEqual(p);
    expect(p.surfaces[0].contentTransform).toBeUndefined();
  });
  it.each([0.25, 1, 16 / 9, 4])(
    "samples the inverse of a physical rotation and translation at aspect %s",
    (aspect) => {
      for (const rotation of [-180, -90, -37, 0, 27, 90, 180]) {
        const transform = { rotation, offsetX: 0.23, offsetY: -0.17 };
        const m = contentMatrix(transform, aspect);
        for (const p of [
          { x: 0, y: 0 },
          { x: 0.5, y: 0.5 },
          { x: 0.75, y: 0.33 },
          { x: 1, y: 1 },
        ]) {
          // Independent forward mapping in physical dimensions.
          const angle = (rotation / 180) * Math.PI,
            x = (p.x - 0.5) * aspect,
            y = p.y - 0.5;
          const u = 0.73 + (x * Math.cos(angle) - y * Math.sin(angle)) / aspect;
          const v = 0.33 + x * Math.sin(angle) + y * Math.cos(angle);
          expect(m[0] * u + m[3] * v + m[6]).toBeCloseTo(p.x, 5);
          expect(m[1] * u + m[4] * v + m[7]).toBeCloseTo(p.y, 5);
        }
      }
    },
  );
  it("saves and copies content position independently of geometry", () => {
    const p = createProject("blank"),
      shape = p.surfaces[0];
    const before = structuredClone(shape.points);
    shape.contentTransform = { rotation: -37, offsetX: 0.29, offsetY: -0.16 };
    const restored = parseProject(serializeProject(p));
    expect(restored.surfaces[0].contentTransform).toEqual(
      shape.contentTransform,
    );
    const pasted = pastedShapes(copyShapeData(p, shape.id), 1, 0)[0];
    expect(pasted.id).not.toBe(shape.id);
    expect(pasted.contentTransform).toEqual(shape.contentTransform);
    expect(pasted.points).toEqual(before);
  });
  it.each([
    { rotation: 181, offsetX: 0, offsetY: 0 },
    { rotation: -181, offsetX: 0, offsetY: 0 },
    { rotation: 0, offsetX: 1.01, offsetY: 0 },
    { rotation: 0, offsetX: 0, offsetY: -1.01 },
    { rotation: 0, offsetX: 0 },
    { rotation: "90", offsetX: 0, offsetY: 0 },
  ])("rejects invalid content placement %j", (contentTransform) => {
    const p = createProject("blank");
    const json = { ...p, surfaces: [{ ...p.surfaces[0], contentTransform }] };
    expect(() => parseProject(JSON.stringify(json))).toThrow();
  });
});
