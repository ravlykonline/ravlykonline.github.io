/**
 * Робоча область: вільне полотно з крапковою сіткою. Головний стос під
 * «коли ▶ натиснуто» виконується; вільні стоси — ні. DOM лише тут і в сусідніх
 * модулях ui/; логіка списків — у core/workspace.js.
 */
import { blockDefinitions } from '../data/blocks.js';
import { buildBlockElement, buildHatElement, syncShapes } from './blockView.js';
import { closePopover } from './popover.js';

export const LOOSE_HINT = 'Не приєднано до «коли ▶ натиснуто» — не виконується';
const MAIN_HINT = 'Натисни блок зліва, щоб додати його сюди, або перетягни його';
const MOUTH_HINT = 'Перетягни блок сюди';
const MOUTH_TARGET_HINT = 'Нові блоки додаються сюди';

let canvas = null;
let api = null;

function buildSlot(text) {
  const slot = document.createElement('div');
  slot.className = 'blk-slot';
  slot.setAttribute('aria-hidden', 'true');
  slot.textContent = text;
  return slot;
}

function fillList(listEl, blocks, owner, state, emptyText) {
  listEl.dataset.owner = String(owner);
  if (blocks.length === 0) {
    listEl.appendChild(buildSlot(emptyText));
    return;
  }
  for (const block of blocks) {
    const el = buildBlockElement(block, api, (mouth, loop) => {
      fillList(mouth, loop.blocks, owner, state, state.insertTargetId === loop.id ? MOUTH_TARGET_HINT : MOUTH_HINT);
    });
    if (state.insertTargetId === block.id) el.classList.add('is-target');
    listEl.appendChild(el);
  }
}

function buildMainStack(state) {
  const stack = document.createElement('div');
  stack.className = 'ws-stack ws-main';
  stack.appendChild(buildHatElement());
  const list = document.createElement('div');
  list.className = 'blk-list ws-main-list';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', 'Програма');
  fillList(list, state.workspace, 'main', state, MAIN_HINT);
  stack.appendChild(list);
  return stack;
}

function buildLooseStack(loose, state) {
  const stack = document.createElement('div');
  stack.className = 'ws-stack ws-loose';
  stack.dataset.looseId = String(loose.id);
  stack.style.left = `${loose.x}px`;
  stack.style.top = `${loose.y}px`;

  const hint = document.createElement('div');
  hint.className = 'ws-loose-hint';
  hint.textContent = LOOSE_HINT;
  const list = document.createElement('div');
  list.className = 'blk-list';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', 'Блоки, що не виконуються');
  fillList(list, loose.blocks, loose.id, state, MOUTH_HINT);
  stack.append(hint, list);
  return stack;
}

/** Повністю перемальовує полотно за станом (зберігає прокрутку). */
export function renderWorkspaceView(dom, state) {
  const { scrollLeft, scrollTop } = canvas;
  const fragment = document.createDocumentFragment();
  fragment.appendChild(buildMainStack(state));
  for (const loose of state.loose) fragment.appendChild(buildLooseStack(loose, state));
  canvas.replaceChildren(fragment);
  syncShapes(canvas);
  canvas.scrollLeft = scrollLeft;
  canvas.scrollTop = scrollTop;
  canvas.classList.toggle('is-running', state.running);
  highlightBlocks(state);
}

/** Підсвічує виконуваний і помилковий блоки без перемальовування. */
export function highlightBlocks(state) {
  canvas.querySelectorAll('.is-active, .is-error').forEach((node) => {
    node.classList.remove('is-active', 'is-error');
  });
  if (state.activeBlockId !== null && state.activeBlockId !== undefined) {
    const el = blockElementById(state.activeBlockId);
    if (el) {
      el.classList.add('is-active');
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }
  if (state.errorBlockId !== null && state.errorBlockId !== undefined) {
    blockElementById(state.errorBlockId)?.classList.add('is-error');
  }
}

export function blockElementById(id) {
  return canvas.querySelector(`[data-block-id="${id}"]`);
}

export function focusBlock(id) {
  blockElementById(id)?.focus();
}

export function scrollBlockIntoView(id) {
  blockElementById(id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// ── Події (делегування: полотно живе, діти перемальовуються) ─────────────────

function onKeyDown(event) {
  const el = event.target.closest?.('.blk');
  if (!el || event.target !== el || el.dataset.hat || api.isLocked()) return;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const id = Number(el.dataset.blockId);
  const type = el.dataset.type;

  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      api.moveUp(id);
      break;
    case 'ArrowDown':
      event.preventDefault();
      api.moveDown(id);
      break;
    case 'Delete':
    case 'Backspace':
      event.preventDefault();
      api.remove(id);
      break;
    case 'Escape':
      if (el.parentElement?.dataset.parent) {
        event.preventDefault();
        api.moveOut(id);
      }
      break;
    case 'Enter':
      event.preventDefault();
      if (blockDefinitions[type]?.container) api.setInsertTarget(id);
      else el.querySelector('.blk-field')?.focus();
      break;
    default:
      break;
  }
}

function onClick(event) {
  if (api.shouldSuppressClick()) return;
  if (event.target.closest('input, button')) return;
  const el = event.target.closest('.blk');
  if (!el || el.dataset.hat) {
    // Порожнє місце або hat: скидаємо ціль вставки.
    api.setInsertTarget(null);
    return;
  }
  if (el.classList.contains('blk-loop') && !event.target.closest('.blk-head, .blk-foot')) {
    api.setInsertTarget(Number(el.dataset.blockId));
  }
}

export function initWorkspaceView(dom, handlers) {
  canvas = dom.workspaceCanvas;
  api = handlers;
  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('scroll', () => closePopover(), { passive: true });
}
