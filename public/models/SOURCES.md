# Face detector models

From Google's MediaPipe model storage, Apache-2.0 (see the MediaPipe Face Detector model card linked from https://developers.google.com/edge/mediapipe/solutions/vision/face_detector), fetched 2026-11-25:

| File | URL | sha256 |
|---|---|---|
| `blaze_face_full_range.tflite` | https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite | `3698b18f063835bc609069ef052228fbe86d9c9a6dc8dcb7c7c2d69aed2b181b` |

The wasm runtime is not committed: `scripts/copy-mediapipe-wasm.mjs` copies it from `@mediapipe/tasks-vision` (Apache-2.0) into `public/mediapipe/` before every dev or build run.
