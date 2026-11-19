/**
 * Кольори пера гри. Назви й HEX збігаються з основними (core) кольорами
 * COLOR_REGISTRY кореневого js/modules/constants.js — тест tests/artistCodegen.test.js
 * звіряє цю таблицю з реєстром мови РАВЛИК.
 */
export const COLORS = [
  { name: 'червоний', hex: '#E8302A' },
  { name: 'жовтогарячий', hex: '#FF8C00' },
  { name: 'жовтий', hex: '#FFD600' },
  { name: 'зелений', hex: '#2ECC40' },
  { name: 'синій', hex: '#1A56DB' },
  { name: 'фіолетовий', hex: '#7B2FBE' },
  { name: 'рожевий', hex: '#FF82AC' },
  { name: 'коричневий', hex: '#8B4513' },
  { name: 'чорний', hex: '#1A1A1A' },
];

export const COLOR_NAMES = COLORS.map((color) => color.name);

const hexByName = new Map(COLORS.map((color) => [color.name, color.hex]));

export function isColorName(name) {
  return hexByName.has(name);
}

export function colorHex(name) {
  return hexByName.get(name) ?? hexByName.get('чорний');
}
