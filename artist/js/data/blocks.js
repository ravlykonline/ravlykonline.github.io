/**
 * Визначення всіх блоків — grid і turtle.
 *
 * Поля:
 *   label       — назва в UI (українська)
 *   className   — CSS-клас
 *   icon        — символ
 *   code        — рядок для codegen (мова РАВЛИК)
 *   paramKey    — ключ параметра в об'єкті блоку (якщо є)
 *   paramLabel  — підпис поряд з input
 *   paramDefault, paramMin, paramMax — обмеження числового параметра
 */
export const blockDefinitions = {
  // ── Grid-блоки ───────────────────────────────────────────────────────────
  move_n: { label: 'вгору',   className: 'move', icon: '↑', code: 'рухатися(вгору)'  },
  move_s: { label: 'вниз',    className: 'move', icon: '↓', code: 'рухатися(вниз)'  },
  move_e: { label: 'вправо',  className: 'move', icon: '→', code: 'рухатися(вправо)' },
  move_w: { label: 'вліво',   className: 'move', icon: '←', code: 'рухатися(вліво)'  },

  // ── Turtle-блоки (команди мови РАВЛИК) ───────────────────────────────────
  turtle_forward: {
    label: 'вперед',
    className: 'move turtle',
    icon: '↑',
    code: 'вперед',
    paramKey: 'steps',
    paramLabel: 'кроків',
    paramDefault: 50,
    paramMin: 1,
    paramMax: 500,
  },
  turtle_right: {
    label: 'праворуч',
    className: 'turn turtle',
    icon: '↻',
    code: 'праворуч',
    paramKey: 'degrees',
    paramLabel: '°',
    paramDefault: 90,
    paramMin: 1,
    paramMax: 360,
  },
  turtle_left: {
    label: 'ліворуч',
    className: 'turn turtle',
    icon: '↺',
    code: 'ліворуч',
    paramKey: 'degrees',
    paramLabel: '°',
    paramDefault: 90,
    paramMin: 1,
    paramMax: 360,
  },
  turtle_pen_up: {
    label: 'підняти',
    className: 'pen turtle',
    icon: '⬆',
    code: 'підняти',
  },
  turtle_pen_down: {
    label: 'опустити',
    className: 'pen turtle',
    icon: '⬇',
    code: 'опустити',
  },

  // ── Спільне ──────────────────────────────────────────────────────────────
  repeat: {
    label: 'повторити',
    className: 'repeat',
    icon: '↻',
    code: 'повторити',
  },
};
