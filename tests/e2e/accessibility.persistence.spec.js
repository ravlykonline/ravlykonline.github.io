import { test, expect } from '@playwright/test';

const PAGE_CASES = [
    '/index.html',
    '/manual.html',
    '/lessons.html',
    '/quiz.html',
    '/resources.html',
    '/advice_for_parents.html',
    '/teacher_guidelines.html',
    '/zen.html',
    '/about.html',
    '/privacy.html',
];

const SETTINGS = [
    ['high-contrast', 'a11y-high-contrast'],
    ['larger-text', 'a11y-larger-text'],
    ['reduce-animations', 'a11y-reduce-animations'],
    ['sans-serif-font', 'a11y-sans-serif-font'],
    ['increased-spacing', 'a11y-increased-spacing'],
];

test.describe('Accessibility settings persistence on public pages', () => {
    for (const path of PAGE_CASES) {
        test(`${path} keeps every accessibility setting after reload`, async ({ page }) => {
            await page.goto(path);
            await page.evaluate(() => localStorage.removeItem('ravlyk_accessibility_settings_v2'));
            await page.reload();

            await page.locator('#accessibility-toggle').click({ force: true });
            for (const [setting] of SETTINGS) {
                await page.locator(`input[data-setting="${setting}"]`).check({ force: true });
            }

            await expect.poll(async () => page.evaluate(
                (settings) => settings.map(([, className]) => document.documentElement.classList.contains(className)),
                SETTINGS
            )).toEqual(SETTINGS.map(() => true));

            await page.reload();

            await expect.poll(async () => page.evaluate(
                (settings) => settings.map(([, className]) => document.documentElement.classList.contains(className)),
                SETTINGS
            )).toEqual(SETTINGS.map(() => true));
        });
    }
});
