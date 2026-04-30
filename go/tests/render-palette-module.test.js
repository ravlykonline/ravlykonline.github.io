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
    attrs: {},
    children: [],
    className: '',
    dataset: {},
    listeners: {},
    tagName,
    type: '',
    appendChild(item) {
      this.children.push(item);
    },
    addEventListener(name, handler) {
      this.listeners[name] = handler;
    },
    setAttribute(name, value) {
      this.attrs[name] = value;
    }
  };
}

test('renderPalette renders only allowed command tiles and selected state', async () => {
  const [{ TILE_DEFS }, { renderPalette }] = await Promise.all([
    importModule('js/core/constants.js'),
    importModule('js/ui/renderPalette.js')
  ]);
  const selected = [];
  const palette = renderPalette({
    createTileIcon(tile) {
      return { iconFile: tile.iconFile };
    },
    documentRef: { createElement },
    level: {
      allowedTiles: ['right', 'left-up']
    },
    onSelect(dir) {
      selected.push(dir);
    },
    selectedDir: 'left-up',
    text: {
      render: {
        dragToBoard(label) {
          return `${label} — перетягни на поле`;
        }
      }
    },
    tileDefs: TILE_DEFS
  });

  assert.equal(palette.className, 'palette');
  assert.equal(palette.children.length, 2);
  assert.equal(palette.children[0].dataset.dir, 'right');
  assert.equal(palette.children[0].type, 'button');
  assert.equal(palette.children[0].attrs['aria-label'].includes('перетягни'), true);
  assert.doesNotMatch(palette.children[0].className, /\bsel\b/);
  assert.match(palette.children[1].className, /\bsel\b/);

  palette.children[1].listeners.click();
  assert.deepEqual(selected, ['left-up']);
});

test('renderPalette exposes all tile definitions when level has no allowedTiles limit', async () => {
  const [{ TILE_DEFS }, { getAllowedTileDefs }] = await Promise.all([
    importModule('js/core/constants.js'),
    importModule('js/ui/renderPalette.js')
  ]);

  assert.equal(getAllowedTileDefs({ level: {}, tileDefs: TILE_DEFS }).length, TILE_DEFS.length);
});

test('renderPalette module stays independent from engine and storage', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'js/ui/renderPalette.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /simulateLevel/);
  assert.doesNotMatch(source, /window\.SnailGame/);
});
