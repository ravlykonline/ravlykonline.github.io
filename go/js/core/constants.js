export const DIRECTIONS = ['up', 'right', 'down', 'left'];

export const LEVEL_TYPES = ['play', 'debug'];

export const TILE_GROUPS = {
  straight: 'str',
  turn: 'trn'
};

export const DIRECTION_DELTAS = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 }
};

export const TILE_DEFS = [
  { dir: 'up', group: TILE_GROUPS.straight, label: '\u0412\u0433\u043e\u0440\u0443', iconFile: 'straight_up.svg' },
  { dir: 'right', group: TILE_GROUPS.straight, label: '\u0412\u043f\u0440\u0430\u0432\u043e', iconFile: 'straight_right.svg' },
  { dir: 'down', group: TILE_GROUPS.straight, label: '\u0412\u043d\u0438\u0437', iconFile: 'straight_down.svg' },
  { dir: 'left', group: TILE_GROUPS.straight, label: '\u0412\u043b\u0456\u0432\u043e', iconFile: 'straight_left.svg' },
  { dir: 'right-up', group: TILE_GROUPS.turn, label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043b\u0456\u0432\u043e \u2192 \u0432\u0433\u043e\u0440\u0443', iconFile: 'right_to_up.svg' },
  { dir: 'down-right', group: TILE_GROUPS.turn, label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u0433\u043e\u0440\u0443 \u2192 \u0432\u043f\u0440\u0430\u0432\u043e', iconFile: 'bottom_to_right.svg' },
  { dir: 'left-down', group: TILE_GROUPS.turn, label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043f\u0440\u0430\u0432\u043e \u2192 \u0432\u043d\u0438\u0437', iconFile: 'left_to_down.svg' },
  { dir: 'up-left', group: TILE_GROUPS.turn, label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043d\u0438\u0437 \u2192 \u0432\u043b\u0456\u0432\u043e', iconFile: 'top_to_left.svg' },
  { dir: 'right-down', group: TILE_GROUPS.turn, label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043b\u0456\u0432\u043e \u2192 \u0432\u043d\u0438\u0437', iconFile: 'right_to_down.svg' },
  { dir: 'down-left', group: TILE_GROUPS.turn, label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u0433\u043e\u0440\u0443 \u2192 \u0432\u043b\u0456\u0432\u043e', iconFile: 'bottom_to_left.svg' },
  { dir: 'left-up', group: TILE_GROUPS.turn, label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043f\u0440\u0430\u0432\u043e \u2192 \u0432\u0433\u043e\u0440\u0443', iconFile: 'left_to_up.svg' },
  { dir: 'up-right', group: TILE_GROUPS.turn, label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043d\u0438\u0437 \u2192 \u0432\u043f\u0440\u0430\u0432\u043e', iconFile: 'top_to_right.svg' }
];

export const TILE_IDS = TILE_DEFS.map((tile) => tile.dir);

export function oppositeDir(dir) {
  if (!dir) {
    return null;
  }

  return {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left'
  }[dir] || null;
}

export function resolveTileExit(tileDir, incomingDir) {
  if (!tileDir || !incomingDir) {
    return null;
  }

  if (!tileDir.includes('-')) {
    return tileDir === incomingDir ? tileDir : null;
  }

  const [entrySide, exitDir] = tileDir.split('-');
  return oppositeDir(incomingDir) === entrySide ? exitDir : null;
}

export function resolveStartTileExit(tileDir) {
  if (!tileDir) {
    return null;
  }

  if (!tileDir.includes('-')) {
    return tileDir;
  }

  const [, exitDir] = tileDir.split('-');
  return exitDir || null;
}

export function canEnterTile(tileDir, incomingDir) {
  return resolveTileExit(tileDir, incomingDir) !== null;
}
