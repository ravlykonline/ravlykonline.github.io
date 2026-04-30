const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { readUtf8, root } = require('./testHelpers.cjs');

function readAppShell() {
  const source = readUtf8('sw.js');
  const match = source.match(/const APP_SHELL = (\[[\s\S]*?\]);/);
  assert.ok(match, 'APP_SHELL should be declared as a static array');
  return vm.runInNewContext(match[1]);
}

test('service worker app shell caches real local files', () => {
  const appShell = readAppShell();

  assert.ok(appShell.includes('./js/core/config.js'));
  assert.ok(appShell.includes('./js/core/constants.js'));
  assert.ok(appShell.includes('./js/core/levels.js'));
  assert.ok(appShell.includes('./js/core/texts.uk.js'));
  assert.ok(appShell.includes('./js/engine/levelRules.js'));
  assert.ok(appShell.includes('./js/engine/route.js'));
  assert.ok(appShell.includes('./js/engine/simulator.js'));
  assert.ok(appShell.includes('./js/engine/validation.js'));
  assert.ok(appShell.includes('./js/features/audio.js'));
  assert.ok(appShell.includes('./js/features/confetti.js'));
  assert.ok(appShell.includes('./js/features/pwaRegister.js'));
  assert.ok(appShell.includes('./js/features/speech.js'));
  assert.ok(appShell.includes('./js/state/gameState.js'));
  assert.ok(appShell.includes('./js/state/sessionStore.js'));
  assert.ok(appShell.includes('./js/ui/dom.js'));
  assert.ok(appShell.includes('./js/ui/focus.js'));
  assert.ok(appShell.includes('./js/ui/modals.js'));
  assert.ok(appShell.includes('./js/ui/renderBoard.js'));
  assert.ok(appShell.includes('./js/ui/renderLevelMap.js'));
  assert.ok(appShell.includes('./js/ui/renderPalette.js'));
  assert.ok(appShell.includes('./js/ui/renderProgress.js'));

  for (const entry of appShell) {
    assert.doesNotMatch(entry, /^https?:\/\//i);
    assert.doesNotMatch(entry, /^\//);

    if (entry === './') {
      continue;
    }

    const relativePath = entry.replace(/^\.\//, '');
    assert.ok(fs.existsSync(path.join(root, relativePath)), `${entry} missing`);
  }
});

test('service worker cache version is bumped for added app shell files', () => {
  const source = readUtf8('sw.js');

  assert.match(source, /const STATIC_CACHE = 'ravlyk-static-v4'/);
  assert.match(source, /event\.request\.method !== 'GET'/);
});

test('manifest uses /go-compatible relative paths', () => {
  const manifest = JSON.parse(readUtf8('manifest.json'));

  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'uk');

  for (const icon of manifest.icons) {
    assert.match(icon.src, /^\.\//);
    assert.doesNotMatch(icon.src, /^https?:\/\//i);
    assert.doesNotMatch(icon.src, /^\//);
  }
});
