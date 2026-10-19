import type { EffectId } from "../types";
import type { Painter } from "./common";
import { halloweenPainters } from "./halloween";
import { naturePainters } from "./nature";
import { spacePainters } from "./space";
import { abstractPainters } from "./abstract";
import { architecturalPainters } from "./architectural";
import { creaturePainters } from "./creatures";
import { materialPainters } from "./materials";
import { colourBlockPainters } from "./colourBlocks";
import { illusionPainters } from "./illusions";
import { livingPainters } from "./livingScenes";
import { puppetPainters } from "./shadowPuppets";
import { cosmicPainters } from "./cosmicScenes";
import { craftedPainters } from "./craftedMaterials";
import { depthPainters } from "./depthScenes";
import { eyeballSwarm, singleEyeball } from "./eyeballs";
import { stagePainters } from "./stageScenes";
import { chasePainters } from "./chaseScenes";
import { portalPainter } from "./portalScene";
import { musicPainters } from "./music";
import { storyPainters } from "./linkedStories";
import { stickPainters } from "./stickBoxes";
export const extendedPainters: Partial<Record<EffectId, Painter>> = {
  ...stickPainters,
  ...storyPainters,
  ...musicPainters,
  "portal-hopper": portalPainter,
  ...chasePainters,
  ...stagePainters,
  "single-eyeball": singleEyeball,
  "eyeball-swarm": eyeballSwarm,
  ...depthPainters,
  ...halloweenPainters,
  ...naturePainters,
  ...spacePainters,
  ...abstractPainters,
  ...architecturalPainters,
  ...creaturePainters,
  ...materialPainters,
  ...colourBlockPainters,
  ...illusionPainters,
  ...livingPainters,
  ...puppetPainters,
  ...cosmicPainters,
  ...craftedPainters,
};
