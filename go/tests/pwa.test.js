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
  assert.ok(appShell.includes('./js/app/appFactory.js'));
  assert.ok(appShell.includes('./js/app/composition.js'));
  assert.equal(appShell.includes('./js/app/legacyEngine.js'), false);
  assert.equal(appShell.includes('./js/app/legacyGlobals.js'), false);
  assert.equal(appShell.includes('./js/app/legacyRender.js'), false);
  assert.equal(appShell.includes('./js/app/legacyRenderDrag.js'), false);
  assert.equal(appShell.includes('./js/app/legacyRenderSnail.js'), false);
  assert.equal(appShell.includes('./js/app/legacyState.js'), false);
  assert.equal(appShell.includes('./js/app/legacyUiAudio.js'), false);
  assert.equal(appShell.includes('./js/app/legacyUiModals.js'), false);
  assert.equal(appShell.includes('./js/app/legacyUi.js'), false);
  assert.ok(appShell.includes('./js/engine/levelRules.js'));
  assert.ok(appShell.includes('./js/engine/route.js'));
  assert.ok(appShell.includes('./js/engine/runtime.js'));
  assert.ok(appShell.includes('./js/engine/simulator.js'));
  assert.ok(appShell.includes('./js/engine/validation.js'));
  assert.ok(appShell.includes('./js/features/audio.js'));
  assert.ok(appShell.includes('./js/features/confetti.js'));
  assert.ok(appShell.includes('./js/features/pwaRegister.js'));
  assert.ok(appShell.includes('./js/features/speech.js'));
  assert.ok(appShell.includes('./js/state/appStateFacade.js'));
  assert.ok(appShell.includes('./js/state/gameState.js'));
  assert.ok(appShell.includes('./js/state/sessionStore.js'));
  assert.ok(appShell.includes('./js/ui/appUi.js'));
  assert.ok(appShell.includes('./js/ui/appUiEffects.js'));
  assert.ok(appShell.includes('./js/ui/appUiEvents.js'));
  assert.ok(appShell.includes('./js/ui/appUiLevelFlow.js'));
  assert.ok(appShell.includes('./js/ui/appUiLayout.js'));
  assert.ok(appShell.includes('./js/ui/appUiState.js'));
  assert.ok(appShell.includes('./js/ui/appUiStartup.js'));
  assert.ok(appShell.includes('./js/ui/appUiStatus.js'));
  assert.ok(appShell.includes('./js/ui/dom.js'));
  assert.ok(appShell.includes('./js/ui/assets.js'));
  assert.ok(appShell.includes('./js/ui/focus.js'));
  assert.ok(appShell.includes('./js/ui/modals.js'));
  assert.ok(appShell.includes('./js/ui/render.js'));
  assert.ok(appShell.includes('./js/ui/renderBoard.js'));
  assert.ok(appShell.includes('./js/ui/renderLevelHeader.js'));
  assert.ok(appShell.includes('./js/ui/renderLevelMap.js'));
  assert.ok(appShell.includes('./js/ui/renderPalette.js'));
  assert.ok(appShell.includes('./js/ui/renderProgress.js'));
  assert.ok(appShell.includes('./js/ui/renderDrag.js'));
  assert.ok(appShell.includes('./js/ui/renderSnail.js'));
  assert.ok(appShell.includes('./js/main.module.js'));
  assert.equal(appShell.includes('./js/main.legacy.js'), false);
  assert.equal(appShell.includes('./js/levels.js'), false);
  assert.equal(appShell.includes('./js/texts.uk.js'), false);
  assert.equal(appShell.includes('./js/gameState.js'), false);
  assert.equal(appShell.includes('./js/renderDrag.js'), false);
  assert.equal(appShell.includes('./js/renderSnail.js'), false);
  assert.equal(appShell.includes('./js/render.js'), false);
  assert.equal(appShell.includes('./js/engineRoute.js'), false);
  assert.equal(appShell.includes('./js/engine.js'), false);
  assert.equal(appShell.includes('./js/uiAudio.js'), false);
  assert.equal(appShell.includes('./js/uiModals.js'), false);
  assert.equal(appShell.includes('./js/ui.js'), false);

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

  assert.match(source, /const STATIC_CACHE = 'ravlyk-static-v39'/);
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

test('index redirects /go to /go/ before loading page assets', () => {
  const html = readUtf8('index.html');
  const redirectScriptIndex = html.indexOf('function ensureDirectoryUrl()');
  const firstStylesheetIndex = html.indexOf('<link rel="stylesheet"');
  const moduleScriptIndex = html.indexOf('<script type="module"');

  assert.notEqual(redirectScriptIndex, -1, 'index.html should contain the early directory URL guard');
  assert.ok(redirectScriptIndex < firstStylesheetIndex, 'directory URL guard should run before CSS loads');
  assert.ok(redirectScriptIndex < moduleScriptIndex, 'directory URL guard should run before module JS loads');
  assert.ok(html.includes("window.location.replace(path + '/' + window.location.search + window.location.hash)"));
  assert.ok(html.includes("window.location.protocol !== 'file:'"));
});

test('optional redirects file documents /go to /go/ fallback for supporting hosts', () => {
  const redirects = readUtf8('_redirects').trim();

  assert.equal(redirects, '/go /go/ 301');
});
