export function createRenderDrag({
  clearPendingDelete,
  createTileIconByDir,
  documentRef = document,
  ghostEl,
  placeArrow,
  state,
  windowRef = window
}) {
  function clearDropTarget() {
    if (state.dragCell) {
      state.dragCell.classList.remove('drop');
      state.dragCell = null;
    }
  }

  function showGhost(group) {
    ghostEl.replaceChildren();
    const iconEl = createTileIconByDir(state.dragDir, 'tile-icon');
    if (iconEl) {
      ghostEl.appendChild(iconEl);
    }
    ghostEl.style.background = group === 'trn' ? 'var(--t-trn)' : 'var(--t-str)';
    ghostEl.classList.add('show');
  }

  function hideGhost() {
    ghostEl.classList.remove('show');
    ghostEl.replaceChildren();
  }

  function moveGhost(x, y) {
    const size = parseFloat(windowRef.getComputedStyle(documentRef.documentElement).getPropertyValue('--tile-sz')) || 56;
    ghostEl.style.left = `${x - size / 2}px`;
    ghostEl.style.top = `${y - size / 2}px`;
  }

  function updateDropTarget(clientX, clientY) {
    if (!state.dragDir) {
      return;
    }

    ghostEl.style.pointerEvents = 'none';
    const under = documentRef.elementFromPoint(clientX, clientY)?.closest?.('.cell') || null;
    ghostEl.style.pointerEvents = '';

    if (state.dragCell && state.dragCell !== under) {
      state.dragCell.classList.remove('drop');
    }

    if (under) {
      under.classList.add('drop');
    }

    state.dragCell = under;
  }

  function beginPointerDrag(event, button, dir, group) {
    if (state.running || button.disabled) {
      return;
    }

    clearPendingDelete();
    state.dragDir = dir;
    state.dragPointerId = event.pointerId;
    state.dragButton = button;
    state.dragMoved = false;
    state.suppressTileClick = false;
    button.classList.add('dragging');
    button.setPointerCapture?.(event.pointerId);
    documentRef.body?.classList.add('dragging-active');
    showGhost(group);
    moveGhost(event.clientX, event.clientY);
    updateDropTarget(event.clientX, event.clientY);
  }

  function endPointerDrag(clientX, clientY) {
    if (!state.dragDir) {
      return false;
    }

    moveGhost(clientX, clientY);
    updateDropTarget(clientX, clientY);

    const targetCell = state.dragCell;
    const dir = state.dragDir;
    const button = state.dragButton;

    hideGhost();
    clearDropTarget();

    if (button) {
      button.classList.remove('dragging');
    }

    documentRef.body?.classList.remove('dragging-active');
    state.dragDir = null;
    state.dragButton = null;
    state.dragPointerId = null;

    if (targetCell) {
      const r = Number(targetCell.dataset.r);
      const c = Number(targetCell.dataset.c);
      if (!Number.isNaN(r) && !Number.isNaN(c)) {
        placeArrow(r, c, dir);
        state.suppressTileClick = true;
        return true;
      }
    }

    state.suppressTileClick = !!state.dragMoved;
    return false;
  }

  return {
    beginPointerDrag,
    clearDropTarget,
    endPointerDrag,
    hideGhost,
    moveGhost,
    updateDropTarget
  };
}
