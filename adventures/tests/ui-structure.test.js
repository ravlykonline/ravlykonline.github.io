const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { htmlPath, root } = require('./testHelpers.cjs');

test('ui rebuilds palette, updates level meta and progress widgets', () => {
  const ui = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');

  assert.match(ui, /function loadCurrentLevel\(\)[\s\S]*app\.render\.buildPalette\(\)[\s\S]*app\.render\.buildGrid\(\)/);
  assert.match(ui, /levelModeEl\.textContent/);
  assert.match(ui, /levelGoalEl\.textContent/);
  assert.match(ui, /levelHintEl\.textContent/);
  assert.match(ui, /debugNoteEl\.textContent/);
  assert.match(ui, /refreshProgressUi/);
  assert.match(ui, /modalApi\.openLevelMap/);
  assert.match(ui, /btnMap\.addEventListener\('click', modalApi\.openLevelMap\)/);
  assert.match(ui, /progressFillEl\.style\.width/);
  assert.match(ui, /setLevelIntroStatus/);
});

test('win and already-solved modals support next level and full restart after final win', () => {
  const uiModals = fs.readFileSync(path.join(root, 'js/uiModals.js'), 'utf8');

  assert.match(uiModals, /function showAlreadySolvedModal\(\)/);
  assert.match(uiModals, /const hasNext = app\.hasNextLevel\(\)/);
  assert.match(uiModals, /const isFinalWin = !hasNext/);
  assert.match(uiModals, /app\.restartProgress\(\)/);
  assert.match(uiModals, /id="already-solved-action"/);
});

test('secondary modals use close icons instead of duplicate close buttons', () => {
  const uiModals = fs.readFileSync(path.join(root, 'js/uiModals.js'), 'utf8');

  assert.match(uiModals, /function getModalCloseMarkup\(id\)/);
  assert.match(uiModals, /getModalCloseMarkup\('clear-close'\)/);
  assert.match(uiModals, /getModalCloseMarkup\('level-intro-close'\)/);
  assert.match(uiModals, /getModalCloseMarkup\('map-close'\)/);
  assert.doesNotMatch(uiModals, /id="clear-cancel"/);
});

test('index.html includes level card, progress UI and map button', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /id="level-chip"/);
  assert.match(html, /id="level-title"/);
  assert.match(html, /id="level-mode"/);
  assert.match(html, /id="level-goal"/);
  assert.match(html, /id="level-hint"/);
  assert.match(html, /id="debug-note"/);
  assert.match(html, /id="progress-text"/);
  assert.match(html, /id="progress-fill"/);
  assert.match(html, /id="btn-map"/);
  assert.match(html, /id="btn-next"/);
});

test('game CSS contains responsive layout, debug styling and level map styles', () => {
  const gameCss = fs.readFileSync(path.join(root, 'css/game.css'), 'utf8');
  const tokensCss = fs.readFileSync(path.join(root, 'css/tokens.css'), 'utf8');

  assert.match(gameCss, /aspect-ratio:\s*8\s*\/\s*6/);
  assert.match(gameCss, /\.level-card/);
  assert.match(gameCss, /\.mode-chip\.debug/);
  assert.match(gameCss, /body\.debug-mode/);
  assert.match(gameCss, /\.debug-note/);
  assert.match(gameCss, /\.cell-arrow\.preset-arrow/);
  assert.match(gameCss, /\.progress-track/);
  assert.match(gameCss, /\.progress-fill/);
  assert.match(gameCss, /\.map-btn/);
  assert.match(gameCss, /\.level-map-grid/);
  assert.match(gameCss, /\.map-level\.current/);
  assert.match(tokensCss, /--tile-sz/);
  assert.match(gameCss, /@media \(max-width: 900px\)/);
  assert.match(gameCss, /body\.dragging-active/);
});

test('safe delete flow keeps pending-delete and preset arrow markers', () => {
  const gameState = fs.readFileSync(path.join(root, 'js/gameState.js'), 'utf8');
  const render = fs.readFileSync(path.join(root, 'js/render.js'), 'utf8');
  const renderDrag = fs.readFileSync(path.join(root, 'js/renderDrag.js'), 'utf8');
  const renderSnail = fs.readFileSync(path.join(root, 'js/renderSnail.js'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
  const gameCss = fs.readFileSync(path.join(root, 'css/game.css'), 'utf8');

  assert.match(gameState, /pendingDeleteKey/);
  assert.match(gameState, /saveProgress/);
  assert.match(gameState, /loadProgress/);
  assert.match(render, /function clearPendingDelete\(/);
  assert.match(render, /function setPendingDelete\(/);
  assert.match(renderDrag, /function beginPointerDrag\(/);
  assert.match(renderDrag, /function clearDropTarget\(/);
  assert.match(renderSnail, /function bumpSnail\(/);
  assert.match(renderSnail, /function posSnail\(/);
  assert.match(render, /className = 'cell-delete-btn'/);
  assert.match(render, /isPresetArrow/);
  assert.match(render, /preset-arrow/);
  assert.match(render, /clearPendingDelete\(\);[\s\S]*app\.state\.arrows\[/);
  assert.match(ui, /app\.render\.clearPendingDelete\(\)/);
  assert.match(gameCss, /\.cell-delete-btn/);
  assert.match(gameCss, /pending-delete-wiggle/);
});