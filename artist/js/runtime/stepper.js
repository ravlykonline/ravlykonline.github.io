/**
 * Покроковий виконавець: обгортка над ледачим `runSteps`. Без DOM.
 *
 * Один виклик `next()` дає рівно один примітив. Заглядає на крок уперед, тому
 * `done` стає true одразу після виконання останнього примітива (кнопка «Крок»
 * знає, що програма закінчилась).
 */
import { runSteps } from './runner.js';

export function createStepper(blocks, lesson, options = {}) {
  const iterator = runSteps(blocks, lesson, options);
  let buffered = null; // { step } | { error } | null
  let finished = false;
  let executed = 0;

  function fetch() {
    try {
      const result = iterator.next();
      if (result.done) {
        buffered = null;
        finished = true;
      } else {
        buffered = { step: result.value };
      }
    } catch (error) {
      buffered = { error };
    }
  }

  fetch();

  return {
    /** Наступний примітив або null, якщо програма закінчилась. Кидає помилку рушія. */
    next() {
      if (buffered === null) return null;
      if (buffered.error) {
        const { error } = buffered;
        buffered = null;
        finished = true;
        throw error;
      }
      const { step } = buffered;
      executed += 1;
      fetch();
      return step;
    },
    get done() { return finished && buffered === null; },
    get executed() { return executed; },
  };
}
