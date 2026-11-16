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
    const apple = app.getApple();
    const start = app.getStart();

    if (app.state.running) {
      return;
    }
    if ((r === apple.r && c === apple.c) || (r === start.r && c === start.c) || app.isObstacle(r, c)) {
      return;
    }

    applyArrowEdit(r, c, dir);
  }

  const dragApi = app.createRenderDrag({
    clearPendingDelete,
    ghostEl,
    placeArrow
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
    const { r, c, dir } = arrowHistory.pop();
    const undoHadFocus = documentRef.activeElement === btnUndo;
    applyArrowEdit(r, c, dir, false);
    if (btnUndo?.disabled && undoHadFocus) {
      setActiveGridCell(r, c);
    }
  }

  function applyArrowEdit(r, c, dir, record = true) {
    const key = `${r},${c}`;
    const previous = app.state.arrows[key];
    if (previous === dir) {
      return;
    }
    if (record) {
      arrowHistory.push({ r, c, dir: previous });
      if (arrowHistory.length > maxUndoSteps) {
        arrowHistory.shift();
      }
    }
    clearPendingDelete();
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
    if (app.state.selDir) {
      placeArrow(r, c, app.state.selDir);
      return;
    }
    if (app.state.arrows[`${r},${c}`]) {
      setPendingDelete(r, c);
      return;
    }
    clearPendingDelete();
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
    resetUndoHistory();
    const grid = createBoardGrid({
      cols,
      documentRef,
      onCellAction(r, c) {
        setActiveGridCell(r, c, { focus: false });
        cellClick(r, c);
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
    beginPointerDrag: dragApi.beginPointerDrag,
    buildPalette,
    buildGrid,
    bumpSnail: snailApi.bumpSnail,
    cellEl,
    clearDropTarget: dragApi.clearDropTarget,
    clearPendingDelete,
    clearStartHighlight,
    clearTrail,
    deselect,
    endPointerDrag: dragApi.endPointerDrag,
    hideGhost: dragApi.hideGhost,
    moveGhost: dragApi.moveGhost,
    placeArrow,
    posSnail: snailApi.posSnail,
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
