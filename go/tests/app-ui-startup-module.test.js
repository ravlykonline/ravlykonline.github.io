const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { readUtf8, root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createHarness({ autoIntro = true } = {}) {
  const calls = [];
  const snailIcon = { tagName: 'img' };
  const app = {
    createAssetIcon(filename, className) {
      calls.push(['create-asset-icon', filename, className]);
      return snailIcon;
    },
    getStart() {
      calls.push('get-start');
      return { c: 2, r: 1 };
    },
    refs: {
      snailEl: {
        children: [],
        replaceChildren(...children) {
          calls.push(['replace-snail', ...children]);
          this.children = children;
        }
      }
    },
    render: {
      posSnail(r, c, animate, facing) {
        calls.push(['pos-snail', r, c, animate, facing]);
      }
    },
    state: {
      snailFacing: 'down'
    }
  };
  const effectsApi = {
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
    setLevelIntroStatus() {
      calls.push('set-level-intro-status');
    }
  };
  const rafCallbacks = [];
  const windowRef = {
    requestAnimationFrame(callback) {
      calls.push('raf');
      rafCallbacks.push(callback);
    }
  };

  return {
    app,
    calls,
    effectsApi,
    modalApiProvider: () => modalApi,
    rafCallbacks,
    shouldAutoOpenIntro() {
      calls.push('should-auto-intro');
      return autoIntro;
    },
    snailIcon,
    statusApi,
    windowRef
  };
}

function flushRaf(harness) {
  while (harness.rafCallbacks.length > 0) {
    const callback = harness.rafCallbacks.shift();
    callback();
  }
}

test('appUiStartup renders the snail icon and schedules initial positioning', async () => {
  const { createAppUiStartup } = await importModule('js/ui/appUiStartup.js');
  const harness = createHarness();
  const startup = createAppUiStartup(harness);

  startup.start({ shouldAutoOpenIntro: harness.shouldAutoOpenIntro });
  flushRaf(harness);

  assert.deepEqual(harness.app.refs.snailEl.children, [harness.snailIcon]);
  assert.deepEqual(harness.calls, [
    'raf',
    'raf',
    'sync-sizes',
    'set-level-intro-status',
    'get-start',
    ['create-asset-icon', 'snail.svg', 'board-icon board-icon-snail'],
    ['replace-snail', harness.snailIcon],
    'raf',
    'should-auto-intro',
    'raf',
    ['pos-snail', 1, 2, false, 'down'],
    'open-intro'
  ]);
});

test('appUiStartup skips intro modal when the session should not auto-open it', async () => {
  const { createAppUiStartup } = await importModule('js/ui/appUiStartup.js');
  const harness = createHarness({ autoIntro: false });
  const startup = createAppUiStartup(harness);

  startup.start({ shouldAutoOpenIntro: harness.shouldAutoOpenIntro });
  flushRaf(harness);

  assert.equal(harness.calls.includes('open-intro'), false);
});

test('appUiStartup remains a focused startup helper without unsafe DOM HTML or globals', () => {
  const source = readUtf8('js/ui/appUiStartup.js');

  assert.match(source, /export function createAppUiStartup/);
  assert.doesNotMatch(source, /innerHTML\s*=/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /eval\(|new Function|document\.write/);
});
