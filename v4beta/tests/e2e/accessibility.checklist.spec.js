import { test, expect } from '@playwright/test';

const PAGE_CASES = [
    '/index.html',
    '/lessons.html',
    '/manual.html',
    '/quiz.html',
    '/resources.html',
    '/advice_for_parents.html',
    '/teacher_guidelines.html',
    '/zen.html',
    '/about.html',
];

async function openAccessibilityPanel(page, toggle, panel) {
    await toggle.click({ force: true });

    await expect
        .poll(async () => {
            return page.evaluate(() => {
                const toggleElement = document.getElementById('accessibility-toggle');
                const panelElement = document.getElementById('accessibility-panel');
                return Boolean(
                    toggleElement &&
                    panelElement &&
                    toggleElement.getAttribute('aria-expanded') === 'true' &&
                    !panelElement.classList.contains('hidden')
                );
            });
        })
        .toBe(true);

    await expect(panel).not.toHaveClass(/hidden/);
}

test.describe('Accessibility checklist keyboard smoke', () => {
    for (const path of PAGE_CASES) {
        test(`${path} keeps skip-link and panel keyboard flow intact`, async ({ page }) => {
            await page.goto(path);
            await page.waitForTimeout(100);

            const skipLink = page.locator('.skip-link');
            const toggle = page.locator('#accessibility-toggle');
            const panel = page.locator('#accessibility-panel');

            await page.keyboard.press('Tab');
            await expect(skipLink).toBeFocused();

            await page.keyboard.press('Enter');
            await expect.poll(async () => page.evaluate(() => location.hash)).toBe('#main-content');

            await openAccessibilityPanel(page, toggle, panel);

            const focusInsidePanel = await page.evaluate(() => {
                const panelElement = document.getElementById('accessibility-panel');
                return Boolean(panelElement && document.activeElement && panelElement.contains(document.activeElement));
            });
            expect(focusInsidePanel).toBe(true);

            await page.keyboard.press('Escape');
            await expect(panel).toHaveClass(/hidden/);
            await expect(toggle).toBeFocused();
        });
    }
});
