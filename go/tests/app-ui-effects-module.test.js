const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { readUtf8, root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createHarness({ width = 1000 } = {}) {
  const calls = [];
  const styleValues = {};
  const timers = [];
  const cell = {
    style: {
      outline: '',
      outlineOffset: ''
    }
  };
  const confEl = {
    children: [],
    append(...nodes) {
      this.children.push(...nodes);
    },
    replaceChildren() {
      this.children = [];
    }
  };
  const app = {
    config: { cols: 4, rows: 3 },
    delta: {
      down: { dc: 0, dr: 1 },
      left: { dc: -1, dr: 0 },
      right: { dc: 1, dr: 0 },
      up: { dc: 0, dr: -1 }
    },
    refs: {
      confEl,
      gwrap: {
        getBoundingClientRect() {
          return { height: 300, width };
        }
      }
    },
    render: {
      cellEl(r, c) {
        calls.push(['cell', r, c]);
        return cell;
      },
      posSnail(r, c, animate, facing) {
        calls.push(['pos-snail', r, c, animate, facing]);
      }
    },
    state: {
      snailFacing: 'right',
      snailPos: { c: 2, r: 1 }
    }
  };
  const documentRef = {
    createElement(tagName) {
      return { className: '', style: {}, tagName };
    },
    documentElement: {
      style: {
        setProperty(name, value) {
          styleValues[name] = value;
        }
      }
    }
  };
  const windowRef = {
    innerWidth: width,
    matchMedia() {
      return { matches: false };
    },
    requestAnimationFrame(callback) {
      calls.push('raf');
      callback();
    },
    setTimeout(callback, delay) {
      const timer = { callback, delay };
      timers.push(timer);
      return timers.length;
    }
  };

  return { app, calls, cell, confEl, documentRef, styleValues, timers, windowRef };
}

test('appUiEffects syncs board CSS variables and snail position', async () => {
  const { createAppUiEffects } = await importModule('js/ui/appUiEffects.js');
  const harness = createHarness({ width: 1000 });
  const effects = createAppUiEffects(harness);

  effects.syncSizes();

  assert.equal(harness.styleValues['--gs-w'], '1000px');
  assert.equal(harness.styleValues['--gs-h'], '300px');
  assert.equal(harness.styleValues['--tile-sz'], '64px');
  assert.deepEqual(harness.calls, ['raf', ['pos-snail', 1, 2, false, 'right']]);
});

test('appUiEffects flashes one cell and clears the outline later', async () => {
  const { createAppUiEffects } = await importModule('js/ui/appUiEffects.js');
  const harness = createHarness();
  const effects = createAppUiEffects(harness);

  effects.flashCell(1, 2);

  assert.deepEqual(harness.calls, [['cell', 1, 2]]);
  assert.equal(harness.cell.style.outline, '4px solid #ff9800');
  assert.equal(harness.cell.style.outlineOffset, '-4px');
  assert.equal(harness.timers[0].delay, 1200);

  harness.timers[0].callback();

  assert.equal(harness.cell.style.outline, '');
  assert.equal(harness.cell.style.outlineOffset, '');
});

test('appUiEffects flashes in-board neighbours only', async () => {
  const { createAppUiEffects } = await importModule('js/ui/appUiEffects.js');
  const harness = createHarness();
  const effects = createAppUiEffects(harness);

  effects.flashNeighbours(0, 0);

  assert.deepEqual(harness.calls, [
    ['cell', 1, 0],
    ['cell', 0, 1]
  ]);
});

test('appUiEffects launches confetti through the feature module', async () => {
  const { createAppUiEffects } = await importModule('js/ui/appUiEffects.js');
  const harness = createHarness();
  const effects = createAppUiEffects(harness);

  assert.equal(effects.launchConfetti(), true);
  assert.equal(harness.confEl.children.length, 75);
  assert.equal(harness.timers[0].delay, 3800);
});

test('appUiEffects remains focused on visual effects without storage or global app contracts', () => {
  const source = readUtf8('js/ui/appUiEffects.js');

  assert.match(source, /export function createAppUiEffects/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /eval\(|new Function|document\.write/);
});
