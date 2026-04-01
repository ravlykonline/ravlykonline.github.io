const test = require('node:test');
const assert = require('node:assert/strict');

const { bootstrapCore } = require('./testHelpers.cjs');

test('saved progress loads from sessionStorage and persists current level', () => {
  const { app, storage } = bootstrapCore({ currentLevelId: 6, completedLevelIds: [1, 2, 3] });

  assert.equal(app.state.currentLevel.id, 6);
  assert.deepEqual(Array.from(app.state.completedLevelIds), [1, 2, 3]);

  app.setCurrentLevel(7);
  const saved = JSON.parse(storage.getItem('ravlyk-code-progress-v1'));
  assert.equal(saved.currentLevelId, 7);
  assert.deepEqual(saved.completedLevelIds, [1, 2, 3]);
});

test('restartProgress resets saved and active progress', () => {
  const { app, storage } = bootstrapCore({ currentLevelId: 8, completedLevelIds: [1, 2, 3, 4] });

  app.restartProgress();
  const saved = JSON.parse(storage.getItem('ravlyk-code-progress-v1'));
  assert.equal(app.state.currentLevel.id, 1);
  assert.deepEqual(Array.from(app.state.completedLevelIds), []);
  assert.equal(saved.currentLevelId, 1);
  assert.deepEqual(saved.completedLevelIds, []);
});

test('storage failures do not break level changes or progress reset', () => {
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

  const { app } = bootstrapCore(null, throwingStorage);

  assert.doesNotThrow(() => app.setCurrentLevel(2));
  assert.equal(app.state.currentLevel.id, 2);
  assert.doesNotThrow(() => app.restartProgress());
  assert.equal(app.state.currentLevel.id, 1);
  assert.deepEqual(Array.from(app.state.completedLevelIds), []);
});
