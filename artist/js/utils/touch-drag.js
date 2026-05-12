/**
 * Touch drag-and-drop emulation.
 *
 * Usage:
 *   makeTouchDraggable(element, getPayload, onDragStart, onDragEnd)
 *   makeDropTarget(element, onDrop)
 *
 * When a touch-drag ends over a drop target, the target's registered
 * onDrop(payload) is called with the payload returned by getPayload().
 */

let activeDrag = null; // { payload, clone, startX, startY }

const dropTargets = new WeakMap(); // element → onDrop(payload)

function getElementFromTouch(touch) {
  // Temporarily hide clone so elementFromPoint looks through it
  if (activeDrag?.clone) activeDrag.clone.style.display = 'none';
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  if (activeDrag?.clone) activeDrag.clone.style.display = '';
  return el;
}

function findDropTarget(el) {
  let node = el;
  while (node && node !== document.body) {
    if (dropTargets.has(node)) return node;
    node = node.parentElement;
  }
  return null;
}

let currentHighlighted = null;

function highlightDropTarget(el) {
  const target = el ? findDropTarget(el) : null;
  if (target === currentHighlighted) return;
  if (currentHighlighted) currentHighlighted.classList.remove('drag-over');
  currentHighlighted = target;
  if (currentHighlighted) currentHighlighted.classList.add('drag-over');
}

export function makeTouchDraggable(element, getPayload, onDragStart, onDragEnd) {
  element.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.touches[0];

    const rect = element.getBoundingClientRect();
    const clone = element.cloneNode(true);
    clone.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      pointer-events: none;
      opacity: 0.85;
      z-index: 9999;
      transform: scale(1.05);
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      border-radius: 8px;
    `;
    document.body.appendChild(clone);

    activeDrag = {
      payload: getPayload(),
      clone,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
    };

    element.classList.add('dragging');
    onDragStart?.();
    // For touch we also need to signal "drop target active" so drop zones become visible
    document.dispatchEvent(new CustomEvent('touch-drag-start'));
  }, { passive: false });

  element.addEventListener('touchmove', (event) => {
    if (!activeDrag) return;
    event.preventDefault();
    const touch = event.touches[0];
    activeDrag.clone.style.left = `${touch.clientX - activeDrag.offsetX}px`;
    activeDrag.clone.style.top = `${touch.clientY - activeDrag.offsetY}px`;
    highlightDropTarget(getElementFromTouch(touch));
  }, { passive: false });

  element.addEventListener('touchend', (event) => {
    if (!activeDrag) return;
    const touch = event.changedTouches[0];
    const el = getElementFromTouch(touch);
    const target = el ? findDropTarget(el) : null;

    if (target) {
      dropTargets.get(target)(activeDrag.payload);
    }

    activeDrag.clone.remove();
    element.classList.remove('dragging');
    highlightDropTarget(null);
    activeDrag = null;
    onDragEnd?.();
    document.dispatchEvent(new CustomEvent('touch-drag-end'));
  }, { passive: false });
}

export function makeDropTarget(element, onDrop) {
  dropTargets.set(element, onDrop);
}
