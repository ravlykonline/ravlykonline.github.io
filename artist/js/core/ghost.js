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
