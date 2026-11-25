/**
 * Vite config. The app is mounted at /faceover/ on apps.thorwhalen.com; the deployer
 * injects VITE_PUBLIC_BASE, and a hand build falls back to the same value.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.VITE_PUBLIC_BASE || '/faceover/';
const THEME = '#0a0a0a';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['animals/*.svg', 'models/*.tflite', 'mediapipe/*', 'icon-512.png'],
      manifest: {
        name: 'Faceover',
        short_name: 'Faceover',
        description: 'Hide every face in a photo behind an animal, on your device.',
        theme_color: THEME,
        background_color: THEME,
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The wasm runtime (~15 MB) and the model are precached so the app works offline.
        globPatterns: ['**/*.{js,css,html,svg,png,tflite,wasm,webmanifest}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as never);
