/**
 * Єдиний спливаючий елемент для полів блоків: кнопки −/+ і швидкий вибір кута,
 * список кольорів. Тільки createElement/textContent.
 */
let popover = null;
let anchorEl = null;
let onClose = null;
let outsideHandler = null;

function ensurePopover() {
  if (popover) return popover;
  popover = document.createElement('div');
  popover.id = 'blk-popover';
  popover.className = 'blk-popover';
  popover.hidden = true;
  document.body.appendChild(popover);
  return popover;
}

export function isPopoverOpen() {
  return Boolean(popover) && !popover.hidden;
}

export function closePopover({ restoreFocus = false } = {}) {
  if (!isPopoverOpen()) return;
  const anchor = anchorEl;
  const callback = onClose;
  popover.hidden = true;
  popover.replaceChildren();
  anchorEl = null;
  onClose = null;
  if (outsideHandler) {
    document.removeEventListener('pointerdown', outsideHandler, true);
    outsideHandler = null;
  }
  if (restoreFocus && anchor && anchor.isConnected && typeof anchor.focus === 'function') anchor.focus();
  if (callback) callback();
}

function place(rect) {
  const node = popover;
  node.style.left = '0px';
  node.style.top = '0px';
  const width = node.offsetWidth;
  const height = node.offsetHeight;
  const margin = 6;
  let left = rect.left;
  let top = rect.bottom + margin;
  if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin;
  if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.top - height - margin);
  node.style.left = `${Math.max(margin, left)}px`;
  node.style.top = `${top}px`;
}

function open(anchor, rect, role, label, closeCallback) {
  closePopover();
  const node = ensurePopover();
  node.hidden = false;
  node.setAttribute('role', role);
  node.setAttribute('aria-label', label);
  node.replaceChildren();
  anchorEl = anchor;
  onClose = closeCallback ?? null;
  outsideHandler = (event) => {
    if (node.contains(event.target) || (anchor && anchor.contains && anchor.contains(event.target))) return;
    closePopover();
  };
  document.addEventListener('pointerdown', outsideHandler, true);
  return { node, place: () => place(rect) };
}

function makeButton(text, className, ariaLabel) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
  // Не забираємо фокус із поля, поки діти натискають кнопки.
  button.addEventListener('pointerdown', (event) => event.preventDefault());
  return button;
}

const HOLD_DELAY_MS = 450;
const HOLD_INTERVAL_MS = 90;

/** Клік — один крок; утримання (миша чи палець) — автоповтор, щоб дійти від 50 до 150 без 10 тапів. */
function attachRepeat(button, step) {
  let delayTimer = 0;
  let repeatTimer = 0;
  let repeated = false;
  const stop = () => {
    window.clearTimeout(delayTimer);
    window.clearInterval(repeatTimer);
  };
  button.addEventListener('pointerdown', () => {
    repeated = false;
    stop();
    delayTimer = window.setTimeout(() => {
      repeated = true;
      step();
      repeatTimer = window.setInterval(step, HOLD_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) button.addEventListener(type, stop);
  button.addEventListener('click', (event) => {
    if (repeated) {
      repeated = false;
      event.preventDefault();
      return;
    }
    step();
  });
}

/**
 * Кнопки −/+ і швидкий вибір під числовим полем.
 * getValue() → число, setValue(число) застосовує (і прикріплює до моделі).
 */
export function openNumberPopover({ anchor, param, getValue, setValue }) {
  const view = open(anchor, anchor.getBoundingClientRect(), 'group', `${param.aria ?? 'Значення'}: змінити`);
  const row = document.createElement('div');
  row.className = 'blk-popover-row';

  const apply = (delta) => {
    const next = Math.max(param.min, Math.min(param.max, getValue() + delta));
    setValue(next);
  };
  const minus = makeButton('−', 'blk-pop-step', 'Менше');
  const plus = makeButton('+', 'blk-pop-step', 'Більше');
  attachRepeat(minus, () => apply(-(param.step ?? 1)));
  attachRepeat(plus, () => apply(param.step ?? 1));
  row.append(minus, plus);
  view.node.appendChild(row);

  if (param.quick) {
    const quick = document.createElement('div');
    quick.className = 'blk-popover-row blk-popover-quick';
    for (const value of param.quick) {
      const button = makeButton(`${value}°`, 'blk-pop-quick', `${value} градусів`);
      button.addEventListener('click', () => setValue(value));
      quick.appendChild(button);
    }
    view.node.appendChild(quick);
  }
  view.place();
}

/**
 * Список кольорів.
 * items: [{ label, dotColor?, selected?, onSelect }]
 */
export function openColorPopover({ anchor, label, items }) {
  const view = open(anchor, anchor.getBoundingClientRect(), 'listbox', label);
  const buttons = [];

  items.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'blk-pop-item';
    button.setAttribute('role', 'option');
    button.tabIndex = -1;
    button.setAttribute('aria-selected', String(Boolean(item.selected)));
    if (item.dotColor) {
      const dot = document.createElement('span');
      dot.className = 'blk-color-dot';
      dot.setAttribute('aria-hidden', 'true');
      dot.style.background = item.dotColor;
      button.appendChild(dot);
    }
    const text = document.createElement('span');
    text.textContent = item.label;
    button.appendChild(text);
    button.addEventListener('click', () => {
      closePopover();
      item.onSelect();
    });
    view.node.appendChild(button);
    buttons.push(button);
  });

  view.node.onkeydown = (event) => {
    const current = buttons.indexOf(document.activeElement);
    const focusAt = (index) => buttons[(index + buttons.length) % buttons.length]?.focus();
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); focusAt(current + 1); break;
      case 'ArrowUp': event.preventDefault(); focusAt(current - 1); break;
      case 'Home': event.preventDefault(); focusAt(0); break;
      case 'End': event.preventDefault(); focusAt(buttons.length - 1); break;
      case 'Escape': event.preventDefault(); event.stopPropagation(); closePopover({ restoreFocus: true }); break;
      case 'Tab': closePopover({ restoreFocus: true }); break;
      default: break;
    }
  };

  view.place();
  const selected = buttons[items.findIndex((item) => item.selected)] ?? buttons[0];
  selected?.focus();
}
