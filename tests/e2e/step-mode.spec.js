import { test, expect } from '@playwright/test';

const state = (page) => page.evaluate(() => {
  const { x, y, angle } = window.ravlykInterpreterInstance.state;
  return { x, y, angle };
});

test('step remains usable with repeated keyboard activation', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('#code-editor').fill('вперед 10\nправоруч 90');
  const step = page.locator('#step-btn');
  await step.focus();
  await page.keyboard.press('Enter');
  await expect(step).toBeEnabled();
  await expect(step).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#code-editor')).toBeEnabled();
  await expect(step).toBeFocused();
});

test('step completes one command, highlights its source, and continues the same program', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('#code-editor').fill('повторити 2 (\n вперед 10\n праворуч 90\n)');
  await page.locator('#step-btn').click();
  await expect(page.locator('#step-btn')).toBeEnabled();
  await expect(page.locator('#code-active-line')).toHaveAttribute('data-execution-line', '2');
  await expect(page.locator('#continue-btn')).toContainText('Виконати все');
  await expect(page.locator('#code-editor')).toBeDisabled();
  const afterFirst = await state(page);
  await page.waitForTimeout(300);
  expect(await state(page)).toEqual(afterFirst);
  await page.locator('#stop-btn').click();
  await page.locator('#cancel-stop-btn').click();
  await page.waitForTimeout(150);
  expect(await state(page)).toEqual(afterFirst);
  await expect(page.locator('#step-btn')).toBeEnabled();
  await page.locator('#step-btn').click();
  await expect(page.locator('#step-btn')).toBeEnabled();
  await expect(page.locator('#code-active-line')).toHaveAttribute('data-execution-line', '3');
  await page.locator('#continue-btn').click();
  await expect(page.locator('#stop-btn')).toBeDisabled();
  await expect(page.locator('#code-editor')).toBeEnabled();
  const stepped = await state(page);
  await page.locator('#run-btn').click();
  await expect(page.locator('#stop-btn')).toBeDisabled();
  const automatic = await state(page);
  expect(stepped.x).toBeCloseTo(automatic.x, 5);
  expect(stepped.y).toBeCloseTo(automatic.y, 5);
  expect(stepped.angle).toBeCloseTo(automatic.angle, 5);
  await expect(page.locator('#code-active-line')).not.toHaveClass(/is-executing/);
});

test('step ends on last primitive, refuses games, and retains safety errors', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('#code-editor').fill('вперед 10');
  await page.locator('#step-btn').click();
  await expect(page.locator('#stop-btn')).toBeDisabled();
  const drawing = await state(page);
  await page.locator('#code-editor').fill('грати ( вперед 1 )');
  await page.locator('#step-btn').click();
  await expect(page.locator('#code-editor')).toBeEnabled();
  expect(await state(page)).toEqual(drawing);
  await page.locator('#code-editor').fill('поки 1 = 1 ( )');
  await page.locator('#step-btn').click();
  await expect(page.locator('#code-editor')).toBeEnabled();
  await expect(page.locator('#step-btn')).toBeEnabled();
  await expect(page.locator('#global-message-display')).toBeVisible();
});

test('share sits in the toolbar and files keeps import without overflowing at larger text', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.toolbar button:visible')).toHaveCount(5);
  await expect(page.locator('.toolbar #share-btn')).toContainText('Поділитися');
  const clippedLabels = await page.locator('.toolbar button:visible').evaluateAll((buttons) => buttons
    .filter((button) => (button.querySelector('.toolbar-label')?.scrollWidth ?? 0) > button.clientWidth)
    .map((button) => button.id));
  expect(clippedLabels).toEqual([]);
  await page.locator('#download-btn').click();
  await expect(page.locator('#open-code-btn')).toBeVisible();
  await expect(page.locator('#download-modal-content #share-btn')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#download-btn')).toBeFocused();
  await page.locator('#accessibility-toggle').click();
  await page.locator('#larger-text-input').check({ force: true });
  await page.keyboard.press('Escape');
  await page.locator('#download-btn').click();
  const overflow = await page.locator('#download-modal-content').evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(overflow).toBe(false);
});

test('step respects semantic waits with reduced animation', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('#accessibility-toggle').click();
  await page.locator('#reduce-animations-input').check({ force: true });
  await page.keyboard.press('Escape');
  await page.locator('#code-editor').fill('чекати 1\nвперед 10');
  const initial = await state(page);
  await page.locator('#step-btn').click();
  await expect(page.locator('#step-btn')).toBeDisabled();
  await expect(page.locator('#step-btn')).toBeEnabled();
  expect(await state(page)).toEqual(initial);
  await page.locator('#step-btn').click();
  await expect(page.locator('#stop-btn')).toBeDisabled();
  expect((await state(page)).y).not.toBe(initial.y);
});
