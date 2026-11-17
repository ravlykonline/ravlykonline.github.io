const CACHE_PREFIX = 'ravlyk-game-static-v';
const LEGACY_CACHE = 'ravlyk-static-v28';
const STATIC_CACHE = 'ravlyk-game-static-v32';
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
    './assets/pictures.svg',
    './assets/homes.svg',
    './assets/pond.svg',
    './assets/ui.svg',
    './assets/star.svg',
    './assets/bush.svg',
    './assets/rock.svg',
    './assets/twig.svg',
    './assets/voice/add-5-5.mp3',
    './assets/voice/add-6-3.mp3',
    './assets/voice/add-6-6.mp3',
    './assets/voice/add-7-4.mp3',
    './assets/voice/add-8-4.mp3',
    './assets/voice/add-9-2.mp3',
    './assets/voice/add-adv-10-7.mp3',
    './assets/voice/add-adv-12-8.mp3',
    './assets/voice/add-adv-13-6.mp3',
    './assets/voice/add-adv-7-8.mp3',
    './assets/voice/add-adv-8-5.mp3',
    './assets/voice/add-adv-9-6.mp3',
    './assets/voice/add-adv-9-9.mp3',
    './assets/voice/compareLess.mp3',
    './assets/voice/compareMore.mp3',
    './assets/voice/countAndMatch.mp3',
    './assets/voice/logic-adv-odd-animals-vs-machine.mp3',
    './assets/voice/logic-adv-odd-gives-light-vs-sound.mp3',
    './assets/voice/logic-adv-odd-more-than-four-legs.mp3',
    './assets/voice/logic-adv-odd-natural-vs-made.mp3',
    './assets/voice/logic-adv-odd-swims-not-flies.mp3',
    './assets/voice/logic-adv-odd-winter-vs-summer.mp3',
    './assets/voice/logic-adv-pairs-boat-water.mp3',
    './assets/voice/logic-adv-pairs-egg-chick.mp3',
    './assets/voice/logic-adv-pairs-grape-juice.mp3',
    './assets/voice/logic-adv-pairs-milk-cheese.mp3',
    './assets/voice/logic-adv-pairs-sprout-tree.mp3',
    './assets/voice/logic-adv-pairs-wheat-bread.mp3',
    './assets/voice/logic-pairs-baby-parent.mp3',
    './assets/voice/logic-pairs-bee-flower.mp3',
    './assets/voice/logic-pairs-bee-honey.mp3',
    './assets/voice/logic-pairs-cat-fish.mp3',
    './assets/voice/logic-pairs-caterpillar-butterfly.mp3',
    './assets/voice/logic-pairs-chick-hen.mp3',
    './assets/voice/logic-pairs-chicken-egg.mp3',
    './assets/voice/logic-pairs-cow-milk.mp3',
    './assets/voice/logic-pairs-dog-bone.mp3',
    './assets/voice/logic-pairs-fish-sea.mp3',
    './assets/voice/logic-pairs-fish-water.mp3',
    './assets/voice/logic-pairs-foot-shoe.mp3',
    './assets/voice/logic-pairs-hand-glove.mp3',
    './assets/voice/logic-pairs-key-door.mp3',
    './assets/voice/logic-pairs-key-lock.mp3',
    './assets/voice/logic-pairs-pencil-paper.mp3',
    './assets/voice/logic-pairs-rabbit-carrot.mp3',
    './assets/voice/logic-pairs-rain-umbrella.mp3',
    './assets/voice/logic-pairs-seed-tree.mp3',
    './assets/voice/logic-pairs-sheep-wool.mp3',
    './assets/voice/logic-pairs-snow-cold.mp3',
    './assets/voice/logic-pairs-snow-mittens.mp3',
    './assets/voice/logic-pairs-squirrel-acorn.mp3',
    './assets/voice/logicPairs.mp3',
    './assets/voice/magicSquare.mp3',
    './assets/voice/odd-one-out-air-land-transport.mp3',
    './assets/voice/odd-one-out-animals.mp3',
    './assets/voice/odd-one-out-birds-butterfly.mp3',
    './assets/voice/odd-one-out-birds-fish.mp3',
    './assets/voice/odd-one-out-clothing-animal.mp3',
    './assets/voice/odd-one-out-day-vs-night.mp3',
    './assets/voice/odd-one-out-flowers-tree.mp3',
    './assets/voice/odd-one-out-forest-food.mp3',
    './assets/voice/odd-one-out-fruits-vegetable.mp3',
    './assets/voice/odd-one-out-grow-vs-build.mp3',
    './assets/voice/odd-one-out-grows-on-tree.mp3',
    './assets/voice/odd-one-out-has-shell.mp3',
    './assets/voice/odd-one-out-hot-vs-cold.mp3',
    './assets/voice/odd-one-out-insects-bird.mp3',
    './assets/voice/odd-one-out-instruments-animal.mp3',
    './assets/voice/odd-one-out-land-sea-transport.mp3',
    './assets/voice/odd-one-out-lays-eggs.mp3',
    './assets/voice/odd-one-out-leaves-acorn.mp3',
    './assets/voice/odd-one-out-legs-count.mp3',
    './assets/voice/odd-one-out-lives-in-water.mp3',
    './assets/voice/odd-one-out-living-nonliving.mp3',
    './assets/voice/odd-one-out-logic-animals.mp3',
    './assets/voice/odd-one-out-logic-forest-food.mp3',
    './assets/voice/odd-one-out-logic-shapes.mp3',
    './assets/voice/odd-one-out-makes-light.mp3',
    './assets/voice/odd-one-out-mammals-bird.mp3',
    './assets/voice/odd-one-out-many-vs-one-side.mp3',
    './assets/voice/odd-one-out-pets-wild.mp3',
    './assets/voice/odd-one-out-plants-animal.mp3',
    './assets/voice/odd-one-out-round-vs-square.mp3',
    './assets/voice/odd-one-out-sea-land.mp3',
    './assets/voice/odd-one-out-shapes.mp3',
    './assets/voice/odd-one-out-sky-animal.mp3',
    './assets/voice/odd-one-out-sports-food.mp3',
    './assets/voice/odd-one-out-swim-vs-fly.mp3',
    './assets/voice/odd-one-out-tools-for-writing.mp3',
    './assets/voice/odd-one-out-tools-vs-toy.mp3',
    './assets/voice/odd-one-out-transport-living.mp3',
    './assets/voice/odd-one-out-vegetables-fruit.mp3',
    './assets/voice/odd-one-out-vegetables-vs-fruit.mp3',
    './assets/voice/odd-one-out-water-land.mp3',
    './assets/voice/odd-one-out-wheels-vs-wings.mp3',
    './assets/voice/odd-one-out-wild-vs-farm.mp3',
    './assets/voice/odd-one-out-winter-summer.mp3',
    './assets/voice/oddOneOut.mp3',
    './assets/voice/orderAsc.mp3',
    './assets/voice/orderDesc.mp3',
    './assets/voice/sequence.mp3',
    './assets/voice/shapePattern.mp3',
    './assets/voice/simple-addition-1-1.mp3',
    './assets/voice/simple-addition-1-4.mp3',
    './assets/voice/simple-addition-2-1.mp3',
    './assets/voice/simple-addition-2-2.mp3',
    './assets/voice/simple-addition-2-3.mp3',
    './assets/voice/simple-addition-3-2.mp3',
    './assets/voice/simple-addition-3-3.mp3',
    './assets/voice/simple-addition-4-2.mp3',
    './assets/voice/simple-addition-4-3.mp3',
    './assets/voice/simple-addition-5-1.mp3',
    './assets/voice/simple-subtraction-3-1.mp3',
    './assets/voice/simple-subtraction-4-1.mp3',
    './assets/voice/simple-subtraction-5-2.mp3',
    './assets/voice/simple-subtraction-6-2.mp3',
    './assets/voice/simple-subtraction-6-3.mp3',
    './assets/voice/simple-subtraction-7-2.mp3',
    './assets/voice/simple-subtraction-7-3.mp3',
    './assets/voice/simple-subtraction-8-4.mp3',
    './assets/voice/sub-10-10.mp3',
    './assets/voice/sub-10-4.mp3',
    './assets/voice/sub-11-5.mp3',
    './assets/voice/sub-12-3.mp3',
    './assets/voice/sub-12-7.mp3',
    './assets/voice/sub-9-6.mp3',
    './assets/voice/sub-adv-13-5.mp3',
    './assets/voice/sub-adv-14-6.mp3',
    './assets/voice/sub-adv-15-7.mp3',
    './assets/voice/sub-adv-16-8.mp3',
    './assets/voice/sub-adv-17-9.mp3',
    './assets/voice/sub-adv-18-9.mp3',
    './assets/voice/sub-adv-20-4.mp3',
    './js/main.js',
    './js/app/bootstrap.js',
    './js/core/announcer.js',
    './js/core/audio-context.js',
    './js/core/config.js',
    './js/core/dom.js',
    './js/core/event-bus.js',
    './js/core/input.js',
    './js/core/motion.js',
    './js/game/collectible-system.js',
    './js/game/camera-system.js',
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
    './js/scenes/pause-scene.js',
    './js/scenes/scene-manager.js',
    './js/scenes/level-complete-scene.js',
    './js/scenes/win-scene.js',
    './js/systems/score-system.js',
    './js/tasks/task-catalog.js',
    './js/tasks/task-registry.js',
    './js/tasks/task-ui-helpers.js',
    './js/tasks/task-validator.js',
    './js/tasks/task-voice.js',
    './js/tasks/task-data/categories/arithmetic.beginner.json',
    './js/tasks/task-data/categories/counting.beginner.json',
    './js/tasks/task-data/categories/logic.beginner.json',
    './js/tasks/task-data/categories/observation.beginner.json',
    './js/tasks/task-data/categories/patterns.beginner.json',
    './js/tasks/task-data/categories/visual-logic.beginner.json',
    './js/tasks/task-data/categories/counting.intermediate.json',
    './js/tasks/task-data/categories/visual-logic.intermediate.json',
    './js/tasks/task-data/categories/patterns.intermediate.json',
    './js/tasks/task-data/categories/logic.intermediate.json',
    './js/tasks/task-data/categories/arithmetic.intermediate.json',
    './js/tasks/task-data/categories/counting.advanced.json',
    './js/tasks/task-data/categories/visual-logic.advanced.json',
    './js/tasks/task-data/categories/patterns.advanced.json',
    './js/tasks/task-data/categories/logic.advanced.json',
    './js/tasks/task-data/categories/arithmetic.advanced.json',
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
    './js/ui/illustrations.js',
    './js/ui/joystick.js',
    './js/ui/touch-guard.js',
    './js/ui/music-controller.js',
    './js/ui/reward-effects.js',
    './js/ui/stats-grid.js',
    './js/ui/theme-mode.js',
    './js/frame-guard.js',
    './css/offline.css'
];

self.addEventListener('install', (event) => {
    // skipWaiting() is called AFTER addAll() resolves so the SW never
    // activates before the cache is fully populated (prevents serving
    // partial/stale assets during the install→activate transition).
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && (key.startsWith(CACHE_PREFIX) || key === LEGACY_CACHE))
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

async function serveAudioRange(response, range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return response;

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
    return new Response(audio.slice(start, end + 1), {
        status: 206,
        headers: {
            'Accept-Ranges': 'bytes',
            'Content-Type': audio.type || 'audio/mpeg',
            'Content-Length': String(end - start + 1),
            'Content-Range': `bytes ${start}-${end}/${audio.size}`
        }
    });
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    const scope = self.registration.scope;
    if (request.method !== 'GET' || !url.href.startsWith(scope)) return;

    const match = path => caches.match(path, { cacheName: STATIC_CACHE });

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(async () => {
                const home = url.pathname === new URL(scope).pathname || url.pathname === new URL('index.html', scope).pathname;
                return (home && await match('./index.html')) || match('./offline.html');
            })
        );
        return;
    }

    event.respondWith(
        match(request).then((cachedResponse) => {
            const range = request.headers.get('Range');
            return cachedResponse && range && url.pathname.endsWith('.mp3')
                ? serveAudioRange(cachedResponse, range)
                : cachedResponse || fetch(request);
        })
    );
});
