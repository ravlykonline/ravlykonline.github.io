const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { htmlPath, root } = require('./testHelpers.cjs');

test('ui rebuilds palette, updates level meta and progress widgets', () => {
  const ui = fs.readFileSync(path.join(root, 'js/ui/appUi.js'), 'utf8');
  const renderLevelHeader = fs.readFileSync(path.join(root, 'js/ui/renderLevelHeader.js'), 'utf8');

  assert.match(ui, /function loadCurrentLevel\(\)[\s\S]*app\.render\.buildPalette\(\)[\s\S]*app\.render\.buildGrid\(\)/);
  assert.match(ui, /renderLevelHeader\(/);
  assert.match(renderLevelHeader, /levelModeEl\.textContent/);
  assert.match(renderLevelHeader, /levelGoalEl\.textContent/);
  assert.match(renderLevelHeader, /levelHintEl\.textContent/);
  assert.match(renderLevelHeader, /debugNoteEl\.textContent/);
  assert.match(ui, /refreshProgressUi/);
  assert.match(ui, /modalApi\.openLevelMap/);
  assert.match(ui, /btnMap\.addEventListener\('click', modalApi\.openLevelMap\)/);
  assert.match(ui, /renderProgress\(/);
  assert.match(ui, /setLevelIntroStatus/);
  assert.match(ui, /function shouldAutoOpenIntroOnSessionStart\(\)/);
  assert.match(ui, /shouldAutoOpenIntroOnSessionStart\(\)[\s\S]*modalApi\.openLevelIntro\(\)/);
  assert.match(ui, /loadCurrentLevel\(\{ showIntro: false \}\)/);
});

test('win and already-solved modals support next level and full restart after final win', () => {
  const modalRenderers = fs.readFileSync(path.join(root, 'js/ui/modals.js'), 'utf8');

  assert.match(modalRenderers, /function showAlreadySolvedModal\(\)/);
  assert.match(modalRenderers, /const hasNext = app\.hasNextLevel\(\)/);
  assert.match(modalRenderers, /const isFinalWin = !hasNext/);
  assert.match(modalRenderers, /app\.restartProgress\(\)/);
  assert.match(modalRenderers, /loadCurrentLevel\(\{ showIntro: true \}\)/);
  assert.match(modalRenderers, /renderResultModal\(/);
  assert.match(modalRenderers, /closeId: 'win-close'/);
  assert.match(modalRenderers, /actionId: 'mok'/);
  assert.match(modalRenderers, /actionId: 'already-solved-action'/);
});

test('secondary modals use close icons instead of duplicate close buttons', () => {
  const modalRenderers = fs.readFileSync(path.join(root, 'js/ui/modals.js'), 'utf8');

  assert.match(modalRenderers, /renderLevelIntroModal\(/);
  assert.match(modalRenderers, /levelChipText: levelChipEl\.textContent/);
  assert.match(modalRenderers, /createModalCloseButton\(\{ documentRef, id: 'level-intro-close', text \}\)/);
  assert.match(modalRenderers, /badges\.appendChild\(createTextElement\(\{ documentRef, tagName: 'span', className: 'goal-chip', text: introGoal \}\)\)/);
  assert.match(modalRenderers, /renderMessageModal\(/);
  assert.match(modalRenderers, /closeId: 'clear-close'/);
  assert.match(modalRenderers, /const taskCard = documentRef\.createElement\('div'\);/);
  assert.match(modalRenderers, /taskCard\.append\(taskLabel, taskText, speakButton\)/);
  assert.match(modalRenderers, /renderLevelMapModal\(/);
  assert.match(modalRenderers, /currentLevelId: app\.state\.currentLevel\.id/);
  assert.match(modalRenderers, /loadCurrentLevel\(\{ showIntro: false \}\)/);
  assert.match(modalRenderers, /renderTurnHintModal\(/);
  assert.match(modalRenderers, /includeTurnHint/);
  assert.match(modalRenderers, /closeId: 'already-solved-close'/);
  assert.doesNotMatch(modalRenderers, /id="clear-cancel"/);
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
  const appStateFacade = fs.readFileSync(path.join(root, 'js/state/appStateFacade.js'), 'utf8');
  const render = fs.readFileSync(path.join(root, 'js/ui/render.js'), 'utf8');
  const renderBoard = fs.readFileSync(path.join(root, 'js/ui/renderBoard.js'), 'utf8');
  const renderDrag = fs.readFileSync(path.join(root, 'js/ui/renderDrag.js'), 'utf8');
  const renderSnail = fs.readFileSync(path.join(root, 'js/ui/renderSnail.js'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'js/ui/appUi.js'), 'utf8');
  const gameCss = fs.readFileSync(path.join(root, 'css/game.css'), 'utf8');

  assert.match(appStateFacade, /pendingDeleteKey/);
  assert.match(appStateFacade, /saveProgress/);
  assert.match(appStateFacade, /loadProgress/);
  assert.match(render, /function clearPendingDelete\(/);
  assert.match(render, /function setPendingDelete\(/);
  assert.match(renderDrag, /function beginPointerDrag\(/);
  assert.match(renderDrag, /function clearDropTarget\(/);
  assert.match(renderSnail, /function bumpSnail\(/);
  assert.match(renderSnail, /function posSnail\(/);
  assert.match(render, /className = 'cell-delete-btn'/);
  assert.match(renderBoard, /isPresetArrow/);
  assert.match(renderBoard, /preset-arrow/);
  assert.match(render, /clearPendingDelete\(\);[\s\S]*app\.state\.arrows\[/);
  assert.match(ui, /app\.render\.clearPendingDelete\(\)/);
  assert.match(gameCss, /\.cell-delete-btn/);
  assert.match(gameCss, /pending-delete-wiggle/);
});

test('runtime confetti respects reduced motion and avoids innerHTML clearing', () => {
  const ui = fs.readFileSync(path.join(root, 'js/ui/appUi.js'), 'utf8');
  const confetti = fs.readFileSync(path.join(root, 'js/features/confetti.js'), 'utf8');

  assert.match(ui, /launchFeatureConfetti/);
  assert.match(confetti, /prefers-reduced-motion: reduce/);
  assert.match(confetti, /confettiRoot\.replaceChildren\(\)/);
  assert.doesNotMatch(confetti, /innerHTML\s*=/);
  assert.doesNotMatch(confetti, /style\.cssText/);
});
