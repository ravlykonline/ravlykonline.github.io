/**
 * Текстові описи для екранних читачів: де равлик і яку фігуру треба намалювати.
 * Чисті функції без DOM. Координати — ігрові (вісь y вниз), напрямок 0° — вгору.
 */
import { colorName } from '../data/colors.js';

const HEADING_WORDS = [
  'вгору',
  'вгору й праворуч',
  'праворуч',
  'вниз і праворуч',
  'вниз',
  'вниз і ліворуч',
  'ліворуч',
  'вгору й ліворуч',
];

const MAX_DESCRIBED_STEPS = 10;

function normalizeHeading(heading) {
  return ((heading % 360) + 360) % 360;
}

/** Напрямок словами; нестандартні кути — числом. */
export function describeHeading(heading) {
  const normalized = normalizeHeading(heading);
  const index = Math.round(normalized / 45) % 8;
  if (Math.abs(normalized - Math.round(normalized / 45) * 45) < 1) return HEADING_WORDS[index];
  return `під кутом ${Math.round(normalized)}° від напрямку вгору за годинниковою стрілкою`;
}

/** «Равлик у точці x, y, дивиться праворуч, олівець опущено». */
export function describeTurtleStatus(turtle) {
  const x = Math.round(turtle.x);
  const y = Math.round(turtle.y);
  return `Равлик у точці ${x}, ${y}, дивиться ${describeHeading(turtle.heading)}, олівець ${turtle.penDown ? 'опущено' : 'піднято'}`;
}

function segmentWord(segment) {
  const dx = segment.to[0] - segment.from[0];
  const dy = segment.to[1] - segment.from[1];
  const heading = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return { word: describeHeading(heading), length: Math.hypot(dx, dy) };
}

function samePoint(a, b) {
  return Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) < 0.5;
}

/**
 * Опис ghost-фігури: послідовність відрізків від старту, сусідні однонапрямні
 * зливаються; для складних фігур — короткий підсумок.
 */
export function describeGhost(segments, start = {}, { withColors = false } = {}) {
  if (!segments || segments.length === 0) return '';
  const sx = start.x ?? 0;
  const sy = start.y ?? 0;
  const steps = [];
  let position = [sx, sy];
  for (const segment of segments) {
    if (!samePoint(segment.from, position)) steps.push({ jump: true });
    const { word, length } = segmentWord(segment);
    const color = withColors ? colorName(segment.color) : null;
    const last = steps[steps.length - 1];
    if (last && !last.jump && last.word === word && last.color === color) {
      last.length += length;
    } else {
      steps.push({ word, length, color });
    }
    position = segment.to;
  }

  const intro = `Пунктирна фігура на полі. Старт у точці ${Math.round(sx)}, ${Math.round(sy)} (y рахується вниз).`;
  if (steps.length <= MAX_DESCRIBED_STEPS) {
    const parts = steps.map((step) => {
      if (step.jump) return 'олівець піднято, перехід';
      const base = `${step.word} на ${Math.round(step.length)}`;
      return step.color ? `${base}, колір ${step.color}` : base;
    });
    return `${intro} Лінії по черзі: ${parts.join('; ')}.`;
  }
  const xs = segments.flatMap((segment) => [segment.from[0], segment.to[0]]);
  const ys = segments.flatMap((segment) => [segment.from[1], segment.to[1]]);
  const width = Math.round(Math.max(...xs) - Math.min(...xs));
  const height = Math.round(Math.max(...ys) - Math.min(...ys));
  return `${intro} Складна фігура з ${segments.length} ліній, приблизно ${width} на ${height}.`;
}
