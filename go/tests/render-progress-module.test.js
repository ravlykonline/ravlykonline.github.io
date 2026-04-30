const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

test('renderProgress calculates rounded completion percentage', async () => {
  const { getProgressPercent } = await importModule('js/ui/renderProgress.js');

  assert.equal(getProgressPercent(0, 20), 0);
  assert.equal(getProgressPercent(1, 20), 5);
  assert.equal(getProgressPercent(7, 20), 35);
  assert.equal(getProgressPercent(1, 3), 33);
  assert.equal(getProgressPercent(1, 0), 0);
});

test('renderProgress updates text, fill width and progressbar aria on the track', async () => {
  const { renderProgress } = await importModule('js/ui/renderProgress.js');
  const attrs = {};
  const refs = {
    progressTextEl: { textContent: '' },
    progressFillEl: { style: {} },
    progressTrackEl: {
      setAttribute(name, value) {
        attrs[name] = value;
      }
    }
  };
  const text = {
    progress(completed, total) {
      return `Пройдено ${completed} з ${total} рівнів`;
    }
  };

  const percent = renderProgress({
    completedLevelIds: [1, 2, 3],
    refs,
    text,
    totalLevels: 20
  });

  assert.equal(percent, 15);
  assert.equal(refs.progressTextEl.textContent, 'Пройдено 3 з 20 рівнів');
  assert.equal(refs.progressFillEl.style.width, '15%');
  assert.equal(attrs['aria-valuenow'], '15');
});

test('renderProgress module stays focused on progress UI only', async () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'js/ui/renderProgress.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /simulateLevel/);
});
