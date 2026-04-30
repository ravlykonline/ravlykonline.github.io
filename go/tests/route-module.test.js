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
    id: 901,
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

test('route module finds the first valid neighboring start move by scan order', async () => {
  const { findNeighborStartMove } = await importModule('js/engine/route.js');
  const result = findNeighborStartMove({
    arrows: {
      '0,0': 'down',
      '1,1': 'right'
    },
    level: baseLevel(),
    scanOrder: ['up', 'right']
  });

  assert.deepEqual(result, {
    c: 1,
    dir: 'right',
    r: 1,
    startKey: '1,1'
  });
});

test('route module analyzes success, missing arrows and blocked moves', async () => {
  const { analyzeRoute } = await importModule('js/engine/route.js');

  const success = analyzeRoute({
    arrows: {
      '1,1': 'right',
      '1,2': 'right'
    },
    config: { routeScanOrder: ['right'] },
    level: baseLevel()
  });
  assert.equal(success.canReachApple, true);
  assert.equal(success.success, true);
  assert.equal(success.reason, null);
  assert.equal(success.startKey, '1,1');
  assert.deepEqual(success.path.map(({ r, c }) => `${r},${c}`), ['1,0', '1,1', '1,2', '1,3']);

  const missing = analyzeRoute({
    arrows: {},
    config: { routeScanOrder: ['right'] },
    level: baseLevel()
  });
  assert.equal(missing.success, false);
  assert.equal(missing.reason, 'missing-arrow');

  const blocked = analyzeRoute({
    arrows: { '1,1': 'right' },
    config: { routeScanOrder: ['right'] },
    level: baseLevel({ obstacles: [{ r: 1, c: 2, kind: 'rock', label: 'Камінь' }] })
  });
  assert.equal(blocked.success, false);
  assert.equal(blocked.reason, 'blocked');
  assert.deepEqual(blocked.path.map(({ r, c }) => `${r},${c}`), ['1,0', '1,1', '1,2']);
});

test('route module stays pure and independent from DOM, storage and global app state', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'js/engine/route.js'), 'utf8');

  assert.doesNotMatch(source, /document|window\.SnailGame/);
  assert.doesNotMatch(source, /sessionStorage|localStorage/);
});
