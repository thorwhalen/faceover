# Face detection and de-identification in the browser: options for Faceover

**Summary and recommendation.** Use MediaPipe's Face Detector with the full-range BlazeFace model [1][2], served from the app's own origin, scanned over overlapping tiles at three scales (slicing-aided inference [10]) to catch small faces in group photos. Cover each face with an opaque image rather than blurring or pixelating it: blur and mosaic are known to be defeated by recognition models [12], and an opaque cover is the stronger de-identification [11]. The decision is recorded in `docs/adr/0001-in-browser-face-detector.md`.

## Standard terminology

- **Face de-identification / face anonymization**: removing the identity information of faces in images while keeping the image useful [11]. Faceover is a de-identification tool; "animal faces" is one *obfuscation* method among blur, pixelation, masking and synthetic replacement.
- **Face detection** (boxes plus a few key points) versus **face landmarking / face mesh** (hundreds of points, [4]).
- **Slicing-aided (hyper) inference, SAHI**: running a detector over overlapping slices of a large image to find small objects, then merging [10].
- **Non-maximum suppression (NMS)**: keeping the best of overlapping detections.

## Libraries (browser, on device)

| Library | Licence | Maintenance | Notes | Verdict |
|---|---|---|---|---|
| `@mediapipe/tasks-vision` Face Detector [1][3] | Apache-2.0 | active (npm 1.2.3, nightly 1.3.0 rc) | BlazeFace short-range (selfie), full-range (back camera) and sparse full-range variants listed [1]; the full-range `.tflite` is downloadable, the sparse one was not at the time of writing | **depend** |
| `@mediapipe/tasks-vision` Face Landmarker [4] | Apache-2.0 | active | 478-point mesh, blendshapes; needed later for AR-style transforms | depend later |
| face-api.js [5] | MIT | last release 2020 | tfjs 1.x | avoid |
| `@vladmandic/face-api` [6] | MIT | archived; its README says it is superseded by Human | | avoid |
| `@vladmandic/human` [7] | MIT | active (3.3.6) | face, body, hand, iris; heavier tfjs runtime | study |

## Method notes

- BlazeFace [2] is a sub-millisecond mobile detector working on a 128 px (short-range) or larger (full-range) input; a face that shrinks below a few pixels at that input is lost, which is why whole-image detection misses faces in group photos and tiling recovers them.
- Merging tile results with plain IoU keeps a half-face box from a tile edge next to the full box; overlap divided by the smaller area removes it.
- Roll is taken from the eye key points, so covers tilt with the head.
- Re-encoding through a canvas drops the original file's metadata (GPS, camera, time), which is itself a de-identification step.

## Assets

- Animal faces: Microsoft Fluent Emoji, flat style, MIT [8]. Side-profile or body-shaped art (unicorn, owl) was dropped because it leaves parts of a face visible.
- Test photos: public-domain images only (the 1927 Solvay conference photo [9]; a NASA crew portrait, public domain as a US government work), kept outside the repository.

## Prior art

Face-blurring and masking apps exist on every platform (Signal's built-in face blur, numerous "face swap with emoji" apps). Faceover's differences are that it is a web app that never uploads the image, and that its transform is a seam, so blur, pixelate, emoji and AR lenses are additions rather than rewrites.

## REFERENCES

1. Google. [Face detection guide (MediaPipe Tasks)](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector). Accessed 2026-11-25.
2. Bazarevsky V, Kartynnik Y, Vakunov A, Raveendran K, Grundmann M. [BlazeFace: Sub-millisecond Neural Face Detection on Mobile GPUs](https://arxiv.org/abs/1907.05047). arXiv:1907.05047; 2019.
3. Google. [@mediapipe/tasks-vision on npm](https://www.npmjs.com/package/@mediapipe/tasks-vision). Version 1.2.3, Apache-2.0.
4. Google. [Face landmark detection guide (MediaPipe Tasks)](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker). Accessed 2026-11-25.
5. Mühler V. [face-api.js](https://github.com/justadudewhohacks/face-api.js). GitHub; MIT.
6. Mandic V. [@vladmandic/face-api](https://github.com/vladmandic/face-api). GitHub; MIT; archived.
7. Mandic V. [Human: AI-powered 3D face, body, hand and iris tracking](https://github.com/vladmandic/human). GitHub; MIT.
8. Microsoft. [Fluent Emoji](https://github.com/microsoft/fluentui-emoji). GitHub; MIT.
9. Couprie B. [Solvay conference 1927](https://commons.wikimedia.org/wiki/File:Solvay_conference_1927.jpg). Wikimedia Commons; public domain.
10. Akyon FC, Altinuc SO, Temizel A. [Slicing Aided Hyper Inference and Fine-tuning for Small Object Detection](https://arxiv.org/abs/2202.06934). arXiv:2202.06934; 2022.
11. Newton EM, Sweeney L, Malin B. [Preserving privacy by de-identifying face images](https://doi.org/10.1109/TKDE.2005.32). IEEE Trans Knowl Data Eng. 2005;17(2):232-43.
12. McPherson R, Shokri R, Shmatikov V. [Defeating Image Obfuscation with Deep Learning](https://arxiv.org/abs/1609.00408). arXiv:1609.00408; 2016.
