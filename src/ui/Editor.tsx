/**
 * The result: the photo with every face covered, handles to adjust each cover, and
 * Save / Share. Tap a cover to pick its animal, size or remove it; drag to move it;
 * "Add" covers a face the detector missed.
 */
import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Plus, RotateCcw, Share2, Shuffle, Trash2, X } from 'lucide-react';
import { Button } from './components/button';
import { useFaceover } from '../state/store';
import { ANIMALS, type AnimalId, type Face } from '../core/schema';
import { animalUrl, loadAnimals } from '../core/assets';
import { renderComposite } from '../core/render';
import { canShareFile, canvasToBlob, downloadFile, outputName, releaseCanvas, shareFile } from '../core/image';
import { cn } from '../lib-utils';

/** A tap this close to a cover (screen px) still picks it. */
const TOUCH_SLOP_PX = 22;

/** The face whose cover is nearest the point, within its radius plus `slop` (image px). */
function nearestFace(faces: Face[], p: { x: number; y: number }, slop: number): Face | null {
  let best: Face | null = null;
  let bestD = Infinity;
  for (const f of faces) {
    const d = Math.hypot(f.cx - p.x, f.cy - p.y);
    if (d <= (f.size * f.scale) / 2 + slop && d < bestD) [best, bestD] = [f, d];
  }
  return best;
}

/** Longest side of the on-screen preview, device pixels. */
const PREVIEW_MAX = 2048;

function usePreview(image: HTMLCanvasElement | null, faces: Face[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!image || !ref.current) return;
    let live = true;
    let frame = 0;
    const canvas = ref.current;
    loadAnimals(faces.map((f) => f.transform.animal)).then((animals) => {
      if (!live) return;
      // One redraw per animation frame, however fast a drag fires pointermove.
      frame = requestAnimationFrame(() => {
        const scale = Math.min(1, PREVIEW_MAX / Math.max(image.width, image.height));
        renderComposite(canvas, image, faces, { animals }, { scale });
      });
    });
    return () => {
      live = false;
      cancelAnimationFrame(frame);
    };
  }, [image, faces]);
  return ref;
}

/** The largest box of the image's aspect ratio that fits the container (the stage is sized in px, so pointer maths match the drawn photo). */
function useFitBox(aspect: number | null) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !aspect) return;
    const fit = () => {
      const cs = getComputedStyle(el); // clientWidth includes padding; the stage must fit inside it
      const W = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const H = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const w = Math.min(W, H * aspect);
      setBox({ w, h: w / aspect });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);
  return [ref, box] as const;
}

function AnimalStrip({ value, onPick, allowMix }: { value: AnimalId | 'mix'; onPick: (a: AnimalId | 'mix') => void; allowMix: boolean }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Animal">
      {allowMix && (
        <button
          aria-pressed={value === 'mix'}
          aria-label="Mix: a different animal for each face"
          onClick={() => onPick('mix')}
          className={cn('flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/5 transition active:scale-90', value === 'mix' && 'ring-2 ring-orange-400 bg-white/15')}
          title="A different animal for each face"
        >
          <Shuffle className="size-6" />
        </button>
      )}
      {ANIMALS.map((a) => (
        <button
          key={a}
          aria-pressed={value === a}
          aria-label={a}
          onClick={() => onPick(a)}
          className={cn('size-14 shrink-0 rounded-2xl bg-white/5 p-1.5 transition active:scale-90', value === a && 'ring-2 ring-orange-400 bg-white/15')}
        >
          <img src={animalUrl(a)} alt="" className="size-full" />
        </button>
      ))}
    </div>
  );
}

export function Editor() {
  const { image, faces, phase, progress, selectedId, prefs } = useFaceover();
  const { select, setAnimal, setScale, moveFace, addFace, removeFace, reset } = useFaceover.getState();
  const canvasRef = usePreview(image, faces);
  const [areaRef, box] = useFitBox(image ? image.width / image.height : null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [busy, setBusy] = useState<null | 'share' | 'save'>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const selected = faces.find((f) => f.id === selectedId) ?? null;
  const working = phase === 'decoding' || phase === 'detecting';

  const toImage = (e: React.PointerEvent) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * image!.width, y: ((e.clientY - r.top) / r.height) * image!.height };
  };

  const exportFile = async (forFaces: Face[]) => {
    const animals = await loadAnimals(forFaces.map((f) => f.transform.animal));
    const canvas = renderComposite(document.createElement('canvas'), image!, forFaces, { animals });
    try {
      return new File([await canvasToBlob(canvas)], outputName(), { type: 'image/jpeg' });
    } finally {
      releaseCanvas(canvas);
    }
  };

  // The shareable file is made ahead of the tap: iOS only lets navigator.share run
  // straight from a gesture, and a full-resolution export can take a second.
  const ready = useRef<{ faces: Face[]; file: File } | null>(null);
  useEffect(() => {
    if (phase !== 'ready' || !image) return;
    const t = setTimeout(() => {
      exportFile(faces)
        .then((file) => (ready.current = { faces, file }))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, image, faces]);

  const act = async (kind: 'share' | 'save') => {
    if (busy) return;
    const prepared = ready.current?.faces === faces ? ready.current.file : null;
    setBusy(kind);
    try {
      const file = prepared ?? (await exportFile(faces));
      ready.current = { faces, file };
      if (kind === 'share' && canShareFile(file)) {
        if (await shareFile(file)) setNotice('Shared');
      } else {
        downloadFile(file);
        setNotice(kind === 'share' ? 'Sharing is not available here, so it was saved instead' : 'Saved');
      }
    } catch (e) {
      const name = (e as DOMException)?.name;
      setNotice(name === 'NotAllowedError' ? 'Ready: tap Share again' : `Could not export: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);


  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-2 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <Button variant="ghost" onClick={reset} aria-label="New photo">
          <RotateCcw /> New
        </Button>
        <span className="text-sm text-white/70" data-testid="face-count">
          {working ? (phase === 'decoding' ? 'Opening…' : `Finding faces… ${Math.round(progress * 100)}%`) : `${faces.length} ${faces.length === 1 ? 'face' : 'faces'} covered`}
        </span>
        <span className="sr-only" aria-live="polite">
          {phase === 'ready' ? `${faces.length} ${faces.length === 1 ? 'face' : 'faces'} covered` : ''}
        </span>
        <Button variant="ghost" onClick={addFace} disabled={working} aria-label="Cover another face">
          <Plus /> Add
        </Button>
      </header>

      <div ref={areaRef} className="relative flex min-h-0 flex-1 items-center justify-center p-3" onPointerDown={(e) => e.target === e.currentTarget && select(null)}>
        {image && box && (
          <div
            ref={stageRef}
            className="relative touch-none"
            style={{ width: box.w, height: box.h, flex: 'none' }}
            onPointerDown={(e) => {
              if (working) return;
              const p = toImage(e);
              const f = nearestFace(faces, p, (TOUCH_SLOP_PX / stageRef.current!.getBoundingClientRect().width) * image.width);
              select(f?.id ?? null);
              if (!f) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { id: f.id, dx: f.cx - p.x, dy: f.cy - p.y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              const p = toImage(e);
              moveFace(d.id, p.x + d.dx, p.y + d.dy);
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            <canvas ref={canvasRef} className={cn('size-full rounded-lg transition-[filter]', working && 'blur-xl')} data-testid="preview" />
            {!working &&
              faces.map((f) => (
                <button
                  key={f.id}
                  tabIndex={0}
                  aria-label={`Face ${f.transform.animal}`}
                  aria-pressed={f.id === selectedId}
                  data-testid="face-handle"
                  onClick={() => select(f.id)}
                  className={cn(
                    'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed transition-colors focus-visible:border-white',
                    f.id === selectedId ? 'border-orange-400 bg-orange-400/10' : 'border-transparent',
                  )}
                  style={{
                    left: `${(f.cx / image.width) * 100}%`,
                    top: `${(f.cy / image.height) * 100}%`,
                    width: `${((f.size * f.scale) / image.width) * 100}%`,
                    aspectRatio: '1',
                  }}
                />
              ))}
          </div>
        )}
        {working && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm backdrop-blur">
              <Loader2 className="size-4 animate-spin" /> {phase === 'decoding' ? 'Opening photo' : 'Finding faces'}
            </div>
          </div>
        )}
        {notice && (
          <div role="status" className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm">
            {notice}
          </div>
        )}
      </div>

      <section className="space-y-3 border-t border-white/10 bg-neutral-900/80 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur">
        {selected ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">This face</span>
              <div className="flex gap-1">
                <Button variant="destructive" size="icon" aria-label="Remove this cover" onClick={() => removeFace(selected.id)}>
                  <Trash2 />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Done" onClick={() => select(null)}>
                  <X />
                </Button>
              </div>
            </div>
            <AnimalStrip value={selected.transform.animal} allowMix={false} onPick={(a) => setAnimal(a, selected.id)} />
            <label className="flex items-center gap-3 text-sm text-white/70">
              Size
              <input
                type="range"
                min={0.8}
                max={3}
                step={0.05}
                value={selected.scale}
                onChange={(e) => setScale(Number(e.target.value), selected.id)}
                className="h-11 flex-1 accent-orange-500"
                aria-label="Cover size"
              />
            </label>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-medium">Animal for every face</span>
              <span className="text-xs text-white/50">Tap a face to change just that one</span>
            </div>
            <AnimalStrip value={prefs.animal} allowMix onPick={(a) => setAnimal(a)} />
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" disabled={working || !!busy} onClick={() => act('save')} data-testid="save">
            {busy === 'save' ? <Loader2 className="animate-spin" /> : <Download />} Save
          </Button>
          <Button size="lg" disabled={working || !!busy} onClick={() => act('share')} data-testid="share">
            {busy === 'share' ? <Loader2 className="animate-spin" /> : <Share2 />} Share
          </Button>
        </div>
      </section>
    </div>
  );
}
