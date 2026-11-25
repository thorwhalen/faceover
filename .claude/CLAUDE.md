# faceover — map for agents building it

Seams (v1 default → replacement in view):
- detector: `detectFaces(img, { detector })`, default MediaPipe full-range BlazeFace, tiled → Face Landmarker (AR lenses), a Web Worker
- transform: `renderComposite(..., { transforms })` + `FaceTransformSpec` union, default `{ animal }` → blur, pixelate, emoji, AR lens (owner's roadmap)
- prefs store: zodal `DataProvider`, default `@zodal/store-localstorage` → IndexedDB / synced provider
Surfaces built: web frontend (PWA) only. NOT seams: tile sizes, NMS thresholds, preview size (constants, on purpose).

- `src/core/`: framework-free logic (schema, geometry, detect, transforms, render, image I/O). Keep React and app imports out: it is an extraction candidate.
- `src/state/`: the zustand store and preferences. `src/ui/`: React components.
- Decisions: `docs/adr/`. Research: `docs/research/`. Fleet reuse record: `docs/reuse.md`.
- One-command check: `npm test && npm run build && npm run test:e2e` (needs samples in `~/.local/share/faceover/samples/`).
- Never commit photos of real people (`.gitignore` blocks jpg/jpeg/heic). Assets need a recorded source and a redistributable licence (`public/*/SOURCES.md`).
- Deploy: tw_platform lists `../faceover` in `platform.toml`; deploy from the Mac with `python deploy.py cmd-deploy --app faceover --force` (the `tw-deploy` skill).
