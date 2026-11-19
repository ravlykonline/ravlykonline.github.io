/**
 * Turtle model для режиму малювання.
 * Координати в логічних одиницях відносно центру поля (400 × 300), вісь y вниз.
 * Heading: 0 = вгору, 90 = праворуч, 180 = вниз, 270 = ліворуч.
 * Усі функції — чисті (pure), без DOM і side-effects.
 */
import { FIELD_HALF_HEIGHT, FIELD_HALF_WIDTH } from '../core/constants.js';
import { colorHex } from '../data/colors.js';

export const DEFAULT_PEN = Object.freeze({ color: 'жовтогарячий', width: 4 });

export function createTurtle(start = {}) {
  return {
    x: start.x ?? 0,
    y: start.y ?? 0,
    heading: start.heading ?? 0,
    penDown: start.penDown ?? true,
    color: start.color ?? colorHex(DEFAULT_PEN.color),
    strokeWidth: start.strokeWidth ?? DEFAULT_PEN.width,
  };
}

/** Початковий стан черепахи для рівня: `lesson.start` + `lesson.pen`. */
export function createTurtleForLesson(lesson) {
  const pen = { ...DEFAULT_PEN, ...(lesson.pen ?? {}) };
  return createTurtle({
    x: lesson.start?.x ?? 0,
    y: lesson.start?.y ?? 0,
    heading: lesson.start?.heading ?? 0,
    color: colorHex(pen.color),
    strokeWidth: pen.width,
  });
}

function clamp(value, limit) {
  return Math.max(-limit, Math.min(limit, value));
}

/** Обмежує точку межами поля (так само, як РАВЛИК обмежує межами полотна). */
export function clampToField(x, y) {
  return [clamp(x, FIELD_HALF_WIDTH), clamp(y, FIELD_HALF_HEIGHT)];
}

function travel(turtle, distance) {
  const rad = (turtle.heading - 90) * (Math.PI / 180);
  const [nx, ny] = clampToField(
    turtle.x + distance * Math.cos(rad),
    turtle.y + distance * Math.sin(rad),
  );

  const segment = turtle.penDown
    ? {
        from: [turtle.x, turtle.y],
        to: [nx, ny],
        color: turtle.color,
        width: turtle.strokeWidth,
      }
    : null;

  return {
    turtle: { ...turtle, x: nx, y: ny },
    segment,
  };
}

/**
 * Рухає черепаху вперед на steps одиниць у поточному напрямку.
 * Повертає новий стан черепахи та сегмент лінії (якщо перо опущено).
 *
 * @returns {{ turtle: object, segment: object | null }}
 */
export function moveForward(turtle, steps) {
  return travel(turtle, steps);
}

/** Рухає черепаху назад (напрямок не змінюється). */
export function moveBack(turtle, steps) {
  return travel(turtle, -steps);
}

function normalizeHeading(value) {
  return ((value % 360) + 360) % 360;
}

/** Повертає черепаху праворуч на degrees градусів. */
export function turnRight(turtle, degrees) {
  return { ...turtle, heading: normalizeHeading(turtle.heading + degrees) };
}

/** Повертає черепаху ліворуч на degrees градусів. */
export function turnLeft(turtle, degrees) {
  return { ...turtle, heading: normalizeHeading(turtle.heading - degrees) };
}

/** Піднімає перо — рух без малювання. */
export function penUp(turtle) {
  return { ...turtle, penDown: false };
}

/** Опускає перо — рух з малюванням. */
export function penDown(turtle) {
  return { ...turtle, penDown: true };
}

/** Змінює колір пера (hex). */
export function setColor(turtle, color) {
  return { ...turtle, color };
}
