/** Faceover: pick a photo, every face is covered, save or share. */
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useFaceover } from './state/store';
import { PhotoPicker } from './ui/PhotoPicker';
import { Editor } from './ui/Editor';
import { Button } from './ui/components/button';

export default function App() {
  const phase = useFaceover((s) => s.phase);
  const error = useFaceover((s) => s.error);
  const { loadFile, reset, hydratePrefs } = useFaceover.getState();
  useEffect(() => void hydratePrefs(), [hydratePrefs]);

  if (phase === 'empty') return <PhotoPicker onFile={loadFile} />;
  if (phase === 'error')
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="size-10 text-amber-400" />
        <p className="max-w-sm text-white/80">That photo could not be processed.</p>
        <p className="max-w-sm text-sm text-white/50">{error}</p>
        <Button onClick={reset}>Try another photo</Button>
      </div>
    );
  return <Editor />;
}
