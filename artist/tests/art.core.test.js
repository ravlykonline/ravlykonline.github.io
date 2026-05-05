import assert from 'node:assert/strict';

import { lessons } from '../js/data/lessons.js';
import { createTurtle, moveForward, turnRight, turnLeft, penUp, penDown } from '../js/domain/turtle.js';
import { buildProgramCode } from '../js/core/codegen.js';
import { cellToGridIntersection, moveSnail } from '../js/core/engine.js';
import { evaluateGoal } from '../js/core/goals.js';
import { appState } from '../js/core/state.js';
import { clearWorkspace, countBlocks, createBlock, findBlock, flattenBlocks, insertBlock, moveBlockInList, moveBlockUp, moveBlockDown, moveBlockOut } from '../js/core/workspace.js';
import { validateProgram } from '../js/runtime/execution-limits.js';
import { pushSnapshot, undo, redo, canUndo, canRedo, clearHistory } from '../js/state/history.js';
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
  assert.equal(lessons.length, 10);
  assert.equal(lessons[0].id, 'lesson-01');
  assert.equal(lessons[5].order, 6);
  assert.equal(lessons[6].id, 'lesson-07');
  assert.equal(lessons[9].order, 10);
});

runTest('turtle levels have mode turtle and valid toolbox', () => {
  const turtleLessons = lessons.filter((l) => l.mode === 'turtle');
  assert.equal(turtleLessons.length, 4);
  for (const lesson of turtleLessons) {
    assert.ok(Array.isArray(lesson.toolbox));
    assert.ok(lesson.toolbox.some((t) => t.startsWith('turtle_')));
    assert.equal(lesson.success.mode, 'turtle-minimum');
    assert.ok(lesson.success.minSegments >= 1);
  }
});

runTest('lessons use instruction instead of instructionHtml', () => {
  for (const lesson of lessons) {
    assert.equal(typeof lesson.instruction, 'string', `${lesson.id} має мати поле instruction`);
    assert.equal('instructionHtml' in lesson, false, `${lesson.id} не повинен мати instructionHtml`);
  }
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

runTest('buildProgramCode prints nested repeat blocks in Ukrainian', () => {
  const workspace = [
    {
      type: 'repeat',
      id: 1,
      count: 2,
      blocks: [{ type: 'move_s', id: 2 }],
    },
  ];

  assert.equal(buildProgramCode(workspace), 'коли запущено {\n  повторити 2 разів {\n    рухатися(вниз)\n  }\n}');
});

runTest('evaluateGoal accepts exact matching path for exact-path lessons', () => {
  const result = evaluateGoal(lessons[0], [[4, 2], [4, 3], [4, 4], [4, 5]]);
  assert.equal(result.ok, true);
});

runTest('evaluateGoal rejects wrong-length path for exact-path lessons', () => {
  const tooShort = evaluateGoal(lessons[0], [[4, 2], [4, 3]]);
  assert.equal(tooShort.ok, false);

  const tooLong = evaluateGoal(lessons[0], [[4, 2], [4, 3], [4, 4], [4, 5], [4, 6]]);
  assert.equal(tooLong.ok, false);
});

runTest('evaluateGoal rejects wrong-order path for exact-path lessons', () => {
  const wrongOrder = evaluateGoal(lessons[0], [[4, 5], [4, 4], [4, 3], [4, 2]]);
  assert.equal(wrongOrder.ok, false);
});

runTest('evaluateGoal enforces minimum step lessons', () => {
  const failResult = evaluateGoal(lessons[5], [[4, 3], [5, 3]]);
  const successResult = evaluateGoal(lessons[5], [[4, 3], [5, 3], [5, 4], [4, 4], [4, 5], [5, 5]]);

  assert.equal(failResult.ok, false);
  assert.equal(successResult.ok, true);
});

runTest('validateProgram rejects programs exceeding expanded action limit', () => {
  const workspace = [
    { type: 'repeat', id: 1, count: 20, blocks: [
      { type: 'repeat', id: 2, count: 20, blocks: [
        { type: 'repeat', id: 3, count: 20, blocks: [{ type: 'move_s', id: 4 }] },
      ]},
    ]},
  ];
  const result = validateProgram(workspace);
  assert.equal(result.ok, false);
});

runTest('validateProgram accepts a reasonable program', () => {
  const workspace = [
    { type: 'repeat', id: 1, count: 3, blocks: [{ type: 'move_s', id: 2 }] },
  ];
  const result = validateProgram(workspace);
  assert.equal(result.ok, true);
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

runTest('moveBlockUp and moveBlockDown reorder blocks in-place', () => {
  appState.workspace = [createBlock('move_n', 1), createBlock('move_s', 2), createBlock('move_e', 3)];

  assert.equal(moveBlockUp(2), true);
  assert.deepEqual(appState.workspace.map((b) => b.id), [2, 1, 3]);

  assert.equal(moveBlockUp(2), false); // already first
  assert.equal(moveBlockDown(3), false); // already last

  assert.equal(moveBlockDown(1), true);
  assert.deepEqual(appState.workspace.map((b) => b.id), [2, 3, 1]);

  clearWorkspace();
});

runTest('moveBlockOut moves nested block after its parent repeat', () => {
  appState.workspace = [
    { type: 'repeat', id: 10, count: 2, blocks: [createBlock('move_s', 11), createBlock('move_e', 12)] },
    createBlock('move_w', 13),
  ];

  assert.equal(moveBlockOut(11), true);
  assert.deepEqual(appState.workspace.map((b) => b.id), [10, 11, 13]);
  assert.deepEqual(appState.workspace[0].blocks.map((b) => b.id), [12]);

  assert.equal(moveBlockOut(10), false); // already at root
  clearWorkspace();
});

runTest('history supports undo and redo', () => {
  clearHistory();
  appState.workspace = [createBlock('move_s', 21)];

  pushSnapshot(appState.workspace);
  appState.workspace.push(createBlock('move_e', 22));

  assert.equal(canUndo(), true);
  assert.equal(canRedo(), false);

  const restored = undo(appState.workspace);
  appState.workspace = restored;
  assert.deepEqual(appState.workspace.map((b) => b.id), [21]);
  assert.equal(canRedo(), true);

  const redone = redo(appState.workspace);
  appState.workspace = redone;
  assert.deepEqual(appState.workspace.map((b) => b.id), [21, 22]);

  clearWorkspace();
  clearHistory();
});

runTest('pushSnapshot clears redo stack on new action', () => {
  clearHistory();
  appState.workspace = [createBlock('move_s', 31)];

  pushSnapshot(appState.workspace);
  appState.workspace.push(createBlock('move_e', 32));

  undo(appState.workspace); // creates redo entry
  assert.equal(canRedo(), true);

  pushSnapshot(appState.workspace); // new action clears redo
  assert.equal(canRedo(), false);

  clearWorkspace();
  clearHistory();
});

// ── Turtle domain ────────────────────────────────────────────────────────────

runTest('createTurtle returns default state', () => {
  const t = createTurtle();
  assert.equal(t.x, 0);
  assert.equal(t.y, 0);
  assert.equal(t.heading, 0);
  assert.equal(t.penDown, true);
});

runTest('moveForward heading 0 (up) moves y negative', () => {
  const t = createTurtle({ heading: 0 });
  const { turtle, segment } = moveForward(t, 100);
  assert.ok(Math.abs(turtle.x) < 0.001);
  assert.ok(Math.abs(turtle.y + 100) < 0.001);
  assert.ok(segment !== null);
});

runTest('moveForward heading 90 (right) moves x positive', () => {
  const t = createTurtle({ heading: 90 });
  const { turtle } = moveForward(t, 100);
  assert.ok(Math.abs(turtle.x - 100) < 0.001);
  assert.ok(Math.abs(turtle.y) < 0.001);
});

runTest('moveForward with penDown false returns null segment', () => {
  const t = createTurtle({ penDown: false });
  const { segment } = moveForward(t, 50);
  assert.equal(segment, null);
});

runTest('turnRight increases heading, wraps at 360', () => {
  const t = createTurtle({ heading: 270 });
  const turned = turnRight(t, 90);
  assert.equal(turned.heading, 0);
});

runTest('turnLeft decreases heading, wraps correctly', () => {
  const t = createTurtle({ heading: 0 });
  const turned = turnLeft(t, 90);
  assert.equal(turned.heading, 270);
});

runTest('square (4 × forward + right 90) closes back to origin', () => {
  let t = createTurtle({ heading: 0 });
  const segments = [];
  for (let i = 0; i < 4; i += 1) {
    const { turtle: t2, segment } = moveForward(t, 100);
    t = turnRight(t2, 90);
    if (segment) segments.push(segment);
  }
  assert.equal(segments.length, 4);
  assert.ok(Math.abs(t.x) < 0.001, `x should be ~0, got ${t.x}`);
  assert.ok(Math.abs(t.y) < 0.001, `y should be ~0, got ${t.y}`);
});

runTest('penUp / penDown toggle penDown flag', () => {
  const t = createTurtle();
  const up = penUp(t);
  assert.equal(up.penDown, false);
  const down = penDown(up);
  assert.equal(down.penDown, true);
});

runTest('createBlock turtle_forward uses paramDefault steps:50', () => {
  const b = createBlock('turtle_forward');
  assert.equal(b.type, 'turtle_forward');
  assert.equal(b.steps, 50);
});

runTest('createBlock turtle_right uses paramDefault degrees:90', () => {
  const b = createBlock('turtle_right');
  assert.equal(b.degrees, 90);
});

runTest('buildProgramCode generates РАВЛИК turtle code', () => {
  const workspace = [
    { type: 'turtle_forward', id: 1, steps: 50 },
    { type: 'turtle_right', id: 2, degrees: 90 },
    { type: 'turtle_pen_up', id: 3 },
    {
      type: 'repeat', id: 4, count: 2,
      blocks: [{ type: 'turtle_forward', id: 5, steps: 70 }],
    },
  ];
  const code = buildProgramCode(workspace);
  assert.ok(code.includes('вперед 50'));
  assert.ok(code.includes('праворуч 90'));
  assert.ok(code.includes('підняти'));
  assert.ok(code.includes('повторити 2 разів {'));
  assert.ok(code.includes('вперед 70'));
});

runTest('evaluateGoal turtle-minimum passes when enough segments drawn', () => {
  const lesson = lessons.find((l) => l.id === 'lesson-07');
  assert.equal(evaluateGoal(lesson, 1).ok, true);
  assert.equal(evaluateGoal(lesson, 0).ok, false);
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
