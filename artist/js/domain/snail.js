/**
 * Чиста логіка відображення равлика й анімації кроку. Без DOM.
 * Координати — логічні одиниці поля (viewBox -200 -150 400 300); масштаб екрана
 * на логіку не впливає.
 */

import { FIELD_HALF_HEIGHT, FIELD_HALF_WIDTH } from '../core/constants.js';

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

/** Швидкість показу: множник тривалості анімації. */
export const SPEEDS = {
  slow: { label: 'повільно', factor: 2 },
  normal: { label: 'звичайно', factor: 1 },
  fast: { label: 'швидко', factor: 0.35 },
};
export const DEFAULT_SPEED = 'normal';

export function speedFactor(speed) {
  return (SPEEDS[speed] ?? SPEEDS[DEFAULT_SPEED]).factor;
}

/**
 * Тривалість анімації кроку (мс): рух ~250 мс на 50 одиниць, поворот ~200 мс на 90°.
 * `factor` — множник швидкості (див. SPEEDS). Режим «менше руху» вирішує викликач.
 */
export function getStepDuration(before, after, factor = 1) {
  const distance = Math.hypot(after.x - before.x, after.y - before.y);
  let base = MS_PER_INSTANT_STEP;
  if (distance > 0) {
    base = (distance / 50) * MS_PER_50_UNITS;
  } else {
    const turn = Math.abs(headingDelta(before.heading, after.heading));
    if (turn > 0) base = (turn / 90) * MS_PER_QUARTER_TURN;
  }
  return base * factor;
}

// Наближена область, яку займає тіло у двох віддзеркалених позах SVG.
const BODY_OFFSET = 27;
const BODY_RADIUS = 20;

function distanceToSegment(x, y, { from: [ax, ay], to: [bx, by] }) {
  const dx = bx - ax;
  const dy = by - ay;
  const projection = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1);
  const t = Math.max(0, Math.min(1, projection));
  return Math.hypot(x - ax - dx * t, y - ay - dy * t);
}

function poseCost(turtle, side, routes) {
  const heading = turtle.heading * Math.PI / 180;
  const x = turtle.x + side * BODY_OFFSET * Math.cos(heading);
  const y = turtle.y + side * BODY_OFFSET * Math.sin(heading);
  const outside = Math.max(0, Math.abs(x) + BODY_RADIUS - FIELD_HALF_WIDTH)
    + Math.max(0, Math.abs(y) + BODY_RADIUS - FIELD_HALF_HEIGHT);
  let overlap = 0;
  for (const route of routes) {
    for (const segment of route) {
      overlap = Math.max(overlap, BODY_RADIUS - distanceToSegment(x, y, segment));
    }
  }
  return outside * 2 + overlap;
}

/** Вибирає бік на весь крок, щоб равлик не міняв позу посеред анімації. */
export function chooseSnailSide(before, after, routes, preferred = 1) {
  const poses = [before, interpolateTurtle(before, after, 0.5), after];
  const cost = (side) => Math.max(...poses.map((pose) => poseCost(pose, side, routes)));
  const other = -preferred;
  return cost(other) + 3 < cost(preferred) ? other : preferred;
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
