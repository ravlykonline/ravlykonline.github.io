(function () {
  const app = window.SnailGame;
  const { paletteEl, ghostEl, gridEl } = app.refs;
  const { render: renderText } = app.text;

  function findTileDef(dir) {
    return app.tileDefs.find((item) => item.dir === dir);
  }

  function cellEl(r, c) {
    return gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  }

  function createTileIconElement(def) {
    return app.createAssetIcon(def.iconFile, 'tile-icon');
  }

  function deselect() {
    app.state.selDir = null;
    document.querySelectorAll('.atile').forEach((tile) => tile.classList.remove('sel'));
  }

  // Clears the staged delete marker so clicks never remove arrows accidentally.
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

  // Marks a placed arrow for deletion; a second explicit action actually removes it.
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

  const dragApi = app.createRenderDrag({
    clearPendingDelete,
    ghostEl,
    placeArrow
  });

  function renderObstacle(el, obstacle) {
    const obstacleEl = document.createElement('span');
    obstacleEl.className = `cell-obstacle ${obstacle.kind}`;
    obstacleEl.appendChild(app.createAssetIcon(obstacle.kind === 'log' ? 'stump.svg' : 'rock.svg', 'obstacle-icon'));
    obstacleEl.setAttribute('aria-hidden', 'true');
    el.appendChild(obstacleEl);
  }

  // Rebuilds a single cell from state so arrows, apple and debug markers always stay in sync.
  function renderCell(r, c) {
    const el = cellEl(r, c);
    const start = app.getStart();
    const apple = app.getApple();
    const obstacle = app.getObstacle(r, c);
    const key = `${r},${c}`;
    const def = app.state.arrows[key] ? findTileDef(app.state.arrows[key]) : null;
    const isApple = r === apple.r && c === apple.c;
    const shouldRenderApple = isApple && !app.state.appleEaten;
    const isStart = r === start.r && c === start.c;
    const isPendingDelete = app.state.pendingDeleteKey === key;
    const isDebugLevel = app.state.currentLevel.type === 'debug';
    const isPresetArrow = Object.prototype.hasOwnProperty.call(app.state.currentLevel.presetArrows || {}, key);
    const isStartPickedArrow = app.state.startHighlightKey === key;

    if (!el) {
      return;
    }

    el.innerHTML = '';
    el.classList.toggle('pending-delete', isPendingDelete);
    el.classList.toggle('debug-cell', isDebugLevel && isPresetArrow);

    if (obstacle) {
      renderObstacle(el, obstacle);
    }

    if (shouldRenderApple) {
      const appleEl = document.createElement('span');
      appleEl.className = 'cell-apple';
      appleEl.appendChild(app.createAssetIcon('apple.svg', 'board-icon board-icon-apple'));
      appleEl.setAttribute('aria-hidden', 'true');
      el.appendChild(appleEl);
    }

    if (def && !shouldRenderApple && !obstacle) {
      const arrowEl = document.createElement('div');
      arrowEl.className = `cell-arrow ${def.group}-placed${isPendingDelete ? ' is-pending-delete' : ''}${isPresetArrow ? ' preset-arrow' : ''}${isStartPickedArrow ? ' start-picked-arrow' : ''}`;
      arrowEl.appendChild(createTileIconElement(def));
      arrowEl.setAttribute('aria-hidden', 'true');
      el.appendChild(arrowEl);

      if (isPendingDelete) {
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'cell-delete-btn';
        deleteButton.setAttribute('aria-label', renderText.deleteCommand);
        deleteButton.textContent = '\u2715';
        deleteButton.addEventListener('click', (event) => {
          event.stopPropagation();
          removeArrow(r, c);
        });
        el.appendChild(deleteButton);
      }
    }

    let label = renderText.rowCol(r, c);
    if (obstacle) {
      label += `. ${renderText.obstacleSuffix(obstacle.label)}`;
    }
    if (def) {
      if (isDebugLevel && isPresetArrow) {
        label += `. ${renderText.presetDebug}`;
      }
      label += `. ${def.label}${isStartPickedArrow ? `. ${renderText.startPicked}` : ""}. ${isPendingDelete ? renderText.pendingDelete : renderText.clickToDelete}`;
    }
    if (shouldRenderApple) {
      label += `. ${renderText.appleGoal}`;
    }
    if (isStart) {
      label += `. ${renderText.snailStart}`;
    }
    el.setAttribute('aria-label', label);
  }

  // Re-renders the whole board after level resets or larger state changes.
  function renderAll() {
    const rows = app.config.rows;
    const cols = app.config.cols;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        renderCell(r, c);
      }
    }
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

    clearPendingDelete();
    app.state.arrows[`${r},${c}`] = dir;
    app.persistCurrentArrows?.();
    renderCell(r, c);
    app.ui?.onRouteChanged?.();
  }

  function removeArrow(r, c) {
    if (app.state.running) {
      return;
    }
    const key = `${r},${c}`;
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
    delete app.state.arrows[key];
    if (app.state.pendingDeleteKey === key) {
      app.state.pendingDeleteKey = null;
    }
    app.persistCurrentArrows?.();
    renderCell(r, c);
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

  // Builds the command palette from the tiles allowed in the current level.
  function buildPalette() {
    paletteEl.innerHTML = '';

    app.getAllowedTileDefs().forEach(({ dir, group, label, icon, iconFile }) => {
      const button = document.createElement('button');
      button.className = `atile ${group}`;
      button.dataset.dir = dir;
      button.dataset.group = group;
      button.setAttribute('aria-label', renderText.dragToBoard(label));
      button.appendChild(app.createAssetIcon(iconFile, 'tile-icon'));

      button.addEventListener('pointerdown', (event) => {
        if (event.button !== undefined && event.button !== 0) {
          return;
        }
        dragApi.beginPointerDrag(event, button, dir, group, icon);
      });

      button.addEventListener('click', () => {
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
          app.state.selDir = dir;
          document.querySelectorAll('.atile').forEach((tile) => tile.classList.remove('sel'));
          button.classList.add('sel');
        }
      });

      paletteEl.appendChild(button);
    });
  }

  // Rebuilds the grid DOM to match the current level dimensions and keyboard bindings.
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
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    gridEl.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const el = document.createElement('div');
        el.className = `cell ${(r + c) % 2 === 0 ? 'odd' : 'even'}`;
        el.setAttribute('role', 'gridcell');
        el.setAttribute('tabindex', '-1');
        el.dataset.r = String(r);
        el.dataset.c = String(c);
        el.addEventListener('click', () => {
          setActiveGridCell(r, c, { focus: false });
          cellClick(r, c);
        });
        el.addEventListener('focus', () => {
          setActiveGridCell(r, c, { focus: false });
        });
        el.addEventListener('keydown', (event) => {
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
        });
        gridEl.appendChild(el);
      }
    }

    setActiveGridCell(0, 0, { focus: false });
  }
  const snailApi = app.createRenderSnail({
    cellEl
  });

  // Highlights the neighboring cell the engine will use as the route entry point.
  function setStartHighlight(r, c) {
    const prevKey = app.state.startHighlightKey;
    const nextKey = `${r},${c}`;
    if (prevKey === nextKey) {
      const currentCell = cellEl(r, c);
      currentCell?.classList.add('start-highlight');
      return;
    }

    clearStartHighlight();
    app.state.startHighlightKey = nextKey;
    cellEl(r, c)?.classList.add('start-highlight');
  }

  // Removes the temporary route-entry highlight after the run or reset finishes.
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
  // Leaves a soft trail so the child can see the route the snail already walked.
  function setTrail(r, c) {
    cellEl(r, c)?.classList.add('trail');
  }

  function clearTrail() {
    document.querySelectorAll('.cell.trail').forEach((cell) => cell.classList.remove('trail'));
  }

  app.render = {
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
    renderAll,
    renderCell,
    setPendingDelete,
    setStartHighlight,
    setTrail,
    updateDropTarget: dragApi.updateDropTarget
  };
})();
