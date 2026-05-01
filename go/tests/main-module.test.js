const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createSessionStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) || null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

function createElement(tagName) {
  return {
    attrs: {},
    alt: '',
    className: '',
    draggable: true,
    src: '',
    tagName,
    setAttribute(name, value) {
      this.attrs[name] = String(value);
    }
  };
}

function createDocument() {
  return {
    createElement,
    getElementById(id) {
      return { id };
    }
  };
}

test('candidate module entrypoint bootstraps composition and app modules', async () => {
  const previousDocument = globalThis.document;
  const previousNavigator = globalThis.navigator;
  const previousWindow = globalThis.window;
  const windowRef = {
    addEventListener() {},
    location: { protocol: 'file:' },
    sessionStorage: createSessionStorage()
  };

  try {
    globalThis.document = createDocument();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {}
    });
    globalThis.window = windowRef;

    const { bootstrapApp } = await importModule('js/main.module.js');
    const composition = await bootstrapApp({
      documentRef: globalThis.document,
      initializeUi: false,
      loadLegacyRuntime: false,
      navigatorRef: globalThis.navigator,
      windowRef
    });

    assert.equal(composition.levels.length, 20);
    assert.equal(composition.app.tileDefs.length, 12);
    assert.equal(typeof composition.app.resolveTileExit, 'function');
    assert.equal(typeof composition.app.createUiAudio, 'function');
    assert.equal(typeof composition.app.createUiModals, 'function');
    assert.equal(windowRef.SnailGame, undefined);
  } finally {
    globalThis.document = previousDocument;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: previousNavigator
    });
    globalThis.window = previousWindow;
  }
});

test('candidate module entrypoint avoids storage internals and old script contents', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'js/main.module.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  assert.doesNotMatch(source, /createTileDef/);
  assert.doesNotMatch(source, /resolveTileExit\(tileDir/);
});

test('module entrypoint defines ordered legacy runtime loading for the transition', async () => {
  const { LEGACY_RUNTIME_SCRIPTS, loadLegacyRuntimeScripts } = await importModule('js/main.module.js');
  const loaded = [];
  const documentRef = {
    body: {
      appendChild(script) {
        loaded.push(script.src);
        script.onload();
      }
    },
    createElement() {
      return {};
    }
  };

  assert.deepEqual(LEGACY_RUNTIME_SCRIPTS, []);
  assert.equal(LEGACY_RUNTIME_SCRIPTS.includes('./js/ui.js'), false);
  assert.equal(LEGACY_RUNTIME_SCRIPTS.includes('./js/uiModals.js'), false);
  assert.equal(LEGACY_RUNTIME_SCRIPTS.includes('./js/uiAudio.js'), false);
  assert.equal(LEGACY_RUNTIME_SCRIPTS.includes('./js/render.js'), false);
  assert.equal(LEGACY_RUNTIME_SCRIPTS.includes('./js/renderDrag.js'), false);
  assert.equal(LEGACY_RUNTIME_SCRIPTS.includes('./js/renderSnail.js'), false);
  assert.equal(LEGACY_RUNTIME_SCRIPTS.includes('./js/engineRoute.js'), false);
  assert.equal(LEGACY_RUNTIME_SCRIPTS.includes('./js/engine.js'), false);

  await loadLegacyRuntimeScripts({
    documentRef,
    scripts: ['./a.js', './b.js']
  });

  assert.deepEqual(loaded, ['./a.js', './b.js']);
});
