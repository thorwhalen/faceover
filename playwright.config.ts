/** e2e at phone width, against the production build (CSP and service worker included). */
import { defineConfig, devices } from '@playwright/test';

// FACEOVER_URL runs the same test against a deployed site (e.g. https://apps.thorwhalen.com/faceover/).
const live = process.env.FACEOVER_URL;
const local = 'http://localhost:4317/faceover/';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  use: { baseURL: live ?? local, video: process.env.FACEOVER_VIDEO ? 'on' : 'off' },
  webServer: live ? undefined : { command: 'npx vite preview --port 4317 --strictPort', url: local, reuseExistingServer: true },
  projects: [
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'pixel-chromium', use: { ...devices['Pixel 7'] } },
  ],
});
