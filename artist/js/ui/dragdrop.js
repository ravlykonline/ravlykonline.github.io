/**
 * Перетягування блоків на pointer events: одна реалізація для миші, дотику й пера.
 *
 * Модель (власна реалізація; математика зчеплення — core/snap.js, списки — core/workspace.js):
 *  - pointerdown запам’ятовує джерело: блок палітри або блок у програмі;
 *  - перетягування починається після зсуву ≥ DRAG_THRESHOLD px, інакше це клік;
 *  - беремо «хвіст» (блок і всі під ним у тому ж списку); оригінали зникають
 *    з моделі, під курсором — «привид»;
 *  - точки зчеплення збираються з DOM один раз на початку (у координатах вмісту
 *    полотна); магніт обирає точку за відстанню від кута «привида» з гістерезисом;
 *  - над точкою в стосі з’являється ПОПЕРЕДНІЙ ПЕРЕГЛЯД — сірий напівпрозорий силует
 *    тієї ж форми й висоти; блоки нижче плавно (≈120 мс) зсуваються вниз;
 *  - відпускання: на точку → «привид» злітає в силует і вставляється справжній блок;
 *    на порожнє місце → вільний стос; на палітру → видалення; Esc → скасування.
 *  - prefers-reduced-motion: без зсувів і польоту, лише силует і миттєва вставка.
 */
import {
  SNAP_RADIUS, SNAP_RADIUS_TOUCH, connectionPointsFromLists, findSnapTarget, snapKey,
} from '../core/snap.js';
import { syncShapes } from './blockView.js';

export const DRAG_THRESHOLD = 6;
const EDGE_ZONE = 44;
const MAX_SCROLL_SPEED = 18;
const MAKE_ROOM_MS = 120;
const FLY_MS = 140;

const INTERACTIVE = 'input, button, select, textarea, [contenteditable="true"]';

function ownerFromDataset(value) {
  return value === 'main' ? 'main' : Number(value);
}

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function listKey(owner, parentId) {
  return `${owner}|${parentId ?? ''}`;
}

export function createDragController({
  canvas,
  palette,
  isLocked,
  lift,
  createPaletteBlock,
  onDrop,
  onCancel,
  onSnap,
}) {
  let candidate = null;
  let session = null;
  let suppressClickUntil = 0;
  let scrollFrame = 0;

  // ── Допоміжне ────────────────────────────────────────────────────────────

  function stripGhost(root) {
    root.querySelectorAll('[data-block-id]').forEach((node) => {
      node.removeAttribute('data-block-id');
    });
    root.querySelectorAll('[tabindex]').forEach((node) => node.removeAttribute('tabindex'));
    root.querySelectorAll('input, button').forEach((node) => { node.tabIndex = -1; });
  }

  function collectTailClones(el) {
    const clones = [];
    for (let node = el; node; node = node.nextElementSibling) {
      if (node.classList.contains('blk')) clones.push(node.cloneNode(true));
    }
    return clones;
  }

  /** Точки зчеплення з DOM (координати вмісту полотна) + мапа «список → елемент». */
  function buildPoints() {
    const origin = canvas.getBoundingClientRect();
    const toX = (rectX) => rectX - origin.left + canvas.scrollLeft;
    const toY = (rectY) => rectY - origin.top + canvas.scrollTop;
    const listElements = new Map();
    const lists = [];
    for (const list of canvas.querySelectorAll('.blk-list')) {
      const owner = ownerFromDataset(list.dataset.owner);
      const parentId = list.dataset.parent ? Number(list.dataset.parent) : null;
      const rect = list.getBoundingClientRect();
      const kids = [...list.children]
        .filter((child) => child.classList.contains('blk'))
        .map((kid) => {
          const kidRect = kid.getBoundingClientRect();
          return { left: toX(kidRect.left), top: toY(kidRect.top), bottom: toY(kidRect.bottom) };
        });
      listElements.set(listKey(owner, parentId), list);
      lists.push({
        owner,
        parentId,
        looseRoot: owner !== 'main' && parentId === null,
        rect: { left: toX(rect.left), top: toY(rect.top) },
        kids,
      });
    }
    return { points: connectionPointsFromLists(lists), listElements };
  }

  // ── Силует вставки ───────────────────────────────────────────────────────

  function cancelCanvasAnimations() {
    canvas.getAnimations?.({ subtree: true }).forEach((animation) => animation.cancel());
  }

  function measureBlocks() {
    const tops = new Map();
    for (const el of canvas.querySelectorAll('.blk')) tops.set(el, el.getBoundingClientRect().top);
    return tops;
  }

  /** FLIP: блоки, що змістилися, плавно «доїжджають» зі старого місця. */
  function animateFromBefore(before) {
    if (prefersReducedMotion()) return;
    const moved = [];
    for (const el of canvas.querySelectorAll('.blk')) {
      if (!before.has(el)) continue;
      moved.push([el, before.get(el) - el.getBoundingClientRect().top]);
    }
    const deltaOf = new Map(moved);
    for (const [el, delta] of moved) {
      // Вкладені блоки їдуть разом із батьківським циклом — віднімаємо його зсув.
      const parent = el.parentElement?.closest('.blk');
      const own = delta - (deltaOf.get(parent) ?? 0);
      if (Math.abs(own) < 0.5) continue;
      el.animate(
        [{ transform: `translateY(${own}px)` }, { transform: 'translateY(0)' }],
        { duration: MAKE_ROOM_MS, easing: 'ease-out' },
      );
    }
  }

  function buildPreview() {
    const preview = document.createElement('div');
    preview.className = 'blk-preview';
    preview.setAttribute('aria-hidden', 'true');
    preview.setAttribute('inert', '');
    for (const child of session.ghost.children) preview.appendChild(child.cloneNode(true));
    return preview;
  }

  function removePreview() {
    const { preview } = session;
    if (!preview) return;
    preview.parentElement?.classList.remove('has-preview');
    preview.remove();
    if (session.shifted) {
      session.shifted.stack.style.top = session.shifted.top;
      session.shifted = null;
    }
    session.preview = null;
  }

  function insertPreview(slot) {
    const list = session.listElements.get(listKey(slot.owner, slot.parentId));
    if (!list) return;
    const preview = buildPreview();
    const kids = [...list.children].filter((child) => child.classList.contains('blk'));
    list.classList.add('has-preview');
    list.insertBefore(preview, kids[slot.index] ?? null);
    session.preview = preview;
    if (slot.anchor === 'bottom') {
      // Хвіст ставав НАД стосом: піднімаємо стос, щоб його блоки лишилися на місці.
      const stack = list.closest('.ws-loose');
      if (stack) {
        const top = Number.parseFloat(stack.style.top) || 0;
        session.shifted = { stack, top: stack.style.top };
        stack.style.top = `${Math.max(0, top - session.height)}px`;
      }
    }
  }

  /** Показує силует у точці slot (або прибирає його, якщо slot = null). */
  function showPreview(slot) {
    const key = slot ? snapKey(slot) : '';
    if (key === session.previewKey) return;
    session.previewKey = key;
    cancelCanvasAnimations();
    const before = measureBlocks();
    removePreview();
    if (slot) insertPreview(slot);
    animateFromBefore(before);
  }

  // ── Життєвий цикл ────────────────────────────────────────────────────────

  function cleanupListeners() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('blur', onPointerCancel);
  }

  function clearCandidate() {
    candidate = null;
  }

  function endSession() {
    if (!session) return;
    window.cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    removePreview();
    session.ghost.remove();
    document.body.classList.remove('is-dragging');
    palette.classList.remove('is-bin');
    canvas.classList.remove('is-drop-target');
    session = null;
  }

  function startDrag(event) {
    const { source, el } = candidate;
    const rect = el.getBoundingClientRect();
    const offset = { x: candidate.startX - rect.left, y: candidate.startY - rect.top };

    const ghost = document.createElement('div');
    ghost.className = 'blk-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.setAttribute('inert', '');

    if (source.kind === 'block') {
      const clones = collectTailClones(el);
      ghost.append(...clones);
      stripGhost(ghost);
      lift(source.id);
    } else {
      ghost.appendChild(createPaletteBlock(source.type));
    }
    document.body.appendChild(ghost);
    syncShapes(ghost);

    const { points, listElements } = buildPoints();
    session = {
      source,
      ghost,
      offset,
      points,
      listElements,
      height: ghost.offsetHeight,
      pointer: { x: event.clientX, y: event.clientY },
      coarse: event.pointerType === 'touch' || event.pointerType === 'pen',
      mode: 'none',
      slot: null,
      slotKey: '',
      previewKey: '',
      preview: null,
      shifted: null,
      flying: false,
      loosePos: null,
    };
    document.body.classList.add('is-dragging');
    window.addEventListener('keydown', onKeyDown, true);
    updateDrag();
  }

  function updateDrag() {
    if (!session || session.flying) return;
    const { pointer, offset, ghost, points } = session;
    const left = pointer.x - offset.x;
    const top = pointer.y - offset.y;
    ghost.style.transform = `translate(${left}px, ${top}px) rotate(-2deg)`;

    const canvasRect = canvas.getBoundingClientRect();
    const paletteRect = palette.getBoundingClientRect();
    const overPalette = pointer.x >= paletteRect.left && pointer.x <= paletteRect.right
      && pointer.y >= paletteRect.top && pointer.y <= paletteRect.bottom;
    const overCanvas = pointer.x >= canvasRect.left && pointer.x <= canvasRect.right
      && pointer.y >= canvasRect.top && pointer.y <= canvasRect.bottom;

    palette.classList.toggle('is-bin', overPalette);
    ghost.classList.toggle('is-deleting', overPalette);
    canvas.classList.toggle('is-drop-target', overCanvas);

    session.slot = null;
    session.loosePos = null;
    if (overPalette) {
      session.mode = 'delete';
    } else if (overCanvas) {
      const contentX = left - canvasRect.left + canvas.scrollLeft;
      const contentY = top - canvasRect.top + canvas.scrollTop;
      const scale = canvas.offsetWidth > 0 ? canvasRect.width / canvas.offsetWidth : 1;
      const slot = findSnapTarget(
        points,
        { x: contentX, y: contentY, height: session.height },
        {
          radius: session.coarse ? SNAP_RADIUS_TOUCH : SNAP_RADIUS,
          previousKey: session.slotKey,
          scale,
        },
      );
      if (slot) {
        session.mode = 'snap';
        session.slot = slot;
      } else {
        session.mode = 'loose';
        session.loosePos = { x: Math.max(0, contentX), y: Math.max(0, contentY) };
      }
    } else {
      session.mode = 'none';
    }
    session.slotKey = session.slot ? snapKey(session.slot) : '';
    showPreview(session.slot);
  }

  function autoScroll() {
    if (!session || session.flying) return;
    const rect = canvas.getBoundingClientRect();
    const { x, y } = session.pointer;
    let canvasDelta = 0;
    let pageDelta = 0;
    const inside = x >= rect.left && x <= rect.right;
    if (inside && y >= rect.top && y < rect.top + EDGE_ZONE) {
      canvasDelta = -MAX_SCROLL_SPEED * ((rect.top + EDGE_ZONE - y) / EDGE_ZONE);
    } else if (inside && y <= rect.bottom && y > rect.bottom - EDGE_ZONE) {
      canvasDelta = MAX_SCROLL_SPEED * ((y - (rect.bottom - EDGE_ZONE)) / EDGE_ZONE);
    }
    if (y < EDGE_ZONE) pageDelta = -MAX_SCROLL_SPEED * ((EDGE_ZONE - y) / EDGE_ZONE);
    else if (y > window.innerHeight - EDGE_ZONE) pageDelta = MAX_SCROLL_SPEED * ((y - (window.innerHeight - EDGE_ZONE)) / EDGE_ZONE);

    if (canvasDelta !== 0) canvas.scrollTop += canvasDelta;
    if (pageDelta !== 0) window.scrollBy(0, pageDelta);
    if (canvasDelta !== 0 || pageDelta !== 0) updateDrag();
    scrollFrame = window.requestAnimationFrame(autoScroll);
  }

  function finish(commit) {
    const finished = session;
    cleanupListeners();
    clearCandidate();
    suppressClickUntil = performance.now() + 350;
    if (!finished) return;
    window.cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    const result = {
      source: finished.source,
      mode: finished.mode,
      slot: finished.slot,
      height: finished.height,
      x: finished.loosePos?.x ?? 0,
      y: finished.loosePos?.y ?? 0,
    };

    const complete = () => {
      endSession();
      if (!commit || result.mode === 'none') {
        onCancel(result.source);
        return;
      }
      onDrop(result);
      if (result.mode === 'snap') onSnap?.();
    };

    if (commit && result.mode === 'snap' && finished.preview && !prefersReducedMotion()) {
      // «Привид» злітає з-під курсора в силует, і лише тоді з’являється справжній блок.
      finished.flying = true;
      const target = finished.preview.getBoundingClientRect();
      const { ghost } = finished;
      ghost.style.transition = `transform ${FLY_MS}ms cubic-bezier(0.2, 0.8, 0.3, 1)`;
      ghost.style.transform = `translate(${target.left}px, ${target.top}px) rotate(0deg)`;
      window.setTimeout(complete, FLY_MS + 20);
      return;
    }
    complete();
  }

  // ── Обробники подій ──────────────────────────────────────────────────────

  function onPointerMove(event) {
    if (!candidate || event.pointerId !== candidate.pointerId) return;
    const dx = event.clientX - candidate.startX;
    const dy = event.clientY - candidate.startY;
    if (!session) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      startDrag(event);
      scrollFrame = window.requestAnimationFrame(autoScroll);
      return;
    }
    event.preventDefault();
    session.pointer = { x: event.clientX, y: event.clientY };
    updateDrag();
  }

  function onPointerUp(event) {
    if (!candidate || event.pointerId !== candidate.pointerId) return;
    if (!session) {
      cleanupListeners();
      clearCandidate();
      return;
    }
    session.pointer = { x: event.clientX, y: event.clientY };
    updateDrag();
    finish(true);
  }

  function onPointerCancel(event) {
    if (event?.pointerId !== undefined && candidate && event.pointerId !== candidate.pointerId) return;
    if (!session) {
      cleanupListeners();
      clearCandidate();
      return;
    }
    finish(false);
  }

  function onKeyDown(event) {
    if (event.key === 'Escape' && session && !session.flying) {
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    }
  }

  function begin(event, source, el) {
    if (candidate || session || isLocked()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    candidate = {
      source,
      el,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', onPointerCancel);
  }

  canvas.addEventListener('pointerdown', (event) => {
    const el = event.target.closest('.blk');
    if (!el || el.dataset.hat) return;
    if (event.target.closest(INTERACTIVE)) return;
    begin(event, { kind: 'block', id: Number(el.dataset.blockId) }, el);
  });

  palette.addEventListener('pointerdown', (event) => {
    const el = event.target.closest('.blk-palette');
    if (!el) return;
    begin(event, { kind: 'palette', type: el.dataset.paletteType }, el);
  });

  return {
    /** true одразу після перетягування: клік, що за ним іде, треба проігнорувати. */
    shouldSuppressClick: () => performance.now() < suppressClickUntil,
    isDragging: () => Boolean(session),
  };
}
