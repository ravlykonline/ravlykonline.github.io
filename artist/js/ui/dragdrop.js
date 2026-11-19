/**
 * Перетягування блоків на pointer events: одна реалізація для миші, дотику й пера.
 *
 * Модель (власна реалізація, логіка списків — у core/workspace.js):
 *  - pointerdown запам’ятовує джерело: блок палітри або блок у програмі;
 *  - перетягування починається після зсуву ≥ DRAG_THRESHOLD px, інакше це клік;
 *  - беремо «хвіст» (блок і всі під ним у тому ж списку); оригінали зникають
 *    з моделі, під курсором — «привид»;
 *  - точки зчеплення збираються з DOM один раз на початку; найближча до
 *    верхнього лівого кута «привида» підсвічується лінією;
 *  - відпускання: на точку → вставка; на порожнє місце полотна → вільний стос;
 *    на палітру → видалення; деінде / Esc → скасування.
 */
import { nearestInsertionPoint } from '../core/workspace.js';
import { syncShapes } from './blockView.js';

export const DRAG_THRESHOLD = 6;
const LONG_PRESS_MS = 550;
const EDGE_ZONE = 44;
const MAX_SCROLL_SPEED = 18;
const SNAP_RADIUS = { maxDx: 64, maxDy: 36 };

const INTERACTIVE = 'input, button, select, textarea, [contenteditable="true"]';

function ownerFromDataset(value) {
  return value === 'main' ? 'main' : Number(value);
}

export function createDragController({
  canvas,
  palette,
  isLocked,
  lift,
  createPaletteBlock,
  onDrop,
  onCancel,
  onLongPress,
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
    root.querySelectorAll('.blk-menu-btn').forEach((node) => node.remove());
  }

  function collectTailClones(el) {
    const clones = [];
    for (let node = el; node; node = node.nextElementSibling) {
      if (node.classList.contains('blk')) clones.push(node.cloneNode(true));
    }
    return clones;
  }

  function buildPoints() {
    const origin = canvas.getBoundingClientRect();
    const toX = (rectX) => rectX - origin.left + canvas.scrollLeft;
    const toY = (rectY) => rectY - origin.top + canvas.scrollTop;
    const points = [];
    for (const list of canvas.querySelectorAll('.blk-list')) {
      const owner = ownerFromDataset(list.dataset.owner);
      const parentId = list.dataset.parent ? Number(list.dataset.parent) : null;
      const kids = [...list.children].filter((child) => child.classList.contains('blk'));
      if (kids.length === 0) {
        const rect = list.getBoundingClientRect();
        points.push({ owner, parentId, index: 0, x: toX(rect.left), y: toY(rect.top) });
        continue;
      }
      kids.forEach((kid, index) => {
        const rect = kid.getBoundingClientRect();
        points.push({ owner, parentId, index, x: toX(rect.left), y: toY(rect.top) });
      });
      const lastRect = kids[kids.length - 1].getBoundingClientRect();
      points.push({
        owner, parentId, index: kids.length, x: toX(lastRect.left), y: toY(lastRect.bottom),
      });
    }
    return points;
  }

  function setSnapline(point, width) {
    const line = session.snapline;
    if (!point) {
      line.hidden = true;
      return;
    }
    line.hidden = false;
    line.style.left = `${point.x}px`;
    line.style.top = `${point.y - 2}px`;
    line.style.width = `${Math.max(48, width)}px`;
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
    if (candidate?.longPressTimer) window.clearTimeout(candidate.longPressTimer);
    candidate = null;
  }

  function endSession() {
    if (!session) return;
    window.cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    session.ghost.remove();
    session.snapline.remove();
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

    const snapline = document.createElement('div');
    snapline.className = 'ws-snapline';
    snapline.hidden = true;
    canvas.appendChild(snapline);

    session = {
      source,
      ghost,
      snapline,
      offset,
      points: buildPoints(),
      pointer: { x: event.clientX, y: event.clientY },
      mode: 'none',
      slot: null,
      loosePos: null,
    };
    document.body.classList.add('is-dragging');
    window.addEventListener('keydown', onKeyDown, true);
    updateDrag();
  }

  function updateDrag() {
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
      setSnapline(null);
    } else if (overCanvas) {
      const contentX = left - canvasRect.left + canvas.scrollLeft;
      const contentY = top - canvasRect.top + canvas.scrollTop;
      const slot = nearestInsertionPoint(points, contentX, contentY, SNAP_RADIUS);
      if (slot) {
        session.mode = 'snap';
        session.slot = slot;
        setSnapline(slot, ghost.firstElementChild?.offsetWidth ?? 80);
      } else {
        session.mode = 'loose';
        session.loosePos = { x: Math.max(0, contentX), y: Math.max(0, contentY) };
        setSnapline(null);
      }
    } else {
      session.mode = 'none';
      setSnapline(null);
    }
  }

  function autoScroll() {
    if (!session) return;
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
    const result = {
      source: finished.source,
      mode: finished.mode,
      slot: finished.slot,
      x: finished.loosePos?.x ?? 0,
      y: finished.loosePos?.y ?? 0,
    };
    endSession();
    if (!commit || result.mode === 'none') {
      onCancel(result.source);
      return;
    }
    onDrop(result);
  }

  // ── Обробники подій ──────────────────────────────────────────────────────

  function onPointerMove(event) {
    if (!candidate || event.pointerId !== candidate.pointerId) return;
    const dx = event.clientX - candidate.startX;
    const dy = event.clientY - candidate.startY;
    if (!session) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (candidate.longPressTimer) {
        window.clearTimeout(candidate.longPressTimer);
        candidate.longPressTimer = 0;
      }
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
    if (event.key === 'Escape' && session) {
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    }
  }

  function begin(event, source, el) {
    if (candidate || isLocked()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    candidate = {
      source,
      el,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      longPressTimer: 0,
    };
    if (source.kind === 'block' && event.pointerType !== 'mouse') {
      candidate.longPressTimer = window.setTimeout(() => {
        if (!candidate || session) return;
        const { el: target, startX, startY } = candidate;
        cleanupListeners();
        clearCandidate();
        suppressClickUntil = performance.now() + 600;
        onLongPress(target, startX, startY);
      }, LONG_PRESS_MS);
    }
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
