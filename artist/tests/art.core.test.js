import assert from 'node:assert/strict';

import { blk, countBlocksIn, withIds } from '../js/core/blockTree.js';
import { blockDefinitions } from '../js/data/blocks.js';
import { createTurtle, moveBack, moveForward, turnRight, turnLeft, penUp, penDown, setColor } from '../js/domain/turtle.js';
import { appState } from '../js/core/state.js';
import {
  clearWorkspace, countBlocks, createBlock, findBlock, insertBlock, moveBlockInList,
  moveBlockUp, moveBlockDown, moveBlockOut, updateBlockParam,
} from '../js/core/workspace.js';
import { LIMITS, validateProgram } from '../js/runtime/execution-limits.js';
import { runProgram, runSteps } from '../js/runtime/runner.js';
import { pushSnapshot, undo, redo, canUndo, canRedo, clearHistory } from '../js/state/history.js';
import { avatarSvg, snailSvg } from '../js/ui/icons.js';
import {
  getSnailTransform, getStepDuration, headingDelta, interpolateTurtle,
} from '../js/domain/snail.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

// ── Блоки ─────────────────────────────────────────────────────────────────────

runTest('block definitions: code() is produced for every type and has no legacy syntax', () => {
  for (const [type, def] of Object.entries(blockDefinitions)) {
    const block = createBlock(type, 1);
    const code = def.code(block);
    assert.equal(typeof code, 'string', type);
    assert.doesNotMatch(code, /коли запущено|разів \{|рухатися\(/);
  }
});

runTest('createBlock uses parameter defaults', () => {
  assert.equal(createBlock('forward').n, 50);
  assert.equal(createBlock('right').n, 90);
  assert.equal(createBlock('repeat').n, 4);
  assert.deepEqual(createBlock('repeat').blocks, []);
  assert.equal(createBlock('color').color, 'червоний');
  assert.equal('n' in createBlock('step'), false);
});

runTest('updateBlockParam clamps numbers and validates colors', () => {
  appState.workspace = [createBlock('forward', 1), createBlock('repeat', 2), createBlock('color', 3)];
  updateBlockParam(1, 'n', '9999');
  assert.equal(findBlock(appState.workspace, 1).n, 300);
  updateBlockParam(1, 'n', '-5');
  assert.equal(findBlock(appState.workspace, 1).n, 1);
  updateBlockParam(2, 'n', '100');
  assert.equal(findBlock(appState.workspace, 2).n, 36);
  updateBlockParam(3, 'color', 'синій');
  assert.equal(findBlock(appState.workspace, 3).color, 'синій');
  updateBlockParam(3, 'color', 'не-колір');
  assert.equal(findBlock(appState.workspace, 3).color, 'червоний');
  clearWorkspace();
});

runTest('block tree helpers: withIds, countBlocksIn', () => {
  const tree = withIds([blk('repeat', 2, [blk('step'), blk('turn_right90')]), blk('step')]);
  assert.deepEqual(tree.map((b) => b.id), [1, 4]);
  assert.deepEqual(tree[0].blocks.map((b) => b.id), [2, 3]);
  assert.equal(countBlocksIn(tree), 4);
});

// ── Ліміти ────────────────────────────────────────────────────────────────────

runTest('limits are 36 repeats, nesting 3, 1000 expanded actions', () => {
  assert.equal(LIMITS.maxRepeatCount, 36);
  assert.equal(LIMITS.maxNestingDepth, 3);
  assert.equal(LIMITS.maxExpandedActions, 1000);
});

runTest('validateProgram accepts repeat 36 (circle) and rejects 37', () => {
  const circle = (n) => withIds([blk('repeat', n, [blk('forward', 10), blk('right', 10)])]);
  assert.equal(validateProgram(circle(36)).ok, true);
  assert.equal(validateProgram(circle(37)).ok, false);
});

runTest('validateProgram rejects too many expanded actions', () => {
  const workspace = withIds([blk('repeat', 36, [blk('repeat', 36, [blk('step')])])]);
  assert.equal(validateProgram(workspace).ok, false); // 1296 > 1000
});

runTest('validateProgram: nesting of 3 repeats is allowed, 4 is not', () => {
  const nest = (depth) => (depth === 0 ? [blk('step')] : [blk('repeat', 2, nest(depth - 1))]);
  assert.equal(validateProgram(withIds(nest(3))).ok, true);
  assert.equal(validateProgram(withIds(nest(4))).ok, false);
});

// ── Turtle ────────────────────────────────────────────────────────────────────

runTest('createTurtle default state has a hex color', () => {
  const t = createTurtle();
  assert.equal(t.penDown, true);
  assert.match(t.color, /^#[0-9A-F]{6}$/i);
});

runTest('moveForward heading 0 (up) moves y negative, heading 90 moves x positive', () => {
  const up = moveForward(createTurtle({ heading: 0 }), 100);
  assert.ok(near(up.turtle.x, 0) && near(up.turtle.y, -100));
  const right = moveForward(createTurtle({ heading: 90 }), 100);
  assert.ok(near(right.turtle.x, 100) && near(right.turtle.y, 0));
});

runTest('moveBack goes opposite to heading without turning', () => {
  const { turtle, segment } = moveBack(createTurtle({ heading: 0 }), 50);
  assert.ok(near(turtle.y, 50));
  assert.equal(turtle.heading, 0);
  assert.ok(segment !== null);
});

runTest('moveForward with pen up returns null segment', () => {
  assert.equal(moveForward(createTurtle({ penDown: false }), 50).segment, null);
});

runTest('movement is clamped to the 400 × 300 field', () => {
  const { turtle } = moveForward(createTurtle({ heading: 90 }), 300);
  assert.equal(turtle.x, 200);
  const up = moveForward(createTurtle({ heading: 0 }), 300);
  assert.equal(up.turtle.y, -150);
});

runTest('turnRight / turnLeft wrap at 360', () => {
  assert.equal(turnRight(createTurtle({ heading: 270 }), 90).heading, 0);
  assert.equal(turnLeft(createTurtle({ heading: 0 }), 90).heading, 270);
  assert.equal(turnLeft(createTurtle({ heading: 0 }), 360).heading, 0);
});

runTest('penUp / penDown / setColor', () => {
  const t = createTurtle();
  assert.equal(penUp(t).penDown, false);
  assert.equal(penDown(penUp(t)).penDown, true);
  assert.equal(setColor(t, '#112233').color, '#112233');
});

// ── Runner ────────────────────────────────────────────────────────────────────

runTest('runSteps is lazy: a repeat is not expanded ahead of time', () => {
  const blocks = withIds([blk('repeat', 36, [blk('forward', 5), blk('right', 10)])]);
  const iterator = runSteps(blocks, { start: { x: 0, y: 0, heading: 0 } });
  const first = iterator.next();
  assert.equal(first.done, false);
  assert.equal(first.value.blockId, 2);
  assert.ok(first.value.segment);
  assert.ok(near(first.value.after.y, -5));
});

runTest('runSteps stops with an error beyond maxSteps', () => {
  const blocks = withIds([blk('repeat', 5, [blk('step')])]);
  assert.throws(() => runProgram(blocks, { start: {} }, { maxSteps: 3 }));
});

runTest('runProgram: square of 4 × (вперед 100, праворуч 90) closes and makes 4 segments', () => {
  const blocks = withIds([blk('repeat', 4, [blk('forward', 100), blk('right', 90)])]);
  const { segments, turtle } = runProgram(blocks, { start: { x: -50, y: 50, heading: 0 } });
  assert.equal(segments.length, 4);
  assert.ok(near(turtle.x, -50) && near(turtle.y, 50));
  assert.ok(near(turtle.heading, 0));
});

runTest('runProgram: color block changes segment color; pen up yields no segment', () => {
  const blocks = withIds([blk('color', 'синій'), blk('step'), blk('pen_up'), blk('step'), blk('pen_down'), blk('step')]);
  const { segments } = runProgram(blocks, { start: { x: 0, y: 100, heading: 0 }, pen: { color: 'червоний', width: 4 } });
  assert.equal(segments.length, 2);
  assert.equal(segments[0].color, '#1A56DB');
});

// ── Валідність SVG равлика (A1) ──────────────────────────────────────────────

runTest('snailSvg has no attributes without a value (valid XML for DOMParser)', () => {
  const tags = snailSvg.match(/<[a-zA-Z][^>]*>/g) ?? [];
  for (const tag of tags) {
    const withoutQuoted = tag.replace(/"[^"]*"/g, '""');
    assert.doesNotMatch(withoutQuoted, /\s[a-zA-Z-]+(?=\s|\/?>)/, `атрибут без значення: ${tag}`);
  }
});

// ── Workspace ─────────────────────────────────────────────────────────────────

runTest('workspace helpers support nested lookup and count', () => {
  const workspace = withIds([blk('repeat', 2, [blk('step'), blk('turn_right90')]), blk('turn_left90')]);
  assert.equal(findBlock(workspace, 3).type, 'turn_right90');
  assert.equal(countBlocks(workspace), 4);
});

runTest('clearWorkspace removes blocks and active block state', () => {
  appState.workspace = [createBlock('step', 21)];
  appState.activeBlockId = 21;
  clearWorkspace();
  assert.deepEqual(appState.workspace, []);
  assert.equal(appState.activeBlockId, null);
});

runTest('insertBlock places blocks at root and inside repeat containers', () => {
  const workspace = [createBlock('step', 1), createBlock('repeat', 2)];
  assert.equal(insertBlock(workspace, createBlock('turn_right90', 3), null, 1), true);
  assert.equal(insertBlock(workspace, createBlock('step', 4), 2, 0), true);
  assert.deepEqual(workspace.map((block) => block.id), [1, 3, 2]);
  assert.deepEqual(workspace[2].blocks.map((block) => block.id), [4]);
});

runTest('moveBlockInList reorders blocks across root and nested repeat containers', () => {
  const workspace = [createBlock('step', 1), { ...createBlock('repeat', 2), blocks: [createBlock('step', 3)] }, createBlock('turn_left90', 4)];
  assert.equal(moveBlockInList(workspace, 4, null, 0), true);
  assert.deepEqual(workspace.map((block) => block.id), [4, 1, 2]);
  assert.equal(moveBlockInList(workspace, 1, 2, 1), true);
  assert.deepEqual(workspace.map((block) => block.id), [4, 2]);
  assert.deepEqual(findBlock(workspace, 2).blocks.map((block) => block.id), [3, 1]);
});

runTest('moveBlockInList prevents moving a repeat block into its own descendants', () => {
  const inner = { ...createBlock('repeat', 11), blocks: [createBlock('step', 12)] };
  const workspace = [{ ...createBlock('repeat', 10), blocks: [inner] }];
  assert.equal(moveBlockInList(workspace, 10, 11, 0), false);
  assert.deepEqual(workspace[0].blocks.map((block) => block.id), [11]);
});

runTest('moveBlockUp and moveBlockDown reorder blocks in-place', () => {
  appState.workspace = [createBlock('step', 1), createBlock('turn_right90', 2), createBlock('turn_left90', 3)];
  assert.equal(moveBlockUp(2), true);
  assert.deepEqual(appState.workspace.map((b) => b.id), [2, 1, 3]);
  assert.equal(moveBlockUp(2), false);
  assert.equal(moveBlockDown(3), false);
  assert.equal(moveBlockDown(1), true);
  assert.deepEqual(appState.workspace.map((b) => b.id), [2, 3, 1]);
  clearWorkspace();
});

runTest('moveBlockOut moves nested block after its parent repeat', () => {
  appState.workspace = [
    { ...createBlock('repeat', 10), blocks: [createBlock('step', 11), createBlock('turn_right90', 12)] },
    createBlock('turn_left90', 13),
  ];
  assert.equal(moveBlockOut(11), true);
  assert.deepEqual(appState.workspace.map((b) => b.id), [10, 11, 13]);
  assert.deepEqual(appState.workspace[0].blocks.map((b) => b.id), [12]);
  assert.equal(moveBlockOut(10), false);
  clearWorkspace();
});

// ── Історія ───────────────────────────────────────────────────────────────────

runTest('history supports undo and redo; new action clears redo', () => {
  clearHistory();
  appState.workspace = [createBlock('step', 21)];
  pushSnapshot(appState.workspace);
  appState.workspace.push(createBlock('turn_right90', 22));
  assert.equal(canUndo(), true);
  assert.equal(canRedo(), false);

  appState.workspace = undo(appState.workspace);
  assert.deepEqual(appState.workspace.map((b) => b.id), [21]);
  assert.equal(canRedo(), true);

  appState.workspace = redo(appState.workspace);
  assert.deepEqual(appState.workspace.map((b) => b.id), [21, 22]);

  undo(appState.workspace);
  pushSnapshot(appState.workspace);
  assert.equal(canRedo(), false);
  clearWorkspace();
  clearHistory();
});

// ── Равлик і анімація (фаза 2) ───────────────────────────────────────────────

runTest('getSnailTransform: heading 0/90/180/270 and tip at the turtle coordinate', () => {
  for (const heading of [0, 90, 180, 270]) {
    assert.equal(
      getSnailTransform({ x: 50, y: -100, heading }),
      `translate(50 -100) rotate(${heading})`,
    );
  }
  assert.equal(getSnailTransform({ x: 0, y: 0, heading: 0 }), 'translate(0 0) rotate(0)');
});

runTest('snail SVG: balanced tags, tip at (0, 0), avatar is the same snail', () => {
  const tags = snailSvg.match(new RegExp('</?[a-zA-Z][^>]*>', 'g')) ?? [];
  const stack = [];
  for (const tag of tags) {
    const name = tag.match(new RegExp('^</?([a-zA-Z]+)'))[1];
    if (tag.startsWith('</')) assert.equal(stack.pop(), name);
    else if (!tag.endsWith('/>')) stack.push(name);
  }
  assert.equal(stack.length, 0);
  assert.match(snailSvg, /data-pen-tip="tip" d="M-3.2 6 L3.2 6 L0 0 Z"/);
  assert.equal(avatarSvg, snailSvg);
});

runTest('animation: duration, heading interpolation and scale independence', () => {
  const a = { x: 0, y: 0, heading: 0, penDown: true, color: '#111', strokeWidth: 4 };
  assert.equal(getStepDuration(a, { ...a, y: -50 }), 250);
  assert.equal(getStepDuration(a, { ...a, y: -100 }), 500);
  assert.equal(getStepDuration(a, { ...a, heading: 90 }), 200);
  assert.equal(headingDelta(270, 0), 90);
  assert.equal(headingDelta(0, 270), -90);
  const b = { ...a, heading: 90, x: 40, color: '#222' };
  const mid = interpolateTurtle(a, b, 0.5);
  assert.equal(mid.x, 20);
  assert.equal(mid.heading, 45);
  assert.equal(mid.color, '#111');
  assert.equal(interpolateTurtle(a, b, 1), b);
  // логіка не залежить від розміру екрана: рушій не знає про пікселі
  const lesson = { start: { x: 0, y: 0, heading: 0 } };
  const run = runProgram(withIds([blk('forward', 100)]), lesson);
  assert.ok(near(run.segments[0].to[0], 0) && near(run.segments[0].to[1], -100));
});
