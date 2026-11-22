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

// Дивиться на клітинку попереду. Равлик не заходить на клітинку без картки або
// з карткою, яка не пропустить його далі, тому такі випадки теж є помилками кроку.
export function inspectForwardMove({ arrows = {}, current, dir, level }) {
  const next = getNextPosition(current.r, current.c, dir);
  if (!next || !isInsideBoard(level, next.r, next.c)) {
    return { dir, next, ok: false, reason: 'out-of-board' };
  }

  if (isObstacle(level, next.r, next.c)) {
    return { dir, next, ok: false, reason: 'blocked' };
  }

  if (isApple(level, next.r, next.c)) {
    return { dir, isAppleAhead: true, next, ok: true };
  }

  const nextArrow = getArrow(arrows, next.r, next.c);
  if (!nextArrow) {
    return { dir, next, ok: false, reason: 'missing-arrow' };
  }
  if (!resolveTileExit(nextArrow, dir)) {
    return { dir, next, ok: false, reason: 'wrong-turn' };
  }

  return { dir, isAppleAhead: false, next, ok: true };
}

// Єдине джерело правди про рух Равлика: і анімований запуск, і тести рівнів
// ходять маршрутом через цей крокувальник. Кожен next() — один крок до сусідньої клітинки.
export function createRouteWalker({ arrows = {}, config = {}, level }) {
  const maxSteps = config.maxSteps || 80;
  const scanOrder = config.routeScanOrder || config.scanOrder || ['down', 'right', 'up', 'left'];
  const visited = new Set();
  let current = { ...level.start };
  let facing = level.startFacing || 'right';
  let firstStep = true;
  let startKey = null;
  let stepCount = 0;

  function next() {
    const from = { ...current };
    if (stepCount >= maxSteps) {
      return { firstStep: false, from, ok: false, reason: 'max-steps', startKey };
    }
    stepCount += 1;
    const isFirstStep = firstStep;
    firstStep = false;

    const step = resolveRouteStep({ arrows, current, facing, firstStep: isFirstStep, level, scanOrder, visited });
    if (!step.ok) {
      return { firstStep: isFirstStep, from, ok: false, reason: step.reason, startKey };
    }
    if (step.startKey) {
      startKey = step.startKey;
    }

    const move = inspectForwardMove({ arrows, current, dir: step.dir, level });
    if (!move.ok) {
      return {
        dir: step.dir,
        firstStep: isFirstStep,
        from,
        ok: false,
        reason: move.reason,
        startKey,
        to: move.next
      };
    }

    current = move.next;
    facing = step.dir;
    return {
      dir: step.dir,
      firstStep: isFirstStep,
      from,
      isAppleAhead: move.isAppleAhead,
      ok: true,
      startKey,
      to: move.next
    };
  }

  return { next };
}

export function analyzeRoute({ arrows = {}, config = {}, level }) {
  const walker = createRouteWalker({ arrows, config, level });
  const path = [{
    c: level.start.c,
    facing: level.startFacing || 'right',
    r: level.start.r
  }];
  let startKey = null;

  for (;;) {
    const step = walker.next();
    startKey = step.startKey || startKey;

    if (step.to && isInsideBoard(level, step.to.r, step.to.c)) {
      path.push({ c: step.to.c, facing: step.dir, r: step.to.r });
    }

    if (!step.ok) {
      return { canReachApple: false, path, reason: step.reason, startKey, success: false };
    }
    if (step.isAppleAhead) {
      return { canReachApple: true, path, reason: null, startKey, success: true };
    }
  }
}
