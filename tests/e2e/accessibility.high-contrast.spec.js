import { test, expect } from '@playwright/test';

const HIGH_CONTRAST_SETTINGS = {
    'high-contrast': true,
    'larger-text': false,
    'reduce-animations': false,
    'sans-serif-font': false,
    'increased-spacing': false,
};

async function enableHighContrast(page, path) {
    await page.goto(path);
    await page.evaluate((settings) => {
        localStorage.setItem('ravlyk_accessibility_settings_v2', JSON.stringify(settings));
    }, HIGH_CONTRAST_SETTINGS);
    await page.reload();
}

async function getComputedSnapshot(page, selector) {
    return page.evaluate((targetSelector) => {
        const node = document.querySelector(targetSelector);
        if (!node) return null;
        const styles = getComputedStyle(node);
        return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            borderColor: styles.borderColor,
        };
    }, selector);
}

test.describe('High-contrast page styling', () => {
    test('quiz page adapts cards, options, and results', async ({ page }) => {
        await enableHighContrast(page, '/quiz.html');

        const card = await getComputedSnapshot(page, '.quiz-card');
        const option = await getComputedSnapshot(page, '#quiz-theme');
        const result = await getComputedSnapshot(page, '#quiz-result');

        expect(card).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
        expect(option).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
        expect(result).toMatchObject({
            backgroundColor: 'rgb(17, 17, 17)',
            color: 'rgb(255, 255, 255)',
        });
    });

    test('editor messages adapt in high-contrast mode', async ({ page }) => {
        await enableHighContrast(page, '/index.html');
        await page.fill('#code-editor', 'вперед 10');
        await page.locator('#clear-btn').click();
        await page.locator('#confirm-clear-btn').click();

        const message = await getComputedSnapshot(page, '#global-message-display');
        expect(message).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
    });

    test('lesson path table stays readable in high-contrast mode', async ({ page }) => {
        await enableHighContrast(page, '/lessons.html');

        const section = await getComputedSnapshot(page, '.lesson-path-section');
        const headerCell = await getComputedSnapshot(page, '.lesson-path-table thead th');
        const bodyCell = await getComputedSnapshot(page, '.lesson-path-table tbody td');

        expect(section).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
        expect(headerCell).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
        expect(bodyCell).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
    });

    test('zen cards and labels adapt in high-contrast mode', async ({ page }) => {
        await enableHighContrast(page, '/zen.html');

        const label = await getComputedSnapshot(page, '.zen-section-label');
        const card = await getComputedSnapshot(page, '.zen-principle');
        const button = await getComputedSnapshot(page, '.zen-copy-btn');

        expect(label).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
        expect(card).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
        expect(button).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
    });

    test('resources page cards and badges adapt in high-contrast mode', async ({ page }) => {
        await enableHighContrast(page, '/resources.html');

        const section = await getComputedSnapshot(page, '.resource-section');
        const item = await getComputedSnapshot(page, '.resource-item');
        const badge = await getComputedSnapshot(page, '.coming-soon');

        expect(section).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
        expect(item).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
        expect(badge).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
    });

    test('parents page cards and printable blocks adapt in high-contrast mode', async ({ page }) => {
        await enableHighContrast(page, '/advice_for_parents.html');

        const card = await getComputedSnapshot(page, '.parent-card');
        const phrase = await getComputedSnapshot(page, '.phrase');
        const printSheet = await getComputedSnapshot(page, '.print-sheet');

        expect(card).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
        expect(phrase).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
        expect(printSheet).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
    });

    test('teacher page cards and tables adapt in high-contrast mode', async ({ page }) => {
        await enableHighContrast(page, '/teacher_guidelines.html');

        const card = await getComputedSnapshot(page, '.teacher-card');
        const table = await getComputedSnapshot(page, '.teacher-table');
        const headerCell = await getComputedSnapshot(page, '.teacher-table th');

        expect(card).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
        expect(table).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
        expect(headerCell).toMatchObject({
            backgroundColor: 'rgb(0, 0, 0)',
            color: 'rgb(255, 255, 255)',
        });
    });
});
