// Copy MediaPipe's wasm runtime from node_modules into public/mediapipe/, so the app serves
// it from its own origin (no CDN request). Runs before dev and build; the copy is gitignored.
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const pkgDir = join(import.meta.dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision');
const out = join(import.meta.dirname, '..', 'public', 'mediapipe');
mkdirSync(out, { recursive: true });
for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm']) copyFileSync(join(pkgDir, 'wasm', f), join(out, f));
console.log(`mediapipe wasm -> ${out}`);
