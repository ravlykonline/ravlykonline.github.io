/**
 * Спільна поведінка «кнопка відкриває панель» для мобільних меню: aria-expanded,
 * клас is-open, закриття по Escape (обробляє main.js), кліку поза панеллю й виходу фокуса.
 * Лише DOM-класи й атрибути, без innerHTML.
 */
export function createPopupToggle({ button, panel, focusFirst = true }) {
  let open = false;

  function setOpen(next, { restoreFocus = false } = {}) {
    if (open === next) return;
    open = next;
    panel.classList.toggle('is-open', next);
    button.setAttribute('aria-expanded', String(next));
    if (next) {
      document.addEventListener('pointerdown', onOutside, true);
      if (focusFirst) panel.querySelector('button:not([disabled])')?.focus();
    } else {
      document.removeEventListener('pointerdown', onOutside, true);
      if (restoreFocus && button.offsetParent) button.focus();
    }
  }

  function onOutside(event) {
    if (panel.contains(event.target) || button.contains(event.target)) return;
    setOpen(false);
  }

  button.addEventListener('click', () => setOpen(!open));
  panel.addEventListener('focusout', (event) => {
    if (!open || !event.relatedTarget) return;
    if (!panel.contains(event.relatedTarget) && event.relatedTarget !== button) setOpen(false);
  });

  return {
    isOpen: () => open,
    close: (options) => setOpen(false, options),
  };
}
