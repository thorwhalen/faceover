/**
 * Animal artwork, loaded from this app's origin and rasterised large enough for any face.
 * The Fluent Emoji SVGs declare 32x32; the size attributes are rewritten before decoding
 * so every browser draws them sharp at photo scale.
 */
import type { AnimalId } from './schema';

const SVG_PX = 1024;
const _cache = new Map<AnimalId, Promise<HTMLImageElement>>();

export const animalUrl = (animal: AnimalId) => `${import.meta.env.BASE_URL}animals/${animal}.svg`;

export function loadAnimal(animal: AnimalId): Promise<HTMLImageElement> {
  let p = _cache.get(animal);
  if (!p) {
    p = (async () => {
      const text = await (await fetch(animalUrl(animal))).text();
      const big = text.replace(/<svg([^>]*?)\swidth="[^"]*"\s+height="[^"]*"/, `<svg$1 width="${SVG_PX}" height="${SVG_PX}"`);
      const url = URL.createObjectURL(new Blob([big], { type: 'image/svg+xml' }));
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    })();
    _cache.set(animal, p);
  }
  return p;
}

export type AnimalImages = Map<AnimalId, HTMLImageElement>;

export async function loadAnimals(animals: Iterable<AnimalId>): Promise<AnimalImages> {
  const ids = [...new Set(animals)];
  const imgs = await Promise.all(ids.map(loadAnimal));
  return new Map(ids.map((id, i) => [id, imgs[i]]));
}
