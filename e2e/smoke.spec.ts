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

    // A request the CSP blocks never reaches the network log, so collect violations too
    // (e.g. a library's usage telemetry to a third party).
    await page.addInitScript(() => {
      (window as any).__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (e) => (window as any).__cspViolations.push(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}:${e.columnNumber}`));
    });
    await page.goto('');
    await expect(page.getByRole('heading', { name: 'Faceover' })).toBeVisible();
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${info.project.name}-0-start.png`) });
    await page.getByTestId('file-input').setInputFiles(path);
    await expect(page.getByTestId('face-count')).toHaveText(/faces? covered/, { timeout: 90_000 });
    const n = await page.getByTestId('face-handle').count();
    console.log(`${info.project.name} ${file}: ${n} faces`);
    expect(n).toBeGreaterThanOrEqual(min);
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${info.project.name}-1-${file}.png`) });

    // The stage that maps taps to image pixels must be exactly the drawn photo (no letterbox).
    const preview = page.getByTestId('preview');
    const [cb, sb] = [await preview.boundingBox(), await preview.locator('..').boundingBox()];
    expect(Math.abs(cb!.width - sb!.width) + Math.abs(cb!.height - sb!.height)).toBeLessThan(2);
    // The preview draws asynchronously; wait for the drawn canvas, then compare aspects.
    await expect
      .poll(() => preview.evaluate((c: HTMLCanvasElement) => c.width / c.height))
      .toBeCloseTo(cb!.width / cb!.height, 1);

    // Covers are hit-tested on the stage (nearest face), so the tap lands through the handle.
    await page.getByTestId('face-handle').first().click({ force: true });
    await expect(page.getByText('This face')).toBeVisible();
    await page.getByRole('button', { name: 'panda', exact: true }).click();

    // Dragging a cover moves it exactly with the pointer.
    const handle = page.getByTestId('face-handle').first();
    const before = (await handle.boundingBox())!;
    const [x, y] = [before.x + before.width / 2, before.y + before.height / 2];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 20, y + 15, { steps: 4 });
    await page.mouse.up();
    const after = (await handle.boundingBox())!;
    expect(after.x - before.x).toBeCloseTo(20, -0.5);
    expect(after.y - before.y).toBeCloseTo(15, -0.5);
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${info.project.name}-2-${file}-selected.png`) });

    const download = page.waitForEvent('download');
    await page.getByTestId('save').click();
    const d = await download;
    expect(d.suggestedFilename()).toMatch(/^faceover-\d{8}-\d{6}\.jpg$/);
    if (SHOTS) await d.saveAs(join(SHOTS, `${info.project.name}-${file.replace('.jpg', '')}-result.jpg`));

    expect(errors).toEqual([]);
    expect(foreign).toEqual([]);
    expect(await page.evaluate(() => (window as any).__cspViolations)).toEqual([]);
  });
}
