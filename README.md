# Faceover

Hide every face in a photo behind an animal, on your phone, without the photo ever leaving the device.

**Live:** https://apps.thorwhalen.com/faceover/

Take or choose a photo; every face is found and covered by an animal (a mix, or one animal for all). Tap a cover to change its animal, resize or remove it, drag it to move it, and **Add** a cover for any face that was missed. Then **Save** or **Share** (the system share sheet on phones). It installs as an app (PWA) and works offline after the first visit.

## Privacy

- Detection and drawing happen in the browser: MediaPipe's BlazeFace detector runs as WebAssembly, and its runtime and model are served from this app's own origin.
- A Content-Security-Policy forbids the page from contacting any other origin, and the e2e test fails if any request leaves the origin.
- The saved image is re-encoded, so GPS, camera and time metadata from the original are dropped.
- No analytics script runs on the page.

## How it works

1. **Detect** (`src/core/detect.ts`): MediaPipe Face Detector, full-range BlazeFace, run on the whole photo and on overlapping tiles at two finer scales, merged by non-maximum suppression. Why: `docs/adr/0001-in-browser-face-detector.md`.
2. **Transform** (`src/core/transforms.ts`): each face carries a transform spec (a Zod discriminated union). v1 has `animal`; blur, pixelate, emoji, AR lenses and video are planned as new members.
3. **Render and export** (`src/core/render.ts`, `src/core/image.ts`): one function draws the photo plus every transform at any scale, for the on-screen preview and for the full-resolution export.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173/faceover/
npm test             # unit tests (geometry, merging, schema)
npm run build && npm run test:e2e   # phone-width e2e (WebKit + Chromium) against the build
```

The e2e test reads sample photos from `~/.local/share/faceover/samples/` (override with `FACEOVER_SAMPLES`) and skips without them; photos of people are never committed.

## Credits

Animal faces: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT), see `public/animals/SOURCES.md`. Face detection: [MediaPipe](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector) (Apache-2.0), see `public/models/SOURCES.md`.

## Licence

MIT.
