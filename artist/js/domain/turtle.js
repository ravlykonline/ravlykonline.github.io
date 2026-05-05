/**
 * Turtle model для режиму малювання.
 * Координати в пікселях відносно центру canvas.
 * Heading: 0 = вгору, 90 = вправо, 180 = вниз, 270 = вліво.
 * Усі функції — чисті (pure), без DOM і side-effects.
 */

export function createTurtle(start = {}) {
  return {
    x: start.x ?? 0,
    y: start.y ?? 0,
    heading: start.heading ?? 0,
    penDown: start.penDown ?? true,
    color: start.color ?? 'var(--color-trail-orange)',
    strokeWidth: start.strokeWidth ?? 4,
  };
}

/**
 * Рухає черепаху вперед на steps пікселів у поточному напрямку.
 * Повертає новий стан черепахи та сегмент лінії (якщо перо опущено).
 *
 * @returns {{ turtle: Turtle, segment: Segment | null }}
 */
export function moveForward(turtle, steps) {
  const rad = (turtle.heading - 90) * (Math.PI / 180);
  const nx = turtle.x + steps * Math.cos(rad);
  const ny = turtle.y + steps * Math.sin(rad);

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
 * Повертає черепаху праворуч на degrees градусів.
 */
export function turnRight(turtle, degrees) {
  return { ...turtle, heading: (turtle.heading + degrees + 3600) % 360 };
}

/**
 * Повертає черепаху ліворуч на degrees градусів.
 */
export function turnLeft(turtle, degrees) {
  return { ...turtle, heading: (turtle.heading - degrees + 3600) % 360 };
}

/**
 * Піднімає перо — рух без малювання.
 */
export function penUp(turtle) {
  return { ...turtle, penDown: false };
}

/**
 * Опускає перо — рух з малюванням.
 */
export function penDown(turtle) {
  return { ...turtle, penDown: true };
}

/**
 * Змінює колір пера.
 */
export function setColor(turtle, color) {
  return { ...turtle, color };
}
