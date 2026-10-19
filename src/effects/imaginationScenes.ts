import type { ImaginationEffectId } from "../types";
import type { Painter } from "./common";
import {
  livingComic,
  claymationChaos,
  yarnFactory,
} from "./imaginationCharacters";
import {
  bubbleCreatures,
  porcelainDreams,
  mosaicFaces,
  rubberRoom,
} from "./imaginationMaterials";

export const imaginationPainters: Record<ImaginationEffectId, Painter> = {
  "living-comic": livingComic,
  "claymation-chaos": claymationChaos,
  "yarn-factory": yarnFactory,
  "bubble-creatures": bubbleCreatures,
  "porcelain-dreams": porcelainDreams,
  "mosaic-faces": mosaicFaces,
  "rubber-room": rubberRoom,
};
