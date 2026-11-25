# ADR-0001: Detect faces in the browser with MediaPipe full-range BlazeFace, tiled

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

Faceover must find every face in a photo on the device: the image never leaves the browser. A missed face is a privacy failure, so recall matters more than precision (a false cover is removed with one tap; a missed face is published). Photos are taken with the back camera and are often group photos, where faces are small. The research behind this choice is `docs/research/face-detection-in-browser.md`.

Candidates that run fully in the browser:

| Option | Licence | Status | Small faces | Size | Verdict |
|---|---|---|---|---|---|
| MediaPipe Face Detector, full-range BlazeFace (`@mediapipe/tasks-vision`) | Apache-2.0 | maintained by Google, npm 1.2.3 | designed for back-camera photos, up to ~5 m | model 1.1 MB, wasm 14.7 MB | **chosen** |
| MediaPipe Face Detector, short-range BlazeFace | Apache-2.0 | same | selfie distance only | 0.23 MB | not shipped: misses back-camera group faces |
| MediaPipe Face Landmarker (478 points) | Apache-2.0 | same | uses the short-range detector internally | 3.6 MB | later: AR-lens transforms need the mesh |
| face-api.js | MIT | unmaintained since 2020; the maintained fork is archived and points to Human | SSD MobileNet does well on small faces | tfjs + models ~6 MB | avoid |
| `@vladmandic/human` | MIT | maintained, 3.3.6 | BlazeFace back-camera models | large (tfjs) | study; a heavier alternative |

## Decision

1. **Detector:** MediaPipe Face Detector with the **full-range** BlazeFace model, CPU delegate, `IMAGE` running mode.
2. **Tiling:** the whole photo, then overlapping square tiles at two finer scales (side halves each level, one third overlap, tiles under 320 px skipped), each scaled to 640 px; detections are mapped back and merged by non-maximum suppression on overlap-over-the-smaller-box, so a tile that cuts a face in half cannot add a second, partial cover. This is the slicing-aided inference idea (SAHI) applied to faces. On the 1927 Solvay group photo (3000 x 2171 px, 29 people) it finds all 29.
3. **Self-hosted:** the wasm runtime is copied from `node_modules` at build time and the `.tflite` model is committed under `public/models/` (Apache-2.0, provenance in `public/models/SOURCES.md`). Nothing is loaded from a CDN. A Content-Security-Policy in `index.html` (`connect-src 'self' blob: data:`) makes the browser refuse any request to another origin, and the e2e test fails on any such request.
4. **Seam:** `detectFaces(image, { detector })` takes any `(canvas) => Promise<Detection[]>`. The landmarker, a Web Worker, or a different model is a new `detector`, with no caller changed.

## Consequences

- First visit downloads ~16 MB (mostly the wasm runtime); the service worker precaches it, so later visits and offline use cost nothing.
- Detection runs on the main thread, tile by tile, yielding between tiles so the progress text paints. A worker is the next step if large photos feel slow on older phones (seam candidate, no evidence yet).
- Faces in strong profile or heavily occluded can still be missed; the editor's **Add** button covers them by hand, and the cover follows a drag.
- BlazeFace gives a box and six key points, enough for position, size and roll. Transforms that need the face's shape (AR lenses, warping) will swap in the Face Landmarker through the same seam.
