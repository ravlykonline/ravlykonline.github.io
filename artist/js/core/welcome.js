/**
 * Вітальний екран: коли його показувати й що малює демо. Чисті функції, без DOM.
 */
import { blk } from './blockTree.js';

/**
 * Демо-малюнок на вітальному екрані — будиночок. Навмисно не фігура з рівнів,
 * щоб не підказувати жодної відповіді. Виконується тим самим рушієм, що й гра.
 */
export const WELCOME_DEMO = Object.freeze({
  start: { x: -40, y: 45, heading: 0 },
  pen: { color: 'жовтогарячий', width: 4 },
  program: [
    ['forward', 60], ['right', 30], ['forward', 80], ['right', 120], ['forward', 80],
    ['right', 30], ['forward', 60], ['right', 90], ['forward', 80],
  ],
});

/** Програма демо як дерево блоків (нові об’єкти щоразу). */
export function welcomeDemoBlocks() {
  return WELCOME_DEMO.program.map(([type, n]) => blk(type, n));
}

/**
 * Вітання бачить лише новачок: без прогресу у вкладці, без посилання на конкретний
 * рівень (`?level=N` дає вчитель) і якщо в цій вкладці ще не натискали «Розпочати».
 */
export function shouldShowWelcome({ search = '', hasProgress = false, seen = false } = {}) {
  if (seen || hasProgress) return false;
  return !new URLSearchParams(search).has('level');
}
