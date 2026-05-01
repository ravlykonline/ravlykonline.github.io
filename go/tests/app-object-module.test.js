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

test('composition creates the app object from explicit ES modules', async () => {
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
  assert.equal(typeof app.textUk.progress, 'function');
  assert.equal(app.tileDefs[0].iconFile, 'straight_up.svg');
  assert.match(app.tileDefs[0].icon, /src="\.\/assets\/straight_up\.svg"/);
  assert.equal(app.delta.right.dc, 1);
  assert.equal(app.oppositeDir('left'), 'right');
  assert.equal(app.resolveTileExit('left-up', 'right'), 'up');
  assert.equal(app.resolveStartTileExit('up-right'), 'right');
  assert.equal(app.canEnterTile('down-left', 'up'), true);

  const icon = app.createAssetIcon('snail.svg', 'board-icon');
  assert.equal(icon.src, './assets/snail.svg');
  assert.equal(icon.className, 'asset-icon board-icon');
  assert.equal(icon.attrs['aria-hidden'], 'true');

  assert.equal(app.createTileIconByDir('right').src, './assets/straight_right.svg');
  assert.equal(app.createTileIconByDir('missing'), null);
  assert.equal(windowRef.SnailGame, undefined);
});
