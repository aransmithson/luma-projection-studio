import type {
  LibraryMedia,
  MediaBinding,
  Point,
  Project,
  ScenePhoto,
  Surface,
} from "./types";
import { bindMedia } from "./media";
import { layerFor } from "./layers";
import { pruneStacks } from "./stacks";

export const photoUrl = (photo: ScenePhoto) =>
  `luma-media://photos/${photo.id}.png`;
export function fitPhoto(
  photo: ScenePhoto,
  width: number,
  height: number,
): Point[] {
  const scale = Math.min(width / photo.width, height / photo.height);
  const w = (photo.width * scale) / width,
    h = (photo.height * scale) / height;
  const x = (1 - w) / 2,
    y = (1 - h) / 2;
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}
export const editableProp = (p: Project, s: Surface) =>
  !s.cutoutOf && !s.locked && !layerFor(p, s).locked;
export function applySceneClip(
  project: Project,
  ids: string[],
  media: MediaBinding,
): Project {
  return pruneStacks({
    ...project,
    surfaces: project.surfaces.map((s) =>
      ids.includes(s.id) && editableProp(project, s)
        ? {
            ...s,
            effectId: "imported-media",
            media: {
              ...media,
              fit: "stretch",
              sceneMapping: media.sceneMapping?.map((p) => ({ ...p })),
            },
            speed: 1,
            colorCycle: false,
            contentTransform: undefined,
          }
        : s,
    ),
  });
}
export function sceneBinding(
  asset: LibraryMedia,
  points: Point[],
): MediaBinding {
  return {
    ...bindMedia(asset),
    fit: "stretch",
    sceneMapping: points.map((p) => ({ ...p })),
  };
}
export function photoSurface(project: Project): Surface | null {
  const scene = project.scene;
  return scene
    ? {
        id: "__scene-photo",
        name: "Scene photo",
        kind: "quad",
        points: scene.points,
        effectId: "imported-media",
        color: "#ffffff",
        colorCycle: false,
        opacity: scene.opacity,
        speed: 0,
        scale: 1,
        feather: 0,
        visible: true,
        locked: false,
        blend: "normal",
        seed: 0,
      }
    : null;
}
