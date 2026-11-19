/**
 * Визначення блоків.
 *
 * Поля:
 *   label       — назва в UI (українська)
 *   category    — move | turn | pen | color | repeat
 *   className   — службовий клас (залишено для сумісності)
 *   icon        — символ
 *   text        — фраза блока як у Scratch: [до поля, після поля] (поле — параметр)
 *   param       — опис параметра: { kind: 'number', key, label, default, min, max, step, aria, quick? }
 *                 або { kind: 'color', key, default, aria }; без поля — блок без параметра
 *   code(block) — рядок коду РАВЛИК (для repeat — заголовок «повторити N (»,
 *                 закриваюча «)» додається в codegen). Тільки валідний РАВЛИК.
 */
export const MAX_REPEAT_COUNT = 36;

export const ANGLE_QUICK_PICKS = [30, 45, 60, 90, 120, 144];

/** Категорії палітри в порядку показу. */
export const BLOCK_CATEGORIES = [
  { id: 'move', title: 'Рух' },
  { id: 'turn', title: 'Повороти' },
  { id: 'pen', title: 'Олівець' },
  { id: 'color', title: 'Колір' },
  { id: 'repeat', title: 'Цикли' },
];

const numberParam = (label, defaultValue, min, max, extra) => ({
  kind: 'number', key: 'n', label, default: defaultValue, min, max, ...extra,
});

const stepsParam = () => numberParam('кроків', 50, 1, 300, { step: 10, aria: 'Кількість кроків' });
const angleParam = () => numberParam('°', 90, 1, 360, { step: 15, aria: 'Кут у градусах', quick: ANGLE_QUICK_PICKS });

export const blockDefinitions = {
  step: {
    label: 'крок вперед', category: 'move', className: 'move turtle', icon: '↑',
    text: ['крок вперед', ''],
    code: () => 'вперед 50',
  },
  turn_right90: {
    label: 'поворот праворуч', category: 'turn', className: 'turn turtle', icon: '↻',
    text: ['поворот праворуч', ''],
    code: () => 'праворуч 90',
  },
  turn_left90: {
    label: 'поворот ліворуч', category: 'turn', className: 'turn turtle', icon: '↺',
    text: ['поворот ліворуч', ''],
    code: () => 'ліворуч 90',
  },
  forward: {
    label: 'вперед', category: 'move', className: 'move turtle', icon: '↑',
    text: ['вперед', 'кроків'],
    param: stepsParam(),
    code: (block) => `вперед ${block.n}`,
  },
  back: {
    label: 'назад', category: 'move', className: 'move turtle', icon: '↓',
    text: ['назад', 'кроків'],
    param: stepsParam(),
    code: (block) => `назад ${block.n}`,
  },
  right: {
    label: 'праворуч', category: 'turn', className: 'turn turtle', icon: '↻',
    text: ['праворуч ↻', 'градусів'],
    param: angleParam(),
    code: (block) => `праворуч ${block.n}`,
  },
  left: {
    label: 'ліворуч', category: 'turn', className: 'turn turtle', icon: '↺',
    text: ['ліворуч ↺', 'градусів'],
    param: angleParam(),
    code: (block) => `ліворуч ${block.n}`,
  },
  pen_up: {
    label: 'підняти олівець', category: 'pen', className: 'pen turtle', icon: '⬆',
    text: ['підняти олівець', ''],
    code: () => 'підняти',
  },
  pen_down: {
    label: 'опустити олівець', category: 'pen', className: 'pen turtle', icon: '⬇',
    text: ['опустити олівець', ''],
    code: () => 'опустити',
  },
  color: {
    label: 'колір', category: 'color', className: 'pen turtle', icon: '●',
    text: ['колір', ''],
    param: { kind: 'color', key: 'color', default: 'червоний', aria: 'Колір' },
    code: (block) => `колір ${block.color}`,
  },
  repeat: {
    label: 'повторити', category: 'repeat', className: 'repeat', icon: '↻',
    text: ['повторити', 'рази'],
    param: numberParam('рази', 4, 1, MAX_REPEAT_COUNT, { step: 1, aria: 'Кількість повторів' }),
    container: true,
    code: (block) => `повторити ${block.n} (`,
  },
};

export const BLOCK_TYPES = Object.keys(blockDefinitions);

/** Читабельний текст блока для скрінрідера й aria-label: «вперед 50 кроків». */
export function describeBlock(block) {
  const definition = blockDefinitions[block.type];
  if (!definition) return '';
  const [before, after] = definition.text;
  const value = definition.param ? String(block[definition.param.key]) : '';
  return [before, value, after].filter(Boolean).join(' ');
}
