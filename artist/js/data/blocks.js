/**
 * Визначення блоків.
 *
 * Поля:
 *   label       — назва в UI (українська)
 *   category    — move | turn | pen | color | repeat
 *   className   — CSS-клас
 *   icon        — символ
 *   param       — опис параметра: { kind: 'number', key, label, default, min, max }
 *                 або { kind: 'color', key, default }; без поля — блок без параметра
 *   code(block) — рядок коду РАВЛИК (для repeat — заголовок «повторити N (»,
 *                 закриваюча «)» додається в codegen). Тільки валідний РАВЛИК.
 */
export const MAX_REPEAT_COUNT = 36;

const numberParam = (label, defaultValue, min, max) => ({
  kind: 'number', key: 'n', label, default: defaultValue, min, max,
});

export const blockDefinitions = {
  step: {
    label: 'крок вперед', category: 'move', className: 'move turtle', icon: '↑',
    code: () => 'вперед 50',
  },
  turn_right90: {
    label: 'поворот праворуч', category: 'turn', className: 'turn turtle', icon: '↻',
    code: () => 'праворуч 90',
  },
  turn_left90: {
    label: 'поворот ліворуч', category: 'turn', className: 'turn turtle', icon: '↺',
    code: () => 'ліворуч 90',
  },
  forward: {
    label: 'вперед', category: 'move', className: 'move turtle', icon: '↑',
    param: numberParam('кроків', 50, 1, 300),
    code: (block) => `вперед ${block.n}`,
  },
  back: {
    label: 'назад', category: 'move', className: 'move turtle', icon: '↓',
    param: numberParam('кроків', 50, 1, 300),
    code: (block) => `назад ${block.n}`,
  },
  right: {
    label: 'праворуч', category: 'turn', className: 'turn turtle', icon: '↻',
    param: numberParam('°', 90, 1, 360),
    code: (block) => `праворуч ${block.n}`,
  },
  left: {
    label: 'ліворуч', category: 'turn', className: 'turn turtle', icon: '↺',
    param: numberParam('°', 90, 1, 360),
    code: (block) => `ліворуч ${block.n}`,
  },
  pen_up: {
    label: 'підняти олівець', category: 'pen', className: 'pen turtle', icon: '⬆',
    code: () => 'підняти',
  },
  pen_down: {
    label: 'опустити олівець', category: 'pen', className: 'pen turtle', icon: '⬇',
    code: () => 'опустити',
  },
  color: {
    label: 'колір', category: 'color', className: 'pen turtle', icon: '●',
    param: { kind: 'color', key: 'color', default: 'червоний' },
    code: (block) => `колір ${block.color}`,
  },
  repeat: {
    label: 'повторити', category: 'repeat', className: 'repeat', icon: '↻',
    param: numberParam('рази', 4, 1, MAX_REPEAT_COUNT),
    container: true,
    code: (block) => `повторити ${block.n} (`,
  },
};

export const BLOCK_TYPES = Object.keys(blockDefinitions);
