import { DIRECTION_DELTAS, resolveTileExit } from '../core/constants.js';
import { analyzeRoute } from './route.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createEngineRoute(app) {
  const scanOrder = app.config.scanOrder;

  function findNeighborStartMove(r, c, rows, cols) {
    for (const dir of scanOrder) {
      const { dr, dc } = DIRECTION_DELTAS[dir];
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
        continue;
      }

      const tileDir = app.state.arrows[`${nr},${nc}`];
      if (tileDir && resolveTileExit(tileDir, dir)) {
        return { dir, startKey: `${nr},${nc}` };
      }
    }

    return { dir: null, startKey: null };
  }

  function resolveRouteStep(stepState) {
    const { c, facing, firstStep, r, rows, cols, visited } = stepState;
    const key = `${r},${c}`;

    if (firstStep) {
      const neighborMove = findNeighborStartMove(r, c, rows, cols);
      if (!neighborMove.dir) {
        return { ok: false, reason: 'invalid-turn' };
      }
      return { ok: true, dir: neighborMove.dir, startKey: neighborMove.startKey };
    }

    const tileDir = app.state.arrows[key];
    if (!tileDir) {
      return { ok: false, reason: 'missing-tile' };
    }
    if (visited.has(key)) {
      return { ok: false, reason: 'loop' };
    }

    visited.add(key);
    const dir = resolveTileExit(tileDir, facing);
    if (!dir) {
      return { ok: false, reason: 'invalid-turn' };
    }

    return { ok: true, dir };
  }

  function inspectForwardMove(moveState) {
    const { apple, c, dir, r, rows, cols } = moveState;
    const { dr, dc } = DIRECTION_DELTAS[dir];
    const nr = r + dr;
    const nc = c + dc;

    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
      return { ok: false, reason: 'out-of-bounds', dir, nr, nc };
    }
    if (app.isObstacle(nr, nc)) {
      return { ok: false, reason: 'obstacle', dir, nr, nc };
    }

    const isAppleAhead = nr === apple.r && nc === apple.c;
    const nextTileDir = app.state.arrows[`${nr},${nc}`];
    if (!isAppleAhead && !nextTileDir) {
      return { ok: false, reason: 'missing-tile', dir, nr, nc };
    }
    if (!isAppleAhead && !resolveTileExit(nextTileDir, dir)) {
      return { ok: false, reason: 'invalid-next-step', dir, nr, nc };
    }

    return { ok: true, dir, nr, nc, isAppleAhead };
  }

  function analyzeCurrentRoute() {
    const result = analyzeRoute({
      arrows: app.state.arrows,
      config: {
        maxSteps: app.config.maxSteps,
        routeScanOrder: app.config.scanOrder
      },
      level: app.state.currentLevel
    });

    return {
      canReachApple: result.canReachApple,
      reason: result.reason || 'success',
      startKey: result.startKey || null
    };
  }

  return {
    analyzeCurrentRoute,
    findNeighborStartMove,
    inspectForwardMove,
    resolveRouteStep
  };
}

export function createGameEngine({ app }) {
  const { engine: engineText } = app.text;

  function returnSnailToStart() {
    const start = app.getStart();
    const startFacing = app.getStartFacing();
    app.state.snailPos = { ...start };
    app.state.snailFacing = startFacing;
    app.render.posSnail(start.r, start.c, false, startFacing);
  }

  async function handleFailure(options) {
    const {
      icon = 'warning',
      text,
      statusType = 'err',
      flash = null,
      bumpDir = null
    } = options || {};

    app.ui.playErrorSound();
    app.ui.setStatus(icon, text, statusType);

    if (flash) {
      app.ui.flashCell(flash.r, flash.c, flash.color);
      app.ui.setStopMark(flash.r, flash.c);
    }

    if (bumpDir) {
      await app.render.bumpSnail(app.state.snailPos.r, app.state.snailPos.c, bumpDir);
    }

    await delay(900);
    returnSnailToStart();

  }

  const routeApi = createEngineRoute(app);

  async function run() {
    const start = app.getStart();
    const apple = app.getApple();
    const rows = app.config.rows;
    const cols = app.config.cols;

    if (app.state.running) {
      return;
    }
    if (app.state.appleEaten) {
      app.ui.showAlreadySolvedModal();
      return;
    }
    if (Object.keys(app.state.arrows).length === 0) {
      app.ui.playErrorSound();
      app.ui.setStatus('warning', engineText.placeCommandsFirst, 'warn');
      return;
    }

    app.render.clearTrail();
    app.render.clearPendingDelete();
    app.render.clearStartHighlight();
    app.ui.clearStopMark?.();
    app.state.snailPos = { ...start };
    app.state.snailFacing = app.getStartFacing();
    app.render.posSnail(app.state.snailPos.r, app.state.snailPos.c, false, app.state.snailFacing);
    app.render.renderAll();

    app.state.running = true;
    app.ui.setDisabled(true);
    app.render.deselect();
    app.ui.setStatus('play', engineText.moving, 'run');

    let steps = 0;
    let firstStep = true;
    const visited = new Set();

    while (steps < app.config.maxSteps) {
      steps += 1;
      const { r, c } = app.state.snailPos;
      const step = routeApi.resolveRouteStep({
        r,
        c,
        rows,
        cols,
        firstStep,
        facing: app.state.snailFacing,
        visited
      });
      firstStep = false;

      if (!step.ok) {
        if (step.reason === 'loop') {
          await handleFailure({ icon: 'warning', text: engineText.loop, statusType: 'err' });
          break;
        }

        if (step.reason === 'missing-tile') {
          await handleFailure({
            text: engineText.noCommand,
            flash: { r, c, color: '#d94d1a' }
          });
          break;
        }

        app.ui.flashNeighbours(r, c);
        await handleFailure({
          icon: 'warning',
          text: engineText.placeNearby,
          statusType: 'warn',
          flash: { r, c, color: '#ff9800' }
        });
        break;
      }

      if (step.startKey) {
        const [sr, sc] = step.startKey.split(',').map(Number);
        if (!Number.isNaN(sr) && !Number.isNaN(sc)) {
          app.render.setStartHighlight(sr, sc);
        }
      }

      const move = routeApi.inspectForwardMove({ r, c, dir: step.dir, rows, cols, apple });
      if (!move.ok) {
        if (move.reason === 'out-of-bounds') {
          await handleFailure({ icon: 'warning', text: engineText.outOfBounds, bumpDir: step.dir });
          break;
        }

        if (move.reason === 'obstacle') {
          await handleFailure({
            icon: 'warning',
            text: engineText.obstacle,
            flash: { r: move.nr, c: move.nc, color: '#8b5e34' },
            bumpDir: step.dir
          });
          break;
        }

        await handleFailure({
          text: move.reason === 'missing-tile' ? engineText.noCommand : engineText.invalidTurn,
          flash: { r: move.nr, c: move.nc, color: '#d94d1a' },
          bumpDir: step.dir
        });
        break;
      }

      app.render.setTrail(r, c);
      app.ui.playStepSound();
      app.state.snailPos = { r: move.nr, c: move.nc };
      app.state.snailFacing = step.dir;
      app.render.posSnail(move.nr, move.nc, true, step.dir);

      if (move.isAppleAhead) {
        await delay(app.config.stepMs * 0.8);
        app.markLevelComplete(app.state.currentLevel.id);
        app.state.appleEaten = true;
        app.render.renderAll();
        app.ui.playSuccessSound();
        app.ui.setStatus('check', engineText.success, 'ok');
        app.ui.refreshLevelUi();
        app.ui.launchConfetti();
        app.render.clearStartHighlight();
        app.state.running = false;
        app.ui.setDisabled(false);
        app.ui.showWin();
        return;
      }

      await delay(app.config.stepMs);
    }

    if (steps >= app.config.maxSteps) {
      await handleFailure({ icon: 'warning', text: engineText.tooManySteps, statusType: 'err' });
    }

    app.render.clearStartHighlight();
    app.state.running = false;
    app.ui.setDisabled(false);
  }

  function clearAll() {
    const start = app.getStart();
    app.ui.clearRunHint?.();

    if (app.state.running) {
      return;
    }

    const levelId = String(app.state.currentLevel.id);
    const initialArrows = { ...(app.state.currentLevel.presetArrows || {}) };
    app.state.arrowsByLevel[levelId] = { ...initialArrows };

    app.resetLevelState();
    app.ui.clearStopMark?.();
    app.render.resetUndoHistory?.();
    app.persistCurrentArrows?.();
    app.render.clearTrail();
    app.render.clearStartHighlight();
    app.render.posSnail(start.r, start.c, false, app.state.snailFacing || 'right');
    app.render.deselect();
    app.render.clearPendingDelete();
    app.render.renderAll();
    app.ui.clearStatus();
    app.ui.refreshLevelUi();
  }

  return {
    analyzeCurrentRoute: routeApi.analyzeCurrentRoute,
    clearAll,
    delay,
    findNeighborStartMove: routeApi.findNeighborStartMove,
    run
  };
}
