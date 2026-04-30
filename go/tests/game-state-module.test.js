const test = require('node:test');
const assert = require('node:assert/strict');

const { readUtf8 } = require('./testHelpers.cjs');

async function importSourceModule(relativePath) {
  const source = readUtf8(relativePath);
  const url = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  return import(url);
}

async function loadStateFixture() {
  const [{ levels }, gameState] = await Promise.all([
    importSourceModule('js/core/levels.js'),
    importSourceModule('js/state/gameState.js')
  ]);

  return { levels, gameState };
}

test('gameState creates initial state from levels and saved session', async () => {
  const { levels, gameState } = await loadStateFixture();
  const state = gameState.createInitialState(levels, {
    version: 1,
    currentLevelId: 7,
    arrowsByLevel: {
      7: {
        '1,2': 'right',
        '1,3': 'down'
      }
    },
    completedLevelIds: [1, 2, 999, 2]
  });

  assert.equal(state.currentLevelId, 7);
  assert.deepEqual(state.completedLevelIds, [1, 2]);
  assert.deepEqual(gameState.getLevelArrows(state, 7), {
    '1,2': 'right',
    '1,3': 'down'
  });
  assert.equal(gameState.getCurrentLevel(state).id, 7);
});

test('gameState changes levels without locking any level', async () => {
  const { levels, gameState } = await loadStateFixture();
  const state = gameState.createInitialState(levels);

  assert.equal(gameState.setCurrentLevel(state, 20), true);
  assert.equal(state.currentLevelId, 20);
  assert.equal(state.snailPos.r, levels[19].start.r);
  assert.equal(state.snailPos.c, levels[19].start.c);
  assert.equal(gameState.setCurrentLevel(state, 21), false);
  assert.equal(state.currentLevelId, 20);
});

test('gameState persists arrows by level in session payload', async () => {
  const { levels, gameState } = await loadStateFixture();
  const state = gameState.createInitialState(levels);

  assert.equal(gameState.placeArrow(state, 1, '1,2', 'right'), true);
  assert.equal(gameState.placeArrow(state, 2, '2,3', 'up'), true);
  assert.equal(gameState.markLevelComplete(state, 1), true);
  assert.equal(gameState.setCurrentLevel(state, 2), true);

  const payload = gameState.toSessionPayload(state);
  assert.deepEqual(payload, {
    version: 1,
    currentLevelId: 2,
    arrowsByLevel: {
      1: {
        '1,2': 'right'
      },
      2: {
        '2,3': 'up'
      },
      ...Object.fromEntries(levels.slice(2).map((level) => [String(level.id), level.presetArrows || {}]))
    },
    completedLevelIds: [1]
  });
});

test('gameState restart clears session progress and player arrows', async () => {
  const { levels, gameState } = await loadStateFixture();
  const state = gameState.createInitialState(levels, {
    version: 1,
    currentLevelId: 8,
    arrowsByLevel: {
      1: { '1,2': 'right' },
      8: { '2,2': 'down' }
    },
    completedLevelIds: [1, 2, 3]
  });

  gameState.restartGame(state);

  assert.equal(state.currentLevelId, 1);
  assert.deepEqual(state.completedLevelIds, []);
  assert.deepEqual(gameState.getLevelArrows(state, 1), {});
  assert.deepEqual(gameState.getLevelArrows(state, 5), levels[4].presetArrows);
  assert.deepEqual(gameState.toSessionPayload(state).completedLevelIds, []);
});

test('gameState module stays independent from DOM and storage APIs', () => {
  const source = readUtf8('js/state/gameState.js');

  assert.doesNotMatch(source, /document\./);
  assert.doesNotMatch(source, /window\./);
  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
});
