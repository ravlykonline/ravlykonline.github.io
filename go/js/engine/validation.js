import { GAME_CONFIG } from '../core/config.js';
import { DIRECTION_DELTAS, LEVEL_TYPES, TILE_IDS, resolveTileExit } from '../core/constants.js';

const VALID_LEVEL_TYPES = new Set(LEVEL_TYPES);
const VALID_TILE_IDS = new Set(TILE_IDS);

function coordinateKey(point) {
  return `${point.r},${point.c}`;
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isIntegerCoordinate(point) {
  return isPlainObject(point) && Number.isInteger(point.r) && Number.isInteger(point.c);
}

function isInside(level, point) {
  return point.r >= 0 && point.r < level.rows && point.c >= 0 && point.c < level.cols;
}

function addError(errors, level, code, message) {
  errors.push({
    code,
    levelId: level?.id ?? null,
    message
  });
}

function validateCoordinate(errors, level, point, fieldName) {
  if (!isIntegerCoordinate(point)) {
    addError(errors, level, `invalid-${fieldName}`, `${fieldName} must be an integer coordinate`);
    return false;
  }

  if (!isInside(level, point)) {
    addError(errors, level, `${fieldName}-out-of-board`, `${fieldName} must be inside the board`);
    return false;
  }

  return true;
}

function validateObstacle(errors, level, obstacle, obstacleKeys) {
  if (!isIntegerCoordinate(obstacle)) {
    addError(errors, level, 'invalid-obstacle', 'obstacle must be an integer coordinate');
    return;
  }

  if (!isInside(level, obstacle)) {
    addError(errors, level, 'obstacle-out-of-board', 'obstacle must be inside the board');
    return;
  }

  const key = coordinateKey(obstacle);
  if (obstacleKeys.has(key)) {
    addError(errors, level, 'duplicate-obstacle', 'obstacles must not overlap');
  }
  obstacleKeys.add(key);
}

function validatePresetArrows(errors, level, obstacleKeys) {
  if (!isPlainObject(level.presetArrows)) {
    addError(errors, level, 'invalid-preset-arrows', 'presetArrows must be an object');
    return;
  }

  for (const [key, tileId] of Object.entries(level.presetArrows)) {
    if (!VALID_TILE_IDS.has(tileId)) {
      addError(errors, level, 'invalid-preset-arrow-tile', `preset arrow ${key} uses an unknown tile`);
    }

    const match = key.match(/^(\d+),(\d+)$/);
    if (!match) {
      addError(errors, level, 'invalid-preset-arrow-coordinate', `preset arrow ${key} has an invalid coordinate`);
      continue;
    }

    const point = { r: Number(match[1]), c: Number(match[2]) };
    if (!isInside(level, point)) {
      addError(errors, level, 'preset-arrow-out-of-board', `preset arrow ${key} must be inside the board`);
    }
    if (coordinateKey(level.start) === key) {
      addError(errors, level, 'preset-arrow-on-start', `preset arrow ${key} must not be on start`);
    }
    if (coordinateKey(level.apple) === key) {
      addError(errors, level, 'preset-arrow-on-apple', `preset arrow ${key} must not be on apple`);
    }
    if (obstacleKeys.has(key)) {
      addError(errors, level, 'preset-arrow-on-obstacle', `preset arrow ${key} must not be on an obstacle`);
    }
  }
}

function findSolution(level) {
  const obstacleKeys = new Set((level.obstacles || []).map(coordinateKey));
  const queue = [{ r: level.start.r, c: level.start.c, facing: null, firstStep: true }];
  const visited = new Set(['start']);

  while (queue.length > 0) {
    const state = queue.shift();

    if (state.firstStep) {
      for (const dir of GAME_CONFIG.routeScanOrder) {
        const delta = DIRECTION_DELTAS[dir];
        const next = { r: state.r + delta.dr, c: state.c + delta.dc };
        const key = coordinateKey(next);
        const stateKey = `${key}|${dir}`;

        if (!isInside(level, next) || obstacleKeys.has(key) || coordinateKey(level.apple) === key) {
          continue;
        }
        if (visited.has(stateKey)) {
          continue;
        }
        if (!level.allowedTiles.some((tileId) => resolveTileExit(tileId, dir))) {
          continue;
        }

        visited.add(stateKey);
        queue.push({ r: next.r, c: next.c, facing: dir, firstStep: false });
      }
      continue;
    }

    for (const tileId of level.allowedTiles) {
      const exitDir = resolveTileExit(tileId, state.facing);
      if (!exitDir) {
        continue;
      }

      const delta = DIRECTION_DELTAS[exitDir];
      const next = { r: state.r + delta.dr, c: state.c + delta.dc };
      const key = coordinateKey(next);
      const stateKey = `${key}|${exitDir}`;

      if (!isInside(level, next) || obstacleKeys.has(key)) {
        continue;
      }
      if (coordinateKey(level.apple) === key) {
        return true;
      }
      if (visited.has(stateKey)) {
        continue;
      }

      visited.add(stateKey);
      queue.push({ r: next.r, c: next.c, facing: exitDir, firstStep: false });
    }
  }

  return false;
}

export function validateLevel(level) {
  const errors = [];

  if (!isPlainObject(level)) {
    return [{ code: 'invalid-level', levelId: null, message: 'level must be an object' }];
  }

  if (!Number.isInteger(level.id)) {
    addError(errors, level, 'invalid-id', 'level id must be an integer');
  }
  if (!VALID_LEVEL_TYPES.has(level.type)) {
    addError(errors, level, 'invalid-type', 'level type must be play or debug');
  }
  if (!Number.isInteger(level.rows) || level.rows <= 0 || !Number.isInteger(level.cols) || level.cols <= 0) {
    addError(errors, level, 'invalid-board-size', 'rows and cols must be positive integers');
  }

  const hasValidStart = validateCoordinate(errors, level, level.start, 'start');
  const hasValidApple = validateCoordinate(errors, level, level.apple, 'apple');
  if (hasValidStart && hasValidApple && coordinateKey(level.start) === coordinateKey(level.apple)) {
    addError(errors, level, 'start-on-apple', 'start and apple must be different cells');
  }

  const obstacleKeys = new Set();
  if (!Array.isArray(level.obstacles)) {
    addError(errors, level, 'invalid-obstacles', 'obstacles must be an array');
  } else {
    for (const obstacle of level.obstacles) {
      validateObstacle(errors, level, obstacle, obstacleKeys);
    }
  }

  if (hasValidStart && obstacleKeys.has(coordinateKey(level.start))) {
    addError(errors, level, 'obstacle-on-start', 'obstacle must not be on start');
  }
  if (hasValidApple && obstacleKeys.has(coordinateKey(level.apple))) {
    addError(errors, level, 'obstacle-on-apple', 'obstacle must not be on apple');
  }

  if (!Array.isArray(level.allowedTiles) || level.allowedTiles.length === 0) {
    addError(errors, level, 'invalid-allowed-tiles', 'allowedTiles must be a non-empty array');
  } else {
    for (const tileId of level.allowedTiles) {
      if (!VALID_TILE_IDS.has(tileId)) {
        addError(errors, level, 'invalid-allowed-tile', `unknown allowed tile: ${tileId}`);
      }
    }
  }

  validatePresetArrows(errors, level, obstacleKeys);

  if (errors.length === 0 && !findSolution(level)) {
    addError(errors, level, 'unsolvable-level', 'level must be solvable with allowed tiles');
  }

  return errors;
}

export function validateLevels(levels) {
  const errors = [];
  if (!Array.isArray(levels)) {
    return [{ code: 'invalid-levels', levelId: null, message: 'levels must be an array' }];
  }

  if (levels.length !== GAME_CONFIG.totalLevels) {
    errors.push({
      code: 'invalid-level-count',
      levelId: null,
      message: `expected exactly ${GAME_CONFIG.totalLevels} levels`
    });
  }

  const ids = new Set();
  for (const level of levels) {
    if (ids.has(level.id)) {
      addError(errors, level, 'duplicate-id', 'level ids must be unique');
    }
    ids.add(level.id);
    errors.push(...validateLevel(level));
  }

  return errors;
}
