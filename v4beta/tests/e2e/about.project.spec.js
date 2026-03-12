import { test, expect } from '@playwright/test';

const PUBLIC_PAGES = [
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

test.describe('About project page and footer navigation', () => {
    for (const path of PUBLIC_PAGES) {
        test(`${path} exposes footer navigation to the project page`, async ({ page }) => {
            await page.goto(path);

            const aboutLink = page.locator('a[href="about.html"]').last();
            await expect(aboutLink).toHaveCount(1);
            await expect(aboutLink).toContainText('Про проєкт');
        });
    }

    test('about page explains Logo-like origin and Ravlyk-specific contribution', async ({ page }) => {
        await page.goto('/about.html');

        await expect(page.locator('main#main-content')).toContainText('У мові програмування Logo є черепаха');
        await expect(page.locator('main#main-content')).toContainText('у власній українськомовній формі');
        await expect(page.locator('main#main-content')).toContainText('не претендує на авторство самої ідеї');
    });
});
