/** e2e at phone width, against the production build (CSP and service worker included). */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  use: { baseURL: 'http://localhost:4317/faceover/' },
  webServer: { command: 'npx vite preview --port 4317 --strictPort', url: 'http://localhost:4317/faceover/', reuseExistingServer: true },
  projects: [
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'pixel-chromium', use: { ...devices['Pixel 7'] } },
  ],
});
