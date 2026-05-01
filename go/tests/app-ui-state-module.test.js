const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { readUtf8, root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createElement() {
  return {
    attributes: {},
    className: '',
    disabled: false,
    hidden: false,
    style: {},
    textContent: '',
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
  };
}

function createHarness() {
  const calls = [];
  const tileButtons = [{ disabled: false }, { disabled: false }];
  const refs = {
    btnClr: createElement(),
    btnLevelInfo: createElement(),
    btnMap: createElement(),
    btnNext: createElement(),
    btnPrev: createElement(),
    btnRun: createElement(),
    btnSpeakTask: createElement(),
    debugNoteEl: createElement(),
    levelChipEl: createElement(),
    levelGoalEl: createElement(),
    levelHintEl: createElement(),
    levelModeEl: createElement(),
    levelTitleEl: createElement(),
    progressFillEl: createElement(),
    progressTextEl: createElement(),
    progressTrackEl: createElement()
  };
  const app = {
    getCurrentLevelIndex() {
      return 1;
    },
    getTotalLevels() {
      return 3;
    },
    hasNextLevel() {
      return true;
    },
    hasPrevLevel() {
      return false;
    },
    refs,
    state: {
      completedLevelIds: [1],
      currentLevel: {
        goal: 'Дістатися яблука',
        hint: 'Спробуй праворуч',
        id: 1,
        name: 'Перший рівень',
        type: 'story'
      },
      running: false
    }
  };
  const documentRef = {
    body: {
      classList: {
        toggle(name, active) {
          calls.push(['body-toggle', name, active]);
        }
      }
    },
    querySelectorAll(selector) {
      assert.equal(selector, '.atile');
      return tileButtons;
    }
  };
  const layoutApi = {
    updateResponsiveLabels() {
      calls.push('responsive-labels');
    }
  };
  const statusApi = {
    clearRunHint() {
      calls.push('clear-run-hint');
    }
  };
  const text = {
    levelChip(index, total, done) {
      return `${index}/${total}/${done ? 'done' : 'open'}`;
    },
    mode(isDebug) {
      return isDebug ? 'debug' : 'play';
    },
    progress(completed, total) {
      return `${completed} з ${total}`;
    },
    static: {
      earlyLevelInfoButton: 'Що робити',
      earlyLevelSpeakAria: 'Пояснити завдання',
      earlyLevelSpeakButton: 'Пояснити',
      earlyLevelSpeakTitle: 'Пояснити завдання',
      infoButton: 'Інфо',
      speakAria: 'Озвучити',
      speakButton: 'Озвучити',
      speakTitle: 'Озвучити завдання'
    },
    ui: {
      debugNote: 'Debug note'
    }
  };

  return { app, calls, documentRef, layoutApi, refs, statusApi, text, tileButtons };
}

test('appUiState refreshes level header and progress widgets', async () => {
  const { createAppUiState } = await importModule('js/ui/appUiState.js');
  const harness = createHarness();
  const state = createAppUiState(harness);

  state.refreshLevelUi();

  assert.equal(harness.refs.levelChipEl.textContent, '1/3/done');
  assert.equal(harness.refs.levelTitleEl.textContent, 'Перший рівень');
  assert.equal(harness.refs.levelGoalEl.textContent, 'Дістатися яблука');
  assert.equal(harness.refs.levelHintEl.textContent, 'Спробуй праворуч');
  assert.equal(harness.refs.progressTextEl.textContent, '1 з 3');
  assert.equal(harness.refs.progressFillEl.style.width, '33%');
  assert.equal(harness.refs.progressTrackEl.attributes['aria-valuenow'], '33');
  assert.equal(harness.refs.btnPrev.disabled, true);
  assert.equal(harness.refs.btnNext.disabled, false);
  assert.deepEqual(harness.calls, [['body-toggle', 'debug-mode', false], 'responsive-labels']);
});

test('appUiState disables command controls and clears run hint when running', async () => {
  const { createAppUiState } = await importModule('js/ui/appUiState.js');
  const harness = createHarness();
  const state = createAppUiState(harness);

  state.setDisabled(true);

  assert.equal(harness.refs.btnRun.disabled, true);
  assert.equal(harness.refs.btnClr.disabled, true);
  assert.equal(harness.refs.btnPrev.disabled, true);
  assert.equal(harness.refs.btnNext.disabled, true);
  assert.equal(harness.refs.btnLevelInfo.disabled, true);
  assert.equal(harness.refs.btnSpeakTask.disabled, true);
  assert.equal(harness.refs.btnMap.disabled, true);
  assert.deepEqual(harness.tileButtons.map((button) => button.disabled), [true, true]);
  assert.deepEqual(harness.calls, ['clear-run-hint']);
});

test('appUiState leaves available nav controls enabled when unlocked', async () => {
  const { createAppUiState } = await importModule('js/ui/appUiState.js');
  const harness = createHarness();
  harness.app.hasPrevLevel = () => true;
  const state = createAppUiState(harness);

  state.setDisabled(false);

  assert.equal(harness.refs.btnRun.disabled, false);
  assert.equal(harness.refs.btnPrev.disabled, false);
  assert.equal(harness.refs.btnNext.disabled, false);
  assert.deepEqual(harness.tileButtons.map((button) => button.disabled), [false, false]);
  assert.deepEqual(harness.calls, []);
});

test('appUiState remains focused on UI state without storage or global app contracts', () => {
  const source = readUtf8('js/ui/appUiState.js');

  assert.match(source, /export function createAppUiState/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /eval\(|new Function|document\.write/);
});
