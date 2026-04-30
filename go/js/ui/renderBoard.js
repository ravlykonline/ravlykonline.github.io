export function getCellKey(row, col) {
  return `${row},${col}`;
}

export function createBoardGrid({
  cols,
  documentRef = document,
  onCellAction,
  onCellFocus,
  rows
}) {
  const grid = documentRef.createElement('div');
  grid.className = 'grid';
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = documentRef.createElement('div');
      cell.className = `cell ${(row + col) % 2 === 0 ? 'odd' : 'even'}`;
      cell.dataset.r = String(row);
      cell.dataset.c = String(col);
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('tabindex', row === 0 && col === 0 ? '0' : '-1');
      cell.addEventListener('click', () => onCellAction?.(row, col));
      cell.addEventListener('focus', () => onCellFocus?.(row, col));
      grid.appendChild(cell);
    }
  }

  return grid;
}

export function renderBoardCell({
  cell,
  createAssetIcon,
  level,
  obstacle,
  state,
  text,
  tileDef
}) {
  if (!cell) {
    return null;
  }

  const row = Number(cell.dataset.r);
  const col = Number(cell.dataset.c);
  const key = getCellKey(row, col);
  const isApple = row === level.apple.r && col === level.apple.c;
  const isStart = row === level.start.r && col === level.start.c;
  const shouldRenderApple = isApple && !state.appleEaten;
  const isPendingDelete = state.pendingDeleteKey === key;
  const isPresetArrow = Object.prototype.hasOwnProperty.call(level.presetArrows || {}, key);
  const isDebugLevel = level.type === 'debug';
  const isStartPickedArrow = state.startHighlightKey === key;

  cell.replaceChildren();
  cell.classList.toggle('pending-delete', isPendingDelete);
  cell.classList.toggle('debug-cell', isDebugLevel && isPresetArrow);

  if (obstacle) {
    const obstacleEl = cell.ownerDocument.createElement('span');
    obstacleEl.className = `cell-obstacle ${obstacle.kind}`;
    obstacleEl.appendChild(createAssetIcon(obstacle.kind === 'log' ? 'stump.svg' : 'rock.svg', 'obstacle-icon'));
    obstacleEl.setAttribute('aria-hidden', 'true');
    cell.appendChild(obstacleEl);
  }

  if (shouldRenderApple) {
    const appleEl = cell.ownerDocument.createElement('span');
    appleEl.className = 'cell-apple';
    appleEl.appendChild(createAssetIcon('apple.svg', 'board-icon board-icon-apple'));
    appleEl.setAttribute('aria-hidden', 'true');
    cell.appendChild(appleEl);
  }

  if (tileDef && !shouldRenderApple && !obstacle) {
    const arrowEl = cell.ownerDocument.createElement('div');
    arrowEl.className = [
      'cell-arrow',
      `${tileDef.group}-placed`,
      isPendingDelete ? 'is-pending-delete' : '',
      isPresetArrow ? 'preset-arrow' : '',
      isStartPickedArrow ? 'start-picked-arrow' : ''
    ].filter(Boolean).join(' ');
    arrowEl.appendChild(createAssetIcon(tileDef.iconFile, 'tile-icon'));
    arrowEl.setAttribute('aria-hidden', 'true');
    cell.appendChild(arrowEl);
  }

  let label = text.rowCol(row, col);
  if (obstacle) {
    label += `. ${text.obstacleSuffix(obstacle.label)}`;
  }
  if (tileDef) {
    if (isDebugLevel && isPresetArrow) {
      label += `. ${text.presetDebug}`;
    }
    label += `. ${tileDef.label}${isStartPickedArrow ? `. ${text.startPicked}` : ''}. ${isPendingDelete ? text.pendingDelete : text.clickToDelete}`;
  }
  if (shouldRenderApple) {
    label += `. ${text.appleGoal}`;
  }
  if (isStart) {
    label += `. ${text.snailStart}`;
  }
  cell.setAttribute('aria-label', label);

  return cell;
}
