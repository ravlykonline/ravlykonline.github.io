import { test, expect } from '@playwright/test';

const PAGE_CASES = [
    '/manual.html',
    '/lessons.html',
];

test.describe('Accessibility settings persistence on public pages', () => {
    for (const path of PAGE_CASES) {
        test(`${path} keeps key accessibility settings after reload`, async ({ page }) => {
            await page.goto(path);
            await page.evaluate(() => localStorage.removeItem('ravlyk_accessibility_settings_v2'));
            await page.reload();

            await page.locator('#accessibility-toggle').click({ force: true });
            await page.locator('input[data-setting="high-contrast"]').check({ force: true });
            await page.locator('input[data-setting="larger-text"]').check({ force: true });
            await page.locator('input[data-setting="reduce-animations"]').check({ force: true });

            await expect.poll(async () => page.evaluate(() => ({
                highContrast: document.documentElement.classList.contains('a11y-high-contrast'),
                largerText: document.documentElement.classList.contains('a11y-larger-text'),
                reducedMotion: document.documentElement.classList.contains('a11y-reduce-animations'),
            }))).toEqual({
                highContrast: true,
                largerText: true,
                reducedMotion: true,
            });

            await page.reload();

            await expect.poll(async () => page.evaluate(() => ({
                highContrast: document.documentElement.classList.contains('a11y-high-contrast'),
                largerText: document.documentElement.classList.contains('a11y-larger-text'),
                reducedMotion: document.documentElement.classList.contains('a11y-reduce-animations'),
            }))).toEqual({
                highContrast: true,
                largerText: true,
                reducedMotion: true,
            });
        });
    }
});
