import { describe, expect, it } from 'vitest';
import { animalFor, faceFromDetection, fitPixels, fromTile, mergeDetections, overlapOverMin, planTiles, rollFromKeypoints } from './geometry';
import { ANIMALS, Face } from './schema';

const det = (x: number, y: number, w: number, h: number, score = 0.9) => ({ x, y, w, h, score, keypoints: [] });

describe('planTiles', () => {
  it('starts with the whole image', () => {
    expect(planTiles(1000, 800)[0]).toEqual({ x: 0, y: 0, w: 1000, h: 800 });
  });
  it('covers every pixel at each finer level, inside the image', () => {
    const W = 4032, H = 3024;
    const tiles = planTiles(W, H).slice(1);
    expect(tiles.length).toBeGreaterThan(4);
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.x + t.w).toBeLessThanOrEqual(W);
      expect(t.y + t.h).toBeLessThanOrEqual(H);
    }
    const sides = [...new Set(tiles.map((t) => t.w))];
    for (const side of sides) {
      const level = tiles.filter((t) => t.w === side);
      expect(Math.max(...level.map((t) => t.x + t.w))).toBe(W);
      expect(Math.max(...level.map((t) => t.y + t.h))).toBe(H);
    }
  });
  it('skips levels whose tiles would be too small', () => {
    expect(planTiles(500, 400)).toHaveLength(1);
  });
});

describe('mergeDetections', () => {
  it('keeps the best of overlapping boxes, and a half-face box inside a full one is dropped', () => {
    const full = det(100, 100, 50, 50, 0.95);
    const half = det(100, 100, 25, 50, 0.6);
    const other = det(400, 100, 50, 50, 0.8);
    expect(mergeDetections([half, other, full])).toEqual([full, other]);
    expect(full.w).toBe(50); // inputs are not mutated
  });
  it('a higher-scoring half-face grows to cover the whole face', () => {
    const half = det(100, 100, 25, 50, 0.97);
    const full = det(100, 100, 50, 50, 0.9);
    expect(mergeDetections([half, full])).toEqual([{ ...det(100, 100, 50, 50, 0.97) }]);
  });
  it('drops low scores', () => {
    expect(mergeDetections([det(0, 0, 10, 10, 0.2)])).toEqual([]);
  });
  it('overlapOverMin is 1 for a box inside another, 0 for disjoint', () => {
    expect(overlapOverMin(det(0, 0, 100, 100), det(10, 10, 20, 20))).toBe(1);
    expect(overlapOverMin(det(0, 0, 10, 10), det(20, 20, 5, 5))).toBe(0);
  });
});

describe('faces', () => {
  it('maps tile detections back to image pixels', () => {
    const d = fromTile({ ...det(10, 20, 30, 40), keypoints: [{ x: 1, y: 2 }] }, { x: 100, y: 200, w: 500, h: 500 }, 0.5);
    expect(d).toMatchObject({ x: 120, y: 240, w: 60, h: 80, keypoints: [{ x: 102, y: 204 }] });
  });
  it('reads roll from the eye line', () => {
    expect(rollFromKeypoints([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toBe(0);
    expect(rollFromKeypoints([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBeCloseTo(Math.PI / 4);
    expect(rollFromKeypoints([])).toBe(0);
  });
  it('builds a schema-valid Face', () => {
    const f = faceFromDetection(det(10, 10, 40, 60), { animal: 'fox', scale: 1.7, id: 'a' });
    expect(Face.parse(f)).toEqual(f);
    expect(f).toMatchObject({ cx: 30, cy: 40, size: 60, source: 'detected' });
  });
  it('mix gives neighbours different animals', () => {
    expect(animalFor('mix', 0)).not.toBe(animalFor('mix', 1));
    expect(animalFor('mix', ANIMALS.length)).toBe(animalFor('mix', 0));
    expect(animalFor('cat', 5)).toBe('cat');
  });
  it('fits a 48 MP photo under the canvas limit, keeping the aspect', () => {
    const { w, h } = fitPixels(8064, 6048, 16_000_000);
    expect(w * h).toBeLessThanOrEqual(16_000_000);
    expect(w / h).toBeCloseTo(8064 / 6048, 2);
    expect(fitPixels(100, 100, 16_000_000)).toEqual({ w: 100, h: 100 });
  });
});
