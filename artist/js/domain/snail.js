/**
 * Чиста логіка відображення равлика й анімації кроку. Без DOM.
 * Координати — логічні одиниці поля (viewBox -200 -150 400 300); масштаб екрана
 * на логіку не впливає.
 */

export const MS_PER_50_UNITS = 250;
export const MS_PER_QUARTER_TURN = 200;
export const MS_PER_INSTANT_STEP = 90;
export const REDUCED_MOTION_STEP_PAUSE_MS = 120;

function round(value) {
  return Math.round(value * 1000) / 1000;
}

/** SVG-transform равлика: кінчик олівця в (x, y), голова дивиться за heading (0 = вгору). */
export function getSnailTransform(turtle) {
  return `translate(${round(turtle.x)} ${round(turtle.y)}) rotate(${round(turtle.heading)})`;
}

/** Найкоротша різниця кутів у діапазоні (-180, 180]. */
export function headingDelta(from, to) {
  let delta = (to - from) % 360;
  if (delta > 180) delta -= 360;
  if (delta <= -180) delta += 360;
  return delta;
}

/** Тривалість анімації кроку (мс): рух ~250 мс на 50 одиниць, поворот ~200 мс на 90°. */
export function getStepDuration(before, after) {
  const distance = Math.hypot(after.x - before.x, after.y - before.y);
  if (distance > 0) return (distance / 50) * MS_PER_50_UNITS;
  const turn = Math.abs(headingDelta(before.heading, after.heading));
  if (turn > 0) return (turn / 90) * MS_PER_QUARTER_TURN;
  return MS_PER_INSTANT_STEP;
}

/** Проміжний стан черепахи між before і after, t ∈ [0, 1]. Колір і перо змінюються в кінці. */
export function interpolateTurtle(before, after, t) {
  const k = Math.max(0, Math.min(1, t));
  if (k >= 1) return after;
  return {
    ...before,
    x: before.x + (after.x - before.x) * k,
    y: before.y + (after.y - before.y) * k,
    heading: before.heading + headingDelta(before.heading, after.heading) * k,
  };
}
