import { GAME_CONFIG } from '../core/config.js';
import {
  cloneArrowMap,
  createInitialState,
  getCurrentLevel,
  getLevelArrows,
  markLevelComplete,
  restartGame,
  resetLevelAttempt,
  setCurrentLevel,
  toSessionPayload
} from '../state/gameState.js';
import { clearSession, loadSession, saveSession } from '../state/sessionStore.js';
import { getDomRefs } from '../ui/dom.js';

const LEGACY_STORAGE_KEY = 'ravlyk-code-progress-v1';

function loadLegacySession(storage) {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return {
      version: 1,
      currentLevelId: parsed.currentLevelId,
      arrowsByLevel: parsed.arrowsByLevel || {},
      completedLevelIds: Array.isArray(parsed.completedLevelIds) ? parsed.completedLevelIds : []
    };
  } catch {
    return null;
  }
}

function removeLegacySession(storage) {
  try {
    storage?.removeItem?.(LEGACY_STORAGE_KEY);
  } catch {
    // Keep gameplay available when session storage is blocked.
  }
}

function getStorage(windowRef) {
  try {
    return windowRef?.sessionStorage || null;
  } catch {
    return null;
  }
}

function syncLegacyState(app, moduleState) {
  const currentLevel = getCurrentLevel(moduleState);
  app.state.currentLevel = currentLevel;
  app.state.arrows = cloneArrowMap(getLevelArrows(moduleState, currentLevel.id));
  app.state.arrowsByLevel = moduleState.arrowsByLevel;
  app.state.completedLevelIds = moduleState.completedLevelIds;
  app.state.snailPos = { ...moduleState.snailPos };
  app.state.snailFacing = moduleState.snailFacing;
  app.state.appleEaten = moduleState.appleEaten;
  app.state.startHighlightKey = moduleState.startHighlightKey;
  app.state.running = moduleState.running;
  app.state.selDir = moduleState.selDir;
  app.state.pendingDeleteKey = moduleState.pendingDeleteKey;
  app.state.dragDir = moduleState.dragDir;
  app.state.touchDir = moduleState.touchDir;
  app.state.touchCell = moduleState.touchCell;
  app.config.rows = currentLevel.rows;
  app.config.cols = currentLevel.cols;
}

function syncModuleAttemptFromLegacy(app, moduleState) {
  moduleState.snailPos = { ...app.state.snailPos };
  moduleState.snailFacing = app.state.snailFacing;
  moduleState.appleEaten = app.state.appleEaten;
  moduleState.startHighlightKey = app.state.startHighlightKey;
  moduleState.running = app.state.running;
  moduleState.selDir = app.state.selDir;
  moduleState.pendingDeleteKey = app.state.pendingDeleteKey;
  moduleState.dragDir = app.state.dragDir;
  moduleState.touchDir = app.state.touchDir;
  moduleState.touchCell = app.state.touchCell;
}

export function installLegacyState({
  documentRef = document,
  windowRef = window
} = {}) {
  const app = windowRef.SnailGame;
  const firstLevel = app.levels[0];
  const storage = getStorage(windowRef);
  const moduleState = createInitialState(app.levels, loadSession(storage) || loadLegacySession(storage));

  app.config = {
    rows: firstLevel.rows,
    cols: firstLevel.cols,
    stepMs: GAME_CONFIG.stepMs,
    maxSteps: GAME_CONFIG.maxSteps,
    scanOrder: [...GAME_CONFIG.routeScanOrder]
  };
  app.text = app.textUk;
  app.refs = getDomRefs(documentRef);
  app.state = {
    arrows: {},
    snailPos: { ...firstLevel.start },
    snailFacing: firstLevel.startFacing || 'right',
    appleEaten: false,
    startHighlightKey: null,
    running: false,
    selDir: null,
    pendingDeleteKey: null,
    dragDir: null,
    touchDir: null,
    touchCell: null,
    currentLevel: firstLevel,
    arrowsByLevel: {},
    completedLevelIds: []
  };

  app.getLevelById = function getLevelById(levelId) {
    return app.levels.find((level) => level.id === levelId) || null;
  };

  app.getStartFacing = function getStartFacing() {
    return app.state?.currentLevel?.startFacing || firstLevel.startFacing || 'right';
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
    return app.hasPrevLevel() ? app.levels[app.getCurrentLevelIndex() - 1].id : null;
  };

  app.getNextLevelId = function getNextLevelId() {
    return app.hasNextLevel() ? app.levels[app.getCurrentLevelIndex() + 1].id : null;
  };

  function saveProgress() {
    syncModuleAttemptFromLegacy(app, moduleState);
    saveSession(toSessionPayload(moduleState), storage);
  }

  function clearSavedProgress() {
    clearSession(storage);
    removeLegacySession(storage);
  }

  app.markLevelComplete = function markLegacyLevelComplete(levelId) {
    if (markLevelComplete(moduleState, levelId)) {
      syncLegacyState(app, moduleState);
      saveProgress();
    }
  };

  app.persistCurrentArrows = function persistCurrentArrows() {
    moduleState.arrowsByLevel[String(app.state.currentLevel.id)] = cloneArrowMap(app.state.arrows);
    saveProgress();
  };

  app.resetLevelState = function resetLegacyLevelState() {
    resetLevelAttempt(moduleState);
    syncLegacyState(app, moduleState);
  };

  app.setCurrentLevel = function setLegacyCurrentLevel(levelId) {
    if (!setCurrentLevel(moduleState, levelId)) {
      return false;
    }
    syncLegacyState(app, moduleState);
    saveProgress();
    return true;
  };

  app.restartProgress = function restartProgress() {
    restartGame(moduleState);
    clearSavedProgress();
    syncLegacyState(app, moduleState);
    saveProgress();
  };

  app.storage = {
    clearSavedProgress,
    loadProgress: () => loadSession(storage) || loadLegacySession(storage),
    saveProgress,
    storageKey: 'ravlyk-code-session-v1',
    legacyStorageKey: LEGACY_STORAGE_KEY
  };

  syncLegacyState(app, moduleState);
  return app;
}
