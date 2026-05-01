const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createClassList() {
  const values = new Set();
  return {
    add(value) {
      values.add(value);
    },
    contains(value) {
      return values.has(value);
    },
    remove(value) {
      values.delete(value);
    }
  };
}

function createCell(r, c) {
  return {
    classList: createClassList(),
    dataset: { r: String(r), c: String(c) },
    closest() {
      return this;
    }
  };
}

function createGhost() {
  return {
    children: [],
    classList: createClassList(),
    style: {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    replaceChildren(...children) {
      this.children = children;
    }
  };
}

test('renderDrag starts drag, shows ghost and tracks drop target', async () => {
  const { createRenderDrag } = await importModule('js/ui/renderDrag.js');
  const targetCell = createCell(2, 3);
  const ghostEl = createGhost();
  const button = { classList: createClassList(), disabled: false, setPointerCapture() {} };
  const body = { classList: createClassList() };
  const state = {};
  let cleared = false;

  const drag = createRenderDrag({
    clearPendingDelete() {
      cleared = true;
    },
    createTileIconByDir(dir, className) {
      return { className, dir };
    },
    documentRef: {
      body,
      documentElement: {},
      elementFromPoint() {
        return targetCell;
      }
    },
    ghostEl,
    placeArrow() {},
    state,
    windowRef: {
      getComputedStyle() {
        return { getPropertyValue: () => '64' };
      }
    }
  });

  drag.beginPointerDrag({ clientX: 100, clientY: 80, pointerId: 7 }, button, 'right', 'str');

  assert.equal(cleared, true);
  assert.equal(state.dragDir, 'right');
  assert.equal(state.dragPointerId, 7);
  assert.equal(state.dragCell, targetCell);
  assert.equal(ghostEl.children[0].dir, 'right');
  assert.equal(ghostEl.style.left, '68px');
  assert.equal(ghostEl.style.top, '48px');
  assert.equal(ghostEl.classList.contains('show'), true);
  assert.equal(button.classList.contains('dragging'), true);
  assert.equal(body.classList.contains('dragging-active'), true);
  assert.equal(targetCell.classList.contains('drop'), true);
});

test('renderDrag ends drag by placing an arrow and clearing drag state', async () => {
  const { createRenderDrag } = await importModule('js/ui/renderDrag.js');
  const targetCell = createCell(1, 2);
  const ghostEl = createGhost();
  const button = { classList: createClassList(), disabled: false };
  const body = { classList: createClassList() };
  const placed = [];
  const state = {
    dragButton: button,
    dragCell: targetCell,
    dragDir: 'down',
    dragMoved: true,
    dragPointerId: 3
  };

  const drag = createRenderDrag({
    clearPendingDelete() {},
    createTileIconByDir() {
      return null;
    },
    documentRef: {
      body,
      documentElement: {},
      elementFromPoint() {
        return targetCell;
      }
    },
    ghostEl,
    placeArrow(r, c, dir) {
      placed.push([r, c, dir]);
    },
    state,
    windowRef: {
      getComputedStyle() {
        return { getPropertyValue: () => '56' };
      }
    }
  });

  const didPlace = drag.endPointerDrag(10, 12);

  assert.equal(didPlace, true);
  assert.deepEqual(placed, [[1, 2, 'down']]);
  assert.equal(state.dragDir, null);
  assert.equal(state.dragButton, null);
  assert.equal(state.dragPointerId, null);
  assert.equal(state.dragCell, null);
  assert.equal(state.suppressTileClick, true);
  assert.equal(button.classList.contains('dragging'), false);
  assert.equal(body.classList.contains('dragging-active'), false);
});

test('renderDrag module stays independent from storage and global app state', () => {
  const source = fs.readFileSync(path.join(root, 'js/ui/renderDrag.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
});
