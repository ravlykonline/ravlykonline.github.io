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
  '/privacy.html',
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

test.describe('Lessons tab keyboard accessibility', () => {
  test('arrows wrap, Home and End select and focus the intended tab', async ({ page }) => {
    await page.goto('/lessons.html?lesson=lesson0');
    const first = page.locator('#lesson0-tab');
    const last = page.locator('#lesson9-tab');

    await first.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(last).toBeFocused();
    await expect(last).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowRight');
    await expect(first).toBeFocused();
    await expect(first).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('End');
    await expect(last).toBeFocused();
    await page.keyboard.press('Home');
    await expect(first).toBeFocused();
    await expect(page.locator('.tab-button[tabindex="0"]')).toHaveCount(1);
  });

  test('valid deep links open and invalid ids keep a valid lesson visible', async ({ page }) => {
    await page.goto('/lessons.html?lesson=lesson6');
    await expect(page.locator('#lesson6')).toBeVisible();
    await expect(page.locator('#lesson6-tab')).toHaveAttribute('aria-selected', 'true');

    await page.goto('/lessons.html?lesson=not-a-lesson');
    await expect(page.locator('#lesson0')).toBeVisible();
    await expect(page.locator('.lesson-content:visible')).toHaveCount(1);
  });

  test('saved reduced-motion setting changes lesson scrolling to auto', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ravlyk_accessibility_settings_v2', JSON.stringify({ 'reduce-animations': true }));
      window.__lessonScrollBehaviors = [];
      const originalScrollTo = window.scrollTo.bind(window);
      window.scrollTo = (options) => {
        window.__lessonScrollBehaviors.push(options?.behavior);
        return originalScrollTo(options);
      };
    });
    await page.goto('/lessons.html?lesson=lesson0');
    await expect(page.locator('html')).toHaveClass(/a11y-reduce-animations/);
    await page.locator('#lesson1-tab').click();
    await expect.poll(() => page.evaluate(() => window.__lessonScrollBehaviors.at(-1))).toBe('auto');
  });
});

test('canvas state dialog exposes readable learning state and a bounded command log', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ravlyk_accessibility_settings_v2', JSON.stringify({ 'reduce-animations': true }));
  });
  await page.goto('/index.html');
  await page.locator('#code-editor').fill('перейти в 30 20\nповторити 55 ( праворуч 1 )');
  await page.locator('#run-btn').click();
  await expect(page.locator('#stop-btn')).toBeDisabled();

  // The state lives in a toolbar dialog, so it is reachable without leaving the
  // editor tab on any viewport.
  await page.locator('#canvas-state-btn').click();
  await expect(page.locator('#canvas-state-modal-overlay')).not.toHaveClass(/hidden/);
  await expect(page.locator('#canvas-state-x')).toHaveText('30');
  await expect(page.locator('#canvas-state-y')).toHaveText('20');
  await expect(page.locator('#canvas-state-color')).toHaveText('чорний');

  await page.locator('#read-canvas-state-btn').click();
  await expect(page.locator('#canvas-state-status')).toContainText('X 30, Y 20');
  await expect(page.locator('#ravlyk-canvas')).toHaveAttribute('aria-describedby', 'canvas-state-description');

  await page.locator('.canvas-command-log-panel > summary').click();
  await expect(page.locator('#canvas-state-log > li')).toHaveCount(50);

  await page.keyboard.press('Escape');
  await expect(page.locator('#canvas-state-modal-overlay')).toHaveClass(/hidden/);
  await expect(page.locator('#canvas-state-btn')).toBeFocused();
});

// Found on production: the state used to be a <details> inside the fixed-height
// canvas column, so opening it shrank the canvas from 472px to 52px, pushed the
// drawing up and redrew it at a new size. The dialog must leave the canvas and
// its pixels completely untouched.
test('opening the canvas state does not disturb the drawing', async ({ page }) => {
  await page.goto('/index.html');
  // Draws a real shape and produces more than the 50 logged commands.
  await page.locator('#code-editor').fill('повторити 30 ( вперед 6 праворуч 12 )');
  await page.locator('#run-btn').click();
  await expect(page.locator('#run-btn')).toBeEnabled({ timeout: 20000 });

  const canvasSignature = () => page.evaluate(() => {
    const canvas = document.getElementById('ravlyk-canvas');
    const ctx = canvas.getContext('2d');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let colored = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] > 0) colored += 1;
    }
    return { width: canvas.width, height: canvas.height, colored };
  });

  const before = await canvasSignature();
  expect(before.colored).toBeGreaterThan(0);

  await page.locator('#canvas-state-btn').click();
  await expect(page.locator('#canvas-state-modal-overlay')).not.toHaveClass(/hidden/);
  await page.locator('.canvas-command-log-panel > summary').click();
  await expect(page.locator('#canvas-state-log > li')).toHaveCount(50);
  await page.waitForTimeout(400);

  // Same canvas size and the very same pixels: no reflow, no redraw, no shift.
  expect(await canvasSignature()).toEqual(before);

  await page.locator('#close-canvas-state-modal-btn').click();
  expect(await canvasSignature()).toEqual(before);
});
