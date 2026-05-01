// Service worker for offline play.
// Core app files use network-first so deployed updates can replace older cached
// copies without relying entirely on manual cache version bumps.
const STATIC_CACHE = 'ravlyk-static-v39';
const APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './ravlyk.png',
  './css/tokens.css',
  './css/base.css',
  './css/game.css',
  './js/core/config.js',
  './js/core/constants.js',
  './js/core/levels.js',
  './js/core/texts.uk.js',
  './js/app/appFactory.js',
  './js/app/composition.js',
  './js/engine/levelRules.js',
  './js/engine/route.js',
  './js/engine/runtime.js',
  './js/engine/simulator.js',
  './js/engine/validation.js',
  './js/features/audio.js',
  './js/features/confetti.js',
  './js/features/pwaRegister.js',
  './js/features/speech.js',
  './js/state/appStateFacade.js',
  './js/state/gameState.js',
  './js/state/sessionStore.js',
  './js/ui/dom.js',
  './js/ui/appUi.js',
  './js/ui/appUiEffects.js',
  './js/ui/appUiEvents.js',
  './js/ui/appUiLevelFlow.js',
  './js/ui/appUiLayout.js',
  './js/ui/appUiState.js',
  './js/ui/appUiStartup.js',
  './js/ui/appUiStatus.js',
  './js/ui/assets.js',
  './js/ui/focus.js',
  './js/ui/modals.js',
  './js/ui/render.js',
  './js/ui/renderBoard.js',
  './js/ui/renderLevelHeader.js',
  './js/ui/renderLevelMap.js',
  './js/ui/renderPalette.js',
  './js/ui/renderProgress.js',
  './js/ui/renderDrag.js',
  './js/ui/renderSnail.js',
  './js/main.js',
  './js/main.module.js',
  './assets/run_button.svg',
  './assets/trash_icon.svg',
  './assets/prev_level.svg',
  './assets/next_level.svg',
  './assets/apple.svg',
  './assets/snail.svg',
  './assets/rock.svg',
  './assets/stump.svg',
  './assets/straight_up.svg',
  './assets/straight_right.svg',
  './assets/straight_down.svg',
  './assets/straight_left.svg',
  './assets/right_to_up.svg',
  './assets/bottom_to_right.svg',
  './assets/left_to_down.svg',
  './assets/top_to_left.svg',
  './assets/right_to_down.svg',
  './assets/bottom_to_left.svg',
  './assets/left_to_up.svg',
  './assets/top_to_right.svg',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

function isSuccessfulDocumentResponse(response) {
  if (!response || !response.ok) {
    return false;
  }

  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('text/html');
}

function isCacheableAssetResponse(response) {
  return !!response && response.ok;
}

async function cacheDocumentResponse(request, response) {
  if (!isSuccessfulDocumentResponse(response)) {
    return response;
  }

  const cache = await caches.open(STATIC_CACHE);
  await cache.put(request, response.clone());
  return response;
}

async function cacheAssetResponse(request, response) {
  if (!isCacheableAssetResponse(response)) {
    return response;
  }

  const cache = await caches.open(STATIC_CACHE);
  await cache.put(request, response.clone());
  return response;
}

function isRuntimeUpdatableAsset(pathname) {
  return (
    pathname.endsWith('.html') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.json')
  );
}

async function networkFirst(request, fallback) {
  try {
    const response = await fetch(request);
    if (request.mode === 'navigate' || request.destination === 'document') {
      return cacheDocumentResponse(request, response);
    }
    return cacheAssetResponse(request, response);
  } catch {
    return fallback();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isDocument = event.request.mode === 'navigate' || event.request.destination === 'document';
  const sameOrigin = requestUrl.origin === self.location.origin;

  if (!sameOrigin) {
    return;
  }

  if (isDocument) {
    event.respondWith(
      networkFirst(event.request, async () => {
        return (await caches.match(event.request)) || caches.match('./offline.html');
      })
    );
    return;
  }

  if (isRuntimeUpdatableAsset(requestUrl.pathname)) {
    event.respondWith(
      networkFirst(event.request, async () => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

