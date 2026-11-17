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
  const documentRef = {
    createElement() {
      return {
        children: [],
        className: '',
        append(...children) {
          this.children.push(...children);
        }
      };
    }
  };
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
    documentRef,
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

  startup.start();

  const [sprite] = harness.app.refs.snailEl.children;
  assert.equal(sprite.className, 'snail-sprite');
  assert.equal(sprite.children[0], harness.snailIcon);
  assert.equal(sprite.children.length, 5);
  assert.deepEqual(harness.calls[0], 'set-level-intro-status');
  assert.deepEqual(harness.calls[1], ['create-asset-icon', 'snail.svg', 'board-icon board-icon-snail']);
  assert.deepEqual(harness.calls.at(-1), 'sync-sizes');
});

test('appUiStartup skips intro modal when the session should not auto-open it', async () => {
  const { createAppUiStartup } = await importModule('js/ui/appUiStartup.js');
  const harness = createHarness({ autoIntro: false });
  const startup = createAppUiStartup(harness);

  startup.start();

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
