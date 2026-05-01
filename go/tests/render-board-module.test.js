const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createElement(tagName, ownerDocument) {
  return {
    attrs: {},
    children: [],
    className: '',
    dataset: {},
    listeners: {},
    ownerDocument,
    style: {},
    tagName,
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute(name, value) {
      this.attrs[name] = String(value);
    },
    classList: {
      toggle() {}
    }
  };
}

function createDocument() {
  const documentRef = {
    createElement(tagName) {
      return createElement(tagName, documentRef);
    }
  };
  return documentRef;
}

const text = {
  appleGoal: 'яблуко',
  clickToDelete: 'натисни, щоб видалити',
  obstacleSuffix(label) {
    return `перешкода ${label}`;
  },
  pendingDelete: 'підтверди видалення',
  presetDebug: 'готова стрілка',
  rowCol(row, col) {
    return `ряд ${row}, колонка ${col}`;
  },
  snailStart: 'старт равлика',
  startPicked: 'вибраний старт'
};

test('createBoardGrid builds stable grid cells with coordinates and events', async () => {
  const { createBoardGrid } = await importModule('js/ui/renderBoard.js');
  const documentRef = createDocument();
  const clicked = [];
  const keyed = [];
  const grid = createBoardGrid({
    cols: 2,
    documentRef,
    onCellAction(row, col) {
      clicked.push([row, col]);
    },
    onCellKeyDown(event, row, col) {
      keyed.push([event.key, row, col]);
    },
    rows: 2
  });

  assert.equal(grid.children.length, 4);
  assert.equal(grid.children[0].dataset.r, '0');
  assert.equal(grid.children[0].dataset.c, '0');
  assert.equal(grid.children[0].attrs.role, 'gridcell');
  assert.equal(grid.children[0].attrs.tabindex, '0');
  assert.equal(grid.children[3].attrs.tabindex, '-1');

  grid.children[2].listeners.click();
  grid.children[1].listeners.keydown({ key: 'Enter' });
  assert.deepEqual(clicked, [[1, 0]]);
  assert.deepEqual(keyed, [['Enter', 0, 1]]);
});

test('renderBoardCell renders arrow state and accessible label without innerHTML', async () => {
  const [{ TILE_DEFS }, { renderBoardCell }] = await Promise.all([
    importModule('js/core/constants.js'),
    importModule('js/ui/renderBoard.js')
  ]);
  const documentRef = createDocument();
  const cell = documentRef.createElement('div');
  cell.dataset.r = '1';
  cell.dataset.c = '1';
  const tileDef = TILE_DEFS.find((tile) => tile.dir === 'right');

  renderBoardCell({
    cell,
    createAssetIcon(iconFile, className) {
      return { className, iconFile };
    },
    level: {
      apple: { r: 2, c: 2 },
      presetArrows: { '1,1': 'right' },
      start: { r: 0, c: 0 },
      type: 'debug'
    },
    state: {
      appleEaten: false,
      pendingDeleteKey: '1,1',
      startHighlightKey: '1,1'
    },
    text,
    tileDef
  });

  assert.equal(cell.children.length, 1);
  assert.match(cell.children[0].className, /cell-arrow/);
  assert.match(cell.children[0].className, /preset-arrow/);
  assert.match(cell.attrs['aria-label'], /готова стрілка/);
  assert.match(cell.attrs['aria-label'], /підтверди видалення/);
});

test('renderBoard module stays independent from storage and global app state', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'js/ui/renderBoard.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
});
