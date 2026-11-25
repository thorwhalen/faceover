/**
 * Getting a photo in and the result out, without it leaving the device.
 *
 * In: decode with EXIF orientation applied, downscaled to a canvas-safe pixel count.
 * Out: re-encoded from a canvas, which also drops every metadata field (GPS, camera,
 * time), then shared with the Web Share API or saved as a download.
 */
import { fitPixels } from './geometry';

/** iOS Safari refuses canvases above ~16.7 MP. */
export const MAX_PIXELS = 16_000_000;

export async function decodeImage(file: Blob, { maxPixels = MAX_PIXELS } = {}): Promise<HTMLCanvasElement> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(file); // e.g. HEIC on browsers whose createImageBitmap refuses it
    try {
      const img = new Image();
      img.src = url;
      try {
        await img.decode();
      } catch {
        const heic = /\.(heic|heif)$/i.test((file as File).name ?? '') || /hei[cf]/.test(file.type);
        throw new Error(heic ? 'This browser cannot open HEIC photos. Try Safari, or export the photo as JPEG.' : 'This file is not an image this browser can open.');
      }
      source = img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const { w, h } = fitPixels(source.width, source.height, maxPixels);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(source, 0, 0, w, h);
  if ('close' in source) source.close();
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, { type = 'image/jpeg', quality = 0.92 } = {}): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the image'))), type, quality),
  );
}

/** A name that says nothing about who is in the photo (the original file name might). */
export function outputName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `faceover-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}.jpg`;
}

/** Give a canvas's memory back now: iOS caps the total canvas memory per page. */
export function releaseCanvas(canvas: HTMLCanvasElement | null | undefined): void {
  if (canvas) canvas.width = canvas.height = 0;
}

export function canShareFile(file: File): boolean {
  return typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] });
}

/** Share through the OS sheet. Resolves false when the viewer cancels. */
export async function shareFile(file: File): Promise<boolean> {
  try {
    await navigator.share({ files: [file], title: 'Faceover' });
    return true;
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return false;
    throw e;
  }
}

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
