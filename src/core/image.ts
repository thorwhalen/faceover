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
      await img.decode();
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

export function outputName(inputName: string | null): string {
  const stem = (inputName ?? 'photo').replace(/\.[^.]+$/, '') || 'photo';
  return `${stem}-faceover.jpg`;
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
