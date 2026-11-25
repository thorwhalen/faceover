/**
 * Face transforms: how one face is hidden. One entry per `FaceTransformSpec` kind.
 * v1 ships `animal`; blur, pixelate, emoji and AR lenses are added as new entries,
 * and `renderComposite` takes the table as its `transforms` keyword, so a caller can
 * swap or extend it without touching this file.
 */
import type { Face, FaceTransformSpec } from './schema';
import type { AnimalImages } from './assets';

export interface TransformContext {
  animals: AnimalImages;
}

export type DrawFace<K extends FaceTransformSpec['kind']> = (
  ctx: CanvasRenderingContext2D,
  face: Face & { transform: Extract<FaceTransformSpec, { kind: K }> },
  env: TransformContext,
) => void;

export type TransformTable = { [K in FaceTransformSpec['kind']]: DrawFace<K> };

/** Where the art's face sits inside its square: Fluent animal heads have ears on top. */
const ANIMAL_LIFT = 0.06;

export const drawAnimal: DrawFace<'animal'> = (ctx, face, { animals }) => {
  const img = animals.get(face.transform.animal);
  if (!img) return;
  const side = face.size * face.scale;
  ctx.save();
  ctx.translate(face.cx, face.cy);
  ctx.rotate(face.angle);
  ctx.drawImage(img, -side / 2, -side / 2 - side * ANIMAL_LIFT, side, side);
  ctx.restore();
};

export const defaultTransforms: TransformTable = { animal: drawAnimal };
