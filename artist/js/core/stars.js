/** Зірки результату рівня. Чисті функції, без DOM. */
export const MAX_STARS = 3;

/** «★★☆» для n зірок з трьох. */
export function starsText(stars, max = MAX_STARS) {
  const filled = Math.max(0, Math.min(max, Math.round(stars)));
  return '★'.repeat(filled) + '☆'.repeat(max - filled);
}

/** Доступний опис для скрінрідера. */
export function starsLabel(stars, max = MAX_STARS) {
  return `Зірок: ${Math.max(0, Math.min(max, Math.round(stars)))} з ${max}`;
}

/** Підказка під зірками: як отримати більше. */
export function starsCaption(stars, blockCount, bestBlocks) {
  if (stars >= MAX_STARS) return 'Найкращий результат!';
  if (bestBlocks === undefined) return '';
  return `Блоків: ${blockCount}. Спробуй вкластися в ${bestBlocks + (stars === 2 ? 0 : 2)} — буде більше зірок.`;
}
