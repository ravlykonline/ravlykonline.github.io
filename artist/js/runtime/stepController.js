/**
 * Керування натисканнями «Крок» / «Старт» / «Далі» під час анімації. Без DOM.
 *
 * Правило: натискання під час анімації кроку негайно ДОВОДИТЬ поточний крок до кінця
 * (`finishNow`) і лише потім виконує наступний. Жодне натискання не губиться, жоден
 * крок не виконується двічі: одночасно працює лише один цикл `pump`.
 *
 * @param {{ playStep: () => Promise<{status: string}>, finishNow: () => void }} deps
 *   playStep — виконує й показує рівно один примітив (status 'ok' = можна далі);
 *   finishNow — миттєво завершує анімацію поточного кроку (якщо вона триває).
 */
export function createStepController({ playStep, finishNow }) {
  let mode = 'idle'; // 'idle' | 'step' | 'run'
  let pending = 0; // скільки кроків ще треба виконати
  let busy = false;

  async function pump() {
    busy = true;
    let outcome = { status: 'ok' };
    while (outcome.status === 'ok' && (mode === 'run' || pending > 0)) {
      if (mode !== 'run') pending -= 1;
      outcome = await playStep();
    }
    busy = false;
    pending = 0;
    mode = 'idle';
    return outcome;
  }

  /** Повертає проміжок виконання для того, хто запустив цикл, і null для «приєднаних» натискань. */
  function start() {
    if (busy) {
      finishNow();
      return null;
    }
    return pump();
  }

  return {
    get busy() { return busy; },
    get mode() { return mode; },
    get pending() { return pending; },
    /** «Крок». Ігнорується лише під час безперервного запуску. */
    pressStep() {
      if (mode === 'run') return null;
      mode = 'step';
      pending += 1;
      return start();
    },
    /** «Старт» / «Далі»: виконує програму до кінця. Під час кроку — доводить його й продовжує. */
    pressRun() {
      if (mode === 'run') return null;
      mode = 'run';
      return start();
    },
    /** Зупинка: нові кроки не починаються; поточну анімацію скасовує сеанс. */
    cancel() {
      pending = 0;
      mode = 'idle';
    },
  };
}
