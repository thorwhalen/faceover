/** Draw the photo with every face transformed, at any output size. */
import type { Face } from './schema';
import { defaultTransforms, type TransformContext, type TransformTable } from './transforms';

export interface RenderOptions {
  /** Output scale relative to the image (1 = full resolution). */
  scale?: number;
  transforms?: TransformTable;
}

export function renderComposite(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource & { width: number; height: number },
  faces: Face[],
  env: TransformContext,
  { scale = 1, transforms = defaultTransforms }: RenderOptions = {},
): HTMLCanvasElement {
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.drawImage(image, 0, 0);
  for (const face of faces) (transforms[face.transform.kind] as TransformTable['animal'])(ctx, face as never, env);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}
