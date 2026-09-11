import { test, expect } from '@playwright/test';

test('step status does not move panels and run/stop occupies one toolbar slot', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.toolbar button:visible')).toHaveCount(5);
  await page.locator('#code-editor').fill('вперед 10\nправоруч 90\nвперед 10');
  // Document coordinates distinguish layout shifts from browser click scrolling.
  const documentBounds = (selector) => page.locator(selector).evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
  });
  const panelBounds = () => documentBounds('.main-area');
  const before = await panelBounds();
  const stepBefore = await documentBounds('#step-btn');
  await page.locator('#step-btn').click();
  await expect(page.locator('#step-btn')).toBeEnabled();
  await expect(page.locator('#continue-btn')).toBeVisible();
  expect(await panelBounds()).toEqual(before);
  // A repeated click at the same spot must hit «Крок» again, not the run-all button.
  // Only the horizontal box matters: hover lifts the button by a couple of pixels.
  const stepAfter = await documentBounds('#step-btn');
  expect(stepAfter.x).toBeCloseTo(stepBefore.x, 1);
  expect(stepAfter.width).toBeCloseTo(stepBefore.width, 1);
  await expect(page.locator('#run-btn')).toBeHidden();
  await expect(page.locator('#stop-btn')).toBeVisible();
  await expect(page.locator('#step-status')).toContainText('Рядок 1');
  await page.locator('#continue-btn').click();
  await expect(page.locator('#run-btn')).toBeVisible();
  await expect(page.locator('#stop-btn')).toBeHidden();
  expect(await panelBounds()).toEqual(before);
});

test('help opens at its heading and categories scroll without hiding close', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('#help-btn').click();
  await expect(page.locator('#help-modal-title-static')).toBeInViewport();
  await expect(page.locator('#help-modal-title-static')).toBeFocused();
  await expect(page.locator('.help-categories details')).toHaveCount(5);
  await page.locator('.help-categories details').evaluateAll((items) => items.forEach(item => { item.open = true; }));
  await page.locator('.help-categories').evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(page.locator('#close-help-modal-btn')).toBeInViewport();
  await expect(page.locator('#help-modal-title-static')).toBeInViewport();
  await expect(page.locator('#accessibility-toggle')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.locator('#help-btn').click();
  expect(await page.locator('.help-categories').evaluate(element => element.scrollTop)).toBe(0);
  await expect(page.locator('.help-categories details[open]')).toHaveCount(1);
});

test('accessibility stays in the bottom corner and state needs no read button', async ({ page }) => {
  await page.goto('/index.html');
  const button = await page.locator('#accessibility-toggle').boundingBox();
  expect(button.y).toBeGreaterThan(page.viewportSize().height / 2);
  expect(button.y + button.height).toBeLessThanOrEqual(page.viewportSize().height);
  await expect(page.locator('#accessibility-toggle')).toBeInViewport();
  if (!(await page.locator('#canvas-state-btn').isVisible())) await page.locator('#workspace-canvas-tab').click();
  await page.locator('#canvas-state-btn').click();
  await expect(page.locator('#canvas-state-modal-title')).toBeFocused();
  await expect(page.locator('#canvas-state-status')).toContainText('напрямок');
  await expect(page.locator('#read-canvas-state-btn')).toHaveCount(0);
  await expect(page.locator('#canvas-state-size')).toHaveCount(0);
});
