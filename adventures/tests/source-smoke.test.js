const test = require('node:test');
const assert = require('node:assert/strict');

const { readUtf8 } = require('./testHelpers.cjs');

test('core JS files keep expected symbols for game logic and progress', () => {
  const main = readUtf8('js/main.js');
  const ui = readUtf8('js/ui.js');
  const levels = readUtf8('js/levels.js');
  const textsUk = readUtf8('js/texts.uk.js');
  const gameState = readUtf8('js/gameState.js');
  const engineRoute = readUtf8('js/engineRoute.js');
  const engine = readUtf8('js/engine.js');
  const render = readUtf8('js/render.js');
  const renderDrag = readUtf8('js/renderDrag.js');
  const renderSnail = readUtf8('js/renderSnail.js');
  const uiAudio = readUtf8('js/uiAudio.js');
  const uiModals = readUtf8('js/uiModals.js');

  assert.ok(main.includes('resolveTileExit'));
  assert.ok(main.includes('app.oppositeDir'));
  assert.ok(main.includes('\\u0441\\u043f\\u0440\\u0430\\u0432\\u0430 \\u2192 \\u0432\\u0433\\u043e\\u0440\\u0443'));
  assert.ok(main.includes('\\u0437\\u043b\\u0456\\u0432\\u0430 \\u2192 \\u0432\\u0433\\u043e\\u0440\\u0443'));
  assert.ok(ui.includes('debugNoteEl'));
  assert.ok(ui.includes('setLevelIntroStatus'));
  assert.ok(ui.includes('refreshProgressUi'));
  assert.ok(ui.includes('audioApi'));
  assert.ok(ui.includes('modalApi'));
  assert.ok(uiAudio.includes('createUiAudio'));
  assert.ok(uiAudio.includes('playSuccessSound'));
  assert.ok(uiAudio.includes('speakCurrentTask'));
  assert.ok(uiModals.includes('openLevelMap'));
  assert.ok(uiModals.includes('showWin'));
  assert.ok(uiModals.includes('restartProgress'));
  assert.ok(uiModals.includes('openManagedModal'));
  assert.ok(renderDrag.includes('createRenderDrag'));
  assert.ok(renderDrag.includes('beginPointerDrag'));
  assert.ok(renderDrag.includes('updateDropTarget'));
  assert.ok(renderSnail.includes('createRenderSnail'));
  assert.ok(renderSnail.includes('bumpSnail'));
  assert.ok(renderSnail.includes('posSnail'));
  assert.ok(render.includes('const dragApi = app.createRenderDrag'));
  assert.ok(render.includes('const snailApi = app.createRenderSnail'));
  assert.ok(levels.includes('ALL_TILES'));
  assert.ok(levels.includes('centerLevelLayout'));
  assert.ok(levels.includes('id: 20'));
  assert.ok(levels.includes('id: 19'));
  assert.ok(textsUk.includes('\u041f\u0440\u0438\u0433\u043e\u0434\u0438 \u0420\u0430\u0432\u043b\u0438\u043a\u0430'));
  assert.ok(textsUk.includes('\u0422\u044f\u0433\u043d\u0438 \u043a\u043e\u043c\u0430\u043d\u0434\u0438 \u043d\u0430 \u043f\u043e\u043b\u0435'));
  assert.ok(gameState.includes('texts.uk.js must be loaded before gameState.js'));
  assert.ok(gameState.includes('app.text = app.textUk'));
  assert.ok(gameState.includes('ravlyk-code-progress-v1'));
  assert.ok(gameState.includes('saveProgress'));
  assert.ok(gameState.includes('loadProgress'));
  assert.ok(engine.includes('routeApi.resolveRouteStep'));
  assert.ok(engine.includes('routeApi.inspectForwardMove'));
  assert.ok(engineRoute.includes('findNeighborStartMove'));
  assert.ok(engineRoute.includes('analyzeCurrentRoute'));
  assert.ok(render.includes('preset-arrow'));
});

test('responsive UI and safe-delete styles remain present', () => {
  const ui = readUtf8('js/ui.js');
  const gameCss = readUtf8('css/game.css');
  const render = readUtf8('js/render.js');

  assert.ok(gameCss.includes('aspect-ratio: 8 / 6'));
  assert.ok(gameCss.includes('.level-card'));
  assert.ok(gameCss.includes('.cell-delete-btn'));
  assert.ok(gameCss.includes('pending-delete-wiggle'));
  assert.ok(gameCss.includes('.debug-note'));
  assert.ok(gameCss.includes('.progress-fill'));
  assert.ok(gameCss.includes('.level-map-grid'));
  assert.ok(gameCss.includes('.cell-arrow.preset-arrow'));
  assert.ok(render.includes('minmax(0, 1fr)'));
  assert.ok(ui.includes("root.style.setProperty('--gs-w'"));
  assert.ok(ui.includes("root.style.setProperty('--gs-h'"));
});