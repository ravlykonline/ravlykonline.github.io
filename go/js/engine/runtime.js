import { analyzeRoute, createRouteWalker } from './route.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Тонка обгортка над чистим route.js: лише збирає вхідні дані з app.
export function createEngineRoute(app) {
  function routeInput() {
    return {
      arrows: app.state.arrows,
      config: {
        maxSteps: app.config.maxSteps,
        routeScanOrder: app.config.scanOrder
      },
      level: app.state.currentLevel
    };
  }

  function analyzeCurrentRoute() {
    const result = analyzeRoute(routeInput());
    return {
      canReachApple: result.canReachApple,
      reason: result.reason || 'success',
      startKey: result.startKey || null
    };
  }

  function createWalker() {
    return createRouteWalker(routeInput());
  }

  return { analyzeCurrentRoute, createWalker };
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
    // Позначка «тут зупинка» за замовчуванням стоїть там, де блимає клітинка,
    // але може бути на іншій (перешкода блимає, а помилка — у картці під Равликом).
    const stopMark = options && 'stopMark' in options ? options.stopMark : flash;

    app.ui.playErrorSound();
    app.render.setSnailMood?.('sad', '😢', 2200);
    app.ui.setStatus(icon, text, statusType);

    if (flash) {
      app.ui.flashCell(flash.r, flash.c, flash.color);
    }
    if (stopMark) {
      app.ui.setStopMark(stopMark.r, stopMark.c);
    }

    if (bumpDir) {
      await app.render.bumpSnail(app.state.snailPos.r, app.state.snailPos.c, bumpDir);
    }

    await delay(900);
    returnSnailToStart();

  }

  const routeApi = createEngineRoute(app);

  async function handleRouteFailure(step) {
    const { r, c } = step.from;
    const bumpDir = step.dir || null;
    const target = step.to;

    switch (step.reason) {
      case 'loop':
        await handleFailure({ icon: 'warning', text: engineText.loop, statusType: 'err' });
        return;
      case 'max-steps':
        await handleFailure({ icon: 'warning', text: engineText.tooManySteps, statusType: 'err' });
        return;
      case 'out-of-board':
        await handleFailure({ icon: 'warning', text: engineText.outOfBounds, bumpDir });
        return;
      case 'blocked':
        // Каменю не виправиш: блимає перешкода, а позначка зупинки — на картці під Равликом.
        await handleFailure({
          icon: 'warning',
          text: engineText.obstacle,
          flash: { r: target.r, c: target.c, color: 'var(--flash-obstacle)' },
          stopMark: { r, c },
          bumpDir
        });
        return;
      default:
        break;
    }

    if (step.firstStep) {
      // Немає жодної картки біля Равлика, з якої можна почати.
      app.ui.flashNeighbours(r, c);
      await handleFailure({
        icon: 'warning',
        text: engineText.placeNearby,
        statusType: 'warn',
        flash: { r, c, color: 'var(--flash-warn)' }
      });
      return;
    }

    const isMissing = step.reason === 'missing-arrow';
    const bad = target || { r, c };
    await handleFailure({
      text: isMissing ? engineText.noCommand : engineText.invalidTurn,
      flash: { r: bad.r, c: bad.c, color: 'var(--flash-missing)' },
      bumpDir
    });
  }

  async function run() {
    const start = app.getStart();

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

    app.render.setSnailMood?.(null);
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

    const walker = routeApi.createWalker();

    for (;;) {
      const step = walker.next();

      if (!step.ok) {
        await handleRouteFailure(step);
        break;
      }

      const { r, c } = step.from;
      if (step.startKey) {
        const [sr, sc] = step.startKey.split(',').map(Number);
        if (!Number.isNaN(sr) && !Number.isNaN(sc)) {
          app.render.setStartHighlight(sr, sc);
        }
      }

      app.render.setTrail(r, c);
      app.ui.playStepSound();
      app.state.snailPos = { r: step.to.r, c: step.to.c };
      app.state.snailFacing = step.dir;
      app.render.posSnail(step.to.r, step.to.c, true, step.dir);

      if (step.isAppleAhead) {
        await delay(app.config.stepMs * 0.8);
        app.render.setSnailMood?.('eat', '😋');
        app.ui.playCrunchSound?.(5);
        await delay(app.config.stepMs * 3);
        const isFinalLevel = app.hasNextLevel ? !app.hasNextLevel() : false;
        app.markLevelComplete(app.state.currentLevel.id);
        app.state.appleEaten = true;
        app.render.renderAll();
        app.render.setSnailMood?.('happy', '😍', isFinalLevel ? 6000 : 2600);
        if (isFinalLevel && app.ui.playFinaleSound) {
          app.ui.playFinaleSound();
        } else {
          app.ui.playSuccessSound();
        }
        app.ui.setStatus('check', engineText.success, 'ok');
        app.ui.refreshLevelUi();
        app.ui.launchConfetti({ finale: isFinalLevel });
        app.render.clearStartHighlight();
        await delay(isFinalLevel ? app.config.stepMs * 5 : app.config.stepMs * 1.5);
        app.state.running = false;
        app.ui.setDisabled(false);
        app.ui.showWin();
        return;
      }

      await delay(app.config.stepMs);
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
