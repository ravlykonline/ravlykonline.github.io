import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { blk, withIds } from '../js/core/blockTree.js';
import { buildProgramCode, programToText } from '../js/core/codegen.js';
import { hatPath, loopPath, SHAPE, stackPath } from '../js/core/blockShape.js';
import {
  appendToTarget, cloneDoc, createBlock, findInDoc, liftTail, moveDownInDoc, moveOutInDoc, moveUpInDoc,
  nearestInsertionPoint, placeLoose, placeTail, pruneLoose, removeFromDoc,
} from '../js/core/workspace.js';
import { describeBlock, blockDefinitions, BLOCK_CATEGORIES, unitText } from '../js/data/blocks.js';
import { pluralUk } from '../js/core/plural.js';
import { lessons } from '../js/data/lessons.js';
import { validateProgram } from '../js/runtime/execution-limits.js';
import { pushSnapshot, undo, redo, clearHistory } from '../js/state/history.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

/** Документ: головний стос і вільні стоси з унікальними id. */
function makeDoc() {
  return {
    main: withIds([blk('forward', 10), blk('repeat', 3, [blk('step'), blk('turn_right90')]), blk('back', 20)], 1),
    loose: [],
  };
}
// id: forward=1, repeat=2, step=3, turn_right90=4, back=5

const idsOf = (list) => list.map((block) => block.id);

// ── Хвіст ─────────────────────────────────────────────────────────────────────

runTest('liftTail takes the block and everything below it in the same list', () => {
  const doc = makeDoc();
  const { tail, from } = liftTail(doc, 2);
  assert.deepEqual(idsOf(tail), [2, 5]);
  assert.deepEqual(idsOf(doc.main), [1]);
  assert.deepEqual(from, { owner: 'main', parentId: null, index: 1 });
  assert.deepEqual(idsOf(tail[0].blocks), [3, 4], 'loop keeps its contents');
});

runTest('liftTail inside a loop takes only the tail of that loop', () => {
  const doc = makeDoc();
  const { tail } = liftTail(doc, 3);
  assert.deepEqual(idsOf(tail), [3, 4]);
  assert.deepEqual(doc.main[1].blocks, []);
  assert.equal(doc.main.length, 3, 'outer list is untouched');
});

runTest('liftTail of an unknown id returns null and does not change the document', () => {
  const doc = makeDoc();
  const before = cloneDoc(doc);
  assert.equal(liftTail(doc, 999), null);
  assert.deepEqual(doc, before);
});

runTest('placeTail inserts the tail at an index, into a loop and at the end', () => {
  const doc = makeDoc();
  const { tail } = liftTail(doc, 5);
  assert.equal(placeTail(doc, tail, { owner: 'main', parentId: 2, index: 1 }), true);
  assert.deepEqual(idsOf(doc.main[1].blocks), [3, 5, 4]);

  const second = liftTail(doc, 2);
  assert.deepEqual(idsOf(doc.main), [1]);
  assert.equal(placeTail(doc, second.tail, { owner: 'main', parentId: null, index: -5 }), true);
  assert.deepEqual(idsOf(doc.main), [2, 1], 'negative index is clamped to the start');
  const third = liftTail(doc, 1);
  assert.equal(placeTail(doc, third.tail, { owner: 'main', parentId: null, index: 99 }), true);
  assert.deepEqual(idsOf(doc.main), [2, 1], 'index is clamped to the end');
});

runTest('placeTail refuses to drop a loop into itself or a missing list', () => {
  const doc = makeDoc();
  const { tail } = liftTail(doc, 2);
  assert.equal(placeTail(doc, tail, { owner: 'main', parentId: 2, index: 0 }), false);
  assert.equal(placeTail(doc, tail, { owner: 'main', parentId: 4, index: 0 }), false, 'nested id inside the tail');
  assert.equal(placeTail(doc, tail, { owner: 77, parentId: null, index: 0 }), false);
  assert.equal(placeTail(doc, [], { owner: 'main', parentId: null, index: 0 }), false);
});

// ── Вільні стоси ─────────────────────────────────────────────────────────────

runTest('placeLoose creates a loose stack that is not part of main', () => {
  const doc = makeDoc();
  const { tail } = liftTail(doc, 5);
  const stack = placeLoose(doc, tail, 120.4, 80.6, 100);
  assert.deepEqual({ id: stack.id, x: stack.x, y: stack.y }, { id: 100, x: 120, y: 81 });
  assert.deepEqual(idsOf(doc.loose[0].blocks), [5]);
  assert.equal(findInDoc(doc, 5).owner, 100);
  assert.equal(placeLoose(doc, [], 0, 0), null);
});

runTest('lifting the only block of a loose stack removes the empty stack', () => {
  const doc = makeDoc();
  placeLoose(doc, liftTail(doc, 5).tail, 10, 10, 100);
  assert.equal(doc.loose.length, 1);
  liftTail(doc, 5);
  assert.equal(doc.loose.length, 0);
});

runTest('pruneLoose removes only empty stacks and mutates in place', () => {
  const doc = { main: [], loose: [{ id: 1, x: 0, y: 0, blocks: [] }, { id: 2, x: 0, y: 0, blocks: [createBlock('step', 9)] }] };
  const looseRef = doc.loose;
  assert.equal(pruneLoose(doc), true);
  assert.equal(doc.loose, looseRef);
  assert.deepEqual(doc.loose.map((stack) => stack.id), [2]);
  assert.equal(pruneLoose(doc), false);
});

runTest('loose blocks do not reach the generated code', () => {
  const doc = makeDoc();
  const lesson = lessons[0];
  placeLoose(doc, liftTail(doc, 5).tail, 10, 10, 100);
  const text = programToText(buildProgramCode(lesson, doc.main));
  assert.match(text, /вперед 10/);
  assert.doesNotMatch(text, /назад 20/);
});

runTest('removeFromDoc deletes a single block everywhere, with loop contents, and prunes', () => {
  const doc = makeDoc();
  assert.equal(removeFromDoc(doc, 2).id, 2);
  assert.deepEqual(idsOf(doc.main), [1, 5]);
  assert.equal(findInDoc(doc, 3), null, 'children vanish with the loop');
  placeLoose(doc, liftTail(doc, 5).tail, 0, 0, 100);
  removeFromDoc(doc, 5);
  assert.equal(doc.loose.length, 0);
  assert.equal(removeFromDoc(doc, 12345), null);
});

// ── Ціль вставки, ↑ ↓ ↖ ─────────────────────────────────────────────────────

runTest('appendToTarget appends to a loop target or to the end of main', () => {
  const doc = makeDoc();
  assert.equal(appendToTarget(doc, createBlock('step', 50), 2), 2);
  assert.deepEqual(idsOf(doc.main[1].blocks), [3, 4, 50]);
  assert.equal(appendToTarget(doc, createBlock('step', 51), null), null);
  assert.equal(doc.main.at(-1).id, 51);
  assert.equal(appendToTarget(doc, createBlock('step', 52), 1), null, 'non-loop target falls back to main');
  assert.equal(appendToTarget(doc, createBlock('step', 53), 999), null, 'missing target falls back to main');
  assert.deepEqual(idsOf(doc.main).slice(-2), [52, 53]);
});

runTest('moveUp/moveDown/moveOut work for blocks in loose stacks too', () => {
  const doc = {
    main: [],
    loose: [{ id: 100, x: 0, y: 0, blocks: withIds([blk('step'), blk('repeat', 2, [blk('forward', 5), blk('back', 5)])], 10) }],
  };
  // step=10, repeat=11, forward=12, back=13
  assert.equal(moveUpInDoc(doc, 10), false);
  assert.equal(moveDownInDoc(doc, 10), true);
  assert.deepEqual(idsOf(doc.loose[0].blocks), [11, 10]);
  assert.equal(moveDownInDoc(doc, 12), true);
  assert.deepEqual(idsOf(doc.loose[0].blocks[0].blocks), [13, 12]);
  assert.equal(moveOutInDoc(doc, 13), true);
  assert.deepEqual(idsOf(doc.loose[0].blocks), [11, 13, 10]);
  assert.equal(moveOutInDoc(doc, 13), false, 'already top-level');
});

// ── Пошук найближчої точки ───────────────────────────────────────────────────

runTest('nearestInsertionPoint picks the closest point within the radius', () => {
  const points = [
    { owner: 'main', parentId: null, index: 0, x: 16, y: 80 },
    { owner: 'main', parentId: null, index: 1, x: 16, y: 120 },
    { owner: 'main', parentId: 2, index: 0, x: 32, y: 100 },
  ];
  assert.equal(nearestInsertionPoint(points, 20, 118).index, 1);
  assert.equal(nearestInsertionPoint(points, 30, 98).parentId, 2);
  assert.equal(nearestInsertionPoint(points, 200, 100), null, 'too far horizontally');
  assert.equal(nearestInsertionPoint(points, 16, 400), null, 'too far vertically');
  assert.equal(nearestInsertionPoint([], 0, 0), null);
});

runTest('nearestInsertionPoint weighs vertical distance more than horizontal', () => {
  const points = [
    { id: 'near-x', x: 40, y: 0 },
    { id: 'near-y', x: 0, y: 25 },
  ];
  // dx=40 → 40; dy=25 → 50 при вазі 2: ближчою вважається та, що лише збоку.
  assert.equal(nearestInsertionPoint(points, 0, 0).id, 'near-x');
  assert.equal(nearestInsertionPoint(points, 0, 0, { dyWeight: 1 }).id, 'near-y');
});

// ── Історія зі вільними стосами ──────────────────────────────────────────────

runTest('history snapshots keep loose stacks', () => {
  clearHistory();
  const doc = makeDoc();
  placeLoose(doc, liftTail(doc, 5).tail, 10, 10, 100);
  pushSnapshot(doc);
  const changed = cloneDoc(doc);
  changed.loose.length = 0;
  const restored = undo(changed);
  assert.equal(restored.loose.length, 1);
  assert.deepEqual(idsOf(restored.loose[0].blocks), [5]);
  const again = redo(restored);
  assert.equal(again.loose.length, 0);
  clearHistory();
});

// ── Помилковий блок ──────────────────────────────────────────────────────────

runTest('validateProgram reports the id of the offending block', () => {
  const tooMany = withIds([blk('forward', 10), blk('repeat', 501, [blk('step')])], 1);
  const result = validateProgram(tooMany);
  assert.equal(result.ok, false);
  assert.equal(result.blockId, 2);

  const huge = withIds([blk('repeat', 36, [blk('repeat', 36, [blk('step')])])], 1);
  const hugeResult = validateProgram(huge);
  assert.equal(hugeResult.ok, false);
  assert.equal(typeof hugeResult.blockId, 'number');
});

// ── Текст блоків і категорії ─────────────────────────────────────────────────

runTest('describeBlock reads like Scratch phrases', () => {
  assert.equal(describeBlock({ type: 'forward', n: 50 }), 'вперед 50 кроків');
  assert.equal(describeBlock({ type: 'right', n: 90 }), 'праворуч ↻ 90 градусів');
  assert.equal(describeBlock({ type: 'left', n: 45 }), 'ліворуч ↺ 45 градусів');
  assert.equal(describeBlock({ type: 'back', n: 10 }), 'назад 10 кроків');
  assert.equal(describeBlock({ type: 'repeat', n: 4 }), 'повторити 4 рази');
  assert.equal(describeBlock({ type: 'color', color: 'червоний' }), 'колір червоний');
  assert.equal(describeBlock({ type: 'pen_up' }), 'підняти олівець');
  assert.equal(describeBlock({ type: 'step' }), 'крок вперед (одна клітинка)');
  assert.equal(describeBlock({ type: 'turn_right90' }), 'поворот праворуч');
});

runTest('pluralUk follows Ukrainian plural rules', () => {
  const forms = ['крок', 'кроки', 'кроків'];
  const expected = {
    1: 'крок', 2: 'кроки', 4: 'кроки', 5: 'кроків', 11: 'кроків', 12: 'кроків', 14: 'кроків',
    21: 'крок', 22: 'кроки', 25: 'кроків', 36: 'кроків', 111: 'кроків', 144: 'кроки', 101: 'крок', 0: 'кроків',
  };
  for (const [n, word] of Object.entries(expected)) assert.equal(pluralUk(Number(n), forms), word, n);
});

runTest('describeBlock agrees units with the number', () => {
  assert.equal(describeBlock({ type: 'forward', n: 1 }), 'вперед 1 крок');
  assert.equal(describeBlock({ type: 'forward', n: 2 }), 'вперед 2 кроки');
  assert.equal(describeBlock({ type: 'back', n: 21 }), 'назад 21 крок');
  assert.equal(describeBlock({ type: 'right', n: 144 }), 'праворуч ↻ 144 градуси');
  assert.equal(describeBlock({ type: 'right', n: 1 }), 'праворуч ↻ 1 градус');
  assert.equal(describeBlock({ type: 'left', n: 22 }), 'ліворуч ↺ 22 градуси');
  assert.equal(describeBlock({ type: 'repeat', n: 6 }), 'повторити 6 разів');
  assert.equal(describeBlock({ type: 'repeat', n: 2 }), 'повторити 2 рази');
  assert.equal(describeBlock({ type: 'repeat', n: 36 }), 'повторити 36 разів');
  assert.equal(unitText(blockDefinitions.repeat, 3), 'рази');
  // типові значення палітри читаються природно
  for (const [type, text] of [['forward', 'вперед 50 кроків'], ['right', 'праворуч ↻ 90 градусів'], ['repeat', 'повторити 4 рази']]) {
    assert.equal(describeBlock(createBlock(type, 1)), text);
  }
});

runTest('every block has a text phrase, a known category and numeric fields have quick data', () => {
  const categories = new Set(BLOCK_CATEGORIES.map((category) => category.id));
  for (const [type, definition] of Object.entries(blockDefinitions)) {
    assert.equal(definition.text.length, 2, type);
    assert.ok(categories.has(definition.category), type);
    if (definition.param?.kind === 'number') {
      assert.ok(definition.param.aria, type);
      assert.ok(definition.param.step >= 1, type);
    }
  }
  assert.deepEqual(blockDefinitions.right.param.quick, [10, 30, 45, 60, 90, 120]);
  assert.deepEqual(blockDefinitions.left.param.quick, [10, 30, 45, 60, 90, 120]);
  assert.ok(!blockDefinitions.right.param.quick.includes(144), '144 — відповідь рівня «Зірка»');
  assert.equal(blockDefinitions.right.param.step, 1);
  assert.equal(blockDefinitions.left.param.step, 1);
});

// ── Форма пазла ──────────────────────────────────────────────────────────────

const numbersIn = (path) => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const countOf = (path, fragment) => path.split(fragment).length - 1;

runTest('stackPath has a top notch and a bottom tab of the same size', () => {
  const path = stackPath(160, 40);
  assert.match(path, /^M4 0 /);
  assert.match(path, / Z$/);
  assert.ok(numbersIn(path).every(Number.isFinite));
  const notch = `l${SHAPE.slope} ${SHAPE.notchH} h${SHAPE.notchW - 2 * SHAPE.slope} l${SHAPE.slope} ${-SHAPE.notchH}`;
  const tab = `l${-SHAPE.slope} ${SHAPE.notchH} h${-(SHAPE.notchW - 2 * SHAPE.slope)} l${-SHAPE.slope} ${-SHAPE.notchH}`;
  assert.equal(countOf(path, notch), 1);
  assert.equal(countOf(path, tab), 1);
});

runTest('stackPath respects notchTop/tabBottom switches and tiny sizes', () => {
  assert.equal(countOf(stackPath(100, 40, { notchTop: false }), `l${SHAPE.slope} ${SHAPE.notchH}`), 0);
  const flat = stackPath(100, 40, { notchTop: false, tabBottom: false });
  assert.equal(countOf(flat, 'l'), 0);
  assert.ok(numbersIn(stackPath(0, 0)).every(Number.isFinite));
  assert.ok(numbersIn(stackPath(Number.NaN, Number.NaN)).every(Number.isFinite));
});

runTest('hatPath is rounded on top and has no top notch', () => {
  const path = hatPath(200, 60);
  assert.match(path, / C/);
  assert.equal(countOf(path, `l${SHAPE.slope} ${SHAPE.notchH} h`), 0);
  assert.equal(countOf(path, `l${-SHAPE.slope} ${SHAPE.notchH}`), 1, 'bottom tab');
  assert.match(path, / Z$/);
});

runTest('loopPath has head notch, mouth tab, mouth notch and foot tab', () => {
  const path = loopPath(180, 40, 30, 24);
  assert.ok(numbersIn(path).every(Number.isFinite));
  assert.equal(countOf(path, `l${SHAPE.slope} ${SHAPE.notchH} h`), 2, 'top notch + mouth-bottom notch');
  assert.equal(countOf(path, `l${-SHAPE.slope} ${SHAPE.notchH} h`), 2, 'mouth-top tab + foot tab');
  // Рука: вертикальний край на x = arm.
  assert.match(path, new RegExp(`V${40 + 30 - SHAPE.innerRadius}`));
});

runTest('loopPath grows with the mouth height', () => {
  const short = numbersIn(loopPath(180, 40, 24, 24));
  const tall = numbersIn(loopPath(180, 40, 124, 24));
  assert.ok(Math.max(...tall) > Math.max(...short));
});

// ── Контраст кольорів блоків (обидва варіанти) ───────────────────────────────

function luminance(hex) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

runTest('block text contrast is at least 4.5:1 in both colour variants', () => {
  const css = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');
  const [saturated, pastel] = css.split('body.blocks-pastel');
  assert.ok(pastel, 'pastel variant exists');
  for (const [label, source] of [['saturated', saturated], ['pastel', `${saturated}\n${pastel}`]]) {
    // Для пастельного варіанту пізніші оголошення перекривають попередні.
    for (const category of ['move', 'turn', 'pen', 'color', 'repeat', 'start']) {
      const read = (suffix) => {
        const matches = [...source.matchAll(new RegExp(`--blk-${category}-${suffix}:\\s*(#[0-9a-fA-F]{6})`, 'g'))];
        return matches.at(-1)?.[1];
      };
      const fill = read('fill');
      const text = read('text');
      assert.ok(fill && text, `${label}/${category}: tokens exist`);
      assert.ok(contrast(fill, text) >= 4.5, `${label}/${category}: ${contrast(fill, text).toFixed(2)}`);
    }
  }
});

runTest('no hardcoded colours in blocks.css', () => {
  const css = readFileSync(new URL('../css/blocks.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(css, /rgba?\(/);
});

runTest('blocks use createElement/textContent only (no innerHTML) in ui modules', () => {
  for (const file of ['blockView.js', 'workspaceView.js', 'dragdrop.js', 'popover.js', 'palette.js']) {
    const source = readFileSync(new URL(`../js/ui/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|dataTransfer/, file);
  }
});
