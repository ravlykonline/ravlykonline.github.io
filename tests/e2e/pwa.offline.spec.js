import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// The canonical release token drives both versioned asset URLs and cache names.
const { releaseVersion } = JSON.parse(readFileSync('release-version.json', 'utf8'));

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

    // Playwright's offline emulation does not cover requests the service worker
    // itself issues, so asserting that a stale ?v= fetch rejects would be
    // vacuous: the worker still reaches the network and answers 200. Assert the
    // invariant the worker actually depends on instead — lookups in the current
    // caches are exact-key, so a stale or bare URL can never resolve to the
    // cached versioned asset. The worker-side logic is covered in
    // tests/serviceWorker.test.js.
    const cacheKeys = await page.evaluate(async (activeVersion) => {
      const names = (await caches.keys()).filter((name) => (
        name.startsWith('ravlyk-app-') || name.startsWith('ravlyk-runtime-')
      ));
      const isCached = async (url) => {
        for (const name of names) {
          if (await (await caches.open(name)).match(url)) return true;
        }
        return false;
      };
      return {
        active: await isCached(`/js/main.js?v=${activeVersion}`),
        stale: await isCached('/js/main.js?v=not-the-active-release'),
        bare: await isCached('/js/main.js'),
      };
    }, releaseVersion);

    expect(cacheKeys.active).toBe(true);
    expect(cacheKeys.stale).toBe(false);
    expect(cacheKeys.bare).toBe(false);
  });
});
