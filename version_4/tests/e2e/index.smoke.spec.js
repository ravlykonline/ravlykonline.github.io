import { test, expect } from '@playwright/test';

const GAME_CODE = [
  '\u0433\u0440\u0430\u0442\u0438 (',
  '  \u044f\u043a\u0449\u043e \u043a\u043b\u0430\u0432\u0456\u0448\u0430 "\u0432\u043d\u0438\u0437" ( \u043d\u0430\u0437\u0430\u0434 3 )',
  ')',
].join('\n');

test.describe('Ravlyk UI smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('help modal closes on Escape and returns focus to help button', async ({ page }) => {
    const helpBtn = page.locator('#help-btn');
    await helpBtn.click();

    const modal = page.locator('#help-modal-overlay');
    await expect(modal).not.toHaveClass(/hidden/);

    await page.keyboard.press('Escape');
    await expect(modal).toHaveClass(/hidden/);
    await expect(helpBtn).toBeFocused();
  });

  test('accessibility panel traps focus and persists high contrast after reload', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('ravlyk_accessibility_settings_v2'));

    await page.locator('#accessibility-toggle').click();
    const panel = page.locator('#accessibility-panel');
    await expect(panel).not.toHaveClass(/hidden/);

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusInsidePanel = await page.evaluate(() => {
      const panelElement = document.getElementById('accessibility-panel');
      return Boolean(panelElement && document.activeElement && panelElement.contains(document.activeElement));
    });
    expect(focusInsidePanel).toBe(true);

    const highContrastInput = page.locator('#high-contrast-input');
    await highContrastInput.check({ force: true });
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains('a11y-high-contrast')))
      .toBe(true);

    await page.reload();
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains('a11y-high-contrast')))
      .toBe(true);
  });

  test('game mode blocks page scroll on arrow keys', async ({ page }) => {
    await page.evaluate((code) => {
      window.scrollTo(0, 500);
      const editor = document.getElementById('code-editor');
      if (editor) {
        editor.value = code;
      }
    }, GAME_CODE);

    await page.locator('#run-btn').click();
    await page.waitForTimeout(200);

    const before = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => window.scrollY);

    expect(after).toBe(before);

    await page.evaluate(() => {
      if (window.ravlykInterpreterInstance && typeof window.ravlykInterpreterInstance.stopExecution === 'function') {
        window.ravlykInterpreterInstance.stopExecution();
      }
    });
  });

  test('example smoke-run starts game mode and can be stopped', async ({ page }) => {
    const gameExample = page.locator('.example-block').last();
    await gameExample.click();

    await expect(page.locator('#stop-btn')).toBeEnabled();
    await expect(page.locator('#ravlyk-command-indicator')).toContainText('\u0433\u0440\u0430\u0442\u0438');

    await page.evaluate(() => {
      if (window.ravlykInterpreterInstance && typeof window.ravlykInterpreterInstance.stopExecution === 'function') {
        window.ravlykInterpreterInstance.stopExecution();
      }
    });

    await expect(page.locator('#run-btn')).toBeEnabled();
  });
});
