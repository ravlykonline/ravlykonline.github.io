const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const { readUtf8, root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

test('ui dom module collects stable DOM refs including the progressbar track', async () => {
  const { getDomRefs } = await importModule('js/ui/dom.js');
  const requestedIds = [];
  const documentRef = {
    getElementById(id) {
      requestedIds.push(id);
      return { id };
    }
  };

  const refs = getDomRefs(documentRef);

  assert.equal(refs.gridEl.id, 'grid');
  assert.equal(refs.progressTrackEl.id, 'progress-track');
  assert.equal(refs.progressFillEl.id, 'progress-fill');
  assert.ok(requestedIds.includes('btn-run'));
  assert.ok(requestedIds.includes('palette'));
});

test('progressbar aria-valuenow is updated on the element with role progressbar', () => {
  const html = readUtf8('index.html');
  const gameState = readUtf8('js/gameState.js');
  const ui = readUtf8('js/ui.js');

  assert.match(html, /id="progress-track"[^>]+role="progressbar"/);
  assert.match(gameState, /progressTrackEl: document\.getElementById\('progress-track'\)/);
  assert.match(ui, /progressTrackEl\.setAttribute\('aria-valuenow', String\(percent\)\)/);
  assert.doesNotMatch(ui, /progressFillEl\.setAttribute\('aria-valuenow'/);
});
