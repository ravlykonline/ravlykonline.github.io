// Service worker for offline play.
// Core app files use network-first so deployed updates can replace older cached
// copies without relying entirely on manual cache version bumps.
const CACHE_PREFIX = 'ravlyk-go-static-v';
const STATIC_CACHE = 'ravlyk-go-static-v48';
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
  './assets/ui-sun.svg',
  './assets/ui-moon.svg',
  './assets/ui-map.svg',
  './assets/ui-undo.svg',
  './assets/ui-sound.svg',
  './assets/ui-book.svg',
  './assets/ui-hint.svg',
  './assets/ui-search.svg',
  './assets/ui-warning.svg',
  './assets/ui-check.svg',
  './assets/ui-trash.svg',
  './assets/ui-prev.svg',
  './assets/ui-next.svg',
  './assets/trash_icon.svg',
  './assets/prev_level.svg',
  './assets/next_level.svg',
  './assets/apple.svg',
  './assets/garden-paper.jpg',
  './assets/nunito-cyrillic.woff2',
  './assets/nunito-latin.woff2',
  './assets/voice/1.mp3',
  './assets/voice/2.mp3',
  './assets/voice/3.mp3',
  './assets/voice/4.mp3',
  './assets/voice/5.mp3',
  './assets/voice/6.mp3',
  './assets/voice/7.mp3',
  './assets/voice/8.mp3',
  './assets/voice/9.mp3',
  './assets/voice/10.mp3',
  './assets/voice/11.mp3',
  './assets/voice/12.mp3',
  './assets/voice/13.mp3',
  './assets/voice/14.mp3',
  './assets/voice/15.mp3',
  './assets/voice/16.mp3',
  './assets/voice/17.mp3',
  './assets/voice/18.mp3',
  './assets/voice/19.mp3',
  './assets/voice/20.mp3',
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
const SHELL_URLS = new Set(APP_SHELL.map((path) => new URL(path, self.registration.scope).href));

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

async function networkFirst(request, shellUrl, fallback) {
  let response;
  try {
    response = await fetch(request);
  } catch {
    return fallback();
  }

  if (!SHELL_URLS.has(shellUrl)) {
    return response;
  }
  try {
    if (request.mode === 'navigate' || request.destination === 'document') {
      return await cacheDocumentResponse(shellUrl, response);
    }
    return await cacheAssetResponse(shellUrl, response);
  } catch {
    return response;
  }
}

async function readAudioRange(response, range) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) {
    return response;
  }
  const audio = await response.blob();
  const [, first, last] = match;
  const start = first ? Number(first) : Math.max(0, audio.size - Number(last));
  const end = first && last ? Math.min(Number(last), audio.size - 1) : audio.size - 1;
  if (start > end || start >= audio.size) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${audio.size}` }
    });
  }
  return new Response(audio.slice(start, end + 1, audio.type), {
    status: 206,
    headers: {
      'Content-Type': audio.type || 'audio/mpeg',
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${audio.size}`,
      'Accept-Ranges': 'bytes'
    }
  });
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
      keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE)
        .map((key) => caches.delete(key))
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

  const shellUrl = new URL(requestUrl.pathname, requestUrl.origin).href;
  if (isDocument) {
    event.respondWith(
      networkFirst(event.request, shellUrl, async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(shellUrl)) || cache.match('./offline.html');
      })
    );
    return;
  }

  if (!SHELL_URLS.has(shellUrl)) {
    return;
  }

  if (isRuntimeUpdatableAsset(requestUrl.pathname)) {
    event.respondWith(
      networkFirst(event.request, shellUrl, () => caches.match(shellUrl, { cacheName: STATIC_CACHE }))
    );
    return;
  }

  event.respondWith(
    caches.match(shellUrl, { cacheName: STATIC_CACHE })
      .then((cached) => {
        const range = event.request.headers.get('range');
        if (cached && range && requestUrl.pathname.endsWith('.mp3')) {
          return readAudioRange(cached, range);
        }
        return cached || fetch(event.request);
      })
  );
});

