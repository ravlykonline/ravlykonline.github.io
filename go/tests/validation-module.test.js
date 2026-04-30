const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function validLevel(overrides = {}) {
  return {
    id: 1,
    name: 'Тестовий рівень',
    type: 'play',
    rows: 3,
    cols: 4,
    start: { r: 1, c: 0 },
    apple: { r: 1, c: 3 },
    obstacles: [],
    startFacing: 'right',
    allowedTiles: ['right'],
    presetArrows: {},
    hint: 'Постав стрілки.',
    goal: 'Дійти до яблука.',
    ...overrides
  };
}

test('validation accepts the shipped 20 levels', async () => {
  const [{ levels }, { validateLevels }] = await Promise.all([
    importModule('js/core/levels.js'),
    importModule('js/engine/validation.js')
  ]);

  assert.deepEqual(validateLevels(levels), []);
});

test('validation reports invalid level collection shape and duplicate ids', async () => {
  const { validateLevels } = await importModule('js/engine/validation.js');
  const levels = Array.from({ length: 20 }, (_, index) => validLevel({ id: index + 1 }));
  levels[1] = validLevel({ id: 1 });

  const errors = validateLevels(levels);
  assert.ok(errors.some((error) => error.code === 'duplicate-id'));
  assert.ok(validateLevels(levels.slice(0, 19)).some((error) => error.code === 'invalid-level-count'));
});

test('validation reports coordinate, obstacle and tile errors', async () => {
  const { validateLevel } = await importModule('js/engine/validation.js');
  const errors = validateLevel(validLevel({
    start: { r: 10, c: 0 },
    obstacles: [
      { r: 1, c: 3, kind: 'rock', label: 'Каміння' }
    ],
    allowedTiles: ['right', 'sideways'],
    presetArrows: {
      '1,3': 'sideways',
      '9,9': 'right'
    }
  }));
  const codes = errors.map((error) => error.code);

  assert.ok(codes.includes('start-out-of-board'));
  assert.ok(codes.includes('obstacle-on-apple'));
  assert.ok(codes.includes('invalid-allowed-tile'));
  assert.ok(codes.includes('invalid-preset-arrow-tile'));
  assert.ok(codes.includes('preset-arrow-on-apple'));
  assert.ok(codes.includes('preset-arrow-out-of-board'));
});

test('validation reports unsolvable levels', async () => {
  const { validateLevel } = await importModule('js/engine/validation.js');
  const errors = validateLevel(validLevel({
    allowedTiles: ['up']
  }));

  assert.ok(errors.some((error) => error.code === 'unsolvable-level'));
});

test('validation module stays independent from DOM and storage APIs', async () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'js/engine/validation.js'), 'utf8');

  assert.doesNotMatch(source, /document\./);
  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
});
