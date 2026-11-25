/** The empty state: take or choose a photo (or drop one, on a desktop). */
import { useRef, useState } from 'react';
import { Camera, ImagePlus, ShieldCheck } from 'lucide-react';
import { Button } from './components/button';
import { animalUrl } from '../core/assets';

export function PhotoPicker({ onFile }: { onFile: (f: File) => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) onFile(f);
  };
  return (
    <div
      className={`flex min-h-full flex-col items-center justify-center gap-8 px-6 py-10 text-center transition-colors ${over ? 'bg-orange-500/10' : ''}`}
      onDragOver={(e) => (e.preventDefault(), setOver(true))}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f && (f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))) onFile(f);
      }}
    >
      <div className="flex -space-x-3" aria-hidden>
        {(['fox', 'panda', 'cat', 'frog'] as const).map((a, i) => (
          <img key={a} src={animalUrl(a)} alt="" className="size-16 drop-shadow-lg" style={{ transform: `rotate(${(i - 1.5) * 8}deg)` }} />
        ))}
      </div>
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Faceover</h1>
        <p className="mx-auto max-w-sm text-balance text-white/70">
          Hide every face in a photo behind an animal, then save or share it.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button size="lg" onClick={() => camera.current?.click()}>
          <Camera /> Take a photo
        </Button>
        <Button size="lg" variant="secondary" onClick={() => library.current?.click()}>
          <ImagePlus /> Choose a photo
        </Button>
      </div>
      <p className="flex max-w-xs items-start gap-2 text-left text-sm text-white/60">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
        Your photo never leaves this device: faces are found and covered right here, in the browser.
      </p>
      <a href="credits.html" className="text-xs text-white/40 underline-offset-2 hover:underline">
        Credits and licences
      </a>
      <input ref={camera} type="file" accept="image/*,.heic,.heif" capture="environment" hidden onChange={take} data-testid="camera-input" />
      <input ref={library} type="file" accept="image/*,.heic,.heif" hidden onChange={take} data-testid="file-input" />
    </div>
  );
}
