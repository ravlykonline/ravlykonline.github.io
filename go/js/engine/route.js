import { DIRECTION_DELTAS, resolveTileExit } from '../core/constants.js';
import {
  coordinateKey,
  getArrow,
  getNextPosition,
  isApple,
  isInsideBoard,
  isObstacle
} from './levelRules.js';

export function findNeighborStartMove({ arrows = {}, level, scanOrder }) {
  for (const dir of scanOrder) {
    const delta = DIRECTION_DELTAS[dir];
    if (!delta) {
      continue;
    }

    const r = level.start.r + delta.dr;
    const c = level.start.c + delta.dc;
    if (!isInsideBoard(level, r, c) || isObstacle(level, r, c)) {
      continue;
    }

    const tileDir = getArrow(arrows, r, c);
    if (tileDir && resolveTileExit(tileDir, dir)) {
      return {
        c,
        dir,
        r,
        startKey: coordinateKey(r, c)
      };
    }
  }

  return null;
}

export function resolveRouteStep({ arrows = {}, current, facing, firstStep, level, scanOrder, visited }) {
  if (firstStep) {
    const startMove = findNeighborStartMove({ arrows, level, scanOrder });
    if (!startMove) {
      return { ok: false, reason: 'missing-arrow' };
    }

    return {
      dir: startMove.dir,
      ok: true,
      startKey: startMove.startKey
    };
  }

  const key = coordinateKey(current.r, current.c);
  if (visited.has(key)) {
    return { ok: false, reason: 'loop' };
  }
  visited.add(key);

  const tileDir = getArrow(arrows, current.r, current.c);
  if (!tileDir) {
    return { ok: false, reason: 'missing-arrow' };
  }

  const dir = resolveTileExit(tileDir, facing);
  if (!dir) {
    return { ok: false, reason: 'wrong-turn' };
  }

  return { dir, ok: true };
}

export function inspectForwardMove({ arrows = {}, current, dir, level }) {
  const next = getNextPosition(current.r, current.c, dir);
  if (!next || !isInsideBoard(level, next.r, next.c)) {
    return {
      dir,
      next,
      ok: false,
      reason: 'out-of-board'
    };
  }

  if (isObstacle(level, next.r, next.c)) {
    return {
      dir,
      next,
      ok: false,
      reason: 'blocked'
    };
  }

  if (isApple(level, next.r, next.c)) {
    return {
      dir,
      isAppleAhead: true,
      next,
      ok: true
    };
  }

  return {
    dir,
    isAppleAhead: false,
    next,
    ok: true
  };
}

export function analyzeRoute({ arrows = {}, config = {}, level }) {
  const maxSteps = config.maxSteps || 80;
  const scanOrder = config.routeScanOrder || config.scanOrder || ['down', 'right', 'up', 'left'];
  const path = [{
    c: level.start.c,
    facing: level.startFacing || 'right',
    r: level.start.r
  }];
  const visited = new Set();
  let current = { ...level.start };
  let facing = level.startFacing || 'right';
  let firstStep = true;
  let startKey = null;

  for (let stepCount = 0; stepCount < maxSteps; stepCount += 1) {
    const step = resolveRouteStep({
      arrows,
      current,
      facing,
      firstStep,
      level,
      scanOrder,
      visited
    });
    firstStep = false;

    if (!step.ok) {
      return {
        canReachApple: false,
        path,
        reason: step.reason,
        startKey,
        success: false
      };
    }

    if (step.startKey) {
      startKey = step.startKey;
    }

    const move = inspectForwardMove({
      arrows,
      current,
      dir: step.dir,
      level
    });

    if (move.next && isInsideBoard(level, move.next.r, move.next.c)) {
      path.push({
        c: move.next.c,
        facing: step.dir,
        r: move.next.r
      });
    }

    if (!move.ok) {
      return {
        canReachApple: false,
        path,
        reason: move.reason,
        startKey,
        success: false
      };
    }

    if (move.isAppleAhead) {
      return {
        canReachApple: true,
        path,
        reason: null,
        startKey,
        success: true
      };
    }

    const nextKey = coordinateKey(move.next.r, move.next.c);
    if (visited.has(nextKey)) {
      return {
        canReachApple: false,
        path,
        reason: 'loop',
        startKey,
        success: false
      };
    }

    current = move.next;
    facing = step.dir;
  }

  return {
    canReachApple: false,
    path,
    reason: 'max-steps',
    startKey,
    success: false
  };
}
