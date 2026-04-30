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
    children: [],
    className: '',
    dataset: {},
    listeners: {},
    tagName,
    textContent: '',
    type: '',
    append(...items) {
      this.children.push(...items);
    },
    appendChild(item) {
      this.children.push(item);
    },
    addEventListener(name, handler) {
      this.listeners[name] = handler;
    }
  };
}

test('renderLevelMap renders all levels as unlocked buttons with current and done states', async () => {
  const [{ levels }, { renderLevelMap }] = await Promise.all([
    importModule('js/core/levels.js'),
    importModule('js/ui/renderLevelMap.js')
  ]);
  const selected = [];
  const documentRef = { createElement };
  const text = {
    mapState(isCurrent, isDone) {
      return isCurrent ? 'Ми тут' : (isDone ? 'Пройдено' : 'Ще попереду');
    }
  };

  const grid = renderLevelMap({
    completedLevelIds: [1, 3],
    currentLevelId: 3,
    documentRef,
    levels,
    onSelect(levelId) {
      selected.push(levelId);
    },
    text
  });

  assert.equal(grid.className, 'level-map-grid');
  assert.equal(grid.children.length, 20);
  assert.equal(grid.children[0].tagName, 'button');
  assert.equal(grid.children[0].type, 'button');
  assert.match(grid.children[0].className, /\bdone\b/);
  assert.doesNotMatch(grid.children[0].className, /\blocked\b/);
  assert.match(grid.children[2].className, /\bcurrent\b/);
  assert.match(grid.children[2].className, /\bdone\b/);
  assert.equal(grid.children[2].children[2].textContent, 'Ми тут');

  grid.children[19].listeners.click();
  assert.deepEqual(selected, [20]);
});

test('renderLevelMap module stays independent from engine and storage', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'js/ui/renderLevelMap.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /simulateLevel/);
  assert.doesNotMatch(source, /window\.SnailGame/);
});
