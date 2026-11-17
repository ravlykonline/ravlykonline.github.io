import { test, expect } from '@playwright/test';

async function approachNpc(page, taskId) {
  return page.evaluate(async (id) => {
    const { SceneManager } = await import('/game/js/scenes/scene-manager.js');
    const { TaskCatalog } = await import('/game/js/tasks/task-catalog.js');
    const { TaskRegistry } = await import('/game/js/tasks/task-registry.js');
    const game = SceneManager.active;
    const npc = game.npcs.find(candidate => candidate.id === 'mouse_1');
    const entry = TaskCatalog.getTasks(TaskCatalog.categories.map(category => category.id)).find(task => task.id === id);
    npc.activeTask = TaskRegistry.createTaskFromEntry(entry, () => 0.4);
    game.state.x = npc.x + npc.w / 2;
    game.state.y = npc.y + npc.h / 2;
    game.syncCameraToPlayer();
    game.update();
    game.render();
    return npc.activeTask.correctChoiceId;
  }, taskId);
}

test('@cross-browser-smoke adventure shows local art and keeps the same task on reopening', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 568 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game/');
  const dialog = page.getByRole('dialog');
  const activate = locator => testInfo.project.use.hasTouch ? locator.tap() : locator.click();
  await activate(dialog.getByRole('button', { name: 'Вирушити в подорож' }));

  await activate(page.getByRole('button', { name: 'Увімкнути нічний режим' }));
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#theme-toggle-btn')).toHaveText('День');

  await approachNpc(page, 'odd-one-out-leaves-acorn');
  const mouseHome = page.locator('.npc[data-id="mouse_1"] .npc-home');
  await expect(mouseHome).toHaveAttribute('data-habitat', 'burrow');
  await expect.poll(() => mouseHome.locator('.npc-home__back use').evaluate(use => use.getBBox().width)).toBeGreaterThan(0);
  await expect(page.locator('.obstacle.pond')).toHaveCount(5);
  const nearby = page.getByRole('button', { name: 'Завдання · Мишка' });
  await activate(nearby);
  await expect(dialog).toHaveAccessibleDescription('Що не схоже на листок чи гілочку?');
  const acorn = dialog.getByRole('button', { name: 'Жолудь' });
  await expect(acorn).toBeVisible();
  await expect.poll(() => acorn.locator('use').evaluate(use => use.getBBox().width)).toBeGreaterThan(0);
  await expect(dialog.locator('.animal-art use')).toHaveAttribute('href', /pictures\.svg#animal-mouse$/);

  await activate(dialog.getByRole('button', { name: 'Повернутися' }));
  await activate(nearby);
  await expect(dialog.getByRole('button', { name: 'Жолудь' })).toBeVisible();
  await page.setViewportSize({ width: 720, height: 360 });
  await expect(dialog.getByRole('button', { name: 'Слухати' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Повернутися' })).toBeInViewport({ ratio: 1 });
  expect(await page.locator('.dialog-box').evaluate(box => box.scrollWidth <= box.clientWidth)).toBe(true);

  await activate(dialog.locator('button[data-choice-id]:not([data-choice-id="acorn"])').first());
  await expect(dialog.getByText('Спробуй ще раз.')).toBeVisible();
  await activate(acorn);
  await expect(dialog.getByRole('button', { name: 'Готово' })).toBeFocused();
  await expect(page.locator('#stars-count')).toHaveText(/^1\//);
  await activate(dialog.getByRole('button', { name: 'Готово' }));
  await expect(nearby).toBeHidden();
  await expect(page.locator('.npc[data-id="mouse_1"]')).toHaveClass(/completed/);

  await page.reload();
  await expect(dialog.getByRole('button', { name: 'Вирушити в подорож' })).toBeVisible();
  await expect(page.locator('#stars-count')).toHaveText(/^0\//);
  expect(errors).toEqual([]);
});

test('@desktop-chromium-only adventure reloads offline and plays the actual arithmetic question', async ({ page, context }) => {
  await page.goto('/game/');
  await expect.poll(
    () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    { timeout: 20_000, message: 'Waiting for the game and its audio to be cached' }
  ).toBe(true);
  await context.setOffline(true);
  await page.reload();
  const art = await page.evaluate(async () => Promise.all(['homes.svg', 'pond.svg'].map(async name =>
    (await fetch('./assets/' + name)).ok
  )));
  expect(art).toEqual([true, true]);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Вирушити в подорож' }).click();
  const answer = await approachNpc(page, 'simple-addition-2-1');
  await page.getByRole('button', { name: 'Завдання · Мишка' }).click();
  await expect(dialog).toContainText('2 + 1 = ?');
  const range = await page.evaluate(async () => {
    const response = await fetch('./assets/voice/simple-addition-2-1.mp3', { headers: { Range: 'bytes=0-15' } });
    return [response.status, response.headers.get('Content-Range'), (await response.arrayBuffer()).byteLength];
  });
  expect(range).toEqual([206, expect.stringMatching(/^bytes 0-15\//), 16]);
  await dialog.getByRole('button', { name: 'Слухати' }).click();
  await expect(dialog.getByRole('button', { name: 'Зупинити озвучку' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Зупинити озвучку' }).click();
  await expect(dialog.getByRole('button', { name: 'Слухати' })).toBeVisible();
  await dialog.getByRole('button', { name: String(answer), exact: true }).click();
  await expect(page.locator('#stars-count')).toHaveText(/^1\//);
});

test('@desktop-chromium-only adventure compares groups directly with the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/game/');
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Вирушити в подорож' }).press('Enter');
  await approachNpc(page, 'compare-sets-more-6-5');
  await page.getByRole('button', { name: 'Завдання · Мишка' }).press('Enter');
  const left = dialog.getByRole('button', { name: /Ліворуч.*6/ });
  const right = dialog.getByRole('button', { name: /Праворуч.*5/ });
  const leftBox = await left.boundingBox();
  const rightBox = await right.boundingBox();
  expect(leftBox.x).toBeLessThan(rightBox.x);
  expect(leftBox.y).toBe(rightBox.y);
  await right.press('Space');
  await expect(dialog.getByText('Підказка: порахуй крапки в кожній групі.')).toBeVisible();
  await left.press('Space');
  await expect(dialog.getByRole('button', { name: 'Готово' })).toBeFocused();
  await expect(page.locator('#stars-count')).toHaveText(/^1\//);
});

test('@desktop-chromium-only adventure blocks accidental zoom and text selection on tablets', async ({ page }) => {
  await page.goto('/game/');
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toContain('user-scalable=no');
  expect(await page.evaluate(() => getComputedStyle(document.body).userSelect)).toBe('none');
  const prevented = await page.evaluate(() => {
    const event = new Event('gesturestart', { cancelable: true });
    document.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
});

test('@desktop-chromium-only adventure places large animals without overlaps or corner fallbacks', async ({ page }) => {
  await page.goto('/game/');
  const result = await page.evaluate(async () => {
    const { generateObstacles } = await import('/game/js/game/world-generator.js');
    const { positionNpcs } = await import('/game/js/game/npc-spawner.js');
    const { LevelData } = await import('/game/js/game/level-data.js');
    const { createLevelConfig } = await import('/game/js/core/config.js');
    const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    let bad = 0;
    let size = 0;
    for (const index of [1, 2, 3]) {
      const level = LevelData.getByIndex(index);
      const config = createLevelConfig(level);
      for (let run = 0; run < 15; run += 1) {
        const player = { x: 2000, y: 2000 };
        const obstacles = generateObstacles({ config, player });
        const npcs = positionNpcs({ npcs: level.npcs.map(npc => ({ ...npc })), config, player, blockers: obstacles });
        size = npcs[0].w;
        npcs.forEach((npc, i) => {
          if ((npc.x === 0 && npc.y === 0) || obstacles.some(o => overlap(npc, o)) || npcs.slice(i + 1).some(o => overlap(npc, o))) bad += 1;
        });
      }
    }
    return { bad, size };
  });
  expect(result.bad).toBe(0);
  expect(result.size).toBeGreaterThanOrEqual(112);
});
