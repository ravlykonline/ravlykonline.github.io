export function getAllowedTileDefs({ level, tileDefs }) {
  const allowed = level.allowedTiles;
  if (!allowed || allowed.length === 0) {
    return [...tileDefs];
  }

  return tileDefs.filter((tile) => allowed.includes(tile.dir));
}

export function renderPalette({
  createTileIcon,
  documentRef = document,
  level,
  onPointerDown,
  onSelect,
  selectedDir,
  text,
  tileDefs
}) {
  const palette = documentRef.createElement('div');
  palette.className = 'palette';

  for (const tile of getAllowedTileDefs({ level, tileDefs })) {
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.className = ['atile', tile.group, selectedDir === tile.dir ? 'sel' : ''].filter(Boolean).join(' ');
    button.dataset.dir = tile.dir;
    button.dataset.group = tile.group;
    button.setAttribute('aria-label', text.render.dragToBoard(tile.label));
    button.appendChild(createTileIcon(tile));
    if (onPointerDown) {
      button.addEventListener('pointerdown', (event) => onPointerDown(event, button, tile));
    }
    button.addEventListener('click', () => onSelect(tile.dir, button, tile));
    palette.appendChild(button);
  }

  return palette;
}
