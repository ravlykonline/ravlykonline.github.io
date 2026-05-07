const STATIC_CACHE = 'ravlyk-static-v13';
const STATIC_ASSETS = [
    './',
    './index.html',
    './offline.html',
    './manifest.json',
    './tokens.css',
    './style.css',
    './css/entities.css',
    './css/hud.css',
    './css/tasks.css',
    './icons/icon-192.svg',
    './icons/icon-512.svg',
    './js/main.js',
    './js/app/bootstrap.js',
    './js/core/announcer.js',
    './js/core/config.js',
    './js/core/dom.js',
    './js/core/event-bus.js',
    './js/core/input.js',
    './js/core/motion.js',
    './js/game/collision-system.js',
    './js/game/distribution-rules.js',
    './js/game/level-data.js',
    './js/game/npc-spawner.js',
    './js/game/rules.js',
    './js/game/session-state.js',
    './js/game/spawn-rules.js',
    './js/game/task-picker.js',
    './js/game/world-generator.js',
    './js/i18n/index.js',
    './js/i18n/uk.js',
    './js/pwa/register-sw.js',
    './js/scenes/dialog-scene.js',
    './js/scenes/game-scene.js',
    './js/scenes/intro-scene.js',
    './js/scenes/modal-scene.js',
    './js/scenes/scene-manager.js',
    './js/systems/score-system.js',
    './js/tasks/task-catalog.js',
    './js/tasks/task-registry.js',
    './js/tasks/task-ui-helpers.js',
    './js/tasks/task-validator.js',
    './js/tasks/task-data/categories/arithmetic.beginner.json',
    './js/tasks/task-data/categories/counting.beginner.json',
    './js/tasks/task-data/categories/logic.beginner.json',
    './js/tasks/task-data/categories/observation.beginner.json',
    './js/tasks/task-data/categories/patterns.beginner.json',
    './js/tasks/task-data/categories/visual-logic.beginner.json',
    './js/tasks/task-data/compare-sets-variants.js',
    './js/tasks/task-data/count-and-match-variants.js',
    './js/tasks/task-data/logic-pairs-variants.js',
    './js/tasks/task-data/magic-square-variants.js',
    './js/tasks/task-data/odd-one-out-variants.js',
    './js/tasks/task-data/order-numbers-variants.js',
    './js/tasks/task-data/sequence-next-variants.js',
    './js/tasks/task-data/shape-pattern-variants.js',
    './js/tasks/task-data/simple-addition-variants.js',
    './js/tasks/task-data/simple-subtraction-variants.js',
    './js/tasks/task-data/task-pools.js',
    './js/tasks/task-evaluators/single-choice.js',
    './js/tasks/task-types/compare-sets.js',
    './js/tasks/task-types/count-and-match.js',
    './js/tasks/task-types/logic-pairs.js',
    './js/tasks/task-types/magic-square.js',
    './js/tasks/task-types/odd-one-out.js',
    './js/tasks/task-types/order-numbers.js',
    './js/tasks/task-types/sequence-next.js',
    './js/tasks/task-types/shape-pattern.js',
    './js/tasks/task-types/simple-addition.js',
    './js/tasks/task-types/simple-subtraction.js',
    './js/ui/font-mode.js',
    './js/ui/hud-controller.js',
    './js/ui/reward-effects.js',
    './js/ui/theme-mode.js'
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
