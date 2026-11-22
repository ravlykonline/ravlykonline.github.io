/**
 * Побудова DOM одного блока «як у Scratch»: контур-пазл (SVG-шлях за виміряним
 * розміром) + справжній HTML-текст і поля. Дані вставляються лише через
 * createElement/textContent.
 */
import { blockDefinitions, describeBlock } from '../data/blocks.js';
import { COLORS, colorHex } from '../data/colors.js';
import { hatPath, loopPath, stackPath, SHAPE } from '../core/blockShape.js';
import { closePopover, openColorPopover, openNumberPopover } from './popover.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const partsByBlock = new WeakMap();
const lastPath = new WeakMap();

// ── Контур ──────────────────────────────────────────────────────────────────

function createShapeSvg() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'blk-shape');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  svg.appendChild(path);
  return { svg, path };
}

/** Перераховує контур блока за його поточними розмірами. */
export function updateShape(el) {
  const parts = partsByBlock.get(el);
  if (!parts) return;
  const { kind, head, mouth, foot, svg, path } = parts;
  let d;
  let width;
  let height;
  if (kind === 'loop') {
    if (head.offsetWidth === 0) return;
    width = Math.max(head.offsetWidth, SHAPE.minWidth + SHAPE.arm);
    const headH = head.offsetHeight;
    const mouthH = mouth.offsetHeight;
    const footH = foot.offsetHeight;
    height = headH + mouthH + footH;
    d = loopPath(width, headH, mouthH, footH);
  } else {
    width = el.offsetWidth;
    height = el.offsetHeight;
    if (width === 0 || height === 0) return;
    d = kind === 'hat' ? hatPath(width, height) : stackPath(width, height);
  }
  if (lastPath.get(el) === d) return;
  lastPath.set(el, d);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  path.setAttribute('d', d);
}

let resizeObserver = null;

function observe(targets) {
  if (typeof ResizeObserver === 'undefined') return;
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const owner = entry.target.closest('.blk');
        if (owner) updateShape(owner);
      }
    });
  }
  for (const target of targets) resizeObserver.observe(target);
}

/** Примусово оновлює контури всіх блоків усередині root (після вставки в DOM). */
export function syncShapes(root) {
  const list = root.classList?.contains('blk') ? [root] : [];
  list.push(...root.querySelectorAll('.blk'));
  // Спершу внутрішні (вкладені), щоб розміри зовнішніх уже були остаточні.
  for (let i = list.length - 1; i >= 0; i -= 1) updateShape(list[i]);
}

function attachShape(el, kind, head, mouth = null, foot = null) {
  const { svg, path } = createShapeSvg();
  el.insertBefore(svg, el.firstChild);
  el.dataset.shape = kind;
  partsByBlock.set(el, { kind, head, mouth, foot, svg, path });
  observe([el, head, ...(mouth ? [mouth] : [])]);
}

// ── Поля ────────────────────────────────────────────────────────────────────

function sizeInput(input) {
  input.style.width = `${Math.max(2, input.value.length) + 1.6}ch`;
}

function textSpan(text) {
  const span = document.createElement('span');
  span.className = 'blk-text';
  span.textContent = text;
  return span;
}

function buildColorDot(name) {
  const dot = document.createElement('span');
  dot.className = 'blk-color-dot';
  dot.setAttribute('aria-hidden', 'true');
  dot.style.background = colorHex(name);
  return dot;
}

function buildStaticField(block, definition) {
  const field = document.createElement('span');
  field.className = 'blk-field';
  if (definition.param.kind === 'color') {
    field.classList.add('blk-field-color');
    field.append(buildColorDot(block.color), textSpan(block.color), textSpan('▾'));
  } else {
    field.textContent = String(block[definition.param.key]);
  }
  return field;
}

function buildNumberField(block, definition, handlers) {
  const { param } = definition;
  const input = document.createElement('input');
  input.type = 'text';
  // На дотику екранна клавіатура закрила б спливаюче вікно з −/+ — там цифри вводять кнопками.
  input.inputMode = window.matchMedia?.('(pointer: coarse)').matches ? 'none' : 'numeric';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.maxLength = String(param.max).length;
  input.className = 'blk-field blk-field-number';
  input.value = String(block[param.key]);
  input.setAttribute('aria-label', param.aria);
  sizeInput(input);

  // Одна «сесія редагування» = один запис в історії скасування.
  let session = { taken: false };
  const current = () => Number.parseInt(input.value, 10) || param.default;
  const commit = (raw) => {
    const value = handlers.onParamChange(block.id, param.key, raw, session);
    input.value = String(value);
    sizeInput(input);
    return value;
  };
  const backToBlock = () => input.closest('.blk')?.focus();

  input.addEventListener('focus', () => {
    session = { taken: false };
    input.select();
    openNumberPopover({
      anchor: input,
      param,
      getValue: current,
      setValue: (value) => { commit(value); input.select(); },
    });
  });
  input.addEventListener('blur', () => {
    commit(input.value);
    closePopover();
  });
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D+/g, '');
    sizeInput(input);
  });
  input.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(input.value);
      backToBlock();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      input.value = String(block[param.key]);
      backToBlock();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const delta = event.key === 'ArrowUp' ? 1 : -1;
      commit(Math.max(param.min, Math.min(param.max, current() + delta)));
      input.select();
    }
  });
  return input;
}

function buildColorField(block, definition, handlers) {
  const { param } = definition;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'blk-field blk-field-color';
  button.setAttribute('aria-haspopup', 'listbox');
  const dot = buildColorDot(block.color);
  const name = textSpan(block.color);
  button.append(dot, name, textSpan('▾'));
  const refresh = (value) => {
    dot.style.background = colorHex(value);
    name.textContent = value;
    button.setAttribute('aria-label', `${param.aria}: ${value}`);
  };
  refresh(block.color);

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    openColorPopover({
      anchor: button,
      label: 'Колір олівця',
      items: COLORS.map((color) => ({
        label: color.name,
        dotColor: color.hex,
        selected: color.name === block.color,
        onSelect: () => {
          const value = handlers.onParamChange(block.id, param.key, color.name, { taken: false });
          block.color = value;
          refresh(value);
          button.focus();
        },
      })),
    });
  });
  return button;
}

function buildPhrase(block, definition, handlers) {
  const [before, after] = definition.text;
  const nodes = [textSpan(before)];
  if (definition.param) {
    if (!handlers) nodes.push(buildStaticField(block, definition));
    else if (definition.param.kind === 'color') nodes.push(buildColorField(block, definition, handlers));
    else nodes.push(buildNumberField(block, definition, handlers));
  }
  if (after) nodes.push(textSpan(after));
  return nodes;
}

// ── Блоки ───────────────────────────────────────────────────────────────────

/**
 * Блок програми.
 * handlers: { onParamChange(id, key, raw, session) → нове значення }
 * renderChildren(mouthElement, block) — наповнює «рот» циклу.
 */
export function buildBlockElement(block, handlers, renderChildren) {
  const definition = blockDefinitions[block.type];
  const isLoop = Boolean(definition.container);
  const el = document.createElement('div');
  el.className = `blk cat-${definition.category}`;
  if (isLoop) el.classList.add('blk-loop');
  el.dataset.blockId = String(block.id);
  el.dataset.type = block.type;
  el.tabIndex = 0;
  el.setAttribute('role', 'group');
  el.setAttribute('aria-roledescription', 'блок');
  el.setAttribute('aria-label', describeBlock(block));

  const head = document.createElement('div');
  head.className = 'blk-head';
  head.append(...buildPhrase(block, definition, handlers));
  el.appendChild(head);

  if (isLoop) {
    const mouth = document.createElement('div');
    mouth.className = 'blk-mouth blk-list';
    mouth.dataset.parent = String(block.id);
    renderChildren(mouth, block);
    const foot = document.createElement('div');
    foot.className = 'blk-foot';
    el.append(mouth, foot);
    attachShape(el, 'loop', head, mouth, foot);
  } else {
    attachShape(el, 'stack', head);
  }
  return el;
}

/** Стартовий блок «коли ▶ натиснуто»: зелений і з ▶, як кнопка «Старт». Не видаляється й не перетягується. */
export function buildHatElement() {
  const el = document.createElement('div');
  el.className = 'blk blk-hat cat-start';
  el.dataset.hat = 'true';
  el.tabIndex = 0;
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Початок програми: коли натиснуто «Запустити»');

  const head = document.createElement('div');
  head.className = 'blk-head';
  const play = textSpan('▶');
  play.setAttribute('aria-hidden', 'true');
  head.append(textSpan('коли'), play, textSpan('натиснуто'));
  el.appendChild(head);
  attachShape(el, 'hat', head);
  return el;
}

/**
 * Блок для палітри або «привида» з палітри: статичний, без елементів-полів.
 * tag — 'button' (палітра) або 'div' (привид).
 */
export function buildStaticBlock(block, tag = 'div') {
  const definition = blockDefinitions[block.type];
  const isLoop = Boolean(definition.container);
  const inner = tag === 'button' ? 'span' : 'div';
  const el = document.createElement(tag);
  el.className = `blk cat-${definition.category}`;
  if (tag === 'button') {
    el.type = 'button';
    el.classList.add('blk-palette');
    el.dataset.paletteType = block.type;
    el.setAttribute('aria-label', `Додати блок: ${describeBlock(block)}`);
  }
  if (isLoop) el.classList.add('blk-loop');

  const head = document.createElement(inner);
  head.className = 'blk-head';
  head.append(...buildPhrase(block, definition, null));
  el.appendChild(head);

  if (isLoop) {
    const mouth = document.createElement(inner);
    mouth.className = 'blk-mouth blk-mouth-static';
    const foot = document.createElement(inner);
    foot.className = 'blk-foot';
    el.append(mouth, foot);
    attachShape(el, 'loop', head, mouth, foot);
  } else {
    attachShape(el, 'stack', head);
  }
  return el;
}
