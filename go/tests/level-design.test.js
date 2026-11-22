const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

const DELTAS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

// Перебирає всі прості маршрути від Равлика до яблука за правилами карток.
// На клітинці з готовою карткою дозволена й вона, навіть якщо її немає в палітрі.
function enumerateSolutions(level, limit = 5000) {
  const obstacles = new Set(level.obstacles.map((item) => `${item.r},${item.c}`));
  const allowed = new Set(level.allowedTiles);
  const visited = new Set([`${level.start.r},${level.start.c}`]);
  const solutions = [];
  const inside = (r, c) => r >= 0 && c >= 0 && r < level.rows && c < level.cols;

  function walk(r, c, incoming, route) {
    if (solutions.length >= limit) {
      return;
    }
    for (const out of Object.keys(DELTAS)) {
      const tile = incoming === out ? out : (out === OPPOSITE[incoming] ? null : `${OPPOSITE[incoming]}-${out}`);
      if (!tile || !(allowed.has(tile) || level.presetArrows[`${r},${c}`] === tile)) {
        continue;
      }
      const nr = r + DELTAS[out][0];
      const nc = c + DELTAS[out][1];
      const key = `${nr},${nc}`;
      if (!inside(nr, nc) || obstacles.has(key) || visited.has(key)) {
        continue;
      }
      const next = [...route, { key: `${r},${c}`, tile }];
      if (nr === level.apple.r && nc === level.apple.c) {
        solutions.push(next);
        continue;
      }
      visited.add(key);
      walk(nr, nc, out, next);
      visited.delete(key);
    }
  }

  for (const dir of Object.keys(DELTAS)) {
    const r = level.start.r + DELTAS[dir][0];
    const c = level.start.c + DELTAS[dir][1];
    const key = `${r},${c}`;
    if (!inside(r, c) || obstacles.has(key) || (r === level.apple.r && c === level.apple.c)) {
      continue;
    }
    visited.add(key);
    walk(r, c, dir, []);
    visited.delete(key);
  }
  return solutions;
}

function minimalEdits(level) {
  return Math.min(...enumerateSolutions(level, Infinity).map((route) =>
    route.filter((step) => level.presetArrows[step.key] !== step.tile).length
  ));
}

test('every level has at least one solution under the card rules', async () => {
  const { levels } = await importModule('js/core/levels.js');
  for (const level of levels) {
    assert.ok(enumerateSolutions(level, 1).length > 0, `level ${level.id} is unsolvable`);
  }
});

test('debug levels need exactly as many fixes as their hints promise', async () => {
  const { levels } = await importModule('js/core/levels.js');
  const expectedFixes = { 5: 2, 11: 1, 12: 1, 14: 2, 17: 2, 18: 2 };
  const debugIds = levels.filter((level) => level.type === 'debug').map((level) => level.id);
  assert.deepEqual(debugIds.sort((a, b) => a - b), Object.keys(expectedFixes).map(Number));
  for (const level of levels.filter((item) => item.type === 'debug')) {
    assert.equal(minimalEdits(level), expectedFixes[level.id], `level ${level.id}`);
  }
});

test('level 14 reveals two missing cards in order', async () => {
  const { getLevelById } = await importModule('js/core/levels.js');
  const { analyzeRoute } = await importModule('js/engine/route.js');
  const level = getLevelById(14);
  const arrows = { ...level.presetArrows };

  for (const [r, c, tile] of [[2, 3, 'right'], [1, 4, 'down-right']]) {
    const attempt = analyzeRoute({ arrows, level });
    assert.equal(attempt.reason, 'missing-arrow');
    assert.equal(attempt.path.at(-1).r, r);
    assert.equal(attempt.path.at(-1).c, c);
    arrows[`${r},${c}`] = tile;
  }
  assert.equal(analyzeRoute({ arrows, level }).success, true);
});

test('the mixed-up turns level is solved by swapping two preset turns', async () => {
  const { getLevelById } = await importModule('js/core/levels.js');
  const { analyzeRoute } = await importModule('js/engine/route.js');
  const level = getLevelById(18);
  const arrows = { ...level.presetArrows };
  assert.equal(analyzeRoute({ arrows, level }).reason, 'wrong-turn');

  [arrows['3,4'], arrows['3,7']] = [arrows['3,7'], arrows['3,4']];
  assert.equal(analyzeRoute({ arrows, level }).success, true);
});

test('debug levels stop the snail on the wrong card, not in an empty decoy cell', async () => {
  const { levels } = await importModule('js/core/levels.js');
  const { analyzeRoute } = await importModule('js/engine/route.js');
  const byId = new Map(levels.map((level) => [level.id, level]));
  const run = (id) => analyzeRoute({ arrows: byId.get(id).presetArrows, level: byId.get(id) });

  // Рівень 11: Равлик повертає не туди на (2,3) і впирається в камінь.
  assert.equal(run(11).reason, 'blocked');
  assert.deepEqual(run(11).path.at(-2), { r: 2, c: 3, facing: 'left' });
  // «Дві помилки»: хибна стрілка на (3,2) веде в камінь.
  assert.equal(run(17).reason, 'blocked');
  assert.deepEqual(run(17).path.at(-2), { r: 3, c: 2, facing: 'up' });
});

test('staircase levels come in order and force the intended turns', async () => {
  const { levels } = await importModule('js/core/levels.js');
  const twoTurns = levels.find((level) => level.name === 'Два повороти підряд');
  const staircase = levels.find((level) => level.name === 'Сходинки до яблука');
  assert.ok(twoTurns.id < staircase.id, 'one step must come before the long staircase');

  const [route, ...others] = enumerateSolutions(staircase);
  assert.equal(others.length, 0, 'the staircase must have a single route');
  assert.ok(route.every((step) => step.tile.includes('-')), 'the staircase must use only turn cards');
  assert.equal(route.length, 6);
});

test('level 12 palette can restore every preset card', async () => {
  const { levels } = await importModule('js/core/levels.js');
  const level = levels.find((item) => item.id === 12);
  for (const tile of Object.values(level.presetArrows)) {
    assert.ok(level.allowedTiles.includes(tile), `${tile} missing from palette`);
  }
});

// Мінімальна кількість змін карток, після яких справжній рушій (analyzeRoute з
// route.js, той самий, що рухає Равлика в грі) доводить Равлика до яблука.
function minimalEngineEdits(level, analyzeRoute, maxEdits) {
  const blocked = new Set([
    `${level.start.r},${level.start.c}`,
    `${level.apple.r},${level.apple.c}`,
    ...level.obstacles.map((item) => `${item.r},${item.c}`)
  ]);
  const cells = [];
  for (let r = 0; r < level.rows; r += 1) {
    for (let c = 0; c < level.cols; c += 1) {
      if (!blocked.has(`${r},${c}`)) {
        cells.push(`${r},${c}`);
      }
    }
  }
  const tiles = [undefined, ...level.allowedTiles];

  function search(arrows, from, left) {
    if (analyzeRoute({ arrows, level }).success) {
      return true;
    }
    if (left === 0) {
      return false;
    }
    for (let i = from; i < cells.length; i += 1) {
      const key = cells[i];
      const original = arrows[key];
      for (const tile of tiles) {
        if (tile === original) {
          continue;
        }
        const edited = { ...arrows };
        if (tile) {
          edited[key] = tile;
        } else {
          delete edited[key];
        }
        if (search(edited, i + 1, left - 1)) {
          return true;
        }
      }
    }
    return false;
  }

  for (let edits = 0; edits <= maxEdits; edits += 1) {
    if (search({ ...level.presetArrows }, 0, edits)) {
      return edits;
    }
  }
  return null;
}

test('debug levels: preset run fails and the minimal fix count matches the design', async () => {
  const { levels } = await importModule('js/core/levels.js');
  const { analyzeRoute } = await importModule('js/engine/route.js');
  const expectedFixes = { 5: 2, 11: 1, 12: 1, 14: 2, 17: 2, 18: 2 };
  const debugLevels = levels.filter((level) => level.type === 'debug');
  assert.deepEqual(debugLevels.map((level) => level.id).sort((a, b) => a - b), Object.keys(expectedFixes).map(Number));

  for (const level of debugLevels) {
    const preset = analyzeRoute({ arrows: level.presetArrows, level });
    assert.equal(preset.success, false, `level ${level.id} is already solved`);
    assert.equal(
      minimalEngineEdits(level, analyzeRoute, expectedFixes[level.id]),
      expectedFixes[level.id],
      `level ${level.id}`
    );
  }
});

test('level-design route analysis reports the same stop the UI shows', async () => {
  const { analyzeRoute } = await importModule('js/engine/route.js');
  const level = {
    rows: 3, cols: 5, start: { r: 1, c: 0 }, apple: { r: 1, c: 4 },
    obstacles: [], startFacing: 'right', allowedTiles: [], presetArrows: {}
  };
  // Равлик зупиняється ПЕРЕД клітинкою без картки і ПЕРЕД карткою, що не пропустить його.
  const missing = analyzeRoute({ arrows: { '1,1': 'right' }, level, config: { routeScanOrder: ['right'] } });
  assert.equal(missing.reason, 'missing-arrow');
  assert.deepEqual(missing.path.at(-1), { r: 1, c: 2, facing: 'right' });
  const wrong = analyzeRoute({ arrows: { '1,1': 'right', '1,2': 'left' }, level, config: { routeScanOrder: ['right'] } });
  assert.equal(wrong.reason, 'wrong-turn');
});
