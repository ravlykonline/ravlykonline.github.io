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

test.describe('Public page accessibility shell', () => {
  for (const path of PAGE_CASES) {
    test(`${path} exposes skip link, main landmark, and accessibility controls`, async ({ page }) => {
      await page.goto(path);

      const skipLink = page.locator('.skip-link');
      await expect(skipLink).toHaveAttribute('href', '#main-content');

      const main = page.locator('main#main-content');
      await expect(main).toHaveCount(1);

      const accessibilityToggle = page.locator('#accessibility-toggle');
      const accessibilityPanel = page.locator('#accessibility-panel');

      await expect(accessibilityToggle).toHaveCount(1);
      await expect(accessibilityPanel).toHaveCount(1);
      await expect(accessibilityPanel).toHaveAttribute('role', 'dialog');
      await expect(accessibilityPanel).toHaveAttribute('aria-modal', 'true');

      await accessibilityToggle.click({ force: true });
      await expect(accessibilityPanel).not.toHaveClass(/hidden/);

      await page.keyboard.press('Escape');
      await expect(accessibilityPanel).toHaveClass(/hidden/);
      await expect(accessibilityToggle).toBeFocused();
    });
  }
});
