export function installLegacyRenderDrag({
  documentRef = document,
  windowRef = window
} = {}) {
  const app = windowRef.SnailGame;

  app.createRenderDrag = function createRenderDrag(deps) {
    const { clearPendingDelete, ghostEl, placeArrow } = deps;

    function clearDropTarget() {
      if (app.state.dragCell) {
        app.state.dragCell.classList.remove('drop');
        app.state.dragCell = null;
      }
    }

    function showGhost(group) {
      ghostEl.replaceChildren();
      const iconEl = app.createTileIconByDir(app.state.dragDir, 'tile-icon');
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
      if (!app.state.dragDir) {
        return;
      }

      ghostEl.style.pointerEvents = 'none';
      const under = documentRef.elementFromPoint(clientX, clientY)?.closest?.('.cell') || null;
      ghostEl.style.pointerEvents = '';

      if (app.state.dragCell && app.state.dragCell !== under) {
        app.state.dragCell.classList.remove('drop');
      }

      if (under) {
        under.classList.add('drop');
      }

      app.state.dragCell = under;
    }

    function beginPointerDrag(event, button, dir, group) {
      if (app.state.running || button.disabled) {
        return;
      }

      clearPendingDelete();
      app.state.dragDir = dir;
      app.state.dragPointerId = event.pointerId;
      app.state.dragButton = button;
      app.state.dragMoved = false;
      app.state.suppressTileClick = false;
      button.classList.add('dragging');
      button.setPointerCapture?.(event.pointerId);
      documentRef.body?.classList.add('dragging-active');
      showGhost(group);
      moveGhost(event.clientX, event.clientY);
      updateDropTarget(event.clientX, event.clientY);
    }

    function endPointerDrag(clientX, clientY) {
      if (!app.state.dragDir) {
        return false;
      }

      moveGhost(clientX, clientY);
      updateDropTarget(clientX, clientY);

      const targetCell = app.state.dragCell;
      const dir = app.state.dragDir;
      const button = app.state.dragButton;

      hideGhost();
      clearDropTarget();

      if (button) {
        button.classList.remove('dragging');
      }

      documentRef.body?.classList.remove('dragging-active');
      app.state.dragDir = null;
      app.state.dragButton = null;
      app.state.dragPointerId = null;

      if (targetCell) {
        const r = Number(targetCell.dataset.r);
        const c = Number(targetCell.dataset.c);
        if (!Number.isNaN(r) && !Number.isNaN(c)) {
          placeArrow(r, c, dir);
          app.state.suppressTileClick = true;
          return true;
        }
      }

      app.state.suppressTileClick = !!app.state.dragMoved;
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
  };

  return app.createRenderDrag;
}
