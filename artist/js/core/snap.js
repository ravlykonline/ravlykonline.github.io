/**
 * «Магнітне» зчеплення блоків: чиста математика без DOM.
 *
 * Точка зчеплення — місце, куди можна вставити хвіст (перетягнуті блоки):
 *   { owner, parentId, index, x, y, anchor }
 *  - (x, y) — де має опинитися верхній лівий кут першого вставленого блока;
 *  - anchor 'top'    — із цією точкою порівнюється верхній лівий кут хвоста
 *    (нижня виїмка попереднього блока, вхід у порожній цикл, місце під «коли ▶»);
 *  - anchor 'bottom' — із нею порівнюється нижній лівий кут хвоста: так хвіст
 *    приєднується ПЕРЕД верхнім блоком вільного стосу.
 *
 * Вибір точки — за відстанню в межах радіуса з гістерезисом: поки попередня
 * точка лишається майже такою ж близькою, як найкраща, вона не змінюється,
 * тому підказка не стрибає між двома сусідами.
 */

/** Радіус магніту в CSS-пікселях (миша / дотик). */
export const SNAP_RADIUS = 44;
export const SNAP_RADIUS_TOUCH = 48;
/** Наскільки попередня точка може бути гіршою за найкращу, не втрачаючи вибір. */
export const SNAP_HYSTERESIS = 10;

/** Стабільний ключ точки (для гістерезису й порівняння). */
export function snapKey(point) {
  if (!point) return '';
  return `${point.owner}|${point.parentId ?? ''}|${point.index}|${point.anchor ?? 'top'}`;
}

/**
 * Перетворює виміряні списки на точки зчеплення.
 * lists: [{ owner, parentId, looseRoot?, rect: { left, top }, kids: [{ left, top, bottom }] }]
 * Усі координати — в одній системі (вміст полотна).
 * looseRoot — верхній список вільного стосу: індекс 0 там «прикріплюється знизу».
 */
export function connectionPointsFromLists(lists) {
  const points = [];
  for (const list of lists) {
    const { owner, parentId = null, kids = [] } = list;
    if (kids.length === 0) {
      points.push({ owner, parentId, index: 0, x: list.rect.left, y: list.rect.top, anchor: 'top' });
      continue;
    }
    kids.forEach((kid, index) => {
      const anchor = index === 0 && list.looseRoot ? 'bottom' : 'top';
      points.push({ owner, parentId, index, x: kid.left, y: kid.top, anchor });
    });
    const last = kids[kids.length - 1];
    points.push({ owner, parentId, index: kids.length, x: last.left, y: last.bottom, anchor: 'top' });
  }
  return points;
}

/** Відстань від «кута» хвоста до точки: верхній або нижній лівий кут. */
export function snapDistance(point, drag) {
  const refY = point.anchor === 'bottom' ? drag.y + (drag.height ?? 0) : drag.y;
  return Math.hypot(point.x - drag.x, point.y - refY);
}

/**
 * Обирає точку зчеплення для хвоста.
 * drag: { x, y, height } — верхній лівий кут і сумарна висота хвоста.
 * options: { radius, hysteresis, previousKey, scale } — scale множить радіус
 * (масштаб сторінки/полотна). Повертає точку або null.
 */
export function findSnapTarget(points, drag, options = {}) {
  const {
    radius = SNAP_RADIUS, hysteresis = SNAP_HYSTERESIS, previousKey = '', scale = 1,
  } = options;
  const limit = radius * scale;
  const slack = hysteresis * scale;
  let best = null;
  let bestDistance = Infinity;
  let previous = null;
  let previousDistance = Infinity;
  for (const point of points) {
    const distance = snapDistance(point, drag);
    if (previousKey && snapKey(point) === previousKey) {
      previous = point;
      previousDistance = distance;
    }
    if (distance <= limit && distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  if (previous && previousDistance <= limit + slack
    && (best === null || previousDistance <= bestDistance + slack)) {
    return previous;
  }
  return best;
}
