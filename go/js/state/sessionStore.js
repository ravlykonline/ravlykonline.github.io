export const SESSION_VERSION = 1;
export const SESSION_STORAGE_KEY = 'ravlyk-code-session-v1';

const VALID_DIRECTIONS = new Set([
  'up', 'right', 'down', 'left',
  'right-up', 'down-right', 'left-down', 'up-left',
  'right-down', 'down-left', 'left-up', 'up-right'
]);

function getSessionStorage() {
  try {
    return window.sessionStorage || null;
  } catch {
    return null;
  }
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeArrowMap(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const entries = Object.entries(value).filter(([key, direction]) => (
    /^\d+,\d+$/.test(key) && VALID_DIRECTIONS.has(direction)
  ));

  return entries.length === Object.keys(value).length ? Object.fromEntries(entries) : null;
}

function normalizeArrowsByLevel(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const normalized = {};
  for (const [levelId, arrows] of Object.entries(value)) {
    if (!/^\d+$/.test(levelId)) {
      return null;
    }

    const arrowMap = normalizeArrowMap(arrows);
    if (!arrowMap) {
      return null;
    }

    normalized[levelId] = arrowMap;
  }

  return normalized;
}

function normalizeCompletedLevelIds(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const ids = value.filter(isPositiveInteger);
  if (ids.length !== value.length) {
    return null;
  }

  return [...new Set(ids)];
}

export function normalizeSession(value) {
  if (!isPlainObject(value) || value.version !== SESSION_VERSION) {
    return null;
  }

  if (!isPositiveInteger(value.currentLevelId)) {
    return null;
  }

  const arrowsByLevel = normalizeArrowsByLevel(value.arrowsByLevel);
  const completedLevelIds = normalizeCompletedLevelIds(value.completedLevelIds);

  if (!arrowsByLevel || !completedLevelIds) {
    return null;
  }

  return {
    version: SESSION_VERSION,
    currentLevelId: value.currentLevelId,
    arrowsByLevel,
    completedLevelIds
  };
}

export function isSessionStorageAvailable(storage = getSessionStorage()) {
  if (!storage) {
    return false;
  }

  const testKey = `${SESSION_STORAGE_KEY}:test`;
  try {
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function loadSession(storage = getSessionStorage()) {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return normalizeSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveSession(payload, storage = getSessionStorage()) {
  if (!storage) {
    return false;
  }

  const normalized = normalizeSession(payload);
  if (!normalized) {
    return false;
  }

  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(storage = getSessionStorage()) {
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(SESSION_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
