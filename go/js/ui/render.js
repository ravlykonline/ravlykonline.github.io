import { createBoardGrid, renderBoardCell } from './renderBoard.js';
import { renderPalette } from './renderPalette.js';

export function createRender({
  app,
  documentRef = document
}) {
  const { btnUndo, paletteEl, ghostEl, gridEl } = app.refs;
  const { render: renderText } = app.text;
  const arrowHistory = [];
  const maxUndoSteps = 80;

  function findTileDef(dir) {
    return app.tileDefs.find((item) => item.dir === dir);
  }

  function cellEl(r, c) {
    return gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  }

  function deselect() {
    const wasSelected = app.state.selDir !== null;
    app.state.selDir = null;
    const staleTarget = app.state.targetCellKey;
    app.state.targetCellKey = null;
    if (staleTarget) {
      const [tr, tc] = staleTarget.split(',').map(Number);
      renderCell(tr, tc);
    }
    for (const tile of documentRef.querySelectorAll('.atile.sel')) {
      tile.classList.remove('sel');
      tile.setAttribute('aria-pressed', 'false');
    }
    if (wasSelected) {
      app.ui?.updateEditHint?.();
    }
  }

  function clearPendingDelete() {
    const key = app.state.pendingDeleteKey;
    if (!key) {
      return;
    }

    app.state.pendingDeleteKey = null;
    const [r, c] = key.split(',').map(Number);
    if (!Number.isNaN(r) && !Number.isNaN(c)) {
      renderCell(r, c);
    }
  }

  function setPendingDelete(r, c) {
    const key = `${r},${c}`;
    if (!app.state.arrows[key]) {
      clearPendingDelete();
      return;
    }

    if (app.state.pendingDeleteKey === key) {
      clearPendingDelete();
      return;
    }

    const prevKey = app.state.pendingDeleteKey;
    app.state.pendingDeleteKey = key;

    if (prevKey) {
      const [pr, pc] = prevKey.split(',').map(Number);
      if (!Number.isNaN(pr) && !Number.isNaN(pc)) {
        renderCell(pr, pc);
      }
    }

    renderCell(r, c);
  }

  function placeArrow(r, c, dir) {
    if (app.state.running || !canPlaceAt(r, c)) {
      return;
    }

    applyArrowEdit(r, c, dir);
  }

  function canPlaceAt(r, c) {
    const apple = app.getApple();
    const start = app.getStart();
    return !((r === apple.r && c === apple.c) || (r === start.r && c === start.c) || app.isObstacle(r, c));
  }

  function setTarget(r, c) {
    const key = `${r},${c}`;
    const previous = app.state.targetCellKey;
    app.state.targetCellKey = previous === key ? null : key;
    if (previous) {
      const [pr, pc] = previous.split(',').map(Number);
      renderCell(pr, pc);
    }
    renderCell(r, c);
    app.ui?.updateEditHint?.();
  }

  function clearTarget() {
    const previous = app.state.targetCellKey;
    if (!previous) {
      return;
    }
    app.state.targetCellKey = null;
    const [pr, pc] = previous.split(',').map(Number);
    renderCell(pr, pc);
    app.ui?.updateEditHint?.();
  }

  function moveArrow(fromR, fromC, toR, toC, dir) {
    if (app.state.running || !canPlaceAt(toR, toC) || app.state.arrows[`${fromR},${fromC}`] !== dir) {
      return;
    }
    applyArrowEdit(toR, toC, dir);
    applyArrowEdit(fromR, fromC, undefined, true, true);
  }

  const dragApi = app.createRenderDrag({
    clearPendingDelete,
    ghostEl,
    moveArrow,
    onCellTap: (r, c) => {
      setActiveGridCell(r, c, { focus: false });
      cellClick(r, c);
    },
    placeArrow,
    removeArrow: (r, c) => removeArrow(r, c)
  });

  function renderCell(r, c) {
    const el = cellEl(r, c);
    if (!el) {
      return;
    }

    const key = `${r},${c}`;
    const tileDef = app.state.arrows[key] ? findTileDef(app.state.arrows[key]) : null;
    const isPendingDelete = app.state.pendingDeleteKey === key;
    const apple = app.getApple();
    const obstacle = app.getObstacle(r, c);
    const shouldRenderApple = r === apple.r && c === apple.c && !app.state.appleEaten;

    renderBoardCell({
      cell: el,
      createAssetIcon(filename, className) {
        return app.createAssetIcon(filename, className);
      },
      level: app.state.currentLevel,
      obstacle,
      state: app.state,
      text: renderText,
      tileDef
    });

    if (tileDef && isPendingDelete && !shouldRenderApple && !obstacle) {
      const deleteButton = documentRef.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'cell-delete-btn';
      deleteButton.setAttribute('aria-label', renderText.deleteCommand);
      deleteButton.textContent = '\u2715';
      deleteButton.addEventListener('click', (event) => {
        event.stopPropagation();
        removeArrow(r, c);
        setActiveGridCell(r, c);
      });
      el.appendChild(deleteButton);
    }
  }

  function renderAll() {
    const rows = app.config.rows;
    const cols = app.config.cols;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        renderCell(r, c);
      }
    }
  }

  function removeArrow(r, c) {
    if (app.state.running || !app.state.arrows[`${r},${c}`]) {
      return;
    }
    applyArrowEdit(r, c, undefined);
  }

  function refreshUndoButton(disabled = app.state.running) {
    if (btnUndo) {
      btnUndo.disabled = disabled || arrowHistory.length === 0;
    }
  }

  function resetUndoHistory() {
    arrowHistory.length = 0;
    refreshUndoButton();
  }

  function undoArrowEdit() {
    if (app.state.running || arrowHistory.length === 0) {
      return;
    }
    let { r, c, dir, linked } = arrowHistory.pop();
    const undoHadFocus = documentRef.activeElement === btnUndo;
    applyArrowEdit(r, c, dir, false);
    if (linked && arrowHistory.length > 0) {
      ({ r, c, dir } = arrowHistory.pop());
      applyArrowEdit(r, c, dir, false);
    }
    if (btnUndo?.disabled && undoHadFocus) {
      setActiveGridCell(r, c);
    }
  }

  function applyArrowEdit(r, c, dir, record = true, linked = false) {
    const key = `${r},${c}`;
    const previous = app.state.arrows[key];
    if (previous === dir) {
      return;
    }
    if (record) {
      arrowHistory.push({ r, c, dir: previous, linked });
      if (arrowHistory.length > maxUndoSteps) {
        arrowHistory.shift();
      }
    }
    clearPendingDelete();
    const staleTarget = app.state.targetCellKey;
    if (staleTarget) {
      app.state.targetCellKey = null;
      const [tr, tc] = staleTarget.split(',').map(Number);
      renderCell(tr, tc);
    }
    if (app.state.appleEaten) {
      const start = app.getStart();
      const startFacing = app.getStartFacing();
      app.state.appleEaten = false;
      app.state.snailPos = { ...start };
      app.state.snailFacing = startFacing;
      clearTrail();
      clearStartHighlight();
      renderAll();
      snailApi.posSnail(start.r, start.c, false, startFacing);
    }
    // Після зміни карток слід попереднього запуску вже неправдивий.
    clearTrail();
    if (dir) {
      app.state.arrows[key] = dir;
    } else {
      delete app.state.arrows[key];
    }
    app.persistCurrentArrows?.();
    renderCell(r, c);
    refreshUndoButton();
    app.ui?.onRouteChanged?.();
  }

  function cellClick(r, c) {
    if (app.state.running) {
      return;
    }
    const apple = app.getApple();
    const start = app.getStart();
    if ((r === apple.r && c === apple.c) || (r === start.r && c === start.c)) {
      clearPendingDelete();
      clearTarget();
      app.refs.btnRun?.click();
      return;
    }
    const existing = app.state.arrows[`${r},${c}`];
    if (app.state.selDir && app.state.selDir !== existing) {
      placeArrow(r, c, app.state.selDir);
      return;
    }
    if (existing) {
      clearTarget();
      setPendingDelete(r, c);
      return;
    }
    clearPendingDelete();
    if (canPlaceAt(r, c)) {
      setTarget(r, c);
    }
  }

  let activeCellKey = null;

  function setActiveGridCell(r, c, options) {
    const focus = options?.focus !== false;
    const next = cellEl(r, c);
    if (!next) {
      return false;
    }

    if (activeCellKey) {
      const [prevR, prevC] = activeCellKey.split(',').map(Number);
      const prev = cellEl(prevR, prevC);
      if (prev && prev !== next) {
        prev.setAttribute('tabindex', '-1');
        prev.removeAttribute('data-active');
      }
    }

    activeCellKey = `${r},${c}`;
    next.setAttribute('tabindex', '0');
    next.setAttribute('data-active', 'true');

    if (focus) {
      next.focus();
    }
    return true;
  }

  function buildPalette() {
    const palette = renderPalette({
      createTileIcon: (tile) => app.createTileIconByDir(tile.dir, 'tile-icon'),
      documentRef,
      level: app.state.currentLevel,
      onPointerDown(event, button, tile) {
        if (event.button !== undefined && event.button !== 0) {
          return;
        }
        dragApi.beginPointerDrag(event, button, tile.dir, tile.group, tile.icon);
      },
      onSelect(dir, button, event) {
        if (app.state.suppressTileClick) {
          app.state.suppressTileClick = false;
          return;
        }

        if (app.state.running || button.disabled) {
          return;
        }

        clearPendingDelete();
        if (app.state.targetCellKey) {
          const [tr, tc] = app.state.targetCellKey.split(',').map(Number);
          placeArrow(tr, tc, dir);
          return;
        }
        if (app.state.selDir === dir) {
          deselect();
        } else {
          deselect();
          app.state.selDir = dir;
          button.classList.add('sel');
          button.setAttribute('aria-pressed', 'true');
          app.ui?.updateEditHint?.();
          if (event?.detail === 0 && activeCellKey) {
            const [r, c] = activeCellKey.split(',').map(Number);
            setActiveGridCell(r, c);
          }
        }
      },
      selectedDir: app.state.selDir,
      tileDefs: app.tileDefs
    });

    paletteEl.replaceChildren(...Array.from(palette.childNodes));
    // Багато карток (рівні 7+): вони стискаються до сітки, щоб не з'являлась прокрутка.
    paletteEl.classList.toggle('palette-dense', paletteEl.childNodes.length >= 5);
  }

  function buildGrid() {
    const rows = app.config.rows;
    const cols = app.config.cols;
    const moves = {
      ArrowRight: [0, 1],
      ArrowLeft: [0, -1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0]
    };

    activeCellKey = null;
    app.state.targetCellKey = null;
    resetUndoHistory();
    const grid = createBoardGrid({
      cols,
      documentRef,
      onCellAction(r, c) {
        if (Date.now() < (app.state.suppressCellClickUntil || 0)) {
          return;
        }
        setActiveGridCell(r, c, { focus: false });
        cellClick(r, c);
      },
      onCellPointerDown(event, cell, r, c) {
        if ((event.button !== undefined && event.button !== 0) || !cell.classList.contains('has-arrow')) {
          return;
        }
        if (event.target.closest?.('.cell-delete-btn')) {
          return;
        }
        const dir = app.state.arrows[`${r},${c}`];
        const tile = dir ? findTileDef(dir) : null;
        if (tile) {
          dragApi.beginCellDrag(event, cell, r, c, dir, tile.group);
        }
      },
      onCellFocus(r, c) {
        setActiveGridCell(r, c, { focus: false });
      },
      onCellKeyDown(event, r, c) {
        if (event.target.classList.contains('cell-delete-btn')) {
          return;
        }
        if (moves[event.key]) {
          event.preventDefault();
          const [dr, dc] = moves[event.key];
          setActiveGridCell(r + dr, c + dc);
          return;
        }

        if (event.key === 'Home') {
          event.preventDefault();
          setActiveGridCell(r, 0);
          return;
        }

        if (event.key === 'End') {
          event.preventDefault();
          setActiveGridCell(r, cols - 1);
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          cellClick(r, c);
        }
        if (event.key === 'Delete') {
          event.preventDefault();
          removeArrow(r, c);
        }
      },
      rows
    });

    gridEl.replaceChildren(...Array.from(grid.children));
    gridEl.style.gridTemplateColumns = grid.style.gridTemplateColumns;
    gridEl.style.gridTemplateRows = grid.style.gridTemplateRows;

    setActiveGridCell(0, 0, { focus: false });
  }

  const snailApi = app.createRenderSnail({
    cellEl
  });

  function setStartHighlight(r, c) {
    const prevKey = app.state.startHighlightKey;
    const nextKey = `${r},${c}`;
    if (prevKey === nextKey) {
      cellEl(r, c)?.classList.add('start-highlight');
      return;
    }

    clearStartHighlight();
    app.state.startHighlightKey = nextKey;
    cellEl(r, c)?.classList.add('start-highlight');
  }

  function clearStartHighlight() {
    const key = app.state.startHighlightKey;
    if (!key) {
      return;
    }

    const [r, c] = key.split(',').map(Number);
    app.state.startHighlightKey = null;
    if (!Number.isNaN(r) && !Number.isNaN(c)) {
      cellEl(r, c)?.classList.remove('start-highlight');
    }
  }

  function setTrail(r, c) {
    cellEl(r, c)?.classList.add('trail');
  }

  function clearTrail() {
    documentRef.querySelectorAll('.cell.trail').forEach((cell) => cell.classList.remove('trail'));
  }

  return {
    activateSourceDrag: dragApi.activateSourceDrag,
    beginPointerDrag: dragApi.beginPointerDrag,
    buildPalette,
    buildGrid,
    bumpSnail: snailApi.bumpSnail,
    cellEl,
    clearDropTarget: dragApi.clearDropTarget,
    clearPendingDelete,
    clearTarget,
    clearStartHighlight,
    clearTrail,
    deselect,
    endPointerDrag: dragApi.endPointerDrag,
    hideGhost: dragApi.hideGhost,
    moveGhost: dragApi.moveGhost,
    placeArrow,
    posSnail: snailApi.posSnail,
    setSnailMood: snailApi.setMood,
    removeArrow,
    refreshUndoButton,
    resetUndoHistory,
    renderAll,
    renderCell,
    setPendingDelete,
    setStartHighlight,
    setTrail,
    undoArrowEdit,
    updateDropTarget: dragApi.updateDropTarget
  };
}
