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

test('assets module creates relative /go-compatible image icons', async () => {
  const { assetClassName, assetPath, createAssetIcon } = await importModule('js/ui/assets.js');
  const documentRef = { createElement };

  const icon = createAssetIcon({
    className: 'tile-icon',
    documentRef,
    filename: 'straight_right.svg'
  });

  assert.equal(assetPath('snail.svg'), './assets/snail.svg');
  assert.equal(assetClassName('tile-icon'), 'asset-icon tile-icon');
  assert.equal(icon.src, './assets/straight_right.svg');
  assert.equal(icon.className, 'asset-icon tile-icon');
  assert.equal(icon.alt, '');
  assert.equal(icon.attrs['aria-hidden'], 'true');
  assert.equal(icon.draggable, false);
});

test('assets module creates tile icons by direction', async () => {
  const [{ TILE_DEFS }, { createTileIconByDir }] = await Promise.all([
    importModule('js/core/constants.js'),
    importModule('js/ui/assets.js')
  ]);
  const documentRef = { createElement };

  const icon = createTileIconByDir({
    dir: 'right',
    documentRef,
    tileDefs: TILE_DEFS
  });

  assert.equal(icon.src, './assets/straight_right.svg');
  assert.equal(createTileIconByDir({ dir: 'nope', documentRef, tileDefs: TILE_DEFS }), null);
});

test('assets module stays independent from storage and global app state', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'js/ui/assets.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
});
