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

test('legacy globals module installs the old main.js contract from ES modules', async () => {
  const { installLegacyGlobals } = await importModule('js/app/legacyGlobals.js');
  const windowRef = {};
  const documentRef = { createElement };

  const app = installLegacyGlobals({ documentRef, windowRef });

  assert.equal(app, windowRef.SnailGame);
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

test('legacy globals module is limited to the compatibility bridge', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'js/app/legacyGlobals.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
});
