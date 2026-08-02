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
      await expect(accessibilityPanel).toHaveAttribute('tabindex', '-1');
      await expect.poll(() => accessibilityToggle.evaluate((toggle) => {
        const rect = toggle.getBoundingClientRect();
        const hitTarget = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        );
        return hitTarget === toggle || toggle.contains(hitTarget);
      })).toBe(true);

      await accessibilityToggle.click();
      await expect(accessibilityPanel).not.toHaveClass(/hidden/);
      await expect(accessibilityToggle).toHaveAttribute('aria-expanded', 'true');

      await page.keyboard.press('Escape');
      await expect(accessibilityPanel).toHaveClass(/hidden/);
      await expect(accessibilityToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(accessibilityToggle).toBeFocused();
    });
  }
});
