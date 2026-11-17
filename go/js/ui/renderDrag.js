export function createRenderDrag({
  clearPendingDelete,
  createTileIconByDir,
  documentRef = document,
  ghostEl,
  moveArrow,
  onCellTap,
  placeArrow,
  removeArrow,
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
    ghostEl.classList.remove('trn');
    if (group === 'trn') {
      ghostEl.classList.add('trn');
    }
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
    if (state.running || state.dragDir || button.disabled) {
      return;
    }

    clearPendingDelete();
    state.dragDir = dir;
    state.dragPointerId = event.pointerId;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
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

  function beginCellDrag(event, cell, r, c, dir, group) {
    if (state.running || state.dragDir || !dir) {
      return;
    }

    clearPendingDelete();
    state.dragDir = dir;
    state.dragGroup = group;
    state.dragSource = { r, c, cell };
    state.dragPointerId = event.pointerId;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.dragButton = null;
    state.dragMoved = false;
    state.suppressTileClick = false;
  }

  function activateSourceDrag(clientX, clientY) {
    const source = state.dragSource;
    if (!source || source.active) {
      return;
    }
    source.active = true;
    source.cell.classList.add('drag-source');
    documentRef.body?.classList.add('dragging-active');
    showGhost(state.dragGroup);
    moveGhost(clientX, clientY);
    updateDropTarget(clientX, clientY);
  }

  function finishSourceDrag(clientX, clientY) {
    const source = state.dragSource;
    const dir = state.dragDir;
    const moved = state.dragMoved;
    state.dragSource = null;
    state.dragDir = null;
    state.dragButton = null;
    state.dragPointerId = null;
    state.dragGroup = null;
    state.suppressCellClickUntil = Date.now() + 450;
    source.cell.classList.remove('drag-source');
    documentRef.body?.classList.remove('dragging-active');

    if (clientX < -1000) {
      hideGhost();
      clearDropTarget();
      return false;
    }

    if (!moved) {
      hideGhost();
      clearDropTarget();
      onCellTap?.(source.r, source.c);
      return true;
    }

    moveGhost(clientX, clientY);
    updateDropTarget(clientX, clientY);
    const targetCell = state.dragCell;
    hideGhost();
    clearDropTarget();

    if (targetCell) {
      const r = Number(targetCell.dataset.r);
      const c = Number(targetCell.dataset.c);
      if (!Number.isNaN(r) && !Number.isNaN(c) && (r !== source.r || c !== source.c)) {
        moveArrow?.(source.r, source.c, r, c, dir);
      }
      return true;
    }

    const gridEl = documentRef.getElementById('grid');
    const rect = gridEl?.getBoundingClientRect();
    const outside = rect && (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom);
    if (outside) {
      removeArrow?.(source.r, source.c);
    }
    return true;
  }

  function endPointerDrag(clientX, clientY) {
    if (state.dragSource) {
      return finishSourceDrag(clientX, clientY);
    }

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
    activateSourceDrag,
    beginCellDrag,
    beginPointerDrag,
    clearDropTarget,
    endPointerDrag,
    hideGhost,
    moveGhost,
    updateDropTarget
  };
}
