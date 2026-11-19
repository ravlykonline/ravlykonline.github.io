/**
 * Посилання «Відкрити в Равлику», яке одразу підставляє код у головний редактор.
 *
 * Головний редактор (корінь сайту) читає код із фрагмента адреси `#code=<base64url>`
 * (див. кореневий js/modules/share.js і fileActionsController.loadCodeFromUrlHash).
 * Фрагмент не надсилається на сервер, тож код дитини нікуди не передається.
 * Без DOM: чисті функції.
 */

export const EDITOR_PATH = '/';
/** Той самий ліміт довжини фрагмента, що й у головному редакторі (MAX_SHARE_URL_LENGTH_CHARS). */
export const MAX_EDITOR_HASH_LENGTH = 7000;

/** UTF-8 → base64url без «=» у кінці. */
export function encodeCodeForEditor(code) {
  const bytes = new TextEncoder().encode(code);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * @returns {{ href: string, fits: boolean }} fits=false — код задовгий для адреси,
 *   тоді лишається посилання на порожній редактор, а код треба скопіювати.
 */
export function buildEditorLink(code) {
  const hash = `#code=${encodeCodeForEditor(code)}`;
  if (hash.length > MAX_EDITOR_HASH_LENGTH) return { href: EDITOR_PATH, fits: false };
  return { href: `${EDITOR_PATH}${hash}`, fits: true };
}
