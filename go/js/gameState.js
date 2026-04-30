(function () {
  const app = window.SnailGame;
  const level = app.levels[0];
  const STORAGE_KEY = 'ravlyk-code-session-v1';
  const LEGACY_STORAGE_KEY = 'ravlyk-code-progress-v1';
  const SESSION_VERSION = 1;

  // Clones preset arrows so level templates stay immutable while the player edits the board.
  function cloneArrowMap(source) {
    return Object.fromEntries(Object.entries(source || {}).map(([key, value]) => [key, value]));
  }

  function getLevelStorageKey(levelId) {
    return String(levelId);
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizeSavedArrowsByLevel(source) {
    if (!isPlainObject(source)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(source)
        .filter(([levelId, arrows]) => app.getLevelById(Number(levelId)) && isPlainObject(arrows))
        .map(([levelId, arrows]) => [String(levelId), cloneArrowMap(arrows)])
    );
  }

  function getCurrentLevelArrows() {
    const levelKey = getLevelStorageKey(app.state.currentLevel.id);
    if (!app.state.arrowsByLevel[levelKey]) {
      app.state.arrowsByLevel[levelKey] = cloneArrowMap(app.state.currentLevel.presetArrows);
    }
    return app.state.arrowsByLevel[levelKey];
  }

  // Wraps sessionStorage access because file:// and privacy settings may block it.
  function getStorage() {
    try {
      return window.sessionStorage || null;
    } catch {
      return null;
    }
  }

  // Persists the current level and completion progress only for the current browser session.
  function saveProgress() {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    const payload = {
      version: SESSION_VERSION,
      currentLevelId: app.state.currentLevel.id,
      arrowsByLevel: Object.fromEntries(
        Object.entries(app.state.arrowsByLevel).map(([levelId, arrows]) => [levelId, cloneArrowMap(arrows)])
      ),
      completedLevelIds: [...app.state.completedLevelIds]
    };
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage write failures in privacy-restricted contexts so gameplay can continue.
    }
  }

  // Loads saved progress defensively and ignores broken JSON payloads.
  function loadProgress() {
    const storage = getStorage();
    if (!storage) {
      return null;
    }

    let raw = null;
    try {
      raw = storage.getItem(STORAGE_KEY) || storage.getItem(LEGACY_STORAGE_KEY);
    } catch {
      return null;
    }
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function clearSavedProgress() {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    try {
      storage.removeItem(STORAGE_KEY);
      storage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Ignore storage clear failures in privacy-restricted contexts so gameplay can continue.
    }
  }

  app.config = {
    rows: level.rows,
    cols: level.cols,
    stepMs: 540,
    maxSteps: 80,
    scanOrder: ['down', 'right', 'up', 'left']
  };

  app.getStartFacing = function getStartFacing() {
    return app.state?.currentLevel?.startFacing || level.startFacing || 'right';
  };

  app.state = {
    arrows: cloneArrowMap(level.presetArrows),
    snailPos: { ...level.start },
    snailFacing: level.startFacing || 'right',
    appleEaten: false,
    startHighlightKey: null,
    running: false,
    selDir: null,
    pendingDeleteKey: null,
    dragDir: null,
    touchDir: null,
    touchCell: null,
    currentLevel: level,
    arrowsByLevel: {},
    completedLevelIds: []
  };


  if (!app.textUk) {
    throw new Error('texts.uk.js must be loaded before gameState.js');
  }

  app.text = app.textUk;
  app.refs = {
    gridEl: document.getElementById('grid'),
    gwrap: document.getElementById('gwrap'),
    snailEl: document.getElementById('snail'),
    statusEl: document.getElementById('status'),
    sicoEl: document.getElementById('sico'),
    stxtEl: document.getElementById('stxt'),
    btnRun: document.getElementById('btn-run'),
    btnClr: document.getElementById('btn-clr'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnLevelInfo: document.getElementById('btn-level-info'),
    btnSpeakTask: document.getElementById('btn-speak-task'),
    levelChipEl: document.getElementById('level-chip'),
    levelTitleEl: document.getElementById('level-title'),
    levelModeEl: document.getElementById('level-mode'),
    levelGoalEl: document.getElementById('level-goal'),
    levelHintEl: document.getElementById('level-hint'),
    debugNoteEl: document.getElementById('debug-note'),
    progressTextEl: document.getElementById('progress-text'),
    progressTrackEl: document.getElementById('progress-track'),
    progressFillEl: document.getElementById('progress-fill'),
    btnMap: document.getElementById('btn-map'),
    ghostEl: document.getElementById('ghost'),
    confEl: document.getElementById('confetti'),
    paletteEl: document.getElementById('palette')
  };

  app.getStart = function getStart() {
    return app.state.currentLevel.start;
  };

  app.getApple = function getApple() {
    return app.state.currentLevel.apple;
  };

  app.getAllowedTileDefs = function getAllowedTileDefs() {
    const allowed = app.state.currentLevel.allowedTiles;
    if (!allowed || allowed.length === 0) {
      return [...app.tileDefs];
    }
    return app.tileDefs.filter((tile) => allowed.includes(tile.dir));
  };

  // Returns true for levels that introduce turn tiles, so the engine can show clearer feedback.
  app.levelUsesTurnTiles = function levelUsesTurnTiles() {
    return app.getAllowedTileDefs().some((tile) => tile.dir.includes('-'));
  };

  app.isObstacle = function isObstacle(r, c) {
    return app.state.currentLevel.obstacles.some((item) => item.r === r && item.c === c);
  };

  app.getObstacle = function getObstacle(r, c) {
    return app.state.currentLevel.obstacles.find((item) => item.r === r && item.c === c) || null;
  };

  app.getCurrentLevelIndex = function getCurrentLevelIndex() {
    return app.levels.findIndex((item) => item.id === app.state.currentLevel.id);
  };

  app.getTotalLevels = function getTotalLevels() {
    return app.levels.length;
  };

  app.hasNextLevel = function hasNextLevel() {
    return app.getCurrentLevelIndex() < app.levels.length - 1;
  };

  app.hasPrevLevel = function hasPrevLevel() {
    return app.getCurrentLevelIndex() > 0;
  };

  app.getPrevLevelId = function getPrevLevelId() {
    if (!app.hasPrevLevel()) {
      return null;
    }
    return app.levels[app.getCurrentLevelIndex() - 1].id;
  };

  app.getNextLevelId = function getNextLevelId() {
    if (!app.hasNextLevel()) {
      return null;
    }
    return app.levels[app.getCurrentLevelIndex() + 1].id;
  };

  app.markLevelComplete = function markLevelComplete(levelId) {
    if (!app.state.completedLevelIds.includes(levelId)) {
      app.state.completedLevelIds.push(levelId);
      saveProgress();
    }
  };

  app.persistCurrentArrows = function persistCurrentArrows() {
    const levelKey = getLevelStorageKey(app.state.currentLevel.id);
    app.state.arrowsByLevel[levelKey] = cloneArrowMap(app.state.arrows);
    saveProgress();
  };

  // Resets all transient state that belongs to one level attempt.
  app.resetLevelState = function resetLevelState() {
    app.state.arrows = cloneArrowMap(getCurrentLevelArrows());
    app.state.snailPos = { ...app.state.currentLevel.start };
    app.state.snailFacing = app.getStartFacing();
    app.state.appleEaten = false;
    app.state.startHighlightKey = null;
    app.state.running = false;
    app.state.selDir = null;
    app.state.pendingDeleteKey = null;
    app.state.dragDir = null;
    app.state.touchDir = null;
    app.state.touchCell = null;
  };

  app.setCurrentLevel = function setCurrentLevel(levelId) {
    const nextLevel = app.getLevelById(levelId);
    if (!nextLevel) {
      return false;
    }

    app.state.currentLevel = nextLevel;
    app.config.rows = nextLevel.rows;
    app.config.cols = nextLevel.cols;
    app.resetLevelState();
    saveProgress();
    return true;
  };

  app.restartProgress = function restartProgress() {
    app.state.completedLevelIds = [];
    app.state.arrowsByLevel = {};
    clearSavedProgress();
    app.state.currentLevel = app.levels[0];
    app.config.rows = app.state.currentLevel.rows;
    app.config.cols = app.state.currentLevel.cols;
    app.resetLevelState();
    saveProgress();
  };

  app.storage = {
    clearSavedProgress,
    loadProgress,
    saveProgress,
    storageKey: STORAGE_KEY,
    legacyStorageKey: LEGACY_STORAGE_KEY
  };

  const saved = loadProgress();
  if (saved) {
    app.state.completedLevelIds = Array.isArray(saved.completedLevelIds)
      ? saved.completedLevelIds.filter((id) => !!app.getLevelById(id))
      : [];
    app.state.arrowsByLevel = normalizeSavedArrowsByLevel(saved.arrowsByLevel);

    const savedLevel = app.getLevelById(saved.currentLevelId);
    if (savedLevel) {
      app.state.currentLevel = savedLevel;
      app.config.rows = savedLevel.rows;
      app.config.cols = savedLevel.cols;
    }
  }

  app.resetLevelState();
})();

