const test = require('node:test');
const assert = require('node:assert/strict');

const { bootstrapCore } = require('./testHelpers.cjs');

const SESSION_KEY = 'ravlyk-code-session-v1';

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('saved progress loads from sessionStorage and persists current level', async () => {
  const { app, storage } = await bootstrapCore({ currentLevelId: 6, completedLevelIds: [1, 2, 3] });

  assert.equal(app.state.currentLevel.id, 6);
  assert.deepEqual(Array.from(app.state.completedLevelIds), [1, 2, 3]);

  app.setCurrentLevel(7);
  const saved = JSON.parse(storage.getItem(SESSION_KEY));
  assert.equal(saved.version, 1);
  assert.equal(saved.currentLevelId, 7);
  assert.deepEqual(saved.arrowsByLevel['7'], {});
  assert.deepEqual(saved.completedLevelIds, [1, 2, 3]);
});

test('restartProgress resets saved and active progress', async () => {
  const { app, storage } = await bootstrapCore({ currentLevelId: 8, completedLevelIds: [1, 2, 3, 4] });

  app.restartProgress();
  const saved = JSON.parse(storage.getItem(SESSION_KEY));
  assert.equal(app.state.currentLevel.id, 1);
  assert.deepEqual(Array.from(app.state.completedLevelIds), []);
  assert.equal(saved.version, 1);
  assert.equal(saved.currentLevelId, 1);
  assert.deepEqual(saved.arrowsByLevel['1'], {});
  assert.deepEqual(saved.completedLevelIds, []);
});

test('storage failures do not break level changes or progress reset', async () => {
  const throwingStorage = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error('quota exceeded');
    },
    removeItem() {
      throw new Error('blocked');
    }
  };

  const { app } = await bootstrapCore(null, throwingStorage);

  assert.doesNotThrow(() => app.setCurrentLevel(2));
  assert.equal(app.state.currentLevel.id, 2);
  assert.doesNotThrow(() => app.restartProgress());
  assert.equal(app.state.currentLevel.id, 1);
  assert.deepEqual(Array.from(app.state.completedLevelIds), []);
});

test('placed arrows persist by level across reloads in the same tab', async () => {
  const { app, storage } = await bootstrapCore({
    version: 1,
    currentLevelId: 6,
    arrowsByLevel: {
      6: {
        '2,3': 'right',
        '2,4': 'left-up'
      }
    },
    completedLevelIds: [1, 2]
  });

  assert.equal(app.state.currentLevel.id, 6);
  assert.deepEqual(plain(app.state.arrows), {
    '2,3': 'right',
    '2,4': 'left-up'
  });

  app.state.arrows['3,4'] = 'down';
  app.persistCurrentArrows();

  const reloaded = (await bootstrapCore(null, storage)).app;
  assert.equal(reloaded.state.currentLevel.id, 6);
  assert.deepEqual(plain(reloaded.state.arrows), {
    '2,3': 'right',
    '2,4': 'left-up',
    '3,4': 'down'
  });
  assert.deepEqual(Array.from(reloaded.state.completedLevelIds), [1, 2]);
});
