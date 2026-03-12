import { test, expect } from '@playwright/test';

async function waitForServiceWorker(page) {
    await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service worker is not supported in this browser.');
        }

        await navigator.serviceWorker.ready;
    });
}

test.describe('PWA offline shell', () => {
    test('core public pages and quiz data stay available offline after warm cache', async ({ page, context }) => {
        await page.goto('/index.html');
        await waitForServiceWorker(page);

        // Reload once so the page is controlled by the freshly activated service worker.
        await page.reload({ waitUntil: 'networkidle' });

        await context.setOffline(true);

        await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#code-editor')).toBeVisible();
        await expect(page.locator('#run-btn')).toBeVisible();

        await page.goto('/manual.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main#main-content')).toBeVisible();

        await page.goto('/lessons.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main#main-content')).toBeVisible();

        await page.goto('/quiz.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#quiz-new-set-btn')).toBeVisible();
        await page.locator('#quiz-new-set-btn').click();
        await expect(page.locator('.quiz-question')).toHaveCount(10);
    });
});
