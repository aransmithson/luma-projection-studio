import { z } from 'zod';
import { effectById } from './catalog';
import { blendModes } from './compositing';
import { changeSurface, duplicateSurfaceGroup } from './cutouts';
import { moveVertex, translate } from './geometry';
import { validSurfaceGeometry } from './curves';
import { layerFor, layerIdFor, layersFor, changeLayer } from './layers';
import { createSurface, MAX_SURFACES, parseProject, serializeProject } from './model';
import { bindMedia } from './media';
import { presetGeometry } from './shapePresets';
import { pruneStacks } from './stacks';
import type { LibraryMedia, Project, Surface } from './types';

export type RemoteStatus = { running: boolean; urls: string[]; code: string; codeExpires: number; expires: number; connected: boolean; device: string };
export const remoteOff: RemoteStatus = { running: false, urls: [], code: '', codeExpires: 0, expires: 0, connected: false, device: '' };
export type RemoteSurface = Omit<Surface, 'media' | 'colorOverlay'> & { layerLocked: boolean; layerVisible: boolean; stackName: string; mediaName: string };
export type RemoteSnapshot = {
  revision: number;
  project: { name: string; width: number; height: number; brightness: number; layers: ReturnType<typeof layersFor>; surfaces: RemoteSurface[] };
  selectedId: string | null; playing: boolean; blackout: boolean; mesh: boolean;
  outputOpen: boolean; canUndo: boolean; canRedo: boolean; busy: boolean;
  media: { id: string; name: string }[];
};
export function remoteView(project: Project): RemoteSnapshot['project'] {
  return {
    name: project.name, width: project.width, height: project.height, brightness: project.brightness,
    layers: layersFor(project).map(l => ({ ...l })),
    surfaces: project.surfaces.map(s => ({
      id: s.id, name: s.name, kind: s.kind, points: s.points, curves: s.curves,
      effectId: s.effectId, color: s.color, colorCycle: s.colorCycle,
      opacity: s.opacity, speed: s.speed, scale: s.scale, feather: s.feather,
      visible: s.visible, locked: s.locked, blend: s.blend, seed: s.seed,
      cutoutOf: s.cutoutOf, layerId: layerIdFor(project, s), effectSide: s.effectSide,
      contentTransform: s.contentTransform,
      layerLocked: layerFor(project, s).locked, layerVisible: layerFor(project, s).visible,
      stackName: project.stacks.find(stack => stack.surfaceIds.includes(s.id))?.name || '',
      mediaName: s.media?.asset.name || '',
    })),
  };
}
const id = z.string().min(1).max(100);
const point = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict();
const patch = z.object({
  name: z.string().trim().min(1).max(80), color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  colorCycle: z.boolean(), opacity: z.number().min(0).max(1), speed: z.number().min(0).max(3),
  scale: z.number().min(.25).max(3), feather: z.number().min(0).max(.08), visible: z.boolean(),
  blend: z.enum(blendModes.map(b => b.id) as [Surface['blend'], ...Surface['blend'][]]),
  effectSide: z.enum(['left', 'right']),
  contentTransform: z.object({ rotation: z.number().min(-180).max(180), offsetX: z.number().min(-1).max(1), offsetY: z.number().min(-1).max(1) }).strict(),
}).partial().strict();
export const remoteCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('select'), id: id.nullable() }).strict(),
  z.object({ type: z.literal('surface'), id, patch }).strict(),
  z.object({ type: z.literal('geometry'), id, points: z.array(point).min(3).max(64), curves: z.array(z.object({ control1: point, control2: point }).strict().nullable()).max(64).optional(), transformCutouts: z.boolean().optional() }).strict(),
  z.object({ type: z.literal('nudge'), id, dx: z.number().int().min(-100).max(100), dy: z.number().int().min(-100).max(100), point: z.number().int().min(0).max(63).optional() }).strict(),
  z.object({ type: z.literal('effect'), id, effectId: z.string().min(1).max(100) }).strict(),
  z.object({ type: z.literal('media'), id, mediaId: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  z.object({ type: z.literal('add'), kind: z.enum(['quad', 'triangle', 'ellipse', 'arch', 'hexagon', 'star']), layerId: id }).strict(),
  z.object({ type: z.literal('duplicate'), id }).strict(),
  z.object({ type: z.literal('delete'), id }).strict(),
  z.object({ type: z.literal('layer'), id, visible: z.boolean() }).strict(),
  z.object({ type: z.literal('brightness'), value: z.number().min(0).max(1) }).strict(),
  z.object({ type: z.literal('play'), value: z.boolean() }).strict(),
  z.object({ type: z.literal('blackout'), value: z.boolean() }).strict(),
  z.object({ type: z.literal('mesh'), value: z.boolean() }).strict(),
  z.object({ type: z.literal('restart') }).strict(),
  z.object({ type: z.literal('undo') }).strict(),
  z.object({ type: z.literal('redo') }).strict(),
]);
export type RemoteCommand = z.infer<typeof remoteCommandSchema>;
export function parseRemoteCommand(input: unknown) {
  const parsed = remoteCommandSchema.safeParse(input);
  if (!parsed.success) throw Error('Invalid edit. Refresh the remote and try again.');
  return parsed.data;
}

// Called in the desktop renderer only. Every mutation goes through its existing
// history/model; phones never submit a replacement project or filesystem path.
export function editRemoteProject(project: Project, command: RemoteCommand, library: LibraryMedia[] = []): { project: Project; select?: string | null } {
  let next = project, select: string | null | undefined;
  if (command.type === 'brightness') next = { ...project, brightness: command.value };
  else if (command.type === 'layer') {
    const layer = layersFor(project).find(l => l.id === command.id);
    if (!layer || layer.locked) throw Error('Unlock the layer on the desktop first.');
    next = changeLayer(project, layer.id, { visible: command.visible });
  } else if (command.type === 'add') {
    const layer = layersFor(project).find(l => l.id === command.layerId);
    if (!layer || layer.locked) throw Error('Choose an unlocked layer.');
    if (project.surfaces.length >= MAX_SURFACES) throw Error('This scene already has 32 shapes.');
    const geometry = presetGeometry(command.kind, { x: .35, y: .3, width: .3, height: .4 });
    const surface = { ...createSurface(geometry.kind, project.surfaces.length + 1), ...geometry, layerId: layer.id };
    next = { ...project, layers: layersFor(project), surfaces: [...project.surfaces, surface] }; select = surface.id;
  } else if ('id' in command && command.id) {
    const surface = project.surfaces.find(s => s.id === command.id);
    if (!surface) throw Error('That shape is no longer in the scene.');
    if (command.type === 'select') return { project, select: surface.id };
    if (surface.locked || layerFor(project, surface).locked) throw Error('Unlock this shape and its layer on the desktop first.');
    const children = project.surfaces.filter(s => s.cutoutOf === surface.id);
    const transformCutouts = command.type === 'geometry' ? command.transformCutouts !== false : command.type !== 'nudge' || command.point === undefined;
    if (transformCutouts && ['geometry', 'nudge', 'duplicate', 'delete'].includes(command.type) && children.some(s => s.locked)) throw Error('Unlock the cutout holes on the desktop first.');
    const stacked = project.stacks.some(s => s.surfaceIds.includes(surface.id));
    let change: Partial<Surface> | undefined;
    if (command.type === 'surface') {
      if (stacked && ('speed' in command.patch || 'scale' in command.patch)) throw Error('Adjust linked animation timing and scale in the desktop stacked editor.');
      change = command.patch;
    } else if (command.type === 'geometry') {
      if (command.points.length !== surface.points.length) throw Error('Change the number of corners on the desktop.');
      change = { points: command.points, ...(command.curves ? { curves: command.curves } : {}) };
    } else if (command.type === 'nudge') {
      if (command.point !== undefined && (command.point >= surface.points.length || surface.kind === 'ellipse')) throw Error('Choose a valid corner.');
      const points = command.point === undefined
        ? translate(surface.points, command.dx / project.width, command.dy / project.height)
        : moveVertex(surface.kind, surface.points, command.point, { x: surface.points[command.point].x + command.dx / project.width, y: surface.points[command.point].y + command.dy / project.height });
      if (!points) throw Error('That corner would cross an edge or leave the canvas.');
      change = { points };
    } else if (command.type === 'effect' || command.type === 'media') {
      if (surface.cutoutOf) throw Error('Select the parent shape to change its animation.');
      if (stacked) throw Error('Edit linked animation membership in the desktop stacked editor.');
      if (command.type === 'effect') {
        const effect = effectById[command.effectId as keyof typeof effectById];
        if (!effect || effect.id === 'stacked-liquid') throw Error('Choose a standalone effect. Create liquid stacks on the desktop.');
        change = { effectId: effect.id, media: undefined, color: effect.color, colorCycle: effect.cycleByDefault ?? false };
      } else {
        const asset = library.find(m => m.id === command.mediaId);
        if (!asset) throw Error('That animation is no longer in the desktop library.');
        change = { effectId: 'imported-media', media: bindMedia(asset), speed: 1, colorCycle: false };
      }
    } else if (command.type === 'duplicate') {
      const copies = duplicateSurfaceGroup(project.surfaces, surface.id);
      if (project.surfaces.length + copies.length > MAX_SURFACES) throw Error('Duplicating this shape and its holes would exceed 32 shapes.');
      next = { ...project, surfaces: [...project.surfaces, ...copies] }; select = copies[0]?.id;
    } else if (command.type === 'delete') {
      next = { ...project, surfaces: project.surfaces.filter(s => s.id !== surface.id && s.cutoutOf !== surface.id) }; select = null;
    }
    if (change) {
      const surfaces = changeSurface(project.surfaces, surface.id, change, transformCutouts);
      if (surfaces === project.surfaces && (change.points || change.curves)) throw Error('Keep corners and curves inside the canvas without crossing edges.');
      if (!surfaces.every(validSurfaceGeometry)) throw Error('Invalid shape geometry.');
      next = { ...project, surfaces };
    }
  } else if (command.type === 'select') select = null;
  next = pruneStacks(next);
  parseProject(serializeProject(next));
  return { project: next, select };
}
