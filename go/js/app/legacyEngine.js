import { DIRECTION_DELTAS, resolveTileExit } from '../core/constants.js';
import { analyzeRoute } from '../engine/route.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createLegacyRouteApi(app) {
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
    if (!isAppleAhead && (!nextTileDir || !resolveTileExit(nextTileDir, dir))) {
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

export function installLegacyEngine({ windowRef = window } = {}) {
  const app = windowRef.SnailGame;
  const { engine: engineText } = app.text;

  app.createEngineRoute = function createEngineRoute() {
    return createLegacyRouteApi(app);
  };

  async function showTurnTryAgain() {
    app.ui.showTurnHintModal({
      includeTurnHint: app.levelUsesTurnTiles()
    });
  }

  async function returnSnailToStart() {
    const start = app.getStart();
    const startFacing = app.getStartFacing();
    const alreadyAtStart = app.state.snailPos.r === start.r && app.state.snailPos.c === start.c;

    app.state.snailPos = { ...start };
    app.state.snailFacing = startFacing;
    app.render.posSnail(start.r, start.c, true, startFacing);

    if (!alreadyAtStart) {
      await delay(app.config.stepMs + 180);
    }
  }

  async function handleFailure(options) {
    const {
      icon = '\u{1F914}',
      text,
      statusType = 'err',
      flash = null,
      bumpDir = null,
      showTurnModal = false
    } = options || {};

    app.ui.playErrorSound();
    app.ui.setStatus(icon, text, statusType);

    if (flash) {
      app.ui.flashCell(flash.r, flash.c, flash.color);
    }

    if (bumpDir) {
      await app.render.bumpSnail(app.state.snailPos.r, app.state.snailPos.c, bumpDir);
    }

    await delay(900);
    await returnSnailToStart();

    if (showTurnModal) {
      await delay(1100);
      await showTurnTryAgain();
    }
  }

  const routeApi = app.createEngineRoute();

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
      app.ui.setStatus('\u{1F914}', engineText.placeCommandsFirst, 'warn');
      return;
    }

    app.render.clearTrail();
    app.render.clearPendingDelete();
    app.render.clearStartHighlight();
    app.state.snailPos = { ...start };
    app.state.snailFacing = app.getStartFacing();
    app.render.posSnail(app.state.snailPos.r, app.state.snailPos.c, false, app.state.snailFacing);
    app.render.renderAll();

    app.state.running = true;
    app.ui.setDisabled(true);
    app.render.deselect();
    app.ui.setStatus('\u{1F40C}', engineText.moving, 'run');

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
          await handleFailure({ icon: '\u{1F635}', text: engineText.loop, statusType: 'err' });
          break;
        }

        if (step.reason === 'missing-tile') {
          await handleFailure({
            text: engineText.invalidTurn,
            flash: { r, c, color: '#d94d1a' },
            showTurnModal: true
          });
          break;
        }

        app.ui.flashNeighbours(r, c);
        await handleFailure({
          icon: '\u{1F914}',
          text: engineText.placeNearby,
          statusType: 'warn',
          flash: { r, c, color: '#ff9800' },
          showTurnModal: true
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
          await handleFailure({ icon: '\u{1F62C}', text: engineText.outOfBounds, bumpDir: step.dir });
          break;
        }

        if (move.reason === 'obstacle') {
          await handleFailure({
            icon: '\u{1FAA8}',
            text: engineText.obstacle,
            flash: { r: move.nr, c: move.nc, color: '#8b5e34' },
            bumpDir: step.dir
          });
          break;
        }

        await handleFailure({
          text: engineText.invalidTurn,
          flash: { r: move.nr, c: move.nc, color: '#d94d1a' },
          bumpDir: step.dir,
          showTurnModal: true
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
        const finishFacing = step.dir === 'left' ? 'left' : 'right';
        app.state.snailFacing = finishFacing;
        app.render.renderAll();
        app.render.posSnail(move.nr, move.nc, true, finishFacing);
        app.ui.playSuccessSound();
        app.ui.setStatus('\u{1F3C6}', engineText.success, 'ok');
        app.ui.refreshLevelUi();
        app.ui.launchConfetti();
        setTimeout(app.ui.showWin, 500);
        app.render.clearStartHighlight();
        app.state.running = false;
        app.ui.setDisabled(false);
        return;
      }

      await delay(app.config.stepMs);
    }

    if (steps >= app.config.maxSteps) {
      await handleFailure({ icon: '\u{1F635}', text: engineText.tooManySteps, statusType: 'err' });
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

    app.resetLevelState();
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

  app.engine = {
    analyzeCurrentRoute: routeApi.analyzeCurrentRoute,
    clearAll,
    delay,
    findNeighborStartMove: routeApi.findNeighborStartMove,
    run
  };

  return app.engine;
}
