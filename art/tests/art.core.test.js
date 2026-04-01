import assert from 'node:assert/strict';

import { lessons } from '../js/data/lessons.js';
import { buildProgramCode } from '../js/core/codegen.js';
import { moveSnail } from '../js/core/engine.js';
import { evaluateGoal } from '../js/core/goals.js';
import { countBlocks, findBlock, flattenBlocks } from '../js/core/workspace.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

runTest('lessons expose stable ids and order', () => {
  assert.equal(lessons.length, 6);
  assert.equal(lessons[0].id, 'lesson-01');
  assert.equal(lessons[5].order, 6);
});

runTest('moveSnail clamps to board edges', () => {
  assert.deepEqual(moveSnail({ x: 0, y: 0, dir: 'N' }, 'move_n'), { x: 0, y: 0, dir: 'N' });
  assert.deepEqual(moveSnail({ x: 8, y: 6, dir: 'E' }, 'move_e'), { x: 8, y: 6, dir: 'E' });
  assert.deepEqual(moveSnail({ x: 1, y: 1, dir: 'E' }, 'move_w'), { x: 0, y: 1, dir: 'W' });
});

runTest('buildProgramCode prints nested repeat blocks', () => {
  const workspace = [
    {
      type: 'repeat',
      id: 1,
      count: 2,
      blocks: [{ type: 'move_s', id: 2 }],
    },
  ];

  assert.equal(buildProgramCode(workspace), 'when run {\n  repeat 2 times {\n    move(down)\n  }\n}');
});

runTest('evaluateGoal accepts matching path lessons', () => {
  const result = evaluateGoal(lessons[0], [[4, 2], [4, 3], [4, 4], [4, 5]]);
  assert.equal(result.ok, true);
});

runTest('evaluateGoal enforces minimum step lessons', () => {
  const failResult = evaluateGoal(lessons[5], [[4, 3], [5, 3]]);
  const successResult = evaluateGoal(lessons[5], [[4, 3], [5, 3], [5, 4], [4, 4], [4, 5], [5, 5]]);

  assert.equal(failResult.ok, false);
  assert.equal(successResult.ok, true);
});

runTest('workspace helpers support nested lookup, count, and flatten', () => {
  const workspace = [
    {
      type: 'repeat',
      id: 10,
      count: 2,
      blocks: [
        { type: 'move_e', id: 11 },
        { type: 'move_s', id: 12 },
      ],
    },
    { type: 'move_w', id: 13 },
  ];

  assert.equal(findBlock(workspace, 12).type, 'move_s');
  assert.equal(countBlocks(workspace), 4);
  assert.deepEqual(flattenBlocks(workspace).map((block) => block.id), [11, 12, 11, 12, 13]);
});
