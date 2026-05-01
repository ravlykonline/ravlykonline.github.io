const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { readUtf8, root } = require('./testHelpers.cjs');

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

test('appFactory creates the base app object from explicit core modules', async () => {
  const { createAppObject } = await importModule('js/app/appFactory.js');
  const app = createAppObject({
    documentRef: { createElement }
  });

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
});

test('appFactory clones level arrays and nested objects for runtime mutation safety', async () => {
  const [{ createAppObject }, { levels }] = await Promise.all([
    importModule('js/app/appFactory.js'),
    importModule('js/core/levels.js')
  ]);
  const app = createAppObject({
    documentRef: { createElement }
  });

  assert.notEqual(app.levels[0], levels[0]);
  assert.notEqual(app.levels[0].allowedTiles, levels[0].allowedTiles);
  assert.notEqual(app.levels[0].apple, levels[0].apple);
  assert.notEqual(app.levels[0].start, levels[0].start);
  app.levels[0].start.r = 99;
  assert.notEqual(levels[0].start.r, 99);
});

test('appFactory stays independent from DOM globals, storage and old globals', () => {
  const source = readUtf8('js/app/appFactory.js');

  assert.match(source, /export function createAppObject/);
  assert.doesNotMatch(source, /documentRef = document/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /eval\(|new Function|document\.write/);
});
