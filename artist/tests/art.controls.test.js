import assert from 'node:assert/strict';

import { blk, withIds } from '../js/core/blockTree.js';
import { buildProgramCode } from '../js/core/codegen.js';
import { FIELD_HALF_HEIGHT, FIELD_HALF_WIDTH } from '../js/core/constants.js';
import { tokenizeLine } from '../js/core/codeHighlight.js';
import { evaluateGoal } from '../js/core/goals.js';
import { starsCaption, starsLabel, starsText } from '../js/core/stars.js';
import { createStepper } from '../js/runtime/stepper.js';
import { setEditorView } from '../js/ui/codeView.js';
import {
  SPEEDS, chooseSnailSide, getSnailFieldOffset, getStepDuration, speedFactor,
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

const lesson = { start: { x: 0, y: 0, heading: 0 }, pen: { color: 'чорний', width: 2 } };
const kinds = (line) => tokenizeLine(line).filter((t) => t.type !== 'plain').map((t) => `${t.type}:${t.text}`);

// ── Підсвітка коду ──────────────────────────────────────────────────────────

runTest('tokenizer: keywords, numbers, colour names, comments, punctuation', () => {
  assert.deepEqual(kinds('вперед 50'), ['keyword:вперед', 'number:50']);
  assert.deepEqual(kinds('колір жовтогарячий'), ['keyword:колір', 'color:жовтогарячий']);
  assert.deepEqual(kinds('  повторити 4 ('), ['keyword:повторити', 'number:4', 'punct:(']);
  assert.deepEqual(kinds('перейти в -100 50'), ['keyword:перейти', 'keyword:в', 'punct:-', 'number:100', 'number:50']);
  assert.deepEqual(kinds('// Підготовка поля'), ['comment:// Підготовка поля']);
  assert.deepEqual(kinds('вперед 10 // коментар'), ['keyword:вперед', 'number:10', 'comment:// коментар']);
});

runTest('tokenizer: tokens concatenate back to the original line', () => {
  const code = buildProgramCode(lesson, withIds([blk('repeat', 4, [blk('forward', 60), blk('color', 'синій')])]));
  for (const line of [...code.setup, ...code.body]) {
    assert.equal(tokenizeLine(line).map((t) => t.text).join(''), line);
  }
  assert.deepEqual(tokenizeLine(''), []);
});

runTest('code tab keeps the palette visible while making inactive block controls inert', () => {
  const tab = () => ({
    setAttribute(name, value) { this[name] = value; },
  });
  const dom = { paletteSection: {}, blocksView: {}, codeView: {}, tabBlocks: tab(), tabCode: tab() };
  setEditorView(dom, 'code');
  assert.equal(dom.paletteSection.inert, true);
  assert.equal(dom.paletteSection.hidden, undefined);
  assert.equal(dom.blocksView.hidden, true);
  assert.equal(dom.blocksView.inert, true);
  assert.equal(dom.codeView.hidden, false);
  assert.equal(dom.tabCode['aria-selected'], 'true');
  assert.equal(dom.tabBlocks.tabIndex, -1);
  setEditorView(dom, 'blocks');
  assert.equal(dom.paletteSection.inert, false);
  assert.equal(dom.blocksView.inert, false);
  assert.equal(dom.blocksView.hidden, false);
  assert.equal(dom.codeView.hidden, true);
  assert.equal(dom.tabBlocks['aria-selected'], 'true');
  assert.equal(dom.tabCode.tabIndex, -1);
});

// ── Покроковий виконавець ───────────────────────────────────────────────────

runTest('stepper: one primitive per next(), loops stay lazy, done known after last step', () => {
  const tree = withIds([blk('repeat', 2, [blk('forward', 50), blk('right', 90)])]);
  const stepper = createStepper(tree, lesson);
  assert.equal(stepper.done, false);
  const types = [];
  let step;
  while ((step = stepper.next()) !== null) {
    types.push(step.segment ? 'line' : 'turn');
    assert.equal(stepper.executed, types.length);
  }
  assert.deepEqual(types, ['line', 'turn', 'line', 'turn']);
  assert.equal(stepper.done, true);
  assert.equal(stepper.next(), null);
});

runTest('stepper: done flips right after the final primitive', () => {
  const stepper = createStepper(withIds([blk('forward', 50), blk('right', 90)]), lesson);
  stepper.next();
  assert.equal(stepper.done, false);
  stepper.next();
  assert.equal(stepper.done, true);
});

runTest('stepper: empty loop has no steps; engine limit surfaces as a thrown error on the offending step', () => {
  assert.equal(createStepper(withIds([blk('repeat', 3, [])]), lesson).next(), null);
  const stepper = createStepper(withIds([blk('forward', 50), blk('forward', 50), blk('forward', 50)]), lesson, { maxSteps: 2 });
  stepper.next();
  stepper.next();
  assert.throws(() => stepper.next(), /Забагато/);
  assert.equal(stepper.done, true);
});

// ── Швидкість ───────────────────────────────────────────────────────────────

runTest('speed: factors scale animation durations', () => {
  const a = { x: 0, y: 0, heading: 0 };
  const move = { ...a, y: -50 };
  assert.equal(getStepDuration(a, move), 250);
  assert.equal(getStepDuration(a, move, speedFactor('slow')), 250 * SPEEDS.slow.factor);
  assert.ok(getStepDuration(a, move, speedFactor('fast')) < 250);
  assert.equal(speedFactor('нема-такої'), 1);
  assert.ok(SPEEDS.slow.factor > SPEEDS.normal.factor && SPEEDS.normal.factor > SPEEDS.fast.factor);
});

runTest('snail pose keeps the chosen side along a straight route', () => {
  const start = { x: 0, y: 50, heading: 0 };
  const end = { ...start, y: 0 };
  const guide = [{ from: [0, 50], to: [0, -100] }];
  assert.equal(chooseSnailSide(start, end, [guide], 1), 1);
  assert.equal(chooseSnailSide(start, end, [guide], -1), -1);
});

runTest('snail pose avoids a nearby line and chooses the inward side at the edge', () => {
  const start = { x: 0, y: 0, heading: 0 };
  const rightBranch = [{ from: [0, 0], to: [50, 0] }];
  assert.equal(chooseSnailSide(start, start, [rightBranch], 1), -1);
  const rightEdge = { ...start, x: 190 };
  assert.equal(chooseSnailSide(rightEdge, rightEdge, [], 1), -1);
  const bottomEdge = { ...start, y: 145, heading: 90 };
  assert.equal(chooseSnailSide(bottomEdge, bottomEdge, [], 1), -1);
});

runTest('snail sprite stays inside the field at corners for either mirror pose', () => {
  assert.deepEqual(getSnailFieldOffset({ x: 0, y: 0, heading: 90 }, 1), [0, 0]);
  for (const side of [-1, 1]) {
    for (const x of [-FIELD_HALF_WIDTH, FIELD_HALF_WIDTH]) {
      for (const y of [-FIELD_HALF_HEIGHT, FIELD_HALF_HEIGHT]) {
        for (const heading of [0, 30, 45, 90, 135, 180, 225, 270, 315]) {
          const turtle = { x, y, heading };
          const [dx, dy] = getSnailFieldOffset(turtle, side);
          assert.ok(dx * x < 0 && dy * y < 0);
          const radians = heading * Math.PI / 180;
          for (const [sx, sy] of [[0, 0], [18, -19], [32, -20], [40, 7], [28, 19]]) {
            const visibleX = x + dx + side * sx * Math.cos(radians) - sy * Math.sin(radians);
            const visibleY = y + dy + side * sx * Math.sin(radians) + sy * Math.cos(radians);
            assert.ok(Math.abs(visibleX) < FIELD_HALF_WIDTH);
            assert.ok(Math.abs(visibleY) < FIELD_HALF_HEIGHT);
          }
        }
      }
    }
  }
});

// ── Зірки ───────────────────────────────────────────────────────────────────

runTest('stars: text, label and caption', () => {
  assert.equal(starsText(3), '★★★');
  assert.equal(starsText(2), '★★☆');
  assert.equal(starsText(0), '☆☆☆');
  assert.equal(starsText(9), '★★★');
  assert.equal(starsLabel(2), 'Зірок: 2 з 3');
  assert.equal(starsCaption(3, 3, 3), 'Найкращий результат!');
  assert.match(starsCaption(2, 5, 3), /3/);
  assert.match(starsCaption(1, 9, 3), /5/);
});

runTest('stars: evaluateGoal feeds the modal (3 for best, fewer for longer programs)', () => {
  const square = {
    start: { x: 0, y: 0, heading: 0 },
    solution: [],
    success: { mode: 'shape' },
    successMessage: 'ok',
    constraints: { bestBlocks: 2 },
  };
  const side = (from, to) => ({ from, to, color: '#000', width: 2 });
  const expected = [side([0, 0], [0, -50])];
  const best = evaluateGoal(square, { segments: expected, workspace: withIds([blk('forward', 50), blk('right', 90)]), expected });
  assert.equal(best.stars, 3);
  const long = evaluateGoal(square, {
    segments: expected,
    workspace: withIds([blk('forward', 50), blk('right', 90), blk('left', 90), blk('right', 90), blk('left', 90)]),
    expected,
  });
  assert.equal(long.stars, 1);
});
