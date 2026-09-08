import { test, expect } from '@playwright/test';

const SUPPORTING_PAGE_CASES = [
    '/manual.html',
    '/lessons.html',
    '/resources.html',
    '/teacher_guidelines.html',
    '/advice_for_parents.html',
    '/zen.html',
    '/about.html',
    '/privacy.html',
    '/404.html',
];

async function waitForServiceWorker(page) {
    await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service worker is not supported in this browser.');
        }

        // registerServiceWorker.js skips registration on non-production hosts,
        // so in the E2E test environment (127.0.0.1) we register explicitly.
        if (!navigator.serviceWorker.controller) {
            await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        }

        await navigator.serviceWorker.ready;
    });
}

test.describe('PWA offline shell', () => {
    test('core public pages and quiz data stay available offline after warm cache', async ({ page, context }) => {
        const pageErrors = [];
        page.on('pageerror', (error) => {
            pageErrors.push(String(error));
        });

        await page.goto('/index.html');
        await waitForServiceWorker(page);

        // Reload once so the page is controlled by the freshly activated service worker.
        await page.reload({ waitUntil: 'networkidle' });

        await context.setOffline(true);

        await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#code-editor')).toBeVisible();
        await expect(page.locator('#run-btn')).toBeVisible();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.locator('#code-editor')).toBeVisible();

        for (const path of SUPPORTING_PAGE_CASES) {
            await page.goto(path, { waitUntil: 'domcontentloaded' });
            await expect(page.locator('main#main-content')).toBeVisible();
        }

        await page.goto('/quiz.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#quiz-new-set-btn')).toBeVisible();
        await page.locator('#quiz-new-set-btn').click();
        await expect(page.locator('.quiz-question')).toHaveCount(10);

        expect(pageErrors, `Offline shell should not throw runtime errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });

  test('runtime navigation cache is current and versioned assets require an exact key', async ({ page, context }) => {
    await page.goto('/index.html');
    await waitForServiceWorker(page);
    await page.reload({ waitUntil: 'networkidle' });

    await page.goto('/manual.html?runtime-cache-smoke=1', { waitUntil: 'domcontentloaded' });
    const runtimeKeys = await page.evaluate(async () => {
      const names = await caches.keys();
      const runtimeName = names.find((name) => name.startsWith('ravlyk-runtime-'));
      if (!runtimeName) return [];
      return (await (await caches.open(runtimeName)).keys()).map((request) => request.url);
    });
    expect(runtimeKeys.some((url) => url.endsWith('/manual.html?runtime-cache-smoke=1'))).toBe(true);

    await context.setOffline(true);
    await page.goto('/manual.html?runtime-cache-smoke=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main#main-content')).toBeVisible();

    const versionedMiss = await page.evaluate(async () => {
      try {
        await fetch('/js/main.js?v=not-the-active-release');
        return false;
      } catch {
        return true;
      }
    });
    expect(versionedMiss).toBe(true);
  });
});
