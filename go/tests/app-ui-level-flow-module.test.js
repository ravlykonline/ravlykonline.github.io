const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { readUtf8, root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createHarness() {
  const calls = [];
  const app = {
    engine: {
      clearAll() {
        calls.push('clear-all');
      }
    },
    getNextLevelId() {
      return 3;
    },
    getPrevLevelId() {
      return 1;
    },
    getStart() {
      calls.push('get-start');
      return { c: 2, r: 1 };
    },
    render: {
      buildGrid() {
        calls.push('build-grid');
      },
      buildPalette() {
        calls.push('build-palette');
      },
      clearPendingDelete() {
        calls.push('clear-pending-delete');
      },
      posSnail(r, c, animate, facing) {
        calls.push(['pos-snail', r, c, animate, facing]);
      },
      renderAll() {
        calls.push('render-all');
      }
    },
    setCurrentLevel(levelId) {
      calls.push(['set-level', levelId]);
      if (levelId === 404) {
        return false;
      }
      this.state.currentLevel.id = levelId;
      return true;
    },
    state: {
      completedLevelIds: [],
      currentLevel: { id: 1 },
      snailFacing: 'right'
    }
  };
  const effectsApi = {
    clearStopMark() {
      calls.push('clear-stop-mark');
    },
    syncSizes() {
      calls.push('sync-sizes');
    }
  };
  const modalApi = {
    openLevelIntro() {
      calls.push('open-intro');
    }
  };
  const statusApi = {
    scheduleRunHint() {
      calls.push('schedule-run-hint');
    },
    setLevelIntroStatus() {
      calls.push('set-level-intro-status');
    }
  };
  const windowRef = {
    requestAnimationFrame(callback) {
      calls.push('raf');
      callback();
    }
  };

  return {
    app,
    calls,
    effectsApi,
    modalApiProvider: () => modalApi,
    refreshLevelUi() {
      calls.push('refresh-level-ui');
    },
    statusApi,
    windowRef
  };
}

test('appUiLevelFlow renders the current level without clearing its route', async () => {
  const { createAppUiLevelFlow } = await importModule('js/ui/appUiLevelFlow.js');
  const harness = createHarness();
  const flow = createAppUiLevelFlow(harness);

  flow.loadCurrentLevel();

  assert.deepEqual(harness.calls, [
    'clear-stop-mark',
    'build-palette',
    'build-grid',
    'clear-pending-delete',
    'render-all',
    'refresh-level-ui',
    'set-level-intro-status',
    'schedule-run-hint',
    'sync-sizes'
  ]);
});

test('appUiLevelFlow changes levels without reopening intro', async () => {
  const { createAppUiLevelFlow } = await importModule('js/ui/appUiLevelFlow.js');
  const harness = createHarness();
  const flow = createAppUiLevelFlow(harness);

  assert.equal(flow.goToLevel(2), true);
  assert.equal(flow.goToLevel(404), false);
  assert.equal(flow.goToLevel(null), false);
  assert.equal(flow.goToPrevLevel(), true);
  assert.equal(flow.goToNextLevel(), true);

  assert.equal(harness.calls.filter((item) => item === 'open-intro').length, 0);
  assert.deepEqual(
    harness.calls.filter((item) => Array.isArray(item) && item[0] === 'set-level'),
    [
      ['set-level', 2],
      ['set-level', 404],
      ['set-level', 1],
      ['set-level', 3]
    ]
  );
});

test('appUiLevelFlow remains focused on level flow without storage or global app contracts', () => {
  const source = readUtf8('js/ui/appUiLevelFlow.js');

  assert.match(source, /export function createAppUiLevelFlow/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /eval\(|new Function|document\.write/);
});
