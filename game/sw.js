const STATIC_CACHE = 'ravlyk-static-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './offline.html',
    './tokens.css',
    './style.css',
    './manifest.json',
    './icons/icon-192.svg',
    './icons/icon-512.svg',
    './js/main.js',
    './js/core/event-bus.js',
    './js/core/announcer.js',
    './js/core/dom.js',
    './js/core/config.js',
    './js/core/input.js',
    './js/core/motion.js',
    './js/game/rules.js',
    './js/game/level-data.js',
    './js/game/task-picker.js',
    './js/scenes/scene-manager.js',
    './js/scenes/modal-scene.js',
    './js/scenes/intro-scene.js',
    './js/scenes/dialog-scene.js',
    './js/scenes/game-scene.js',
    './js/systems/score-system.js',
    './js/pwa/register-sw.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('./offline.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
    );
});
