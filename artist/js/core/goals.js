/**
 * Перевірка цілі рівня. Чисті функції, без DOM.
 *
 * Режими `lesson.success.mode`:
 *   shape — намальовані відрізки збігаються з еталоном (як множина неорієнтованих відрізків);
 *   free  — намальовано щонайменше `minSegments` відрізків.
 *
 * Порівняння фігур: відрізки спершу зводяться до канонічного вигляду — усі
 * колінеарні відрізки, що торкаються або перекриваються (і мають однаковий колір,
 * якщо `checkColor`), зливаються в один максимальний відрізок. Тому
 * `вперед 50; вперед 50` дорівнює `вперед 100`, а порядок і розбиття не важливі.
 * Потім кожен еталонний відрізок має знайти пару серед намальованих (кінці
 * збігаються з допуском 2 одиниці в будь-якому напрямку) і навпаки.
 */
import { containsBlockType, countBlocksIn } from './blockTree.js';

export const TOLERANCE = 2;
const MIN_SEGMENT_LENGTH = 0.01;
const COLLINEAR_TOLERANCE = 0.5;

const MESSAGES = {
  missing: 'Не вистачає частини малюнка — подивись на пунктир.',
  extra: 'Є зайві лінії. Подивись на пунктир.',
  almost: 'Майже! Перевір кути повороту.',
  colors: 'Фігура правильна, але колір ліній не той. Перевір блоки «колір».',
  empty: 'Равлик ще нічого не намалював. Додай команди й натисни «Запустити».',
};

function pointDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function segmentLength(segment) {
  return pointDistance(segment.from, segment.to);
}

function distanceToLine(point, a, b) {
  const length = pointDistance(a, b);
  return Math.abs((b[0] - a[0]) * (a[1] - point[1]) - (a[0] - point[0]) * (b[1] - a[1])) / length;
}

function projectOn(point, origin, unit) {
  return (point[0] - origin[0]) * unit[0] + (point[1] - origin[1]) * unit[1];
}

/** Зливає два колінеарні відрізки, що торкаються/перекриваються; інакше null. */
function tryMerge(first, second, checkColor) {
  if (checkColor && first.color !== second.color) return null;
  const length = segmentLength(first);
  if (length < MIN_SEGMENT_LENGTH) return null;

  if (distanceToLine(second.from, first.from, first.to) > COLLINEAR_TOLERANCE
    || distanceToLine(second.to, first.from, first.to) > COLLINEAR_TOLERANCE) {
    return null;
  }

  const unit = [(first.to[0] - first.from[0]) / length, (first.to[1] - first.from[1]) / length];
  const a0 = 0;
  const a1 = length;
  const b0 = projectOn(second.from, first.from, unit);
  const b1 = projectOn(second.to, first.from, unit);
  const bMin = Math.min(b0, b1);
  const bMax = Math.max(b0, b1);

  if (bMin > a1 + TOLERANCE * 0.5 || bMax < a0 - TOLERANCE * 0.5) return null;

  const start = Math.min(a0, bMin);
  const end = Math.max(a1, bMax);
  return {
    from: [first.from[0] + unit[0] * start, first.from[1] + unit[1] * start],
    to: [first.from[0] + unit[0] * end, first.from[1] + unit[1] * end],
    color: first.color,
  };
}

export function mergeSegments(segments, { checkColor = false } = {}) {
  const pool = segments
    .map((segment) => ({ from: [...segment.from], to: [...segment.to], color: segment.color }))
    .filter((segment) => segmentLength(segment) >= MIN_SEGMENT_LENGTH);

  let changed = true;
  while (changed) {
    changed = false;
    outer:
    for (let i = 0; i < pool.length; i += 1) {
      for (let j = i + 1; j < pool.length; j += 1) {
        const merged = tryMerge(pool[i], pool[j], checkColor);
        if (merged) {
          pool[i] = merged;
          pool.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }
  return pool;
}

function endpointsMatch(a, b, checkColor) {
  if (checkColor && a.color !== b.color) return false;
  const straight = pointDistance(a.from, b.from) <= TOLERANCE && pointDistance(a.to, b.to) <= TOLERANCE;
  const flipped = pointDistance(a.from, b.to) <= TOLERANCE && pointDistance(a.to, b.from) <= TOLERANCE;
  return straight || flipped;
}

/**
 * Порівнює намальовані відрізки з еталоном.
 * @returns {{ ok: boolean, reason?: 'missing'|'extra'|'almost'|'colors'|'empty', message?: string }}
 */
export function compareShapes(actual, expected, { checkColor = false } = {}) {
  const drawn = mergeSegments(actual, { checkColor });
  const target = mergeSegments(expected, { checkColor });

  if (drawn.length === 0) return { ok: false, reason: 'empty', message: MESSAGES.empty };

  const used = new Set();
  let unmatchedTarget = 0;
  for (const wanted of target) {
    const index = drawn.findIndex((candidate, i) => !used.has(i) && endpointsMatch(candidate, wanted, checkColor));
    if (index === -1) unmatchedTarget += 1;
    else used.add(index);
  }
  const unmatchedDrawn = drawn.length - used.size;

  if (unmatchedTarget === 0 && unmatchedDrawn === 0) return { ok: true };

  if (checkColor) {
    // Та сама фігура без урахування кольору?
    const shapeOnly = compareShapes(actual, expected, { checkColor: false });
    if (shapeOnly.ok) return { ok: false, reason: 'colors', message: MESSAGES.colors };
  }

  if (unmatchedTarget > 0 && unmatchedDrawn > 0 && drawn.length === target.length) {
    return { ok: false, reason: 'almost', message: MESSAGES.almost };
  }
  if (unmatchedTarget > 0) return { ok: false, reason: 'missing', message: MESSAGES.missing };
  return { ok: false, reason: 'extra', message: MESSAGES.extra };
}

export function getStars(blockCount, bestBlocks) {
  if (blockCount <= bestBlocks) return 3;
  if (blockCount <= bestBlocks + 2) return 2;
  return 1;
}

/**
 * @param {object} lesson
 * @param {{ segments: object[], workspace: object[], expected?: object[], bestBlocks?: number }} run
 *   expected — відрізки еталона (будуються з `lesson.solution` рушієм);
 *   bestBlocks — кількість блоків еталонного розв’язку (за замовчуванням для зірок).
 * @returns {{ ok: boolean, message: string, stars?: number, reason?: string }}
 */
export function evaluateGoal(lesson, run) {
  const { segments, workspace } = run;
  const success = lesson.success ?? {};

  if (success.mode === 'free') {
    const minimum = success.minSegments ?? 1;
    if (segments.length >= minimum) {
      return { ok: true, message: lesson.successMessage, stars: 3 };
    }
    return {
      ok: false,
      reason: 'missing',
      message: `Равлик намалював лише ${segments.length}, а треба щонайменше ${minimum} відрізків. Додай більше команд.`,
    };
  }

  if (success.mode === 'shape') {
    const comparison = compareShapes(segments, run.expected ?? [], { checkColor: Boolean(success.checkColor) });
    if (!comparison.ok) return comparison;

    for (const type of lesson.constraints?.requireBlocks ?? []) {
      if (!containsBlockType(workspace, type)) {
        return {
          ok: false,
          reason: 'requireBlocks',
          message: 'Фігура правильна! А тепер зроби її з блоком «повторити».',
        };
      }
    }

    const best = lesson.constraints?.bestBlocks ?? run.bestBlocks ?? countBlocksIn(workspace);
    return { ok: true, message: lesson.successMessage, stars: getStars(countBlocksIn(workspace), best) };
  }

  return { ok: false, message: 'Невідомий режим перевірки.' };
}
