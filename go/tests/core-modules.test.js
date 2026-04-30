const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { readUtf8, root } = require('./testHelpers.cjs');

async function importSourceModule(relativePath) {
  const source = readUtf8(relativePath);
  const url = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  return import(url);
}

test('core levels module exports level data without global app state', async () => {
  const source = readUtf8('js/core/levels.js');
  const { getLevelById, levels } = await importSourceModule('js/core/levels.js');

  assert.equal(levels.length, 20);
  assert.equal(getLevelById(1)?.id, 1);
  assert.equal(getLevelById(20)?.id, 20);
  assert.equal(getLevelById(21), null);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /\bapp\./);
});

test('core Ukrainian texts module exports UI text without global app state', async () => {
  const source = readUtf8('js/core/texts.uk.js');
  const { textsUk } = await importSourceModule('js/core/texts.uk.js');

  assert.equal(typeof textsUk, 'object');
  assert.equal(typeof textsUk.progress, 'function');
  assert.equal(typeof textsUk.taskSpeech, 'function');
  assert.ok(textsUk.static.pageTitle.includes('Пригоди'));
  assert.ok(textsUk.progress(0, 20).includes('20'));
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /\bapp\./);
});

test('core config module exports stable game settings', async () => {
  const source = readUtf8('js/core/config.js');
  const { GAME_CONFIG } = await importSourceModule('js/core/config.js');

  assert.equal(GAME_CONFIG.totalLevels, 20);
  assert.equal(GAME_CONFIG.storageKey, 'ravlyk-code-session-v1');
  assert.equal(GAME_CONFIG.stepMs, 540);
  assert.equal(GAME_CONFIG.maxSteps, 80);
  assert.deepEqual(GAME_CONFIG.routeScanOrder, ['down', 'right', 'up', 'left']);
  assert.doesNotMatch(source, /window\.SnailGame/);
});

test('core constants module exports tile definitions and route helpers', async () => {
  const source = readUtf8('js/core/constants.js');
  const constants = await importSourceModule('js/core/constants.js');

  assert.deepEqual(constants.DIRECTIONS, ['up', 'right', 'down', 'left']);
  assert.equal(constants.TILE_DEFS.length, 12);
  assert.equal(constants.TILE_IDS.length, 12);
  assert.equal(constants.oppositeDir('left'), 'right');
  assert.equal(constants.resolveTileExit('left-up', 'right'), 'up');
  assert.equal(constants.resolveTileExit('right', 'up'), null);
  assert.equal(constants.resolveStartTileExit('up-right'), 'right');
  assert.equal(constants.canEnterTile('down-left', 'up'), true);

  for (const tile of constants.TILE_DEFS) {
    assert.ok(fs.existsSync(path.join(root, 'assets', tile.iconFile)), `${tile.iconFile} missing`);
  }

  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /\bapp\./);
});
