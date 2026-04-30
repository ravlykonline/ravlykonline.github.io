import assert from 'node:assert/strict';

import { lessons } from '../js/data/lessons.js';
import { buildProgramCode } from '../js/core/codegen.js';
import { cellToGridIntersection, moveSnail } from '../js/core/engine.js';
import { evaluateGoal } from '../js/core/goals.js';
import { appState } from '../js/core/state.js';
import { clearWorkspace, countBlocks, createBlock, findBlock, flattenBlocks, insertBlock, moveBlockInList } from '../js/core/workspace.js';
import { getBrushTransform, getLessonGuidePoints, getSnailScreenPosition } from '../js/ui/canvas.js';

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

runTest('cellToGridIntersection maps logical positions to grid nodes', () => {
  assert.equal(cellToGridIntersection(0), 0);
  assert.equal(cellToGridIntersection(3), 156);
});

runTest('getLessonGuidePoints returns start plus target path for fixed-shape lessons', () => {
  assert.deepEqual(getLessonGuidePoints(lessons[0]).map(({ x, y }) => [x, y]), [[4, 1], [4, 2], [4, 3], [4, 4], [4, 5]]);
  assert.deepEqual(getLessonGuidePoints(lessons[5]), []);
});

runTest('getSnailScreenPosition anchors the brush to grid intersections', () => {
  assert.deepEqual(getSnailScreenPosition({ x: 4, y: 1 }), { left: 184, top: 28 });
});

runTest('getBrushTransform rotates only the brush toward the movement direction', () => {
  assert.equal(getBrushTransform('E'), 'rotate(0 36 36)');
  assert.equal(getBrushTransform('S'), 'rotate(90 36 36)');
  assert.equal(getBrushTransform('W'), 'rotate(180 36 36)');
  assert.equal(getBrushTransform('N'), 'rotate(-90 36 36)');
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

runTest('clearWorkspace removes blocks and active block state', () => {
  appState.workspace = [createBlock('move_s', 21)];
  appState.activeBlockId = 21;

  clearWorkspace();

  assert.deepEqual(appState.workspace, []);
  assert.equal(appState.activeBlockId, null);
});

runTest('insertBlock places blocks at root and inside repeat containers', () => {
  const workspace = [
    createBlock('move_s', 1),
    { type: 'repeat', id: 2, count: 3, blocks: [] },
  ];

  assert.equal(insertBlock(workspace, createBlock('move_e', 3), null, 1), true);
  assert.equal(insertBlock(workspace, createBlock('move_n', 4), 2, 0), true);
  assert.deepEqual(workspace.map((block) => block.id), [1, 3, 2]);
  assert.deepEqual(workspace[2].blocks.map((block) => block.id), [4]);
});

runTest('moveBlockInList reorders blocks across root and nested repeat containers', () => {
  const workspace = [
    createBlock('move_s', 1),
    { type: 'repeat', id: 2, count: 3, blocks: [createBlock('move_e', 3)] },
    createBlock('move_w', 4),
  ];

  assert.equal(moveBlockInList(workspace, 4, null, 0), true);
  assert.deepEqual(workspace.map((block) => block.id), [4, 1, 2]);

  assert.equal(moveBlockInList(workspace, 1, 2, 1), true);
  assert.deepEqual(workspace.map((block) => block.id), [4, 2]);
  assert.deepEqual(findBlock(workspace, 2).blocks.map((block) => block.id), [3, 1]);
});

runTest('moveBlockInList prevents moving a repeat block into its own descendants', () => {
  const workspace = [
    {
      type: 'repeat',
      id: 10,
      count: 2,
      blocks: [
        { type: 'repeat', id: 11, count: 2, blocks: [createBlock('move_s', 12)] },
      ],
    },
  ];

  assert.equal(moveBlockInList(workspace, 10, 11, 0), false);
  assert.deepEqual(workspace[0].blocks.map((block) => block.id), [11]);
});
