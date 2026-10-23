import { describe, expect, it } from 'vitest';
import { createProject, createSurface } from './model';
import { defaultHole } from './cutouts';
import { presetGeometry } from './shapePresets';
import { bindMedia } from './media';
import { editRemoteProject, parseRemoteCommand, remoteView } from './remoteModel';
import type { Project, LibraryMedia, Surface } from './types';

const media: LibraryMedia = { id: 'a'.repeat(64), name: 'My GIF', format: 'gif', bytes: 100, width: 40, height: 30, duration: 3 };
const apply = (p: Project, input: unknown) => editRemoteProject(p, parseRemoteCommand(input), [media]);
const hole = (parent: Surface): Surface => ({ ...createSurface('quad', 2, defaultHole(parent, 'quad')), cutoutOf: parent.id, layerId: parent.layerId });
describe('phone editing contracts', () => {
  it.each([
    { type: 'generateScene', key: 'secret' },
    { type: 'surface', id: 'shape', patch: { locked: false } },
    { type: 'surface', id: 'shape', patch: { media: { path: 'C:/private.mp4' } } },
    { type: 'brightness', value: 1.01 },
    { type: 'play', value: true, project: {} },
    { type: 'geometry', id: 'shape', points: [{ x: Infinity, y: .1 }] },
  ])('rejects commands outside the editing allowlist: %j', input => {
    expect(() => parseRemoteCommand(input)).toThrow('Invalid edit');
  });
  it('keeps scene photos, prompts, media bindings and audio out of the public view', () => {
    const p = createProject('blank');
    p.scene = { photo: { id: 'b'.repeat(64), name: 'Private room', format: 'png', width: 20, height: 20, bytes: 500 }, points: p.surfaces[0].points, opacity: 1, visible: true, prompt: 'private prompt' };
    p.audioSettings = { gain: 2, smoothing: .5, noiseGate: .01 };
    p.surfaces[0] = { ...p.surfaces[0], effectId: 'imported-media', media: bindMedia(media) };
    const view = remoteView(p), serialized = JSON.stringify(view);
    expect(serialized).not.toContain('private prompt'); expect(serialized).not.toContain('Private room');
    expect(view).not.toHaveProperty('scene'); expect(view).not.toHaveProperty('audioSettings');
    expect(view.surfaces[0]).not.toHaveProperty('media'); expect(view.surfaces[0].mediaName).toBe('My GIF');
    const result = apply(p, { type: 'surface', id: p.surfaces[0].id, patch: { opacity: .4 } }).project;
    expect(result.scene).toEqual(p.scene); expect(result.surfaces[0].media).toEqual(p.surfaces[0].media);
  });
  it('rejects locked shapes, layers and cutouts while permitting selection', () => {
    const p = createProject('blank'), id = p.surfaces[0].id;
    p.surfaces[0].locked = true;
    expect(apply(p, { type: 'select', id }).select).toBe(id);
    expect(() => apply(p, { type: 'nudge', id, dx: 1, dy: 0 })).toThrow('Unlock');
    p.surfaces[0].locked = false;
    p.layers = [{ id: 'L', name: 'Protected', locked: true, visible: true }];
    p.surfaces[0].layerId = 'L';
    expect(() => apply(p, { type: 'effect', id, effectId: 'fire' })).toThrow('Unlock');
    expect(() => apply(p, { type: 'layer', id: 'L', visible: false })).toThrow('Unlock');
    p.layers[0].locked = false;
    p.surfaces.push({ ...hole(p.surfaces[0]), locked: true });
    expect(() => apply(p, { type: 'delete', id })).toThrow('cutout');
  });
  it('moves curved shapes and holes together by exact projector pixels', () => {
    const p = createProject('blank');
    p.surfaces[0] = { ...p.surfaces[0], ...presetGeometry('arch', { x: .2, y: .2, width: .4, height: .4 }) };
    p.surfaces.push(hole(p.surfaces[0]));
    const next = apply(p, { type: 'nudge', id: p.surfaces[0].id, dx: 1, dy: -1 }).project;
    for (let s = 0; s < 2; s++) for (let i = 0; i < p.surfaces[s].points.length; i++) {
      expect(next.surfaces[s].points[i].x - p.surfaces[s].points[i].x).toBeCloseTo(1 / p.width, 10);
      expect(next.surfaces[s].points[i].y - p.surfaces[s].points[i].y).toBeCloseTo(-1 / p.height, 10);
    }
    expect(next.surfaces[0].curves).not.toEqual(p.surfaces[0].curves);
  });
  it('keeps invalid geometry out of a project', () => {
    const p = createProject('blank'), s = p.surfaces[0];
    expect(() => apply(p, { type: 'geometry', id: s.id, points: [s.points[0], s.points[2], s.points[1], s.points[3]] })).toThrow();
    expect(() => apply(p, { type: 'nudge', id: s.id, point: 60, dx: 1, dy: 1 })).toThrow('corner');
    expect(() => apply(p, { type: 'geometry', id: s.id, points: s.points.slice(0, 3) })).toThrow('number of corners');
  });
  it('keeps triangle holes fixed during corner drags and nudges, including locked holes', () => {
    const p = createProject('blank');
    const s = p.surfaces[0] = { ...p.surfaces[0], ...presetGeometry('triangle', { x: .2, y: .2, width: .5, height: .5 }) };
    p.surfaces.push({ ...hole(s), locked: true });
    const points = s.points.map((point, index) => index ? point : { ...point, x: point.x + .01 });
    const dragged = apply(p, { type: 'geometry', id: s.id, points, transformCutouts: false }).project;
    expect(dragged.surfaces[0].points).toEqual(points);
    expect(dragged.surfaces[1]).toBe(p.surfaces[1]);
    const nudged = apply(p, { type: 'nudge', id: s.id, point: 0, dx: 1, dy: 0 }).project;
    expect(nudged.surfaces[0].points[0].x).toBeCloseTo(s.points[0].x + 1 / p.width);
    expect(nudged.surfaces[1]).toBe(p.surfaces[1]);
    expect(() => apply(p, { type: 'nudge', id: s.id, dx: 1, dy: 0 })).toThrow('cutout');
  });
  it('preserves linked membership and shared timing for normal edits', () => {
    const p = createProject('blank'), a = p.surfaces[0], b = createSurface('quad', 2);
    a.effectId = b.effectId = 'stacked-liquid'; p.surfaces.push(b);
    p.stacks = [{ id: 'S', name: 'Liquid', kind: 'liquid', surfaceIds: [a.id, b.id], duration: 24, color: '#aabbcc', links: true }];
    expect(() => apply(p, { type: 'effect', id: a.id, effectId: 'fire' })).toThrow('linked');
    expect(() => apply(p, { type: 'surface', id: a.id, patch: { scale: 2 } })).toThrow('linked');
    expect(apply(p, { type: 'nudge', id: a.id, dx: 1, dy: 0 }).project.stacks).toEqual(p.stacks);
    expect(apply(p, { type: 'delete', id: a.id }).project.stacks).toEqual([]);
  });
  it('adds, duplicates and removes shapes with holes through existing limits', () => {
    const p = createProject('blank'), parent = p.surfaces[0];
    p.surfaces.push(hole(parent));
    const duplicate = apply(p, { type: 'duplicate', id: parent.id });
    expect(duplicate.project.surfaces).toHaveLength(4);
    expect(duplicate.project.surfaces[3].cutoutOf).toBe(duplicate.select);
    expect(apply(duplicate.project, { type: 'delete', id: duplicate.select }).project.surfaces).toHaveLength(2);
    const added = apply(p, { type: 'add', kind: 'arch', layerId: 'base-layer' });
    expect(added.project.surfaces[2].curves?.some(Boolean)).toBe(true);
    const full = { ...p, surfaces: Array.from({ length: 32 }, (_, i) => createSurface('quad', i + 1)) };
    expect(() => apply(full, { type: 'add', kind: 'quad', layerId: 'base-layer' })).toThrow('32');
  });
  it('only assigns known effects and locally imported assets', () => {
    const p = createProject('blank'), id = p.surfaces[0].id;
    expect(apply(p, { type: 'effect', id, effectId: 'fire' }).project.surfaces[0].effectId).toBe('fire');
    expect(() => apply(p, { type: 'effect', id, effectId: 'arbitrary-js' })).toThrow('standalone');
    expect(() => apply(p, { type: 'effect', id, effectId: 'stacked-liquid' })).toThrow('standalone');
    const imported = apply(p, { type: 'media', id, mediaId: media.id }).project;
    expect(imported.surfaces[0].media?.asset).toEqual(media);
    expect(() => apply(p, { type: 'media', id, mediaId: '0'.repeat(64) })).toThrow('library');
  });
});
