const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.get(key) || null;
    },
    removeItem(key) {
      data.delete(key);
    },
    setItem(key, value) {
      data.set(key, String(value));
    }
  };
}

test('appStateFacade installs current level helpers and session-backed progress', async () => {
  const [{ installAppStateFacade }, { levels }, { TILE_DEFS }, { textsUk }] = await Promise.all([
    importModule('js/state/appStateFacade.js'),
    importModule('js/core/levels.js'),
    importModule('js/core/constants.js'),
    importModule('js/core/texts.uk.js')
  ]);
  const storage = createStorage();
  const app = {
    levels,
    textUk: textsUk,
    tileDefs: TILE_DEFS
  };

  installAppStateFacade({
    app,
    refs: { gridEl: {}, paletteEl: {} },
    storage
  });

  assert.equal(app.state.currentLevel.id, 1);
  assert.equal(app.getTotalLevels(), 20);
  assert.equal(app.setCurrentLevel(3), true);
  assert.equal(app.state.currentLevel.id, 3);
  assert.equal(JSON.parse(storage.getItem('ravlyk-code-session-v1')).currentLevelId, 3);

  app.state.arrows['1,1'] = 'right';
  app.persistCurrentArrows();
  assert.deepEqual(JSON.parse(storage.getItem('ravlyk-code-session-v1')).arrowsByLevel['3'], {
    '1,1': 'right'
  });
});

test('appStateFacade module does not depend on DOM globals or window app state', () => {
  const source = fs.readFileSync(path.join(root, 'js/state/appStateFacade.js'), 'utf8');

  assert.doesNotMatch(source, /document\./);
  assert.doesNotMatch(source, /window\./);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /localStorage/);
});
