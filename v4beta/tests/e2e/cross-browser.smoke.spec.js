import { test, expect } from '@playwright/test';

test.describe('Cross-browser smoke', () => {
  test('@cross-browser-smoke index page runs a basic drawing program', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#code-editor', 'повторити 4 ( вперед 40 праворуч 90 )');
    await page.locator('#run-btn').click();
    await expect(page.locator('#run-btn')).toBeEnabled();

    const alphaPixels = await page.evaluate(() => {
      const canvas = document.getElementById('ravlyk-canvas');
      const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
      if (!canvas || !ctx) return 0;

      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let colored = 0;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] > 0) colored++;
      }
      return colored;
    });

    expect(alphaPixels).toBeGreaterThan(0);
  });

  test('@cross-browser-smoke manual page keeps accessibility settings after reload', async ({ page }) => {
    await page.goto('/manual.html');
    await page.evaluate(() => localStorage.removeItem('ravlyk_accessibility_settings_v2'));
    await page.reload();

    await page.locator('#accessibility-toggle').click({ force: true });
    await page.locator('input[data-setting="high-contrast"]').check({ force: true });
    await page.locator('input[data-setting="larger-text"]').check({ force: true });

    await expect
      .poll(async () => page.evaluate(() => ({
        highContrast: document.documentElement.classList.contains('a11y-high-contrast'),
        largerText: document.documentElement.classList.contains('a11y-larger-text'),
      })))
      .toEqual({
        highContrast: true,
        largerText: true,
      });

    await page.reload();

    await expect
      .poll(async () => page.evaluate(() => ({
        highContrast: document.documentElement.classList.contains('a11y-high-contrast'),
        largerText: document.documentElement.classList.contains('a11y-larger-text'),
      })))
      .toEqual({
        highContrast: true,
        largerText: true,
      });
  });

  test('@cross-browser-smoke quiz page starts a new set and renders questions', async ({ page }) => {
    await page.goto('/quiz.html');
    await page.locator('#quiz-new-set-btn').click();
    await expect(page.locator('.quiz-question')).toHaveCount(10);
  });
});
