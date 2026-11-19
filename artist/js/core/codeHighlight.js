/**
 * Токенізатор для підсвітки коду РАВЛИК у вкладці «Код». Чисті функції, без DOM.
 * Типи токенів: comment, keyword, number, color, punct, plain.
 */
import { COLOR_NAMES } from '../data/colors.js';

export const KEYWORDS = new Set([
  'вперед', 'назад', 'праворуч', 'ліворуч', 'підняти', 'опустити',
  'повторити', 'колір', 'товщина', 'перейти', 'в',
]);

const COLOR_SET = new Set(COLOR_NAMES);
const TOKEN_PATTERN = /(\/\/.*$)|(\d+(?:\.\d+)?)|([\p{L}_]+)|(\s+)|(.)/gu;

/** Розбиває один рядок коду на токени; конкатенація `text` дає початковий рядок. */
export function tokenizeLine(line) {
  const tokens = [];
  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const [text, comment, number, word, space] = match;
    if (comment !== undefined) tokens.push({ type: 'comment', text });
    else if (number !== undefined) tokens.push({ type: 'number', text });
    else if (word !== undefined) {
      if (KEYWORDS.has(word)) tokens.push({ type: 'keyword', text });
      else if (COLOR_SET.has(word)) tokens.push({ type: 'color', text });
      else tokens.push({ type: 'plain', text });
    } else if (space !== undefined) tokens.push({ type: 'plain', text });
    else tokens.push({ type: 'punct', text });
  }
  return tokens;
}
