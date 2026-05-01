const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createEl() {
  return {
    attrs: {},
    className: '',
    disabled: false,
    hidden: false,
    textContent: '',
    setAttribute(name, value) {
      this.attrs[name] = String(value);
    }
  };
}

function createRefs() {
  return {
    btnLevelInfo: createEl(),
    btnNext: createEl(),
    btnPrev: createEl(),
    btnSpeakTask: createEl(),
    debugNoteEl: createEl(),
    levelChipEl: createEl(),
    levelGoalEl: createEl(),
    levelHintEl: createEl(),
    levelModeEl: createEl(),
    levelTitleEl: createEl()
  };
}

const text = {
  levelChip(index, total, done) {
    return `${index + 1}/${total}${done ? ' done' : ''}`;
  },
  mode(isDebug) {
    return isDebug ? 'debug' : 'play';
  },
  static: {
    earlyLevelInfoButton: 'early info',
    earlyLevelSpeakAria: 'early speak aria',
    earlyLevelSpeakButton: 'early speak',
    earlyLevelSpeakTitle: 'early speak title',
    infoButton: 'info',
    speakAria: 'speak aria',
    speakButton: 'speak',
    speakTitle: 'speak title'
  },
  ui: {
    debugNote: 'debug note'
  }
};

test('renderLevelHeader updates level metadata and nav buttons', async () => {
  const { renderLevelHeader } = await importModule('js/ui/renderLevelHeader.js');
  const toggles = [];
  const refs = createRefs();

  renderLevelHeader({
    canGoNext: true,
    canGoPrev: false,
    completedLevelIds: [2],
    documentRef: {
      body: {
        classList: {
          toggle(name, enabled) {
            toggles.push([name, enabled]);
          }
        }
      }
    },
    isRunning: false,
    level: {
      goal: 'goal',
      hint: 'hint',
      id: 2,
      name: 'Level 2',
      type: 'debug'
    },
    levelIndex: 1,
    refs,
    text,
    totalLevels: 20
  });

  assert.equal(refs.levelChipEl.textContent, '2/20 done');
  assert.equal(refs.levelTitleEl.textContent, 'Level 2');
  assert.equal(refs.levelModeEl.className, 'mode-chip debug');
  assert.equal(refs.levelGoalEl.textContent, 'goal');
  assert.equal(refs.levelHintEl.textContent, 'hint');
  assert.equal(refs.debugNoteEl.hidden, false);
  assert.equal(refs.debugNoteEl.textContent, 'debug note');
  assert.equal(refs.btnPrev.disabled, true);
  assert.equal(refs.btnNext.disabled, false);
  assert.deepEqual(toggles, [['debug-mode', true]]);
});

test('renderLevelHeader module stays independent from engine and storage', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'js/ui/renderLevelHeader.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  assert.doesNotMatch(source, /simulateLevel/);
  assert.doesNotMatch(source, /window\.SnailGame/);
});
