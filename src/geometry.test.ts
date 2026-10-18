import { describe, expect, it } from 'vitest';
import { boundingMap, bounds, contains, insertVertex, inverseQuadMap, isSimplePolygon, makePoints, moveVertex, polygonArea, removeVertex, resize, rotate, translate, triangles, validPoints } from './geometry';
import type { Point } from './types';

function map(matrix: Float32Array, point: Point) {
  const z = matrix[2] * point.x + matrix[5] * point.y + matrix[8];
  return { x: (matrix[0] * point.x + matrix[3] * point.y + matrix[6]) / z, y: (matrix[1] * point.x + matrix[4] * point.y + matrix[7]) / z };
}
describe('projector geometry', () => {
  it('edits one corner without moving its neighbours and refuses a folded quad', () => {
    const original = [{ x: .1, y: .1 }, { x: .9, y: .1 }, { x: .9, y: .9 }, { x: .1, y: .9 }];
    const next = moveVertex('quad', original, 0, { x: .15, y: .2 })!;
    expect(next[0]).toEqual({ x: .15, y: .2 });
    expect(next.slice(1)).toEqual(original.slice(1));
    expect(original[0]).toEqual({ x: .1, y: .1 });
    expect(moveVertex('quad', original, 0, { x: .95, y: .5 })).toBeNull();
    expect(moveVertex('quad', original, 0, { x: -1, y: .1 })![0].x).toBe(0);
    expect(moveVertex('quad', original, 4, { x: .1, y: .2 })).toBeNull();
  });
  it('adds and removes polygon corners without changing the projected outline', () => {
    const original = [{ x: .1, y: .1 }, { x: .9, y: .1 }, { x: .9, y: .4 }, { x: .4, y: .4 }, { x: .4, y: .9 }, { x: .1, y: .9 }];
    const next = insertVertex(original, 2)!;
    expect(next).toHaveLength(7);
    expect(polygonArea(next)).toBeCloseTo(polygonArea(original), 10);
    expect(contains(next, { x: .7, y: .7 })).toBe(false);
    expect(removeVertex(next, 3)).toEqual(original);
    const triangle = makePoints('triangle');
    expect(removeVertex(triangle, 0)).toBeNull();
    const maximum = Array.from({ length: 64 }, (_, i) => ({ x: .5 + .4 * Math.cos(i / 64 * Math.PI * 2), y: .5 + .4 * Math.sin(i / 64 * Math.PI * 2) }));
    expect(insertVertex(maximum, 0)).toBeNull();
  });
  it('maps every perspective corner to its exact texture corner', () => {
    const quad = [{ x: .16, y: .12 }, { x: .82, y: .29 }, { x: .71, y: .94 }, { x: .27, y: .67 }];
    const matrix = inverseQuadMap(quad);
    const targets = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    quad.forEach((point, i) => { const projected = map(matrix, point); expect(projected.x).toBeCloseTo(targets[i].x, 5); expect(projected.y).toBeCloseTo(targets[i].y, 5); });
  });
  it('triangulates a concave outline without filling its cutout', () => {
    const lShape = [{ x: .1, y: .1 }, { x: .9, y: .1 }, { x: .9, y: .4 }, { x: .4, y: .4 }, { x: .4, y: .9 }, { x: .1, y: .9 }];
    expect(validPoints('polygon', lShape)).toBe(true);
    expect(contains(lShape, { x: .7, y: .7 })).toBe(false);
    expect(contains(lShape, { x: .2, y: .7 })).toBe(true);
    const vertices = triangles(lShape);
    let area = 0;
    for (let i = 0; i < vertices.length; i += 6) area += polygonArea([{ x: vertices[i], y: vertices[i + 1] }, { x: vertices[i + 2], y: vertices[i + 3] }, { x: vertices[i + 4], y: vertices[i + 5] }]);
    expect(area).toBeCloseTo(polygonArea(lShape), 6);
  });
  it('rejects crossing, touching, degenerate, concave quad and out-of-bounds geometry', () => {
    expect(isSimplePolygon([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 1 }])).toBe(false);
    expect(isSimplePolygon([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: .5, y: .5 }, { x: .5, y: 0 }, { x: 0, y: 1 }])).toBe(false);
    expect(validPoints('quad', [{ x: .1, y: .1 }, { x: .9, y: .1 }, { x: .4, y: .4 }, { x: .1, y: .9 }])).toBe(false);
    expect(isSimplePolygon([{ x: 0, y: 0 }, { x: .5, y: 0 }, { x: 1, y: 0 }])).toBe(false);
    expect(validPoints('polygon', [{ x: -.1, y: .1 }, { x: .5, y: .5 }, { x: .5, y: .1 }])).toBe(false);
  });
  it('keeps an entire translated surface on the projector without distorting it', () => {
    const original = makePoints('quad'), moved = translate(original, 99, -99), before = bounds(original), after = bounds(moved);
    expect(after.x + after.width).toBeCloseTo(1);
    expect(after.y).toBeCloseTo(0);
    expect(after.width).toBeCloseTo(before.width);
    expect(after.height).toBeCloseTo(before.height);
  });
  it('rotates in physical projector pixels, accounting for a widescreen canvas', () => {
    const square = [{ x: .4, y: .3 }, { x: .6, y: .3 }, { x: .6, y: .7 }, { x: .4, y: .7 }];
    const rotated = rotate(square, 90, 2), b = bounds(rotated);
    expect(b.width).toBeCloseTo(.2); expect(b.height).toBeCloseTo(.4);
    expect(polygonArea(rotated)).toBeCloseTo(polygonArea(square));
  });
  it('creates valid initial shapes and resizes without moving the top-left corner', () => {
    for (const kind of ['quad', 'triangle', 'ellipse'] as const) expect(validPoints(kind, makePoints(kind))).toBe(true);
    const original = makePoints('triangle'), b = bounds(original), changed = bounds(resize(original, .2, .3));
    expect(changed.x).toBe(b.x); expect(changed.y).toBe(b.y); expect(changed.width).toBeCloseTo(.2); expect(changed.height).toBeCloseTo(.3);
  });
  it('maps arbitrary polygons relative to their own bounding box', () => {
    const polygon = [{ x: .2, y: .1 }, { x: .8, y: .5 }, { x: .2, y: .9 }], matrix = boundingMap(polygon);
    const topLeft = map(matrix, { x: .2, y: .1 }), bottomRight = map(matrix, { x: .8, y: .9 });
    expect(topLeft.x).toBeCloseTo(0); expect(topLeft.y).toBeCloseTo(0); expect(bottomRight.x).toBeCloseTo(1); expect(bottomRight.y).toBeCloseTo(1);
  });
});
