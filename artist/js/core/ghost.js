import { withIds, countBlocksIn } from './blockTree.js';
import { runProgram } from '../runtime/runner.js';

const cache = new WeakMap();

/** Еталонні відрізки рівня: будуються рушієм із `lesson.solution`. Для вільних рівнів — []. */
export function getGhostSegments(lesson) {
  if (!lesson.solution) return [];
  if (!cache.has(lesson)) {
    cache.set(lesson, runProgram(withIds(lesson.solution), lesson).segments);
  }
  return cache.get(lesson);
}

/** Кількість блоків еталонного розв’язку (за замовчуванням bestBlocks). */
export function getBestBlocks(lesson) {
  if (lesson.constraints?.bestBlocks !== undefined) return lesson.constraints.bestBlocks;
  return lesson.solution ? countBlocksIn(lesson.solution) : undefined;
}

/** Довжина одного «кроку вперед» в одиницях поля. */
export const STEP_LENGTH = 50;

/**
 * Крапки на пунктирі там, де закінчується кожен крок: кінці відрізків і кожні
 * STEP_LENGTH одиниць уздовж них. Так дитина бачить, скільки «кроків вперед»
 * у кожній лінії. Точки, що збігаються (кути фігури), не дублюються.
 * Відрізки, довжина яких не кратна кроку, отримують лише крапки на кінцях.
 */
export function getStepMarks(segments, step = STEP_LENGTH) {
  const marks = [];
  const seen = new Set();
  const add = (x, y) => {
    const key = `${Math.round(x)},${Math.round(y)}`;
    if (seen.has(key)) return;
    seen.add(key);
    marks.push([x, y]);
  };
  for (const { from, to } of segments) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    const steps = Math.round(length / step);
    const evenSteps = steps > 0 && Math.abs(steps * step - length) < 0.5;
    const count = evenSteps ? steps : 1;
    for (let i = 0; i <= count; i += 1) {
      add(from[0] + (dx * i) / count, from[1] + (dy * i) / count);
    }
  }
  return marks;
}

/** Крапки-кроки показуємо на рівнях із сіткою (розділи, де працює блок «крок вперед»). */
export function shouldShowStepMarks(lesson) {
  return lesson.showGrid === true && Boolean(lesson.solution);
}
