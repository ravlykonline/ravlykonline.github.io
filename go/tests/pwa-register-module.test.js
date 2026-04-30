const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

test('pwaRegister registers the service worker with a relative ./sw.js path', async () => {
  const { registerPwa } = await importModule('js/features/pwaRegister.js');
  let registeredPath = null;
  let loadHandler = null;
  const windowRef = {
    location: { protocol: 'https:' },
    addEventListener(name, handler) {
      assert.equal(name, 'load');
      loadHandler = handler;
    }
  };
  const navigatorRef = {
    serviceWorker: {
      register(pathValue) {
        registeredPath = pathValue;
        return Promise.resolve();
      }
    }
  };

  assert.equal(registerPwa({ navigatorRef, windowRef }), true);
  assert.equal(typeof loadHandler, 'function');
  loadHandler();
  assert.equal(registeredPath, './sw.js');
});

test('pwaRegister skips unsupported and file protocol contexts', async () => {
  const { registerPwa } = await importModule('js/features/pwaRegister.js');

  assert.equal(registerPwa({
    navigatorRef: {},
    windowRef: { location: { protocol: 'https:' }, addEventListener() {} }
  }), false);
  assert.equal(registerPwa({
    navigatorRef: { serviceWorker: {} },
    windowRef: { location: { protocol: 'file:' }, addEventListener() {} }
  }), false);
});
