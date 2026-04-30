export function renderLevelMap({ completedLevelIds, currentLevelId, documentRef = document, levels, onSelect, text }) {
  const grid = documentRef.createElement('div');
  grid.className = 'level-map-grid';

  for (const level of levels) {
    const isCurrent = level.id === currentLevelId;
    const isDone = completedLevelIds.includes(level.id);
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.className = [
      'map-level',
      isCurrent ? 'current' : '',
      isDone ? 'done' : ''
    ].filter(Boolean).join(' ');
    button.dataset.levelId = String(level.id);

    const idEl = documentRef.createElement('span');
    idEl.className = 'map-level-id';
    idEl.textContent = String(level.id);

    const nameEl = documentRef.createElement('span');
    nameEl.className = 'map-level-name';
    nameEl.textContent = level.name;

    const stateEl = documentRef.createElement('span');
    stateEl.className = 'map-level-state';
    stateEl.textContent = text.mapState(isCurrent, isDone);

    button.append(idEl, nameEl, stateEl);
    button.addEventListener('click', () => onSelect(level.id));
    grid.appendChild(button);
  }

  return grid;
}
