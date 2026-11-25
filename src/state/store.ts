/**
 * App state: one zustand store, mutated through immer. The photo itself lives only in
 * memory (a canvas) and is never persisted; only preferences are stored.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AnimalId, Face, Prefs } from '../core/schema';
import { DEFAULT_PREFS } from '../core/schema';
import { animalFor, faceFromDetection, newFaceId } from '../core/geometry';
import { decodeImage } from '../core/image';
import { detectFaces, type DetectFn } from '../core/detect';
import { prefsProvider, readPrefs, writePrefs } from './prefs';

export type Phase = 'empty' | 'decoding' | 'detecting' | 'ready' | 'error';

export interface State {
  phase: Phase;
  image: HTMLCanvasElement | null;
  fileName: string | null;
  faces: Face[];
  selectedId: string | null;
  progress: number; // 0..1 while detecting
  error: string | null;
  prefs: Prefs;
}

export interface Actions {
  loadFile: (file: File) => Promise<void>;
  reset: () => void;
  select: (id: string | null) => void;
  setAnimal: (animal: AnimalId | 'mix', faceId?: string | null) => void;
  setScale: (scale: number, faceId: string) => void;
  moveFace: (faceId: string, cx: number, cy: number) => void;
  addFace: () => void;
  removeFace: (faceId: string) => void;
  hydratePrefs: () => Promise<void>;
}

const initial: State = {
  phase: 'empty',
  image: null,
  fileName: null,
  faces: [],
  selectedId: null,
  progress: 0,
  error: null,
  prefs: DEFAULT_PREFS,
};

export function createFaceoverStore({ detector, provider = prefsProvider() }: { detector?: DetectFn; provider?: ReturnType<typeof prefsProvider> } = {}) {
  return create<State & Actions>()(
    immer((set, get) => {
      const savePrefs = () => void writePrefs(provider, get().prefs);
      let run = 0;
      return {
        ...initial,

        hydratePrefs: async () => {
          const prefs = await readPrefs(provider);
          set((s) => void (s.prefs = prefs));
        },

        loadFile: async (file) => {
          const token = ++run;
          set((s) => Object.assign(s, { ...initial, prefs: s.prefs, phase: 'decoding', fileName: file.name }));
          try {
            const image = await decodeImage(file);
            if (token !== run) return;
            set((s) => Object.assign(s, { image, phase: 'detecting' }));
            const found = await detectFaces(image, {
              detector,
              onProgress: (d, t) => token === run && set((s) => void (s.progress = d / t)),
            });
            if (token !== run) return;
            const { animal, scale } = get().prefs;
            const faces = found
              .sort((a, b) => a.x - b.x)
              .map((d, i) => faceFromDetection(d, { animal: animalFor(animal, i), scale }));
            set((s) => Object.assign(s, { faces, phase: 'ready', progress: 1 }));
          } catch (e) {
            if (token !== run) return;
            console.error(e);
            set((s) => Object.assign(s, { phase: 'error', error: (e as Error)?.message || String(e) }));
          }
        },

        reset: () => {
          run++;
          set((s) => Object.assign(s, { ...initial, prefs: s.prefs }));
        },

        select: (id) => set((s) => void (s.selectedId = id)),

        setAnimal: (animal, faceId = null) => {
          set((s) => {
            if (faceId) {
              const f = s.faces.find((x) => x.id === faceId);
              if (f && animal !== 'mix') f.transform = { kind: 'animal', animal };
              return;
            }
            s.prefs.animal = animal;
            s.faces.forEach((f, i) => (f.transform = { kind: 'animal', animal: animalFor(animal, i) }));
          });
          if (!faceId) savePrefs();
        },

        setScale: (scale, faceId) =>
          set((s) => {
            const f = s.faces.find((x) => x.id === faceId);
            if (f) f.scale = scale;
          }),

        moveFace: (faceId, cx, cy) =>
          set((s) => {
            const f = s.faces.find((x) => x.id === faceId);
            if (f) Object.assign(f, { cx, cy });
          }),

        addFace: () =>
          set((s) => {
            if (!s.image) return;
            const { width, height } = s.image;
            const size = Math.min(width, height) / 6;
            const id = newFaceId();
            s.faces.push({
              id,
              cx: width / 2,
              cy: height / 2,
              size,
              angle: 0,
              scale: s.prefs.scale,
              score: 1,
              source: 'manual',
              transform: { kind: 'animal', animal: animalFor(s.prefs.animal, s.faces.length) },
            });
            s.selectedId = id;
          }),

        removeFace: (faceId) =>
          set((s) => {
            s.faces = s.faces.filter((f) => f.id !== faceId);
            if (s.selectedId === faceId) s.selectedId = null;
          }),
      };
    }),
  );
}

export const useFaceover = createFaceoverStore();
