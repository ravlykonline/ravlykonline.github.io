const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const cssFiles = ['css/tokens.css', 'css/base.css', 'css/game.css'];
const jsFiles = ['js/main.js', 'js/levels.js', 'js/texts.uk.js', 'js/gameState.js', 'js/renderDrag.js', 'js/renderSnail.js', 'js/render.js', 'js/engineRoute.js', 'js/engine.js', 'js/uiAudio.js', 'js/uiModals.js', 'js/ui.js'];

function readUtf8(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readBytes(relativePath) {
  return fs.readFileSync(path.join(root, relativePath));
}

function createStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    }
  };
}

function bootstrapCore(savedProgress = null, storageOverride = null) {
  const storage = storageOverride || createStorage();
  if (savedProgress) {
    storage.setItem('ravlyk-code-progress-v1', JSON.stringify(savedProgress));
  }

  const context = {
    window: {},
    sessionStorage: storage,
    document: {
      body: {
        classList: { toggle() {} }
      },
      getElementById() {
        return {};
      },
      createElement() {
        return {
          setAttribute() {},
          appendChild() {}
        };
      }
    }
  };
  context.window = context;
  vm.createContext(context);

  for (const file of ['js/main.js', 'js/levels.js', 'js/texts.uk.js', 'js/gameState.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }

  return { app: context.SnailGame, storage, context };
}

function bootstrapEngineHarness(levelOverride) {
  const { app, storage, context } = bootstrapCore();
  const modalCalls = { turnHint: 0 };

  context.setTimeout = (fn) => {
    fn();
    return 0;
  };
  context.clearTimeout = () => {};

  app.ui = {
    showTurnHintModal() {
      modalCalls.turnHint += 1;
    },
    showAlreadySolvedModal() {},
    playErrorSound() {},
    setStatus() {},
    flashCell() {},
    flashNeighbours() {},
    setDisabled() {},
    playStepSound() {},
    playSuccessSound() {},
    refreshLevelUi() {},
    launchConfetti() {},
    showWin() {},
    clearRunHint() {},
    clearStatus() {}
  };


  app.render = {
    posSnail() {},
    clearTrail() {},
    clearPendingDelete() {},
    clearStartHighlight() {},
    renderAll() {},
    deselect() {},
    setStartHighlight() {},
    setTrail() {},
    async bumpSnail() {}
  };

  const engineRouteSource = fs.readFileSync(path.join(root, 'js/engineRoute.js'), 'utf8');
  vm.runInContext(engineRouteSource, context, { filename: 'js/engineRoute.js' });
  const engineSource = fs.readFileSync(path.join(root, 'js/engine.js'), 'utf8');
  vm.runInContext(engineSource, context, { filename: 'js/engine.js' });

  app.state.currentLevel = {
    id: 999,
    rows: 3,
    cols: 4,
    start: { r: 1, c: 1 },
    apple: { r: 0, c: 0 },
    obstacles: [],
    presetArrows: { '1,2': 'right' },
    allowedTiles: ['up', 'right', 'down', 'left'],
    ...levelOverride
  };
  app.config.rows = app.state.currentLevel.rows;
  app.config.cols = app.state.currentLevel.cols;
  app.resetLevelState();

  return { app, storage, context, modalCalls };
}

function canReachGoal(app, level) {
  const obstacleKeys = new Set((level.obstacles || []).map((item) => item.r + ',' + item.c));
  const queue = [{ r: level.start.r, c: level.start.c, facing: null, firstStep: true }];
  const visited = new Set(['start']);

  while (queue.length > 0) {
    const state = queue.shift();

    if (state.firstStep) {
      for (const dir of app.config.scanOrder) {
        const { dr, dc } = app.delta[dir];
        const nr = state.r + dr;
        const nc = state.c + dc;
        const cellKey = nr + ',' + nc;
        const stateKey = nr + ',' + nc + '|' + dir;

        if (nr < 0 || nr >= level.rows || nc < 0 || nc >= level.cols) {
          continue;
        }
        if (obstacleKeys.has(cellKey) || (nr === level.apple.r && nc === level.apple.c)) {
          continue;
        }
        if (visited.has(stateKey)) {
          continue;
        }
        if (!level.allowedTiles.some((tileDir) => app.resolveTileExit(tileDir, dir))) {
          continue;
        }

        visited.add(stateKey);
        queue.push({ r: nr, c: nc, facing: dir, firstStep: false });
      }
      continue;
    }


    for (const tileDir of level.allowedTiles) {
      const exitDir = app.resolveTileExit(tileDir, state.facing);
      if (!exitDir) {
        continue;
      }

      const { dr, dc } = app.delta[exitDir];
      const nr = state.r + dr;
      const nc = state.c + dc;
      const cellKey = nr + ',' + nc;
      const stateKey = nr + ',' + nc + '|' + exitDir;

      if (nr < 0 || nr >= level.rows || nc < 0 || nc >= level.cols) {
        continue;
      }
      if (obstacleKeys.has(cellKey)) {
        continue;
      }
      if (nr === level.apple.r && nc === level.apple.c) {
        return true;
      }
      if (visited.has(stateKey)) {
        continue;
      }

      visited.add(stateKey);
      queue.push({ r: nr, c: nc, facing: exitDir, firstStep: false });
    }
  }

  return false;
}

module.exports = {
  bootstrapCore,
  bootstrapEngineHarness,
  canReachGoal,
  cssFiles,
  htmlPath,
  jsFiles,
  readBytes,
  readUtf8,
  root
};

