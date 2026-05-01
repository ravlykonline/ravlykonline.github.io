const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const cssFiles = ['css/tokens.css', 'css/base.css', 'css/game.css'];
const jsFiles = ['js/main.js'];
const legacyJsFiles = [];
const SESSION_KEY = 'ravlyk-code-session-v1';
const LEGACY_PROGRESS_KEY = 'ravlyk-code-progress-v1';

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

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

async function bootstrapCore(savedProgress = null, storageOverride = null) {
  const storage = storageOverride || createStorage();
  if (savedProgress) {
    const key = savedProgress.version === 1 ? SESSION_KEY : LEGACY_PROGRESS_KEY;
    storage.setItem(key, JSON.stringify(savedProgress));
  }

  const documentRef = {
    body: {
      classList: { toggle() {} }
    },
    document: {
      body: {
        classList: { toggle() {} }
      }
    },
    getElementById(id) {
      return { id };
    },
    createElement(tagName) {
      return {
        appendChild() {},
        classList: { add() {}, remove() {}, toggle() {} },
        dataset: {},
        setAttribute() {},
        tagName
      };
    }
  };
  const windowRef = {
    addEventListener() {},
    location: { protocol: 'file:' },
    sessionStorage: storage
  };
  const navigatorRef = {};
  const { createAppComposition } = await importModule('js/app/composition.js');
  const composition = createAppComposition({ documentRef, navigatorRef, windowRef });
  composition.installAppState();
  composition.installEngine();

  return { app: composition.app, storage, context: windowRef, composition };
}

async function bootstrapEngineHarness(levelOverride) {
  const { app, storage, context } = await bootstrapCore();
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
  app.config.stepMs = 0;
  app.state.arrows = { ...(app.state.currentLevel.presetArrows || {}) };
  app.state.snailPos = { ...app.state.currentLevel.start };
  app.state.snailFacing = app.state.currentLevel.startFacing || 'right';
  app.state.appleEaten = false;
  app.state.running = false;

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
  legacyJsFiles,
  readBytes,
  readUtf8,
  root
};

