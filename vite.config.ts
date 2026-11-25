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
        // The app shell is precached. The wasm runtime (~15 MB) and the model are cached on
        // first use instead (a precache entry carries a revision query, so the browser would
        // download the wasm twice on the first visit).
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: `${base}index.html`,
        // Credits and licence files must open as themselves, not as the app.
        navigateFallbackDenylist: [/\.md$/, /LICENSE$/, /credits\.html$/],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/(mediapipe|models)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'faceover-models', expiration: { maxEntries: 10 } },
          },
        ],
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as never);
