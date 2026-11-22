import assert from 'node:assert/strict';

import { blk, countBlocksIn, withIds } from '../js/core/blockTree.js';
import { evaluateGoal } from '../js/core/goals.js';
import { getStepMarks, shouldShowStepMarks, getBestBlocks, getGhostSegments } from '../js/core/ghost.js';
import { lessons } from '../js/data/lessons.js';
import { runProgram } from '../js/runtime/runner.js';
import { appState, clearLevelMemory, markLessonDone, setLesson } from '../js/core/state.js';
import { mergeSegments } from '../js/core/goals.js';
import { pushSnapshot, undo, redo, clearHistory } from '../js/state/history.js';
import { createStepController } from '../js/runtime/stepController.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function play(lesson, tree) {
  const workspace = withIds(tree);
  const { segments } = runProgram(workspace, lesson);
  return evaluateGoal(lesson, {
    segments, workspace, expected: getGhostSegments(lesson), bestBlocks: getBestBlocks(lesson),
  });
}

const mapTree = (list, fn) => list.map((b) => {
  const mapped = fn(b);
  return mapped.blocks ? { ...mapped, blocks: mapTree(mapped.blocks, fn) } : mapped;
});
const NUMBER_BLOCKS = ['forward', 'back', 'right', 'left'];
const typesIn = (list) => list.flatMap((b) => [b.type, ...(b.blocks ? typesIn(b.blocks) : [])]);

// ── Структура курсу ───────────────────────────────────────────────────────────

runTest('course: 21 levels in 4 chapters of 5, 5, 7 and 4 levels, ids are sequential', () => {
  assert.equal(lessons.length, 21);
  const counts = {};
  const order = [];
  for (const lesson of lessons) {
    counts[lesson.chapter] = (counts[lesson.chapter] ?? 0) + 1;
    if (!order.includes(lesson.chapter)) order.push(lesson.chapter);
  }
  assert.deepEqual(order, ['Перші кроки', 'Повторення', 'Числа і кути', 'Кольори і творчість']);
  assert.deepEqual(order.map((c) => counts[c]), [5, 5, 7, 4]);
  lessons.forEach((lesson, index) => {
    assert.equal(lesson.id, `lesson-${String(index + 1).padStart(2, '0')}`);
    assert.ok(lesson.title.startsWith(`Рівень ${index + 1}:`), lesson.title);
  });
});

runTest('course: every level has required fields; non-free levels have a solution', () => {
  for (const lesson of lessons) {
    for (const field of ['id', 'chapter', 'title', 'instruction', 'start', 'pen', 'toolbox', 'success', 'successMessage']) {
      assert.ok(lesson[field] !== undefined, `${lesson.id}: ${field}`);
    }
    assert.ok([true, false, 'faint'].includes(lesson.showGrid), `${lesson.id}: showGrid`);
    if (lesson.success.mode !== 'free') assert.ok(lesson.solution?.length > 0, `${lesson.id}: solution`);
    assert.doesNotMatch(lesson.instruction, /[<>]/, `${lesson.id}: без HTML`);
  }
});

runTest('chapter 1: toolbox and solutions have no number blocks; grid is on', () => {
  for (const lesson of lessons.filter((l) => l.chapter === 'Перші кроки')) {
    assert.ok(lesson.toolbox.every((t) => !NUMBER_BLOCKS.includes(t) && t !== 'repeat'), `${lesson.id}: toolbox`);
    assert.ok(typesIn(lesson.solution).every((t) => !NUMBER_BLOCKS.includes(t)), `${lesson.id}: solution`);
    assert.equal(lesson.showGrid, true);
  }
});

runTest('chapter 2 introduces repeat; chapter 3 uses number blocks and the grid fades', () => {
  assert.ok(lessons.filter((l) => l.chapter === 'Повторення').every((l) => l.toolbox.includes('repeat')));
  for (const lesson of lessons.filter((l) => l.chapter === 'Числа і кути')) {
    assert.ok(lesson.toolbox.includes('forward'), lesson.id);
    assert.ok(!lesson.toolbox.includes('step'), lesson.id);
    assert.notEqual(lesson.showGrid, true, `${lesson.id}: сітка тьмяніє`);
  }
});

runTest('intros: have title and body, no HTML; code is plain text', () => {
  for (const lesson of lessons.filter((l) => l.intro)) {
    assert.ok(lesson.intro.title && lesson.intro.body, lesson.id);
    assert.doesNotMatch(`${lesson.intro.title}${lesson.intro.body}`, /<[a-z/]/i, lesson.id);
    assert.equal(Object.hasOwn(lesson.intro, 'code'), false, lesson.id);
  }
});

runTest('pedagogy: draw a triangle, debug it, then find a new angle independently', () => {
  const level13 = lessons[12];
  const level14 = lessons[13];
  const level15 = lessons[14];
  assert.match(level13.intro.body, /360 ÷/);
  assert.doesNotMatch(level13.intro.body, /120/);
  assert.ok(level14.startBlocks?.length);
  assert.equal(level15.intro, undefined);
  assert.doesNotMatch(level15.instruction, /\b60°|праворуч 60/);
});

// ── Приклади з «майже правильними» програмами ─────────────────────────────────

for (const lesson of lessons.filter((l) => l.success.mode === 'shape')) {
  runTest(`${lesson.id}: wrong turn direction, extra side and missing last side do not pass`, () => {
    const turns = typesIn(lesson.solution).some((t) => ['turn_right90', 'turn_left90', 'right', 'left'].includes(t));
    if (turns) {
      const flipped = mapTree(lesson.solution, (b) => {
        if (b.type === 'turn_right90') return { ...b, type: 'turn_left90' };
        if (b.type === 'turn_left90') return { ...b, type: 'turn_right90' };
        if (b.type === 'right') return { ...b, type: 'left' };
        if (b.type === 'left') return { ...b, type: 'right' };
        return b;
      });
      // Дзеркальна програма — інша фігура, окрім випадків, коли фігура симетрична (лише лінія).
      assert.equal(play(lesson, flipped).ok, false);
    }
    // зайва лінія
    const usesNumbers = typesIn(lesson.solution).some((t) => NUMBER_BLOCKS.includes(t));
    // зайвий рух на початку зсуває всю фігуру
    const extra = usesNumbers ? blk('forward', 70) : blk('step');
    assert.equal(play(lesson, [extra, ...lesson.solution]).ok, false);

    // програма без останнього блока, що малює (на верхньому рівні або всередині циклу)
    const dropLastDrawing = (list) => {
      const result = [...list];
      for (let i = result.length - 1; i >= 0; i -= 1) {
        const block = result[i];
        if (block.blocks) {
          result[i] = { ...block, blocks: dropLastDrawing(block.blocks) };
          return result;
        }
        if (['step', 'forward', 'back'].includes(block.type)) {
          result.splice(i, 1);
          return result;
        }
      }
      return result;
    };
    assert.equal(play(lesson, dropLastDrawing(lesson.solution)).ok, false);
  });
}

runTest('triangle, hexagon, star and circle reject common wrong angles', () => {
  const swapAngle = (lesson, n) => mapTree(lesson.solution, (b) => (b.type === 'right' ? { ...b, n } : b));
  assert.equal(play(lessons[12], swapAngle(lessons[12], 60)).ok, false);
  assert.equal(play(lessons[12], swapAngle(lessons[12], 90)).ok, false);
  assert.equal(play(lessons[14], swapAngle(lessons[14], 120)).ok, false);
  assert.equal(play(lessons[15], swapAngle(lessons[15], 72)).ok, false);
  assert.equal(play(lessons[16], swapAngle(lessons[16], 12)).ok, false);
});

runTest('a full turn with unit moves does not reproduce the specified circle', () => {
  const circle = lessons[16];
  const alternate = [blk('repeat', 360, [blk('forward', 1), blk('right', 1)])];
  assert.equal(play(circle, alternate).ok, false);
  assert.equal(play(circle, circle.solution).stars, 3);
});

runTest('level 18 checks colour; level 19 needs nested repeat; level 20 mixes colour and repeat; level 21 is free with 8 lines', () => {
  const level18 = lessons[17];
  assert.equal(level18.success.checkColor, true);
  const level19 = lessons[18];
  const flat = [blk('repeat', 6, [
    blk('forward', 60), blk('right', 90), blk('forward', 60), blk('right', 90),
    blk('forward', 60), blk('right', 90), blk('forward', 60), blk('right', 90), blk('right', 60),
  ])];
  const flatResult = play(level19, flat);
  assert.equal(flatResult.ok, false);
  assert.equal(flatResult.reason, 'requireNested');
  assert.equal(play(level19, level19.solution).stars, 3);
  const level20 = lessons[19];
  assert.equal(level20.success.checkColor, true);
  assert.deepEqual(level20.constraints.requireBlocks, ['repeat']);
  assert.equal(play(level20, level20.solution).stars, 3);
  const level21 = lessons[20];
  assert.deepEqual([level21.success.mode, level21.success.minSegments], ['free', 8]);
  assert.equal(level21.toolbox.length, 11);
});

runTest('best blocks come from the solution (3 stars on the solution, fewer for padded programs)', () => {
  for (const lesson of lessons.filter((l) => l.solution)) {
    assert.equal(getBestBlocks(lesson), countBlocksIn(lesson.solution));
    assert.equal(play(lesson, lesson.solution).stars, 3, lesson.id);
  }
  const level7 = lessons[6];
  assert.equal(getBestBlocks(level7), 4);
});

// ── Рівень 14: «Знайди помилку» ───────────────────────────────────────────────

runTest('level 14: startBlocks fail, the fixed program passes, workspace loads with fresh ids', () => {
  clearLevelMemory();
  const level = lessons[13];
  assert.ok(level.startBlocks?.length > 0);
  assert.equal(play(level, level.startBlocks).ok, false);
  const fixed = mapTree(level.startBlocks, (b) => (b.type === 'repeat' ? { ...b, n: 4 } : b));
  assert.equal(play(level, fixed).ok, true);
  assert.notEqual(lessons[12].solution[0].blocks[1].n, level.startBlocks[0].blocks[1].n, 'помилка не повторює рівень 13');

  setLesson(13);
  const first = appState.workspace;
  assert.equal(countBlocksIn(first), countBlocksIn(level.startBlocks));
  const ids = [];
  const collect = (list) => list.forEach((b) => { ids.push(b.id); if (b.blocks) collect(b.blocks); });
  collect(first);
  assert.ok(ids.every((id) => Number.isInteger(id)) && new Set(ids).size === ids.length);

  clearLevelMemory();
  setLesson(13);
  const secondIds = [];
  const collectSecond = (list) => list.forEach((b) => { secondIds.push(b.id); if (b.blocks) collectSecond(b.blocks); });
  collectSecond(appState.workspace);
  assert.ok(secondIds.every((id) => !ids.includes(id)), 'нове завантаження — нові id');
  assert.equal(level.startBlocks[0].id, undefined, 'шаблон рівня не мутується');
  setLesson(0);
});

runTest('level 14: the prefilled workspace works with undo/redo', () => {
  clearHistory();
  setLesson(13);
  const doc = () => ({ main: appState.workspace, loose: appState.loose });
  const before = doc();
  pushSnapshot(before);
  appState.workspace = [];
  const restored = undo({ main: appState.workspace, loose: appState.loose });
  assert.equal(restored.main.length, 1);
  assert.equal(restored.main[0].type, 'repeat');
  assert.equal(restored.main[0].blocks.length, 2);
  appState.workspace = restored.main;
  const again = redo({ main: appState.workspace, loose: appState.loose });
  assert.deepEqual(again.main, []);
  clearHistory();
  setLesson(0);
});

runTest('other levels start with an empty workspace', () => {
  clearLevelMemory();
  for (let i = 0; i < lessons.length; i += 1) {
    setLesson(i);
    assert.equal(appState.workspace.length > 0, i === 13, `рівень ${i + 1}`);
  }
  setLesson(0);
});

runTest('level memory: leaving a level keeps its program, returning restores a deep copy', () => {
  clearLevelMemory();
  setLesson(13);
  const edited = [blk('forward', 77)];
  appState.workspace = withIds(edited, 9000);
  appState.loose = [{ id: 9100, x: 10, y: 10, blocks: withIds([blk('step')], 9101) }];
  setLesson(2);
  assert.equal(appState.workspace.length, 0, 'інший рівень — свій (порожній) стос');
  setLesson(13);
  assert.equal(appState.workspace[0].n, 77);
  assert.equal(appState.loose.length, 1);
  // заміна вмісту не псує збережене
  appState.workspace[0].n = 5;
  setLesson(2);
  setLesson(13);
  assert.equal(appState.workspace[0].n, 5);
  clearLevelMemory();
  setLesson(13);
  assert.equal(appState.workspace.length, 1, 'без пам’яті — знову startBlocks');
  assert.equal(appState.workspace[0].type, 'repeat');
  clearLevelMemory();
  setLesson(0);
});

runTest('level 21 (free) counts real lines: one straight line or wall hugging is not many segments', () => {
  const free = lessons[20];
  const straight = Array.from({ length: 8 }, () => blk('forward', 10));
  assert.equal(play(free, straight).ok, false);
  assert.equal(mergeSegments(runProgram(withIds(straight), free).segments).length, 1);
  // 8 різних ліній — восьмикутник
  const octagon = Array.from({ length: 8 }, () => [blk('forward', 10), blk('right', 45)]).flat();
  assert.equal(play(free, octagon).ok, true);
  assert.equal(play(free, octagon.slice(2)).ok, false);
  // вперед — назад по тій самій лінії теж одна лінія
  const back = [blk('repeat', 8, [blk('forward', 10), blk('back', 10)])];
  assert.equal(play(free, back).ok, false);
});

runTest('session memory: best stars never decrease', () => {
  markLessonDone(2, 2);
  markLessonDone(2, 3);
  markLessonDone(2, 1);
  assert.equal(appState.bestStars.get(2), 3);
  assert.ok(appState.doneLessons.has(2));
  appState.bestStars.clear();
  appState.doneLessons.clear();
});

// ── Контролер кроків ──────────────────────────────────────────────────────────

/** Керований «рушій»: кожен крок — проміс, який завершується сам по собі або через finishNow. */
function createHarness(totalSteps) {
  const executed = [];
  let finishCurrent = null;
  let finishCalls = 0;
  let next = 0;
  const controller = createStepController({
    playStep: () => new Promise((resolve) => {
      if (next >= totalSteps) {
        resolve({ status: 'done' });
        return;
      }
      const index = next;
      next += 1;
      executed.push(index);
      finishCurrent = () => {
        finishCurrent = null;
        resolve({ status: next >= totalSteps ? 'done' : 'ok' });
      };
    }),
    finishNow: () => {
      finishCalls += 1;
      finishCurrent?.();
    },
  });
  return { controller, executed, get finishCalls() { return finishCalls; }, finish: () => finishCurrent?.() };
}

await runAsyncTest('stepController: 4 quick presses during animation execute 4 steps, none lost or doubled', async () => {
  const h = createHarness(10);
  const first = h.controller.pressStep();
  assert.ok(first instanceof Promise);
  for (let i = 0; i < 3; i += 1) assert.equal(h.controller.pressStep(), null);
  // анімація кожного кроку «триває», доки її не завершить натискання
  // анімації кроків 1–3 завершуються самі (тут — вручну), крок 0 уже доведено натисканням
  for (let i = 0; i < 20 && h.controller.busy; i += 1) {
    h.finish();
    await Promise.resolve();
  }
  const outcome = await first;
  assert.equal(outcome.status, 'ok');
  assert.deepEqual(h.executed, [0, 1, 2, 3]);
  assert.equal(h.controller.busy, false);
  assert.equal(h.controller.mode, 'idle');
});

await runAsyncTest('stepController: a press while idle runs exactly one step', async () => {
  const h = createHarness(10);
  const pending = h.controller.pressStep();
  assert.deepEqual(h.executed, [0]);
  h.finish();
  await pending;
  assert.deepEqual(h.executed, [0]);
  const second = h.controller.pressStep();
  h.finish();
  await second;
  assert.deepEqual(h.executed, [0, 1]);
});

await runAsyncTest('stepController: run pressed during a step finishes it and continues to the end', async () => {
  const h = createHarness(5);
  const first = h.controller.pressStep();
  assert.equal(h.controller.pressRun(), null);
  assert.equal(h.controller.mode, 'run');
  assert.equal(h.controller.pressStep(), null, 'крок під час запуску ігнорується');
  assert.equal(h.controller.pressRun(), null, 'повторний старт ігнорується');
  const drain = async () => {
    for (let i = 0; i < 20 && h.controller.busy; i += 1) {
      h.finish();
      await Promise.resolve();
    }
  };
  await drain();
  const outcome = await first;
  assert.equal(outcome.status, 'done');
  assert.deepEqual(h.executed, [0, 1, 2, 3, 4]);
});

await runAsyncTest('stepController: step presses stop at the end of the program', async () => {
  const h = createHarness(2);
  const first = h.controller.pressStep();
  h.controller.pressStep();
  h.controller.pressStep();
  await Promise.resolve();
  h.finish();
  const outcome = await first;
  assert.equal(outcome.status, 'done');
  assert.deepEqual(h.executed, [0, 1]);
  assert.equal(h.controller.pending, 0);
});

runTest('stepController: cancel drops queued presses', () => {
  const h = createHarness(5);
  h.controller.pressStep();
  h.controller.pressStep();
  assert.equal(h.controller.pending, 1);
  h.controller.cancel();
  assert.equal(h.controller.pending, 0);
  assert.equal(h.controller.mode, 'idle');
});

runTest('step marks: a dot at every step end, shared corners not duplicated', () => {
  const marks = getStepMarks([
    { from: [0, 0], to: [0, -100] },
    { from: [0, -100], to: [100, -100] },
  ]);
  assert.deepEqual(marks.map(([x, y]) => [Math.round(x), Math.round(y)]), [[0, 0], [0, -50], [0, -100], [50, -100], [100, -100]]);
  const odd = getStepMarks([{ from: [0, 0], to: [0, -60] }]);
  assert.equal(odd.length, 2, 'length not a multiple of the step: only the ends');
});

runTest('step marks are shown only on grid levels with a solution', () => {
  for (const lesson of lessons) {
    assert.equal(shouldShowStepMarks(lesson), lesson.showGrid === true && Boolean(lesson.solution), lesson.id);
  }
  assert.equal(shouldShowStepMarks(lessons[0]), true, 'level 1 shows step dots');
});

runTest('chapter 1 tasks state the goal; the step-by-step answer is in a hidden hint', () => {
  for (const lesson of lessons.filter((l) => l.chapter === lessons[0].chapter)) {
    assert.doesNotMatch(lesson.instruction, /крок(и|ів)? вперед|поворот (праворуч|ліворуч)/, `${lesson.id}: завдання не перелічує блоки`);
    assert.equal(typeof lesson.hint, 'string', `${lesson.id}: є підказка`);
  }
  for (const lesson of lessons.filter((l) => l.hint !== undefined)) {
    assert.ok(lesson.hint.length > 0, lesson.id);
    assert.doesNotMatch(lesson.hint, /[<>]/, `${lesson.id}: підказка без HTML`);
  }
});
