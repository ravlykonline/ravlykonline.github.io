const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

test('engine runtime creates route helpers from explicit app state', async () => {
  const { createEngineRoute } = await importModule('js/engine/runtime.js');
  const route = createEngineRoute({
    config: { maxSteps: 10, scanOrder: ['right'] },
    isObstacle() {
      return false;
    },
    state: {
      arrows: { '1,1': 'right' },
      currentLevel: {
        apple: { r: 1, c: 2 },
        cols: 3,
        rows: 3,
        start: { r: 1, c: 0 }
      }
    }
  });

  assert.deepEqual(route.findNeighborStartMove(1, 0, 3, 3), {
    dir: 'right',
    startKey: '1,1'
  });
  assert.equal(route.analyzeCurrentRoute().canReachApple, true);
});

test('engine runtime module avoids storage, DOM globals and window app state', () => {
  const source = fs.readFileSync(path.join(root, 'js/engine/runtime.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  assert.doesNotMatch(source, /document\./);
  assert.doesNotMatch(source, /window\.SnailGame/);
});
