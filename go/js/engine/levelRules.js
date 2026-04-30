import { DIRECTION_DELTAS, resolveTileExit } from '../core/constants.js';

export function coordinateKey(r, c) {
  return `${r},${c}`;
}

export function isInsideBoard(level, r, c) {
  return r >= 0 && r < level.rows && c >= 0 && c < level.cols;
}

export function isObstacle(level, r, c) {
  return (level.obstacles || []).some((item) => item.r === r && item.c === c);
}

export function isApple(level, r, c) {
  return level.apple.r === r && level.apple.c === c;
}

export function getArrow(arrows, r, c) {
  return arrows?.[coordinateKey(r, c)] || null;
}

export function canUseArrowFromFacing(tileDir, facing) {
  return resolveTileExit(tileDir, facing) !== null;
}

export function getNextPosition(r, c, direction) {
  const delta = DIRECTION_DELTAS[direction];
  if (!delta) {
    return null;
  }

  return {
    r: r + delta.dr,
    c: c + delta.dc
  };
}
