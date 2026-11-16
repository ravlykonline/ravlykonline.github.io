import { test, expect } from '@playwright/test';

const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 568, height: 320 },
  { width: 844, height: 390 },
  { width: 800, height: 749 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 }
];

test('@cross-browser-smoke Ravlyk keeps the board playable in compact windows', async ({ page }) => {
  await page.setViewportSize(viewports[0]);
  await page.goto('/go/');
  await expect(page.locator('#snail img')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const board = page.locator('#grid');
    const cell = board.getByRole('gridcell').first();
    await expect(cell).toBeVisible();
    const { width, height } = await cell.boundingBox();
    expect(Math.round(Math.min(width, height))).toBeGreaterThanOrEqual(30);
    expect(Math.abs(width - height)).toBeLessThan(2);
    expect(await page.locator('html').evaluate((html) => html.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await expect(page.locator('#btn-run')).toBeVisible();
    if (viewport.height >= 650) {
      await expect(page.locator('#btn-run')).toBeInViewport({ ratio: 1 });
    }
    await expect(page.locator('#progress-track')).toBeInViewport({ ratio: 1 });
    expect(await page.locator('.level-toolbar button').evaluateAll((buttons) =>
      buttons.every((button) => button.scrollWidth <= button.clientWidth)
    )).toBe(true);
    const nav = page.locator('.level-nav-btn');
    await expect(nav.first()).toHaveText('Назад');
    await expect(nav.last()).toHaveText('Далі');
    const navWidths = await nav.evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().width)
    );
    expect(Math.min(...navWidths)).toBeGreaterThan(90);
    expect(Math.abs(navWidths[0] - navWidths[1])).toBeLessThan(1);
    const commandBox = await page.locator('.command-panel').boundingBox();
    const boardBox = await board.boundingBox();
    const landscape = (viewport.width >= 760 && viewport.width >= viewport.height) ||
      (viewport.width >= 540 && viewport.height <= 560);
    if (landscape) {
      expect(commandBox.x).toBeGreaterThan(boardBox.x + boardBox.width);
      expect(boardBox.y + boardBox.height).toBeLessThanOrEqual(viewport.height);
      await expect(page.locator('#btn-run')).toBeInViewport({ ratio: 1 });
      if (viewport.width >= 760 && viewport.height >= 650) {
        expect(await page.locator('html').evaluate((html) => html.scrollHeight)).toBeLessThanOrEqual(viewport.height);
      }
    } else {
      expect(commandBox.y).toBeGreaterThan(boardBox.y + boardBox.height);
    }
  }
});

test('@cross-browser-smoke Ravlyk uses consistent controls and remembers the theme in the tab', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/go/');
  const root = page.locator('html');
  const theme = page.locator('#btn-theme');
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(theme).toHaveAccessibleName('Увімкнути світлу тему');
  await theme.click();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(root).toHaveCSS('color-scheme', 'light');
  await page.reload();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await theme.click();
  await expect(root).toHaveAttribute('data-theme', 'dark');

  const dimensions = await page.locator(
    '#btn-theme, #btn-map, #btn-undo, #btn-clr, #btn-run, #btn-level-info, #btn-speak-task, #btn-prev, #btn-next, #palette button'
  ).evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  expect(dimensions).toHaveLength(10);
  expect(new Set(dimensions)).toEqual(new Set([48]));
  await expect(page.locator('#board-goal')).toHaveCount(0);
  await expect(page.locator('.level-bar #progress-track')).toBeVisible();
});

test('@cross-browser-smoke Ravlyk completes level one with touch, mouse or keyboard', async ({ page }, testInfo) => {
  const touch = testInfo.project.use.hasTouch;
  const keyboard = testInfo.project.name === 'firefox-smoke';
  if (touch) {
    await page.setViewportSize({ width: 844, height: 390 });
  }
  await page.goto('/go/');
  const activate = (locator) => touch ? locator.tap() : locator.click();
  const tile = page.locator('#palette button');
  const first = page.locator('.cell[data-r="2"][data-c="3"]');
  const second = page.locator('.cell[data-r="2"][data-c="4"]');

  if (keyboard) {
    await tile.press('Enter');
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.cell[data-active]')).toBeFocused();
    for (const key of ['ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight']) {
      await page.keyboard.press(key);
    }
    await expect(first).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await expect(second).toBeFocused();
    await page.keyboard.press('Space');
    await page.locator('#btn-run').press('Enter');
  } else {
    await activate(tile);
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
    await activate(first);
    await activate(second);
    await activate(page.locator('#btn-run'));
  }

  await expect(page.locator('#progress-track')).toHaveAttribute('aria-valuenow', '5');
});

test('@desktop-chromium-only Ravlyk can reload and play offline after an online visit', async ({ context, page }) => {
  await page.goto('/go/');
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.evaluate(() => {
    const image = new Image();
    image.src = './assets/garden-paper.jpg';
    return image.decode();
  });
  await page.locator('#btn-speak-task').click();
  await expect(page.getByRole('status')).toContainText('Слухаємо завдання.');
  await page.locator('#palette button').click();
  await page.locator('.cell[data-r="2"][data-c="3"]').click();
  await page.locator('.cell[data-r="2"][data-c="4"]').click();
  await page.locator('#btn-run').click();
  await expect(page.locator('#progress-track')).toHaveAttribute('aria-valuenow', '5');
});

test('@desktop-chromium-only Ravlyk anchors the side panel and finishes an upward turn upright', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/go/');
  const run = page.locator('#btn-run');
  const initial = await run.boundingBox();

  for (const level of [5, 7, 20, 6]) {
    await page.locator('#btn-map').click();
    await page.locator('.map-level').nth(level - 1).click();
    const box = await run.boundingBox();
    expect(Math.abs(box.y - initial.y)).toBeLessThan(2);
  }

  await page.locator('#palette button[data-dir="right"]').click();
  await page.locator('.cell[data-r="3"][data-c="3"]').click();
  await page.locator('.cell[data-r="3"][data-c="4"]').click();
  await page.locator('#palette button[data-dir="up"]').click();
  await page.locator('.cell[data-r="2"][data-c="5"]').click();
  await run.click();
  await expect(page.locator('#win-title')).toBeVisible();
  const snail = page.locator('#snail');
  await expect(snail).toHaveAttribute('data-facing', 'up');
  await expect(snail).toHaveAttribute('data-horizontal', 'right');
  expect(await snail.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).b)).toBe(0);
});

test('@desktop-chromium-only Ravlyk explains a missing arrow and lets the player undo edits', async ({ page }) => {
  await page.goto('/go/');
  const tile = page.locator('#palette button');
  const first = page.locator('.cell[data-r="2"][data-c="3"]');
  const second = page.locator('.cell[data-r="2"][data-c="4"]');
  const undo = page.getByRole('button', { name: 'Скасувати останню дію' });
  const run = page.locator('#btn-run');

  await page.locator('#btn-level-info').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#btn-level-info')).toBeFocused();

  await expect(undo).toBeDisabled();
  await tile.click();
  await expect(page.getByRole('status')).toContainText('натисни клітинку');
  await first.click();
  await run.click();
  await expect(page.getByRole('status')).toContainText('Тут бракує стрілки');
  await expect(second).toHaveClass(/cell--stop/);
  await expect(run).toBeEnabled();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await undo.click();
  await expect(first.locator('.cell-arrow')).toHaveCount(0);
  await expect(second).not.toHaveClass(/cell--stop/);
  await expect(undo).toBeDisabled();

  await tile.click();
  await first.click();
  await first.press('Delete');
  await expect(first.locator('.cell-arrow')).toHaveCount(0);
  await undo.click();
  await expect(first.locator('.cell-arrow')).toHaveCount(1);

  const tileBox = await tile.boundingBox();
  const cellBox = await second.boundingBox();
  await page.mouse.move(tileBox.x + tileBox.width / 2, tileBox.y + tileBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(second.locator('.cell-arrow')).toHaveCount(1);
});

test('@desktop-chromium-only Ravlyk preserves edited routes across levels and supports explicit restart', async ({ page }) => {
  await page.goto('/go/');
  const first = page.locator('.cell[data-r="2"][data-c="3"]');
  await page.locator('#palette button').click();
  await first.click();
  await page.locator('#btn-next').click();
  await expect(page.locator('#level-chip')).toHaveText('2 / 20');
  await page.locator('#btn-prev').click();
  await expect(first.locator('.cell-arrow')).toHaveCount(1);

  await page.reload();
  await expect(first.locator('.cell-arrow')).toHaveCount(1);
  await page.locator('#btn-map').click();
  await expect(page.locator('.map-level')).toHaveCount(20);
  await page.locator('.map-level').nth(5).click();
  await expect(page.locator('#level-title')).toHaveText('Поворот до яблука');
  await expect(page.locator('.preset-arrow')).toHaveCount(1);
  await page.locator('#btn-map').click();
  await page.locator('.map-level').nth(7).click();
  await expect(page.locator('.cell-obstacle').first()).toBeVisible();

  await page.locator('#btn-map').click();
  await page.getByRole('button', { name: 'Почати гру спочатку' }).click();
  await expect(page.locator('#restart-confirm-cancel')).toBeFocused();
  await page.locator('#restart-confirm-cancel').click();
  await expect(page.locator('#level-chip')).toHaveText('8 / 20');
  await page.locator('#btn-map').click();
  await page.getByRole('button', { name: 'Почати гру спочатку' }).click();
  await page.locator('#restart-confirm').click();
  await expect(page.locator('#level-chip')).toHaveText('1 / 20');
  await expect(first.locator('.cell-arrow')).toHaveCount(0);
});
