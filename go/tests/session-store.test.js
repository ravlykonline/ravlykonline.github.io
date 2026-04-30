const test = require('node:test');
const assert = require('node:assert/strict');

const { readUtf8 } = require('./testHelpers.cjs');

async function importSessionStore() {
  const source = readUtf8('js/state/sessionStore.js');
  const url = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  return import(url);
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

test('sessionStore saves, loads and clears the versioned session payload', async () => {
  const store = await importSessionStore();
  const storage = createStorage();
  const payload = {
    version: 1,
    currentLevelId: 7,
    arrowsByLevel: {
      7: {
        '1,2': 'right',
        '1,3': 'down'
      }
    },
    completedLevelIds: [1, 2, 2, 3]
  };

  assert.equal(store.saveSession(payload, storage), true);
  assert.deepEqual(store.loadSession(storage), {
    version: 1,
    currentLevelId: 7,
    arrowsByLevel: {
      7: {
        '1,2': 'right',
        '1,3': 'down'
      }
    },
    completedLevelIds: [1, 2, 3]
  });

  assert.equal(store.clearSession(storage), true);
  assert.equal(store.loadSession(storage), null);
});

test('sessionStore ignores invalid JSON and invalid schemas', async () => {
  const store = await importSessionStore();
  const storage = createStorage();

  storage.setItem(store.SESSION_STORAGE_KEY, '{');
  assert.equal(store.loadSession(storage), null);

  storage.setItem(store.SESSION_STORAGE_KEY, JSON.stringify({
    version: 1,
    currentLevelId: 0,
    arrowsByLevel: {},
    completedLevelIds: []
  }));
  assert.equal(store.loadSession(storage), null);

  storage.setItem(store.SESSION_STORAGE_KEY, JSON.stringify({
    version: 1,
    currentLevelId: 1,
    arrowsByLevel: {
      1: {
        '1,2': 'sideways'
      }
    },
    completedLevelIds: []
  }));
  assert.equal(store.loadSession(storage), null);
});

test('sessionStore fails safely when storage throws', async () => {
  const store = await importSessionStore();
  const throwingStorage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    },
    removeItem() {
      throw new Error('blocked');
    }
  };

  assert.equal(store.isSessionStorageAvailable(throwingStorage), false);
  assert.equal(store.loadSession(throwingStorage), null);
  assert.equal(store.saveSession({
    version: 1,
    currentLevelId: 1,
    arrowsByLevel: {},
    completedLevelIds: []
  }, throwingStorage), false);
  assert.equal(store.clearSession(throwingStorage), false);
});

test('sessionStore is the only new state module that names sessionStorage', () => {
  const source = readUtf8('js/state/sessionStore.js');

  assert.match(source, /window\.sessionStorage/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
});
