const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createElement() {
  return {
    childNodes: [],
    classList: { add() {}, remove() {} },
    style: {},
    appendChild() {},
    addEventListener() {},
    focus() {},
    querySelector() {
      return null;
    },
    removeAttribute() {},
    replaceChildren(...children) {
      this.childNodes = children;
    },
    setAttribute() {}
  };
}

function createDocument() {
  return {
    createElement,
    querySelectorAll() {
      return [];
    }
  };
}

test('render facade wires board, drag and snail APIs from explicit dependencies', async () => {
  const { createRender } = await importModule('js/ui/render.js');
  const dragApi = {
    beginPointerDrag() {},
    clearDropTarget() {},
    endPointerDrag() {},
    hideGhost() {},
    moveGhost() {},
    updateDropTarget() {}
  };
  const snailApi = {
    async bumpSnail() {},
    posSnail() {}
  };
  const app = {
    config: { cols: 1, rows: 1 },
    createAssetIcon() {},
    createRenderDrag(deps) {
      assert.equal(typeof deps.clearPendingDelete, 'function');
      assert.equal(typeof deps.placeArrow, 'function');
      return dragApi;
    },
    createRenderSnail(deps) {
      assert.equal(typeof deps.cellEl, 'function');
      return snailApi;
    },
    createTileIconByDir() {},
    getApple() {
      return { r: 0, c: 0 };
    },
    getObstacle() {
      return null;
    },
    getStart() {
      return { r: 0, c: 0 };
    },
    getStartFacing() {
      return 'right';
    },
    isObstacle() {
      return false;
    },
    refs: {
      ghostEl: createElement(),
      gridEl: createElement(),
      paletteEl: createElement()
    },
    state: {
      arrows: {},
      currentLevel: { allowedTiles: ['right'], cols: 1, rows: 1 },
      pendingDeleteKey: null
    },
    text: {
      render: { deleteCommand: 'delete' },
      tiles: {}
    },
    tileDefs: [{ dir: 'right', group: 'str' }]
  };

  const render = createRender({ app, documentRef: createDocument() });

  assert.equal(render.beginPointerDrag, dragApi.beginPointerDrag);
  assert.equal(render.bumpSnail, snailApi.bumpSnail);
  assert.equal(typeof render.buildGrid, 'function');
  assert.equal(typeof render.buildPalette, 'function');
  assert.equal(typeof render.renderAll, 'function');
});

test('render module stays independent from storage and global app state', () => {
  const source = fs.readFileSync(path.join(root, 'js/ui/render.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
});
