const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createSessionStorage(seed = null) {
  let value = seed;
  return {
    clear() {
      value = null;
    },
    getItem() {
      return value;
    },
    removeItem() {
      value = null;
    },
    setItem(_key, nextValue) {
      value = String(nextValue);
    }
  };
}

function createDocument() {
  const requestedIds = [];
  return {
    requestedIds,
    createElement(tagName) {
      return {
        attrs: {},
        alt: '',
        className: '',
        draggable: true,
        src: '',
        tagName,
        setAttribute(name, value) {
          this.attrs[name] = String(value);
        }
      };
    },
    getElementById(id) {
      requestedIds.push(id);
      return { id };
    }
  };
}

test('app composition imports module slices without initializing global app state', async () => {
  const { createAppComposition } = await importModule('js/app/composition.js');
  const documentRef = createDocument();
  const windowRef = {
    addEventListener() {},
    location: { protocol: 'file:' },
    sessionStorage: createSessionStorage(JSON.stringify({
      version: 1,
      currentLevelId: 3,
      arrowsByLevel: { 3: { '1,1': 'right' } },
      completedLevelIds: [1, 2]
    }))
  };

  const composition = createAppComposition({
    documentRef,
    navigatorRef: {},
    windowRef
  });

  assert.equal(composition.levels.length, 20);
  assert.equal(composition.state.currentLevelId, 3);
  assert.deepEqual(composition.state.completedLevelIds, [1, 2]);
  assert.equal(composition.getLevelById(20).id, 20);
  assert.equal(composition.tileDefs.length, 12);
  assert.equal(composition.validateLevels().length, 0);
  assert.equal(composition.registerPwa(), false);
  assert.ok(documentRef.requestedIds.includes('grid'));
  assert.equal(typeof composition.simulateLevel, 'function');
  assert.equal(typeof composition.analyzeRoute, 'function');
  assert.equal(typeof composition.renderPalette, 'function');
});

test('app composition module stays independent from the old global bootstrap', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'js/app/composition.js'), 'utf8');

  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /localStorage/);
});
