const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { bootstrapCore, canReachGoal, cssFiles, htmlPath, jsFiles, root } = require('./testHelpers.cjs');

test('index.html links all extracted CSS and JS files', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  for (const file of cssFiles) {
    assert.match(html, new RegExp(`<link[^>]+href="${file.replace('/', '\\/')}"`));
    assert.ok(fs.existsSync(path.join(root, file)), `${file} missing`);
  }

  for (const file of jsFiles) {
    assert.match(html, new RegExp(`<script[^>]+src="${file.replace('/', '\\/')}"`));
    assert.ok(fs.existsSync(path.join(root, file)), `${file} missing`);
  }

  assert.doesNotMatch(html, /https?:\/\//i);
  assert.match(html, /ravlyk\.png/);
  assert.match(html, /assets\/run_button\.svg/);
  assert.match(html, /assets\/prev_level\.svg/);
  assert.match(html, /assets\/next_level\.svg/);
});

test('all JS files have valid syntax', () => {
  for (const file of jsFiles) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotThrow(() => new vm.Script(source, { filename: file }));
  }
});

test('game exposes 20 levels and unlocks all tiles after level 10', () => {
  const { app } = bootstrapCore();

  assert.equal(app.levels.length, 20);
  assert.equal(app.getTotalLevels(), 20);
  assert.equal(app.getNextLevelId(), 2);

  for (let id = 12; id <= 20; id += 1) {
    assert.equal(app.getLevelById(id)?.allowedTiles.length, app.tileDefs.length, `Level ${id} should expose all tiles`);
  }
});

test('selected layouts keep start and apple within the board', () => {
  const { app } = bootstrapCore();

  for (const id of [1, 4, 11]) {
    const level = app.getLevelById(id);
    assert.ok(level.start.r >= 0 && level.start.r < level.rows, `Level ${id} start row should stay within bounds`);
    assert.ok(level.apple.r >= 0 && level.apple.r < level.rows, `Level ${id} apple row should stay within bounds`);
    assert.ok(level.start.c >= 0 && level.start.c < level.cols, `Level ${id} start col should stay within bounds`);
    assert.ok(level.apple.c >= 0 && level.apple.c < level.cols, `Level ${id} apple col should stay within bounds`);
  }
});

test('turn tiles resolve entry and exit directions correctly', () => {
  const { app } = bootstrapCore();

  assert.equal(app.resolveTileExit('right', 'right'), 'right');
  assert.equal(app.resolveTileExit('right', 'up'), null);
  assert.equal(app.resolveTileExit('left-up', 'right'), 'up');
  assert.equal(app.resolveTileExit('up-right', 'down'), 'right');
  assert.equal(app.resolveTileExit('right-down', 'left'), 'down');
  assert.equal(app.resolveTileExit('down-left', 'up'), 'left');
});

test('every level is solvable with its allowed tiles', () => {
  const { app } = bootstrapCore();

  for (const level of app.levels) {
    assert.equal(canReachGoal(app, level), true, `Level ${level.id} is not solvable with allowedTiles`);
  }
});

test('executed levels keep readable Ukrainian names and hints', () => {
  const { app } = bootstrapCore();

  assert.equal(app.getLevelById(1)?.name, '\u041f\u0440\u044f\u043c\u0430 \u0434\u043e\u0440\u0456\u0436\u043a\u0430');
  assert.equal(app.getLevelById(2)?.name, '\u041a\u0440\u043e\u043a\u0443\u0454\u043c\u043e \u0432\u0433\u043e\u0440\u0443');
  assert.equal(app.getLevelById(20)?.name, '\u0412\u0435\u043b\u0438\u043a\u0430 \u043f\u043e\u0434\u043e\u0440\u043e\u0436 \u0440\u0430\u0432\u043b\u0438\u043a\u0430');
  assert.equal(app.getLevelById(20)?.hint, '\u0424\u0456\u043d\u0430\u043b\u044c\u043d\u0438\u0439 \u0440\u0456\u0432\u0435\u043d\u044c: \u043f\u043e\u0434\u0438\u0432\u0438\u0441\u044c \u043d\u0430 \u0432\u0441\u0435 \u043f\u043e\u043b\u0435, \u0441\u043f\u043b\u0430\u043d\u0443\u0439 \u0448\u043b\u044f\u0445 \u0456 \u043f\u0440\u0438\u0432\u0435\u0434\u0438 \u0440\u0430\u0432\u043b\u0438\u043a\u0430 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430.');
});
test('route analysis respects the level start facing', () => {
  const { app, context } = bootstrapCore();
  vm.runInContext(fs.readFileSync(path.join(root, 'js/engineRoute.js'), 'utf8'), context, { filename: 'js/engineRoute.js' });
  app.state.currentLevel = {
    id: 999,
    type: 'play',
    rows: 3,
    cols: 4,
    start: { r: 1, c: 2 },
    apple: { r: 1, c: 0 },
    startFacing: 'left',
    obstacles: [],
    allowedTiles: ['left'],
    presetArrows: { '1,1': 'left' }
  };
  app.config.rows = app.state.currentLevel.rows;
  app.config.cols = app.state.currentLevel.cols;
  app.resetLevelState();
  const routeApi = app.createEngineRoute();
  assert.equal(routeApi.analyzeCurrentRoute().canReachApple, true);
});





