(function () {
  const app = window.SnailGame;
  const { maxSteps, scanOrder } = app.config;

  app.createEngineRoute = function createEngineRoute() {
    function findNeighborStartMove(r, c, rows, cols) {
      for (const dir of scanOrder) {
        const { dr, dc } = app.delta[dir];
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
          continue;
        }

        const tileDir = app.state.arrows[`${nr},${nc}`];
        if (!tileDir) {
          continue;
        }

        if (app.resolveTileExit(tileDir, dir)) {
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

        return {
          ok: true,
          dir: neighborMove.dir,
          startKey: neighborMove.startKey
        };
      }

      const tileDir = app.state.arrows[key];
      if (!tileDir) {
        return { ok: false, reason: 'missing-tile' };
      }
      if (visited.has(key)) {
        return { ok: false, reason: 'loop' };
      }

      visited.add(key);
      const dir = app.resolveTileExit(tileDir, facing);
      if (!dir) {
        return { ok: false, reason: 'invalid-turn' };
      }

      return { ok: true, dir };
    }

    function inspectForwardMove(moveState) {
      const { apple, c, dir, r, rows, cols } = moveState;
      const { dr, dc } = app.delta[dir];
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
      if (!isAppleAhead && (!nextTileDir || !app.resolveTileExit(nextTileDir, dir))) {
        return { ok: false, reason: 'invalid-next-step', dir, nr, nc };
      }

      return {
        ok: true,
        dir,
        nr,
        nc,
        isAppleAhead
      };
    }

    function analyzeCurrentRoute() {
      const start = app.getStart();
      const apple = app.getApple();
      const rows = app.config.rows;
      const cols = app.config.cols;
      const visited = new Set();
      let firstStep = true;
      let facing = app.getStartFacing();
      let r = start.r;
      let c = start.c;
      let steps = 0;

      while (steps < maxSteps) {
        steps += 1;

        const step = resolveRouteStep({ r, c, rows, cols, firstStep, facing, visited });
        firstStep = false;
        if (!step.ok) {
          return { canReachApple: false, reason: step.reason };
        }

        const move = inspectForwardMove({ r, c, dir: step.dir, rows, cols, apple });
        if (!move.ok) {
          return { canReachApple: false, reason: move.reason };
        }

        if (move.isAppleAhead) {
          return { canReachApple: true, reason: 'success', startKey: step.startKey || null };
        }

        r = move.nr;
        c = move.nc;
        facing = step.dir;
      }

      return { canReachApple: false, reason: 'too-many-steps' };
    }

    return {
      analyzeCurrentRoute,
      findNeighborStartMove,
      inspectForwardMove,
      resolveRouteStep
    };
  };
})();