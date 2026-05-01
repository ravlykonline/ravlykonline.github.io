const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { readUtf8, root } = require('./testHelpers.cjs');

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

function createHarness({
  canReachApple = true,
  levelId = 1,
  running = false,
  type = 'story'
} = {}) {
  const timers = [];
  const refs = {
    btnRun: { classList: createClassList() },
    sicoEl: { textContent: '' },
    statusEl: { className: '' },
    stxtEl: { textContent: '' }
  };
  const app = {
    engine: {
      analyzeCurrentRoute() {
        return { canReachApple };
      }
    },
    state: {
      currentLevel: { id: levelId, type },
      running
    }
  };
  const text = {
    ui: {
      debugStatus: 'Режим перевірки',
      defaultStatus: 'Готово'
    }
  };
  const windowRef = {
    clearTimeout(timerId) {
      const timer = timers.find((item) => item.id === timerId);
      if (timer) {
        timer.cleared = true;
      }
    },
    setTimeout(callback, delay) {
      const timer = { callback, cleared: false, delay, id: timers.length + 1 };
      timers.push(timer);
      return timer.id;
    }
  };

  return { app, refs, text, timers, windowRef };
}

test('appUiStatus sets default and debug status copy', async () => {
  const { createAppUiStatus } = await importModule('js/ui/appUiStatus.js');
  const harness = createHarness();
  const status = createAppUiStatus(harness);

  status.setLevelIntroStatus();

  assert.equal(harness.refs.sicoEl.textContent, '💡');
  assert.equal(harness.refs.stxtEl.textContent, 'Готово');
  assert.equal(harness.refs.statusEl.className, '');

  harness.app.state.currentLevel.type = 'debug';
  status.setLevelIntroStatus();

  assert.equal(harness.refs.sicoEl.textContent, '🔍');
  assert.equal(harness.refs.stxtEl.textContent, 'Режим перевірки');
  assert.equal(harness.refs.statusEl.className, 'warn');
});

test('appUiStatus schedules run hint only for early solvable idle levels', async () => {
  const { createAppUiStatus } = await importModule('js/ui/appUiStatus.js');
  const harness = createHarness();
  const status = createAppUiStatus(harness);

  status.scheduleRunHint();

  assert.equal(harness.timers.length, 1);
  assert.equal(harness.timers[0].delay, 3000);
  assert.equal(harness.refs.btnRun.classList.contains('run-hint'), false);

  harness.timers[0].callback();

  assert.equal(harness.refs.btnRun.classList.contains('run-hint'), true);
});

test('appUiStatus clears run hint and rejects later or running levels', async () => {
  const { createAppUiStatus } = await importModule('js/ui/appUiStatus.js');
  const harness = createHarness({ levelId: 4 });
  const status = createAppUiStatus(harness);

  status.scheduleRunHint();
  assert.equal(harness.timers.length, 0);

  harness.app.state.currentLevel.id = 2;
  harness.app.state.running = true;
  status.scheduleRunHint();
  assert.equal(harness.timers.length, 0);

  harness.app.state.running = false;
  status.onRouteChanged();
  assert.equal(harness.timers.length, 1);
  harness.timers[0].callback();
  assert.equal(harness.refs.btnRun.classList.contains('run-hint'), true);

  status.clearRunHint();

  assert.equal(harness.refs.btnRun.classList.contains('run-hint'), false);
});

test('appUiStatus remains focused on status UI without storage or global app contracts', () => {
  const source = readUtf8('js/ui/appUiStatus.js');

  assert.match(source, /export function createAppUiStatus/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /eval\(|new Function|document\.write/);
});
