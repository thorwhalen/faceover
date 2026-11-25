/**
 * Pure geometry for detection: tiling a photo so small faces are found, merging the
 * detections of overlapping tiles, and turning a detection into a `Face`.
 *
 * Why tiling: BlazeFace looks at the photo through a 128 or 192 px window, so in a
 * 4000 px group photo a 60 px face shrinks to 3 px and is missed. A missed face is a
 * privacy failure, so the photo is also scanned in overlapping tiles at two finer
 * scales and the results merged. No DOM here: everything is unit-tested.
 */
import type { AnimalId, Detection, Face } from './schema';
import { ANIMALS } from './schema';

export interface Tile {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TileOptions {
  /** Finer levels to scan after the whole image (each halves the tile side). */
  levels?: number;
  /** Smallest tile side worth scanning, px. */
  minTile?: number;
  /** Fraction of a tile shared with its neighbour. */
  overlap?: number;
}

function _starts(length: number, tile: number, stride: number): number[] {
  if (tile >= length) return [0];
  const out: number[] = [];
  for (let s = 0; s + tile < length; s += stride) out.push(Math.round(s));
  out.push(Math.round(length - tile));
  return [...new Set(out)];
}

/** The whole image, then overlapping square tiles at finer scales. */
export function planTiles(
  width: number,
  height: number,
  { levels = 2, minTile = 320, overlap = 1 / 3 }: TileOptions = {},
): Tile[] {
  const tiles: Tile[] = [{ x: 0, y: 0, w: width, h: height }];
  let side = Math.min(width, height);
  for (let k = 0; k < levels; k++) {
    side = Math.round(side / 2);
    if (side < minTile) break;
    const stride = side * (1 - overlap);
    for (const y of _starts(height, side, stride))
      for (const x of _starts(width, side, stride)) tiles.push({ x, y, w: side, h: side });
  }
  return tiles;
}

function _area(d: Detection): number {
  return Math.max(0, d.w) * Math.max(0, d.h);
}

/** Intersection over the smaller box: 1 when one box sits inside the other. */
export function overlapOverMin(a: Detection, b: Detection): number {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const small = Math.min(_area(a), _area(b));
  return small > 0 ? inter / small : 0;
}

/**
 * Non-maximum suppression across tiles. Uses overlap-over-min rather than IoU, because
 * a tile that cuts a face in half reports a small box inside the full one. The best-scoring
 * box of a cluster is kept, grown to cover any larger box it suppresses, so a half-face
 * that happens to score higher never leaves the other half uncovered.
 */
export function mergeDetections(
  detections: Detection[],
  { minScore = 0.45, maxOverlap = 0.4 }: { minScore?: number; maxOverlap?: number } = {},
): Detection[] {
  const sorted = detections.filter((d) => d.score >= minScore).sort((a, b) => b.score - a.score);
  const kept: Detection[] = [];
  for (const d of sorted) {
    const k = kept.find((k) => overlapOverMin(k, d) >= maxOverlap);
    if (!k) kept.push({ ...d });
    else if (_area(d) > _area(k)) Object.assign(k, _union(k, d), { keypoints: d.keypoints }); // a half-face may outscore the whole face
  }
  return kept;
}

function _union(a: Detection, b: Detection): Pick<Detection, 'x' | 'y' | 'w' | 'h'> {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/** Map a detection made on a tile back to image pixels. */
export function fromTile(d: Detection, tile: Tile, scale: number): Detection {
  const f = 1 / scale;
  return {
    x: tile.x + d.x * f,
    y: tile.y + d.y * f,
    w: d.w * f,
    h: d.h * f,
    score: d.score,
    keypoints: d.keypoints.map((p) => ({ x: tile.x + p.x * f, y: tile.y + p.y * f })),
  };
}

/** Roll angle from the eye line; 0 when the eyes are missing. */
export function rollFromKeypoints(kp: Detection['keypoints']): number {
  if (kp.length < 2) return 0;
  const [rightEye, leftEye] = kp; // subject's right eye is on the image's left
  return Math.atan2(leftEye.y - rightEye.y, leftEye.x - rightEye.x);
}

/** `mix`: a different animal per face, stable for a given index. */
export function animalFor(choice: AnimalId | 'mix', index: number): AnimalId {
  return choice === 'mix' ? ANIMALS[index % ANIMALS.length] : choice;
}

let _seq = 0;
export function newFaceId(): string {
  _seq += 1;
  return `f${Date.now().toString(36)}${_seq}`;
}

export function faceFromDetection(
  d: Detection,
  { animal, scale, id = newFaceId() }: { animal: AnimalId; scale: number; id?: string },
): Face {
  return {
    id,
    cx: d.x + d.w / 2,
    cy: d.y + d.h / 2,
    size: Math.max(d.w, d.h),
    angle: rollFromKeypoints(d.keypoints),
    scale,
    score: d.score,
    source: 'detected',
    transform: { kind: 'animal', animal },
  };
}

/** Largest size that keeps `width * height <= maxPixels` (iOS caps canvas area near 16.7 MP). */
export function fitPixels(width: number, height: number, maxPixels: number): { w: number; h: number } {
  const area = width * height;
  if (area <= maxPixels) return { w: width, h: height };
  const k = Math.sqrt(maxPixels / area);
  return { w: Math.floor(width * k), h: Math.floor(height * k) };
}
