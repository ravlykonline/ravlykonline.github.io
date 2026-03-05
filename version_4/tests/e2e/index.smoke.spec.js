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

    await page.locator('#accessibility-toggle').click({ force: true });
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

  test('high-contrast mode applies expected visual contract for buttons and modals', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('ravlyk_accessibility_settings_v2'));
    await page.locator('#accessibility-toggle').click({ force: true });
    await page.locator('#high-contrast-input').check({ force: true });
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains('a11y-high-contrast')))
      .toBe(true);

    const buttonStyles = await page.evaluate(() => {
      const runBtn = document.getElementById('run-btn');
      const style = runBtn ? getComputedStyle(runBtn) : null;
      return style ? {
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderTopWidth: style.borderTopWidth,
        borderTopColor: style.borderTopColor,
      } : null;
    });

    expect(buttonStyles).not.toBeNull();
    expect(buttonStyles.color).toContain('255, 255, 255');
    expect(buttonStyles.borderTopWidth).not.toBe('0px');
    expect(buttonStyles.borderTopColor).toContain('255, 255, 255');

    await page.locator('#help-btn').click();
    await expect(page.locator('#help-modal-overlay')).not.toHaveClass(/hidden/);

    const modalStyles = await page.evaluate(() => {
      const modal = document.getElementById('help-modal-content');
      const style = modal ? getComputedStyle(modal) : null;
      return style ? {
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderTopColor: style.borderTopColor,
        borderTopWidth: style.borderTopWidth,
      } : null;
    });

    expect(modalStyles).not.toBeNull();
    expect(modalStyles.color).toContain('255, 255, 255');
    expect(modalStyles.backgroundColor).toContain('0, 0, 0');
    expect(modalStyles.borderTopColor).toContain('255, 255, 255');
    expect(modalStyles.borderTopWidth).not.toBe('0px');
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
    await page.fill('#code-editor', GAME_CODE);
    await page.locator('#run-btn').click();

    await expect(page.locator('#stop-btn')).toBeEnabled();

    await page.evaluate(() => {
      if (window.ravlykInterpreterInstance && typeof window.ravlykInterpreterInstance.stopExecution === 'function') {
        window.ravlykInterpreterInstance.stopExecution();
      }
    });

    await expect(page.locator('#run-btn')).toBeEnabled();
  });

  test('stop confirmation modal supports cancel and confirm flows', async ({ page }) => {
    await page.fill('#code-editor', GAME_CODE);
    await page.locator('#run-btn').click();
    await expect(page.locator('#stop-btn')).toBeEnabled();

    const stopModal = page.locator('#stop-confirm-modal-overlay');

    await page.locator('#stop-btn').click();
    await expect(stopModal).not.toHaveClass(/hidden/);

    await page.locator('#cancel-stop-btn').click();
    await expect(stopModal).toHaveClass(/hidden/);
    await expect(page.locator('#stop-btn')).toBeEnabled();

    await page.locator('#stop-btn').click();
    await expect(stopModal).not.toHaveClass(/hidden/);
    await page.locator('#confirm-stop-btn').click();
    await expect(stopModal).toHaveClass(/hidden/);
    await expect(page.locator('#run-btn')).toBeEnabled();
  });

  test('pressing Escape during execution opens stop confirmation modal', async ({ page }) => {
    await page.fill('#code-editor', GAME_CODE);
    await page.locator('#run-btn').click();
    await expect(page.locator('#stop-btn')).toBeEnabled();

    const stopModal = page.locator('#stop-confirm-modal-overlay');
    await page.keyboard.press('Escape');
    await expect(stopModal).not.toHaveClass(/hidden/);

    await page.locator('#cancel-stop-btn').click();
    await expect(stopModal).toHaveClass(/hidden/);
    await expect(page.locator('#stop-btn')).toBeEnabled();

    await page.locator('#stop-btn').click();
    await page.locator('#confirm-stop-btn').click();
    await expect(page.locator('#run-btn')).toBeEnabled();
  });

  test('clear confirmation modal closes on Escape and returns focus to clear button', async ({ page }) => {
    const clearBtn = page.locator('#clear-btn');
    await clearBtn.click();

    const clearModal = page.locator('#clear-confirm-modal-overlay');
    await expect(clearModal).not.toHaveClass(/hidden/);

    await page.keyboard.press('Escape');
    await expect(clearModal).toHaveClass(/hidden/);
    await expect(clearBtn).toBeFocused();
  });

  test('stop confirmation modal closes on Escape and returns focus to stop button', async ({ page }) => {
    const stopBtn = page.locator('#stop-btn');
    await page.fill('#code-editor', GAME_CODE);
    await page.locator('#run-btn').click();
    await expect(stopBtn).toBeEnabled();

    await stopBtn.click();
    const stopModal = page.locator('#stop-confirm-modal-overlay');
    await expect(stopModal).not.toHaveClass(/hidden/);

    await page.keyboard.press('Escape');
    await expect(stopModal).toHaveClass(/hidden/);
    await expect(stopBtn).toBeFocused();

    await stopBtn.click();
    await page.locator('#confirm-stop-btn').click();
    await expect(page.locator('#run-btn')).toBeEnabled();
  });

  test('global UX messages are unified for success/info/error with ARIA semantics and dismiss action', async ({ page }) => {
    const message = page.locator('#global-message-display');

    await page.fill('#code-editor', 'вперед 10');
    await page.locator('#run-btn').click();
    await expect(message).toBeVisible();
    await expect(message).toHaveClass(/message-success-global/);
    await expect(message).toHaveAttribute('role', 'status');
    await expect(message).toHaveAttribute('aria-live', 'polite');
    await expect(message).toHaveAttribute('aria-atomic', 'true');
    await expect(message.locator('.message-title-global')).toBeVisible();
    await expect(message.locator('.message-main-global')).toBeVisible();
    await message.locator('.message-close-btn-global').click();
    await expect(message).toHaveCount(0);

    await page.locator('#clear-btn').click();
    await expect(page.locator('#clear-confirm-modal-overlay')).not.toHaveClass(/hidden/);
    await page.locator('#confirm-clear-btn').click();
    await expect(message).toBeVisible();
    await expect(message).toHaveClass(/message-info-global/);
    await expect(message).toHaveAttribute('role', 'status');
    await expect(message).toHaveAttribute('aria-live', 'polite');
    await expect(message).toHaveAttribute('aria-atomic', 'true');
    await message.locator('.message-close-btn-global').click();
    await expect(message).toHaveCount(0);

    await page.fill('#code-editor', 'абракадабра');
    await page.locator('#run-btn').click();
    await expect(message).toBeVisible();
    await expect(message).toHaveClass(/message-error-global/);
    await expect(message).toHaveAttribute('role', 'alert');
    await expect(message).toHaveAttribute('aria-live', 'assertive');
    await expect(message).toHaveAttribute('aria-atomic', 'true');
    await message.locator('.message-close-btn-global').click();
    await expect(message).toHaveCount(0);
  });

  test('switching mobile workspace tabs keeps drawn canvas content', async ({ page }, testInfo) => {
    test.skip(!/(mobile|tablet)/i.test(testInfo.project.name), 'Applies to tabbed workspace layouts only.');
    test.skip(!(await page.locator('#workspace-canvas-tab').count()), 'Current layout has no workspace tabs.');

    const code = 'повторити 4 ( вперед 80 праворуч 90 )';
    await page.fill('#code-editor', code);
    await page.locator('#run-btn').click();
    await expect(page.locator('#run-btn')).toBeEnabled();

    await page.locator('#workspace-canvas-tab').click();
    await page.waitForTimeout(150);

    const alphaBeforeSwitch = await page.evaluate(() => {
      const canvas = document.getElementById('ravlyk-canvas');
      const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
      if (!canvas || !ctx) return 0;
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let colored = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] > 0) colored++;
      }
      return colored;
    });

    expect(alphaBeforeSwitch).toBeGreaterThan(0);

    await page.locator('#workspace-editor-tab').click();
    await page.waitForTimeout(100);
    await page.locator('#workspace-canvas-tab').click();
    await page.waitForTimeout(150);

    const alphaAfterSwitch = await page.evaluate(() => {
      const canvas = document.getElementById('ravlyk-canvas');
      const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
      if (!canvas || !ctx) return 0;
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let colored = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] > 0) colored++;
      }
      return colored;
    });

    expect(alphaAfterSwitch).toBeGreaterThan(0);
  });
});
