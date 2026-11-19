import assert from 'node:assert/strict';

import { blk, countBlocksIn, withIds } from '../js/core/blockTree.js';
import { compareShapes, evaluateGoal, getStars, mergeSegments } from '../js/core/goals.js';
import { getBestBlocks, getGhostSegments } from '../js/core/ghost.js';
import { buildProgramCode, programToText } from '../js/core/codegen.js';
import { lessons } from '../js/data/lessons.js';
import { blockDefinitions } from '../js/data/blocks.js';
import { COLORS } from '../js/data/colors.js';
import { runProgram } from '../js/runtime/runner.js';
import { validateProgram } from '../js/runtime/execution-limits.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const seg = (x1, y1, x2, y2, color = '#000000') => ({ from: [x1, y1], to: [x2, y2], color });

function play(lesson, tree) {
  const workspace = withIds(tree);
  const { segments } = runProgram(workspace, lesson);
  return evaluateGoal(lesson, {
    segments,
    workspace,
    expected: getGhostSegments(lesson),
    bestBlocks: getBestBlocks(lesson),
  });
}

/** Розгортає цикли в плоский список примітивів (для перевірки requireBlocks). */
function expand(list) {
  return list.flatMap((block) => (block.type === 'repeat'
    ? Array.from({ length: block.n }, () => expand(block.blocks)).flat()
    : [{ ...block }]));
}

function mapTree(list, fn) {
  return list.map((block) => {
    const copy = fn({ ...block });
    if (copy.blocks) copy.blocks = mapTree(copy.blocks, fn);
    return copy;
  });
}

// ── Порівняння фігур ─────────────────────────────────────────────────────────

runTest('mergeSegments joins consecutive collinear segments (вперед 50 + вперед 50 = вперед 100)', () => {
  const merged = mergeSegments([seg(0, 0, 0, -50), seg(0, -50, 0, -100)]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].from, [0, 0]);
  assert.deepEqual(merged[0].to, [0, -100]);
});

runTest('mergeSegments does not join non-collinear or separated segments', () => {
  assert.equal(mergeSegments([seg(0, 0, 0, -50), seg(0, -50, 50, -50)]).length, 2);
  assert.equal(mergeSegments([seg(0, 0, 0, -50), seg(0, -100, 0, -150)]).length, 2);
});

runTest('mergeSegments merges overlapping retrace (вперед, назад) and respects color when asked', () => {
  assert.equal(mergeSegments([seg(0, 0, 0, -100), seg(0, -100, 0, -50)]).length, 1);
  const red = '#E8302A';
  const blue = '#1A56DB';
  assert.equal(mergeSegments([seg(0, 0, 0, -50, red), seg(0, -50, 0, -100, blue)], { checkColor: true }).length, 2);
  assert.equal(mergeSegments([seg(0, 0, 0, -50, red), seg(0, -50, 0, -100, blue)], { checkColor: false }).length, 1);
});

runTest('compareShapes: split segments equal one long segment, direction does not matter', () => {
  const expected = [seg(0, 0, 0, -100)];
  assert.equal(compareShapes([seg(0, 0, 0, -50), seg(0, -50, 0, -100)], expected).ok, true);
  assert.equal(compareShapes([seg(0, -100, 0, 0)], expected).ok, true);
});

runTest('compareShapes: tolerance is 2 units', () => {
  const expected = [seg(0, 0, 0, -100)];
  assert.equal(compareShapes([seg(1.5, 0, 1.5, -100)], expected).ok, true);
  assert.equal(compareShapes([seg(0, 0, 0, -104)], expected).ok, false);
});

runTest('compareShapes reports missing, extra and almost', () => {
  const square = [seg(0, 0, 50, 0), seg(50, 0, 50, 50), seg(50, 50, 0, 50), seg(0, 50, 0, 0)];
  assert.equal(compareShapes(square.slice(0, 3), square).reason, 'missing');
  assert.equal(compareShapes([...square, seg(0, 0, -50, -50)], square).reason, 'extra');
  const slanted = [seg(0, 0, 50, 0), seg(50, 0, 60, 50), seg(60, 50, 0, 50), seg(0, 50, 0, 0)];
  assert.equal(compareShapes(slanted, square).reason, 'almost');
  assert.equal(compareShapes([], square).reason, 'empty');
});

runTest('compareShapes: checkColor compares colors', () => {
  const red = '#E8302A';
  const blue = '#1A56DB';
  const expected = [seg(0, 0, 0, -50, red)];
  assert.equal(compareShapes([seg(0, 0, 0, -50, red)], expected, { checkColor: true }).ok, true);
  const wrong = compareShapes([seg(0, 0, 0, -50, blue)], expected, { checkColor: true });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, 'colors');
  assert.equal(compareShapes([seg(0, 0, 0, -50, blue)], expected, { checkColor: false }).ok, true);
});

runTest('getStars: ≤ best 3 stars, ≤ best+2 2 stars, else 1', () => {
  assert.equal(getStars(4, 4), 3);
  assert.equal(getStars(6, 4), 2);
  assert.equal(getStars(7, 4), 1);
});

// ── Рівні ─────────────────────────────────────────────────────────────────────

runTest('lessons have unique ids, valid toolbox, no legacy fields', () => {
  assert.equal(new Set(lessons.map((l) => l.id)).size, lessons.length);
  for (const lesson of lessons) {
    assert.equal(typeof lesson.instruction, 'string', lesson.id);
    assert.equal('mode' in lesson, false, `${lesson.id}: поле mode видалено`);
    assert.equal('goalSegments' in lesson, false, `${lesson.id}: goalSegments видалено`);
    assert.ok(lesson.toolbox.length > 0);
    for (const type of lesson.toolbox) assert.ok(blockDefinitions[type], `${lesson.id}: ${type}`);
    assert.ok(['shape', 'free'].includes(lesson.success.mode));
    for (const field of ['x', 'y']) assert.ok(Number.isInteger(lesson.start[field] / 50), `${lesson.id}: старт кратний 50`);
  }
});

for (const lesson of lessons) {
  if (lesson.success.mode === 'free') {
    runTest(`${lesson.id} (free): empty program fails, enough segments pass`, () => {
      assert.equal(play(lesson, []).ok, false);
      const many = Array.from({ length: lesson.success.minSegments }, () => blk('forward', 10));
      assert.equal(play(lesson, many).ok, true);
      assert.equal(play(lesson, many.slice(1)).ok, false);
    });
    continue;
  }

  runTest(`${lesson.id}: solution passes within the field, validates, and empty program fails`, () => {
    assert.ok(Array.isArray(lesson.solution) && lesson.solution.length > 0);
    const workspace = withIds(lesson.solution);
    assert.equal(validateProgram(workspace).ok, true);
    for (const type of new Set(expand(lesson.solution).map((b) => b.type))) {
      assert.ok(lesson.toolbox.includes(type) || type === 'repeat', `${lesson.id}: ${type} відсутній у toolbox`);
    }
    const result = play(lesson, lesson.solution);
    assert.equal(result.ok, true, result.message);
    assert.equal(result.stars, 3);
    assert.equal(play(lesson, []).ok, false);

    const ghost = getGhostSegments(lesson);
    assert.ok(ghost.length > 0);
    for (const { from, to } of ghost) {
      for (const [x, y] of [from, to]) {
        assert.ok(Math.abs(x) <= 180 && Math.abs(y) <= 130, `${lesson.id}: фігура поза межами ±180×±130 (${x}, ${y})`);
      }
    }
  });

  runTest(`${lesson.id}: almost-right programs do not pass`, () => {
    // 1) без першого блоку, що малює
    let dropped = false;
    const withoutDrawing = (list) => list.flatMap((block) => {
      if (!dropped && ['step', 'forward', 'back'].includes(block.type)) {
        dropped = true;
        return [];
      }
      return [block.blocks ? { ...block, blocks: withoutDrawing(block.blocks) } : block];
    });
    assert.equal(play(lesson, withoutDrawing(lesson.solution)).ok, false);

    // 2) кут «трохи не той»
    const hasAngle = expand(lesson.solution).some((b) => b.type === 'right' || b.type === 'left');
    if (hasAngle) {
      const wrongAngle = mapTree(lesson.solution, (b) => (b.type === 'right' ? { ...b, n: b.n === 90 ? 120 : 90 } : b));
      assert.equal(play(lesson, wrongAngle).ok, false);
    }

    // 3) зайва лінія
    assert.equal(play(lesson, [...lesson.solution, blk('right', 37), blk('forward', 130)]).ok, false);
  });

  if (lesson.constraints?.requireBlocks?.includes('repeat')) {
    runTest(`${lesson.id}: correct shape without «повторити» is not accepted`, () => {
      const flat = expand(lesson.solution);
      const result = play(lesson, flat);
      assert.equal(result.ok, false);
      assert.equal(result.reason, 'requireBlocks');
    });
  }
}

runTest('stars depend on block count: extra blocks lower the rating', () => {
  const lesson = lessons.find((l) => l.id === 'lesson-01');
  const best = lesson.solution.length;
  assert.equal(play(lesson, [...lesson.solution, blk('turn_right90')]).stars, 2);
  const padded = [...lesson.solution, blk('turn_right90'), blk('turn_left90'), blk('turn_right90')];
  assert.equal(play(lesson, padded).stars, 1);
  assert.equal(countBlocksIn(lesson.solution), best);
});

runTest('rainbow square level: wrong colors are rejected, right colors pass', () => {
  const lesson = lessons.find((l) => l.success.checkColor);
  assert.ok(lesson, 'є рівень із checkColor');
  const wrong = mapTree(lesson.solution, (b) => (b.type === 'color' && b.color === 'синій' ? { ...b, color: 'червоний' } : b));
  const result = play(lesson, wrong);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'colors');
  assert.equal(play(lesson, lesson.solution).ok, true);
});

// ── Codegen ───────────────────────────────────────────────────────────────────

const lessonAt = (start, pen = { color: 'жовтогарячий', width: 4 }) => ({ start, pen });

runTest('codegen: setup block with start point, turn, thickness and color (y is inverted)', () => {
  const code = buildProgramCode(lessonAt({ x: -100, y: 100, heading: 90 }), withIds([blk('forward', 50)]));
  assert.deepEqual(code.setup, [
    '// Підготовка поля',
    'підняти',
    'перейти в -100 -100',
    'праворуч 90',
    'опустити',
    'товщина 4',
    'колір жовтогарячий',
    '// Твоя програма',
  ]);
  assert.deepEqual(code.body, ['вперед 50']);
});

runTest('codegen: y-inversion for upper half and heading over 180', () => {
  const code = buildProgramCode(lessonAt({ x: 50, y: -50, heading: 270 }), []);
  assert.ok(code.setup.includes('перейти в 50 50'));
  assert.ok(code.setup.includes('ліворуч 90'));
});

runTest('codegen: origin start with heading 0 has only pen setup', () => {
  const code = buildProgramCode(lessonAt({ x: 0, y: 0, heading: 0 }, { color: 'чорний', width: 2 }), []);
  assert.deepEqual(code.setup, ['// Підготовка поля', 'товщина 2', 'колір чорний', '// Твоя програма']);
});

runTest('codegen: repeat and nested repeat have exact text with 2-space indent', () => {
  const tree = withIds([
    blk('repeat', 6, [
      blk('repeat', 4, [blk('forward', 60), blk('right', 90)]),
      blk('right', 60),
    ]),
  ]);
  const code = buildProgramCode(lessonAt({ x: 0, y: 0, heading: 0 }), tree);
  assert.deepEqual(code.body, [
    'повторити 6 (',
    '  повторити 4 (',
    '    вперед 60',
    '    праворуч 90',
    '  )',
    '  праворуч 60',
    ')',
  ]);
});

runTest('codegen: color, back, pen blocks and fixed blocks', () => {
  const tree = withIds([
    blk('color', 'синій'), blk('step'), blk('turn_left90'), blk('turn_right90'),
    blk('back', 20), blk('left', 45), blk('pen_up'), blk('pen_down'),
  ]);
  const code = buildProgramCode(lessonAt({ x: 0, y: 0, heading: 0 }), tree);
  assert.deepEqual(code.body, [
    'колір синій', 'вперед 50', 'ліворуч 90', 'праворуч 90',
    'назад 20', 'ліворуч 45', 'підняти', 'опустити',
  ]);
});

runTest('codegen: lineByBlockId points to the full-text line of each block', () => {
  const tree = withIds([blk('repeat', 2, [blk('step')]), blk('step')]);
  const lesson = lessonAt({ x: 0, y: 0, heading: 0 });
  const code = buildProgramCode(lesson, tree);
  const lines = programToText(code).split('\n');
  assert.equal(lines[code.lineByBlockId.get(1)], 'повторити 2 (');
  assert.equal(lines[code.lineByBlockId.get(2)], '  вперед 50');
  assert.equal(lines[code.lineByBlockId.get(3)], 'вперед 50');
});

runTest('codegen output never contains legacy syntax', () => {
  for (const lesson of lessons.filter((l) => l.solution)) {
    const text = programToText(buildProgramCode(lesson, withIds(lesson.solution)));
    assert.doesNotMatch(text, /коли запущено|разів \{|рухатися\(/);
  }
});

runTest('color table has 9 unique named colors with hex values', () => {
  assert.equal(COLORS.length, 9);
  assert.equal(new Set(COLORS.map((c) => c.name)).size, 9);
  for (const { hex } of COLORS) assert.match(hex, /^#[0-9A-F]{6}$/);
});
