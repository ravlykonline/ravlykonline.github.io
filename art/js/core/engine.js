import { COLS, ROWS, CELL_SIZE, SNAIL_SIZE } from './constants.js';

export function cellToPixels(value) {
  return value * CELL_SIZE + (CELL_SIZE - SNAIL_SIZE) / 2;
}

export function cellToGridIntersection(value) {
  return value * CELL_SIZE;
}

export function moveSnail(snail, blockType) {
  const nextSnail = { ...snail };

  if (blockType === 'move_n') {
    nextSnail.y -= 1;
    nextSnail.dir = 'N';
  } else if (blockType === 'move_s') {
    nextSnail.y += 1;
    nextSnail.dir = 'S';
  } else if (blockType === 'move_e') {
    nextSnail.x += 1;
    nextSnail.dir = 'E';
  } else if (blockType === 'move_w') {
    nextSnail.x -= 1;
    nextSnail.dir = 'W';
  }

  nextSnail.x = Math.max(0, Math.min(COLS - 1, nextSnail.x));
  nextSnail.y = Math.max(0, Math.min(ROWS - 1, nextSnail.y));

  return nextSnail;
}

export function sleep(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}
