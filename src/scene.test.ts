import { describe, expect, it } from "vitest";
import {
  createProject,
  createSurface,
  parseProject,
  serializeProject,
} from "./model";
import { applySceneClip, fitPhoto, sceneBinding } from "./scene";
import { copyShapeData, pastedShapes } from "./shapeClipboard";
import { withStack } from "./stacks";
import type { LibraryMedia, Point, ScenePhoto } from "./types";

const photo: ScenePhoto = {
  id: "b".repeat(64),
  name: "Props.png",
  format: "png",
  bytes: 1024,
  width: 1600,
  height: 900,
};
const asset: LibraryMedia = {
  id: "a".repeat(64),
  name: "Scene.mp4",
  format: "mp4",
  bytes: 1024,
  width: 1280,
  height: 720,
  duration: 5,
};
const full: Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];
function project() {
  const p = createProject("blank");
  p.scene = {
    photo,
    points: full,
    opacity: 0.65,
    visible: true,
    prompt: "Ghosts appear",
  };
  return p;
}
describe("scene alignment and shared media", () => {
  it("fits landscape and portrait photos without cropping", () => {
    expect(fitPhoto(photo, 1920, 1080)).toEqual(full);
    const tall = fitPhoto({ ...photo, width: 900, height: 1600 }, 1920, 1080);
    expect(tall[0].y).toBe(0);
    expect(tall[2].y).toBe(1);
    expect(tall[0].x).toBeCloseTo(0.341796875);
    expect(tall[1].x).toBeCloseTo(1 - tall[0].x);
  });
  it("round-trips reference and shared alignment in version 1 without paths or thumbnails", () => {
    const base = project();
    const p = applySceneClip(
      base,
      [base.surfaces[0].id],
      sceneBinding(asset, full),
    );
    p.surfaces[0].media = sceneBinding(
      { ...asset, thumbnail: "data:image/png;base64,AA==" },
      full,
    );
    p.surfaces[0].effectId = "imported-media";
    expect(parseProject(serializeProject(p))).toEqual(p);
    expect(serializeProject(p)).not.toContain("thumbnail");
    expect(serializeProject(p)).not.toContain("scenePhoto");
    const copied = pastedShapes(copyShapeData(p, p.surfaces[0].id), 1, 0);
    expect(copied[0].media?.sceneMapping).toEqual(full);
  });
  it("respects locked shapes, layers and holes while detaching an affected stack", () => {
    let p = project();
    const first = p.surfaces[0],
      second = createSurface("quad", 2),
      locked = createSurface("quad", 3),
      hole = createSurface("ellipse", 4),
      layerLocked = createSurface("quad", 5);
    first.contentTransform = { rotation: 30, offsetX: 0.1, offsetY: 0.3 };
    first.blend = "screen";
    first.opacity = 0.4;
    locked.locked = true;
    hole.cutoutOf = first.id;
    p.layers = [
      { id: "a", name: "A", locked: false, visible: true },
      { id: "b", name: "B", locked: true, visible: true },
    ];
    layerLocked.layerId = "b";
    p.surfaces = [first, second, locked, hole, layerLocked];
    p = withStack(p, {
      id: "flow",
      name: "Flow",
      surfaceIds: [first.id, second.id],
      color: "#ffffff",
      duration: 10,
      links: false,
    });
    const before = structuredClone(p);
    const next = applySceneClip(
      p,
      p.surfaces.map((s) => s.id),
      sceneBinding(asset, full),
    );
    expect(
      next.surfaces
        .slice(0, 2)
        .every((s) => s.effectId === "imported-media" && s.speed === 1),
    ).toBe(true);
    expect(next.surfaces.slice(2)).toEqual(before.surfaces.slice(2));
    expect(next.surfaces[0].blend).toBe("screen");
    expect(next.surfaces[0].opacity).toBe(0.4);
    expect(next.surfaces[0].contentTransform).toBeUndefined();
    expect(next.surfaces[0].points).toEqual(first.points);
    expect(next.stacks).toEqual([]);
    expect(p).toEqual(before);
    expect(next.surfaces[0].media?.sceneMapping).toEqual(
      next.surfaces[1].media?.sceneMapping,
    );
    expect(next.surfaces[0].media?.sceneMapping).not.toBe(
      next.surfaces[1].media?.sceneMapping,
    );
  });
  it.each(
    [
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
      [{ x: -1, y: 0 }, ...full.slice(1)],
      full.slice(0, 3),
    ].map((points) => ({ points })),
  )("rejects invalid photo and clip registration $points", ({ points }) => {
    const p = project();
    p.scene!.points = points;
    expect(() => parseProject(JSON.stringify(p))).toThrow();
    p.scene!.points = full;
    p.surfaces[0].effectId = "imported-media";
    p.surfaces[0].media = sceneBinding(asset, points);
    expect(() => parseProject(JSON.stringify(p))).toThrow();
  });
  it("accepts legacy projects and rejects filesystem photo references", () => {
    expect(
      parseProject(serializeProject(createProject())).scene,
    ).toBeUndefined();
    const p = project();
    p.scene!.photo = { ...photo, id: "../outside" };
    expect(() => parseProject(JSON.stringify(p))).toThrow();
  });
});
