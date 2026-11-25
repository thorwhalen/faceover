/**
 * The data model, as Zod schemas: the single source of truth for every type in Faceover.
 *
 * A `Face` is one region of the photo to de-identify, in image pixels, with the
 * transform that hides it. `FaceTransformSpec` is a discriminated union on `kind`:
 * v1 has one member (`animal`); blur, pixelate, emoji and AR lenses are later members,
 * added here and in `transforms.ts` without touching any caller.
 */
import { z } from 'zod';

/** Animal faces shipped in `public/animals/` (Fluent Emoji, MIT; see `public/animals/SOURCES.md`). */
export const ANIMALS = [
  'fox', 'cat', 'dog', 'panda', 'bear', 'tiger', 'lion', 'koala', 'monkey', 'frog',
  'pig', 'rabbit', 'mouse', 'cow', 'wolf', 'hamster', 'raccoon',
] as const;
export const AnimalId = z.enum(ANIMALS);
export type AnimalId = z.infer<typeof AnimalId>;

export const AnimalTransform = z.object({
  kind: z.literal('animal'),
  animal: AnimalId,
});

/** One member per kind of face transform. Add `blur`, `pixelate`, `emoji`… here. */
export const FaceTransformSpec = z.discriminatedUnion('kind', [AnimalTransform]);
export type FaceTransformSpec = z.infer<typeof FaceTransformSpec>;

export const FaceSource = z.enum(['detected', 'manual']);

export const Face = z.object({
  id: z.string(),
  /** Centre of the face, image pixels. */
  cx: z.number(),
  cy: z.number(),
  /** Side of the square the detector found the face in, image pixels. */
  size: z.number().positive(),
  /** Roll, radians, from the eye line (0 = upright). */
  angle: z.number().default(0),
  /** How much larger than `size` the cover is drawn. */
  scale: z.number().min(0.5).max(4).default(1.7),
  score: z.number().min(0).max(1),
  source: FaceSource,
  transform: FaceTransformSpec,
});
export type Face = z.infer<typeof Face>;

/** A detection in image pixels, before it becomes a `Face`. */
export const Detection = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  score: z.number(),
  /** MediaPipe order: right eye, left eye, nose tip, mouth, right ear, left ear (image pixels). */
  keypoints: z.array(z.object({ x: z.number(), y: z.number() })).default([]),
});
export type Detection = z.infer<typeof Detection>;

/** The viewer's remembered choices (kept on this device through a zodal store). */
export const Prefs = z.object({
  id: z.literal('prefs'),
  /** One animal for every face, or `mix` for a different one per face. */
  animal: z.union([AnimalId, z.literal('mix')]).default('mix'),
  /** Default cover scale for new faces. */
  scale: z.number().min(1).max(3).default(1.7),
});
export type Prefs = z.infer<typeof Prefs>;
export const DEFAULT_PREFS: Prefs = Prefs.parse({ id: 'prefs' });
