import { test, expect } from '@playwright/test';

const GAME_CODE = [
  '\u0433\u0440\u0430\u0442\u0438 (',
  '  \u044f\u043a\u0449\u043e \u043a\u043b\u0430\u0432\u0456\u0448\u0430 "\u0432\u043d\u0438\u0437" ( \u043d\u0430\u0437\u0430\u0434 3 )',
  ')',
].join('\n');

async function enableAccessibilityModalStressMode(page) {
  await page.locator('#accessibility-toggle').click();
  await page.locator('#high-contrast-input').check({ force: true });
  await page.locator('#larger-text-input').check({ force: true });
  // Escape is the stable setup path here; close-button touch coverage lives in a dedicated test below.
  await page.keyboard.press('Escape');
}

async function expectButtonsNotToOverflow(page, buttonIds) {
  const buttonOverflow = await page.evaluate((ids) => {
    return ids.map((id) => {
      const element = document.getElementById(id);
      if (!element) {
        return { id, missing: true };
      }
      return {
        id,
        missing: false,
        widthOverflow: element.scrollWidth > element.clientWidth + 1,
        heightOverflow: element.scrollHeight > element.clientHeight + 1,
      };
    });
  }, buttonIds);

  for (const result of buttonOverflow) {
    expect(result.missing).toBe(false);
    expect(result.widthOverflow).toBe(false);
    expect(result.heightOverflow).toBe(false);
  }
}

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

  test('accessibility panel closes from close button in high-contrast larger-text mode', async ({ page }, testInfo) => {
    test.skip(!/mobile|tablet/i.test(testInfo.project.name), 'Touch interaction case for touch projects');

    await page.locator('#accessibility-toggle').click();
    const panel = page.locator('#accessibility-panel');
    await expect(panel).not.toHaveClass(/hidden/);

    await page.locator('#high-contrast-input').check({ force: true });
    await page.locator('#larger-text-input').check({ force: true });

    const closeButtonIsTopmost = await page.evaluate(() => {
      const button = document.getElementById('close-accessibility-panel-btn');
      if (!button) return false;
      const rect = button.getBoundingClientRect();
      const x = rect.left + (rect.width / 2);
      const y = rect.top + (rect.height / 2);
      const hit = document.elementFromPoint(x, y);
      return hit === button;
    });
    expect(closeButtonIsTopmost).toBe(true);

    // Touch emulation reports a false positive intercept on this control even when the button is topmost.
    await page.locator('#close-accessibility-panel-btn').click({ force: true });

    await expect(panel).toHaveClass(/hidden/);
    await expect(page.locator('#accessibility-toggle')).toBeFocused();
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

  test('download modal opens, closes on Escape, and returns focus to download button', async ({ page }) => {
    const downloadBtn = page.locator('#download-btn');
    await downloadBtn.click();

    const downloadModal = page.locator('#download-modal-overlay');
    await expect(downloadModal).not.toHaveClass(/hidden/);
    await expect(page.locator('#download-image-btn')).toBeVisible();
    await expect(page.locator('#download-code-btn')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(downloadModal).toHaveClass(/hidden/);
    await expect(downloadBtn).toBeFocused();
  });

  test('download modal buttons do not overflow in high-contrast larger-text mode', async ({ page }) => {
    await enableAccessibilityModalStressMode(page);

    await page.locator('#download-btn').click();
    await expect(page.locator('#download-modal-overlay')).not.toHaveClass(/hidden/);
    await expectButtonsNotToOverflow(page, ['download-image-btn', 'download-code-btn', 'close-download-modal-btn']);
  });

  test('all modal action buttons stay readable in high-contrast larger-text mode', async ({ page }) => {
    await enableAccessibilityModalStressMode(page);

    await page.locator('#help-btn').click();
    await expect(page.locator('#help-modal-overlay')).not.toHaveClass(/hidden/);
    await expectButtonsNotToOverflow(page, ['to-manual-btn-modal', 'close-help-modal-btn']);
    await page.keyboard.press('Escape');

    await page.locator('#clear-btn').click();
    await expect(page.locator('#clear-confirm-modal-overlay')).not.toHaveClass(/hidden/);
    await expectButtonsNotToOverflow(page, ['confirm-clear-btn', 'cancel-clear-btn']);
    await page.keyboard.press('Escape');

    await page.fill('#code-editor', GAME_CODE);
    await page.locator('#run-btn').click();
    await expect(page.locator('#stop-btn')).toBeEnabled();

    await page.keyboard.press('Escape');
    await expect(page.locator('#stop-confirm-modal-overlay')).not.toHaveClass(/hidden/);
    await expectButtonsNotToOverflow(page, ['confirm-stop-btn', 'cancel-stop-btn']);
    await page.keyboard.press('Escape');

    await page.evaluate(() => {
      if (window.ravlykInterpreterInstance && typeof window.ravlykInterpreterInstance.stopExecution === 'function') {
        window.ravlykInterpreterInstance.stopExecution();
      }
    });
  });

  test('escape opens and closes stop confirm modal while code is executing', async ({ page }) => {
    const code = [
      'грати (',
      '  якщо клавіша "вгору" ( вперед 3 )',
      ')',
    ].join('\n');

    await page.fill('#code-editor', code);
    await page.locator('#run-btn').click();
    await expect(page.locator('#stop-btn')).toBeEnabled();

    const stopModal = page.locator('#stop-confirm-modal-overlay');
    await page.keyboard.press('Escape');
    await expect(stopModal).not.toHaveClass(/hidden/);

    await page.keyboard.press('Escape');
    await expect(stopModal).toHaveClass(/hidden/);
    await expect(page.locator('#stop-btn')).toBeEnabled();

    await page.evaluate(() => {
      if (window.ravlykInterpreterInstance && typeof window.ravlykInterpreterInstance.stopExecution === 'function') {
        window.ravlykInterpreterInstance.stopExecution();
      }
    });
    await expect(page.locator('#run-btn')).toBeEnabled();
  });

  test('download modal can export drawing as PNG', async ({ page }) => {
    await page.fill('#code-editor', 'повторити 4 ( вперед 40 праворуч 90 )');
    await page.locator('#run-btn').click();
    await expect(page.locator('#run-btn')).toBeEnabled();

    await page.locator('#download-btn').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#download-image-btn').click(),
    ]);
    await expect(page.locator('#download-modal-overlay')).toHaveClass(/hidden/);

    const suggestedName = download.suggestedFilename();
    expect(suggestedName).toMatch(/^ravlyk-малюнок-\d+\.png$/);
  });

  test('download modal can export code as TXT', async ({ page }) => {
    await page.fill('#code-editor', 'вперед 25');
    await page.locator('#download-btn').click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#download-code-btn').click(),
    ]);
    await expect(page.locator('#download-modal-overlay')).toHaveClass(/hidden/);

    const suggestedName = download.suggestedFilename();
    expect(suggestedName).toMatch(/^ravlyk-code-\d+\.txt$/);
  });

  test('switching mobile workspace tabs keeps drawn canvas content', async ({ page }, testInfo) => {
    const code = 'повторити 4 ( вперед 80 праворуч 90 )';
    await page.fill('#code-editor', code);
    await page.locator('#run-btn').click();
    await expect(page.locator('#run-btn')).toBeEnabled();

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

    const isTabbedWorkspace = await page.evaluate(() => {
      const tabList = document.querySelector('.workspace-tabs');
      if (!tabList) return false;
      return getComputedStyle(tabList).display !== 'none';
    });

    if (isTabbedWorkspace) {
      await page.locator('#workspace-canvas-tab').click();
      await page.waitForTimeout(150);
      await page.locator('#workspace-editor-tab').click();
      await page.waitForTimeout(100);
      await page.locator('#workspace-canvas-tab').click();
      await page.waitForTimeout(150);
    } else {
      expect(/mobile|tablet/i.test(testInfo.project.name)).toBe(false);
    }

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
