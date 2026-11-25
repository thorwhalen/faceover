/**
 * Face detection, on the device. The detector is a seam: `detectFaces(image, { detector })`
 * takes any function from a canvas to detections. The default is MediaPipe's full-range
 * BlazeFace, with the wasm runtime and the model served from this app's own origin
 * (see docs/adr/0001-in-browser-face-detector.md), so no request leaves for a CDN.
 */
import type { Detection } from './schema';
import { fromTile, mergeDetections, planTiles, type TileOptions } from './geometry';

/** Detections for one canvas, in that canvas's pixels. */
export type DetectFn = (canvas: HTMLCanvasElement) => Promise<Detection[]>;

export interface MediaPipeOptions {
  /** Where `vision_wasm_internal.{js,wasm}` are served. */
  wasmBase?: string;
  /** The `.tflite` face detector. */
  modelUrl?: string;
  minDetectionConfidence?: number;
}

const BASE = import.meta.env.BASE_URL;
export const DEFAULT_WASM_BASE = `${BASE}mediapipe`;
export const DEFAULT_MODEL_URL = `${BASE}models/blaze_face_full_range.tflite`;

/** Build a MediaPipe-backed `DetectFn`. Loads lazily, once. */
export function mediapipeDetector({
  wasmBase = DEFAULT_WASM_BASE,
  modelUrl = DEFAULT_MODEL_URL,
  minDetectionConfidence = 0.4,
}: MediaPipeOptions = {}): DetectFn & { ready: () => Promise<void> } {
  type MP = { detect: (img: HTMLCanvasElement) => { detections: any[] } };
  let loading: Promise<MP> | null = null;

  const load = () =>
    (loading ??= (async () => {
      const { FilesetResolver, FaceDetector } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(wasmBase);
      return (await FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: modelUrl, delegate: 'CPU' },
        runningMode: 'IMAGE',
        minDetectionConfidence,
      })) as unknown as MP;
    })().catch((e) => {
      loading = null; // allow a retry
      throw e;
    }));

  const detect: DetectFn = async (canvas) => {
    const mp = await load();
    const { width, height } = canvas;
    return mp.detect(canvas).detections.map((d) => ({
      x: d.boundingBox.originX,
      y: d.boundingBox.originY,
      w: d.boundingBox.width,
      h: d.boundingBox.height,
      score: d.categories?.[0]?.score ?? 0,
      keypoints: (d.keypoints ?? []).map((p: { x: number; y: number }) => ({ x: p.x * width, y: p.y * height })),
    }));
  };
  return Object.assign(detect, { ready: async () => void (await load()) });
}

let _default: ReturnType<typeof mediapipeDetector> | null = null;
export const defaultDetector = () => (_default ??= mediapipeDetector());

export interface DetectOptions extends TileOptions {
  detector?: DetectFn;
  /** Side each tile is scaled to before detection, px. */
  tileInput?: number;
  minScore?: number;
  onProgress?: (done: number, total: number) => void;
}

/** Every face in `image`, in image pixels: whole image plus finer tiles, merged. */
export async function detectFaces(
  image: CanvasImageSource & { width: number; height: number },
  { detector = defaultDetector(), tileInput = 640, minScore, onProgress, ...tiling }: DetectOptions = {},
): Promise<Detection[]> {
  const tiles = planTiles(image.width, image.height, tiling);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const all: Detection[] = [];
  for (const [i, tile] of tiles.entries()) {
    const scale = Math.min(1, tileInput / Math.max(tile.w, tile.h)) || 1;
    canvas.width = Math.max(1, Math.round(tile.w * scale));
    canvas.height = Math.max(1, Math.round(tile.h * scale));
    ctx.drawImage(image, tile.x, tile.y, tile.w, tile.h, 0, 0, canvas.width, canvas.height);
    for (const d of await detector(canvas)) all.push(fromTile(d, tile, scale));
    onProgress?.(i + 1, tiles.length);
    await new Promise((r) => setTimeout(r, 0)); // let the UI paint between tiles
  }
  return mergeDetections(all, { minScore });
}
