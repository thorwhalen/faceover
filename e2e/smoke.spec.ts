/**
 * The one-command test: open the app at phone width, give it a photo, every face gets
 * covered, the result saves. Photos of people are never in this repo: they are read from
 * ~/.local/share/faceover/samples/ (override with FACEOVER_SAMPLES) and the test skips
 * without them. Also asserts the privacy promise: no request leaves this origin.
 */
import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SAMPLES = process.env.FACEOVER_SAMPLES ?? join(homedir(), '.local/share/faceover/samples');
const CASES = [
  { file: 'nasa-crew.jpg', min: 4 },
  { file: 'solvay1927.jpg', min: 25 },
];
const SHOTS = process.env.FACEOVER_SHOTS;

for (const { file, min } of CASES) {
  test(`covers the faces in ${file}`, async ({ page, baseURL }, info) => {
    const path = join(SAMPLES, file);
    test.skip(!existsSync(path), `sample ${path} not present`);
    const origin = new URL(baseURL!).origin;
    const foreign: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith(origin) && !u.startsWith('blob:') && !u.startsWith('data:')) foreign.push(u);
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('');
    await expect(page.getByRole('heading', { name: 'Faceover' })).toBeVisible();
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${info.project.name}-0-start.png`) });
    await page.getByTestId('file-input').setInputFiles(path);
    await expect(page.getByTestId('face-count')).toHaveText(/faces? covered/, { timeout: 90_000 });
    const n = await page.getByTestId('face-handle').count();
    console.log(`${info.project.name} ${file}: ${n} faces`);
    expect(n).toBeGreaterThanOrEqual(min);
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${info.project.name}-1-${file}.png`) });

    // Covers are hit-tested on the stage (nearest face), so the tap lands through the handle.
    await page.getByTestId('face-handle').first().click({ force: true });
    await expect(page.getByText('This face')).toBeVisible();
    await page.getByRole('option', { name: 'panda' }).click();
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${info.project.name}-2-${file}-selected.png`) });

    const download = page.waitForEvent('download');
    await page.getByTestId('save').click();
    const d = await download;
    expect(d.suggestedFilename()).toMatch(/-faceover\.jpg$/);
    if (SHOTS) await d.saveAs(join(SHOTS, `${info.project.name}-${file.replace('.jpg', '')}-result.jpg`));

    expect(errors).toEqual([]);
    expect(foreign).toEqual([]);
  });
}
