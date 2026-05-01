const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createElement(tagName) {
  return {
    alt: null,
    attrs: {},
    className: '',
    draggable: true,
    src: '',
    tagName,
    setAttribute(name, value) {
      this.attrs[name] = String(value);
    }
  };
}

test('composition exposes the app object from the app factory', async () => {
  const { createAppComposition } = await importModule('js/app/composition.js');
  const documentRef = {
    createElement,
    getElementById(id) {
      return { id };
    }
  };
  const windowRef = {
    addEventListener() {},
    location: { protocol: 'file:' },
    sessionStorage: null
  };

  const composition = createAppComposition({ documentRef, navigatorRef: {}, windowRef });
  const { app } = composition;

  assert.equal(app.tileDefs.length, 12);
  assert.equal(app.levels.length, 20);
  assert.equal(app.levels[0].id, 1);
  assert.equal(typeof app.createAssetIcon, 'function');
  assert.equal(typeof app.createTileIconByDir, 'function');
  assert.equal(typeof app.resolveTileExit, 'function');
  assert.equal(windowRef.SnailGame, undefined);
});
