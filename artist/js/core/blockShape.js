/**
 * Геометрія «пазлів»: чисті функції, що повертають значення атрибута `d`
 * для SVG-контуру блока за виміряними розмірами. Без DOM.
 *
 * Правила форми (всі розміри в px):
 *  - зверху — виріз (notch) шириною NOTCH_W і глибиною NOTCH_H;
 *  - знизу — виступ (tab) такої самої форми, що виступає за нижню межу
 *    на NOTCH_H і заходить у виріз наступного блока;
 *  - hat-блок має заокруглений верх і не має верхнього вирізу;
 *  - C-блок «повторити» = шапка + ліва «рука» + «рот» + підошва в одному контурі.
 */
export const SHAPE = Object.freeze({
  radius: 4,
  notchX: 16,
  notchW: 24,
  notchH: 5,
  slope: 4,
  hatCap: 22,
  hatDomeW: 112,
  arm: 16,
  innerRadius: 3,
  minWidth: 48,
});

const { radius: R, notchX: NX, notchW: NW, notchH: NH, slope: S } = SHAPE;

function num(value) {
  return Math.round(value * 100) / 100;
}

function notchDown(x) {
  // Виріз усередину блока: рухаємося вправо.
  return `H${num(x)} l${S} ${NH} h${NW - 2 * S} l${S} ${-NH}`;
}

function tabDown(x) {
  // Виступ назовні (вниз): рухаємося вліво від x + NW до x.
  return `H${num(x + NW)} l${-S} ${NH} h${-(NW - 2 * S)} l${-S} ${-NH}`;
}

function size(value, min) {
  return Number.isFinite(value) ? Math.max(min, value) : min;
}

/** Звичайний блок-«команда». */
export function stackPath(width, height, { notchTop = true, tabBottom = true } = {}) {
  const w = size(width, SHAPE.minWidth);
  const h = size(height, 2 * R + 2);
  const parts = [`M${R} 0`];
  parts.push(notchTop ? notchDown(NX) : '');
  parts.push(
    `H${num(w - R)} a${R} ${R} 0 0 1 ${R} ${R}`,
    `V${num(h - R)} a${R} ${R} 0 0 1 ${-R} ${R}`,
    tabBottom ? tabDown(NX) : '',
    `H${R} a${R} ${R} 0 0 1 ${-R} ${-R}`,
    `V${R} a${R} ${R} 0 0 1 ${R} ${-R} Z`,
  );
  return parts.filter(Boolean).join(' ');
}

/** Стартовий блок із заокругленим верхом. `height` включає шапку-«купол». */
export function hatPath(width, height) {
  const w = size(width, SHAPE.hatDomeW + 2 * R);
  const h = size(height, SHAPE.hatCap + 2 * R + 2);
  const cap = SHAPE.hatCap;
  const dome = SHAPE.hatDomeW;
  return [
    `M0 ${cap}`,
    `C${dome * 0.12} ${cap * 0.28} ${dome * 0.36} 0 ${dome * 0.56} 0`,
    `C${dome * 0.82} 0 ${dome * 0.95} ${cap * 0.4} ${dome} ${cap}`,
    `H${num(w - R)} a${R} ${R} 0 0 1 ${R} ${R}`,
    `V${num(h - R)} a${R} ${R} 0 0 1 ${-R} ${R}`,
    tabDown(NX),
    `H${R} a${R} ${R} 0 0 1 ${-R} ${-R}`,
    `V${cap} Z`,
  ].join(' ');
}

/**
 * C-блок. `width` — ширина шапки й підошви; `mouthHeight` — висота «рота»
 * (вкладені блоки), `arm` — ширина лівої «руки».
 */
export function loopPath(width, headHeight, mouthHeight, footHeight, arm = SHAPE.arm) {
  const w = size(width, SHAPE.minWidth + arm);
  const head = size(headHeight, 2 * R + 2);
  const mouth = size(mouthHeight, 8);
  const foot = size(footHeight, 2 * R + 2);
  const ri = SHAPE.innerRadius;
  const mouthEnd = head + mouth;
  const total = mouthEnd + foot;
  return [
    `M${R} 0`,
    notchDown(NX),
    `H${num(w - R)} a${R} ${R} 0 0 1 ${R} ${R}`,
    `V${num(head - R)} a${R} ${R} 0 0 1 ${-R} ${R}`,
    // верхній край «рота»: виступ, у який входить виріз першого вкладеного блока
    tabDown(arm + NX),
    `H${arm + ri} a${ri} ${ri} 0 0 0 ${-ri} ${ri}`,
    `V${num(mouthEnd - ri)} a${ri} ${ri} 0 0 0 ${ri} ${ri}`,
    // нижній край «рота»: виріз, у який входить виступ останнього вкладеного
    notchDown(arm + NX),
    `H${num(w - R)} a${R} ${R} 0 0 1 ${R} ${R}`,
    `V${num(total - R)} a${R} ${R} 0 0 1 ${-R} ${R}`,
    tabDown(NX),
    `H${R} a${R} ${R} 0 0 1 ${-R} ${-R}`,
    `V${R} a${R} ${R} 0 0 1 ${R} ${-R} Z`,
  ].join(' ');
}
