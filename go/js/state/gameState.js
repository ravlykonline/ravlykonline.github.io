export function cloneArrowMap(source = {}) {
  return Object.fromEntries(Object.entries(source || {}).map(([key, value]) => [key, value]));
}

function findLevel(levels, levelId) {
  return levels.find((level) => level.id === levelId) || null;
}

function getFirstLevel(levels) {
  return levels[0] || null;
}

function getInitialArrowsForLevel(level) {
  return cloneArrowMap(level?.presetArrows || {});
}

function createInitialArrowsByLevel(levels, savedSession) {
  const arrowsByLevel = {};

  for (const level of levels) {
    const savedArrows = savedSession?.arrowsByLevel?.[String(level.id)];
    arrowsByLevel[String(level.id)] = savedArrows
      ? cloneArrowMap(savedArrows)
      : getInitialArrowsForLevel(level);
  }

  return arrowsByLevel;
}

function getValidCompletedLevelIds(levels, savedSession) {
  const levelIds = new Set(levels.map((level) => level.id));
  const completed = Array.isArray(savedSession?.completedLevelIds)
    ? savedSession.completedLevelIds
    : [];

  return completed.filter((id, index) => (
    levelIds.has(id) && completed.indexOf(id) === index
  ));
}

export function getCurrentLevel(state) {
  return findLevel(state.levels, state.currentLevelId);
}

export function getLevelArrows(state, levelId = state.currentLevelId) {
  return state.arrowsByLevel[String(levelId)] || {};
}

export function createInitialState(levels, savedSession = null) {
  const firstLevel = getFirstLevel(levels);
  if (!firstLevel) {
    throw new Error('At least one level is required');
  }

  const savedLevel = findLevel(levels, savedSession?.currentLevelId);
  const currentLevel = savedLevel || firstLevel;

  return {
    levels,
    currentLevelId: currentLevel.id,
    arrowsByLevel: createInitialArrowsByLevel(levels, savedSession),
    completedLevelIds: getValidCompletedLevelIds(levels, savedSession),
    snailPos: { ...currentLevel.start },
    snailFacing: currentLevel.startFacing || 'right',
    appleEaten: false,
    startHighlightKey: null,
    running: false,
    selDir: null,
    pendingDeleteKey: null,
    dragDir: null,
    touchDir: null,
    touchCell: null
  };
}

export function resetLevelAttempt(state) {
  const level = getCurrentLevel(state);
  if (!level) {
    return state;
  }

  state.snailPos = { ...level.start };
  state.snailFacing = level.startFacing || 'right';
  state.appleEaten = false;
  state.startHighlightKey = null;
  state.running = false;
  state.selDir = null;
  state.pendingDeleteKey = null;
  state.dragDir = null;
  state.touchDir = null;
  state.touchCell = null;
  return state;
}

export function setCurrentLevel(state, levelId) {
  const level = findLevel(state.levels, levelId);
  if (!level) {
    return false;
  }

  state.currentLevelId = level.id;
  if (!state.arrowsByLevel[String(level.id)]) {
    state.arrowsByLevel[String(level.id)] = getInitialArrowsForLevel(level);
  }
  resetLevelAttempt(state);
  return true;
}

export function placeArrow(state, levelId, key, direction) {
  const level = findLevel(state.levels, levelId);
  if (!level || !key || !direction) {
    return false;
  }

  const levelKey = String(level.id);
  state.arrowsByLevel[levelKey] = {
    ...getLevelArrows(state, level.id),
    [key]: direction
  };

  return true;
}

export function removeArrow(state, levelId, key) {
  const level = findLevel(state.levels, levelId);
  if (!level || !key) {
    return false;
  }

  const levelKey = String(level.id);
  const arrows = cloneArrowMap(getLevelArrows(state, level.id));
  delete arrows[key];
  state.arrowsByLevel[levelKey] = arrows;

  if (state.pendingDeleteKey === key && state.currentLevelId === level.id) {
    state.pendingDeleteKey = null;
  }

  return true;
}

export function markLevelComplete(state, levelId) {
  if (!findLevel(state.levels, levelId)) {
    return false;
  }

  if (!state.completedLevelIds.includes(levelId)) {
    state.completedLevelIds = [...state.completedLevelIds, levelId];
  }

  return true;
}

export function restartGame(state) {
  const firstLevel = getFirstLevel(state.levels);
  if (!firstLevel) {
    return state;
  }

  state.currentLevelId = firstLevel.id;
  state.completedLevelIds = [];
  state.arrowsByLevel = createInitialArrowsByLevel(state.levels, null);
  resetLevelAttempt(state);
  return state;
}

export function toSessionPayload(state) {
  return {
    version: 1,
    currentLevelId: state.currentLevelId,
    arrowsByLevel: Object.fromEntries(
      Object.entries(state.arrowsByLevel).map(([levelId, arrows]) => [levelId, cloneArrowMap(arrows)])
    ),
    completedLevelIds: [...state.completedLevelIds]
  };
}
