const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function baseLevel(overrides = {}) {
  return {
    id: 999,
    type: 'play',
    rows: 3,
    cols: 5,
    start: { r: 1, c: 0 },
    apple: { r: 1, c: 3 },
    obstacles: [],
    startFacing: 'right',
    allowedTiles: ['right'],
    presetArrows: {},
    ...overrides
  };
}

test('simulator returns success with a pure route result', async () => {
  const { simulateLevel } = await importModule('js/engine/simulator.js');
  const result = simulateLevel({
    level: baseLevel(),
    arrows: {
      '1,1': 'right',
      '1,2': 'right'
    },
    config: { maxSteps: 10, routeScanOrder: ['right'] }
  });

  assert.equal(result.success, true);
  assert.equal(result.reason, null);
  assert.deepEqual(result.path.map(({ r, c }) => `${r},${c}`), ['1,0', '1,1', '1,2', '1,3']);
});

test('simulator reports missing-arrow when route cannot start or continue', async () => {
  const { simulateLevel } = await importModule('js/engine/simulator.js');

  assert.equal(simulateLevel({
    level: baseLevel(),
    arrows: {},
    config: { routeScanOrder: ['right'] }
  }).reason, 'missing-arrow');

  assert.equal(simulateLevel({
    level: baseLevel(),
    arrows: { '1,1': 'right' },
    config: { routeScanOrder: ['right'] }
  }).reason, 'missing-arrow');
});

test('simulator reports blocked and out-of-board failures', async () => {
  const { simulateLevel } = await importModule('js/engine/simulator.js');

  assert.equal(simulateLevel({
    level: baseLevel({
      obstacles: [{ r: 1, c: 2, kind: 'rock', label: 'Каміння' }]
    }),
    arrows: { '1,1': 'right' },
    config: { routeScanOrder: ['right'] }
  }).reason, 'blocked');

  assert.equal(simulateLevel({
    level: baseLevel({ apple: { r: 0, c: 4 } }),
    arrows: {
      '1,1': 'right',
      '1,2': 'right',
      '1,3': 'right',
      '1,4': 'right'
    },
    config: { routeScanOrder: ['right'] }
  }).reason, 'out-of-board');
});

test('simulator reports wrong-turn and loop failures', async () => {
  const { simulateLevel } = await importModule('js/engine/simulator.js');

  assert.equal(simulateLevel({
    level: baseLevel(),
    arrows: {
      '1,1': 'right',
      '1,2': 'left'
    },
    config: { routeScanOrder: ['right'] }
  }).reason, 'wrong-turn');

  assert.equal(simulateLevel({
    level: baseLevel({
      rows: 3,
      cols: 3,
      start: { r: 1, c: 0 },
      apple: { r: 0, c: 0 }
    }),
    arrows: {
      '1,1': 'left-down',
      '2,1': 'up-right',
      '2,2': 'left-up',
      '1,2': 'down-left'
    },
    config: { maxSteps: 10, routeScanOrder: ['right'] }
  }).reason, 'loop');
});

test('simulator reports max-steps when route exceeds configured limit', async () => {
  const { simulateLevel } = await importModule('js/engine/simulator.js');

  const result = simulateLevel({
    level: baseLevel({
      rows: 3,
      cols: 4,
      start: { r: 1, c: 0 },
      apple: { r: 0, c: 0 }
    }),
    arrows: {
      '1,1': 'left-down',
      '2,1': 'up-right',
      '2,2': 'left-up',
      '1,2': 'down-left'
    },
    config: { maxSteps: 1, routeScanOrder: ['right'] }
  });

  assert.equal(result.success, false);
  assert.equal(result.reason, 'max-steps');
});
