# What Faceover reuses, and the search behind it

The fleet search (`fleet-protocol`) run on 2026-11-25 before any code: package and skill indexes (`ir discover packages|skills|reports` with several phrasings: face detection, landmarks, image generation, face anonymization, PWA deploy), the project registry (`projreg search face`, `landmark`, `image generation`), and every `package.json` under the projects folder for `mediapipe`, `face-api`, `tasks-vision`, `blazeface` or `human`.

## Reused

| What | From | Why |
|---|---|---|
| MediaPipe tasks-vision loading pattern (lazy `import()`, `FilesetResolver`, CPU/GPU delegate) | the thoremin apps (hand and face landmarkers in the browser) | proven in production on phones; Faceover differs only in serving the wasm and model from its own origin instead of jsDelivr / Google storage |
| `@zodal/store` `DataProvider` + `@zodal/store-localstorage` | the zodal family | preferences (chosen animal, cover size) are stored behind the store interface, so they can move to IndexedDB or a synced store by swapping one provider |
| Zod-schema-as-SSOT, zustand + immer, shadcn Button | the frontend stack (`frontend` skill) | the face model, transform union and preferences are Zod schemas; types derive from them |
| Static Vite app on enlace (`app.toml` with `[build]`, `frontend_dir = "dist"`, `VITE_PUBLIC_BASE`) | srtplay, glossa | the platform builds and serves it at `/faceover/` with no server code |
| App icon and social card (`scripts/app_icons/app_art.py`) | tw_platform (ADR-0018) | one SVG in, `icon-512.png` and `og-image.png` out |
| Fluent Emoji (MIT) as the art source | tw_platform app icons already use Fluent Emoji motifs | a licence the platform has already vetted; now the animal faces too |
| Analytics opt-out (`[deploy] analytics = false`) | tw_platform `deploy.py` (`app_ga_id`, the kangourou precedent) | a page that promises nothing leaves the device must not load a third-party tracker |

## Looked at, not used

| What | Why not |
|---|---|
| `lookbook` (face detection and ArcFace identity diversity for LoRA curation) | Python, server-side; Faceover must run in the browser |
| `aix.generate_image` and other image-generation facades | generating animal faces would cost an API call per asset and an unclear licence chain; Fluent Emoji is MIT and already vetted |
| `pyckup` (Kaggle face-landmark datasets) | datasets of real faces; not needed for a pretrained detector, and real faces stay out of the repo |
| `sigilsmith` | for item thumbnails in lists; Faceover has no item list |

## Gaps (what a second app would want)

- **An in-browser face-detection component** (tiled detection, NMS, a `DetectFn` seam, self-hosted MediaPipe) does not exist in the fleet. Thoremin has face *landmarking* for a webcam stream, Faceover has face *detection* for still photos. `src/core/` is written with no React or app imports so it can be extracted when a second consumer appears (extraction candidate: a webcam/video mode, or thoremin's face source).
