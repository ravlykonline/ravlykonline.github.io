const CACHE_VERSION = '2026-03-12-1';
const APP_CACHE = `ravlyk-app-${CACHE_VERSION}`;
const OFFLINE_FALLBACK_URL = '/index.html';

const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manual.html',
    '/lessons.html',
    '/quiz.html',
    '/resources.html',
    '/teacher_guidelines.html',
    '/advice_for_parents.html',
    '/zen.html',
    '/about.html',
    '/site.webmanifest?v=2026-03-12-1',
    '/css/about-project.css',
    '/css/accessibility.css?v=2026-03-12-1',
    '/css/global.css?v=2026-03-12-1',
    '/css/lessons.css?v=2026-03-12-1',
    '/css/main-editor.css?v=2026-03-12-1',
    '/css/manual.css?v=2026-03-12-1',
    '/css/parents.css?v=2026-03-12-1',
    '/css/quiz.css?v=2026-03-12-1',
    '/css/resources.css?v=2026-03-12-1',
    '/css/teacher-guidelines.css?v=2026-03-12-1',
    '/css/zen.css?v=2026-03-12-1',
    '/js/accessibility.js',
    '/js/accessibility.js?v=2026-03-12-1',
    '/js/lessonsPage.js',
    '/js/lessonsPage.js?v=2026-03-12-1',
    '/js/main.js',
    '/js/main.js?v=2026-03-12-1',
    '/js/manualPage.js',
    '/js/manualPage.js?v=2026-03-12-1',
    '/js/quizBank.js',
    '/js/quizPage.js',
    '/js/quizPage.js?v=2026-03-12-1',
    '/js/registerServiceWorker.js?v=2026-03-12-1',
    '/js/modules/accessibilityNotifications.js',
    '/js/modules/accessibilitySettings.js',
    '/js/modules/backgroundLayer.js',
    '/js/modules/constants.js',
    '/js/modules/editorInputController.js',
    '/js/modules/editorUi.js',
    '/js/modules/environment.js',
    '/js/modules/executionController.js',
    '/js/modules/fileActionsController.js',
    '/js/modules/gridOverlay.js',
    '/js/modules/interpreterAnimation.js',
    '/js/modules/interpreterAstEval.js',
    '/js/modules/interpreterAstQueueAdapter.js',
    '/js/modules/interpreterBoundary.js',
    '/js/modules/interpreterCommandClone.js',
    '/js/modules/interpreterCommandExecutor.js',
    '/js/modules/interpreterConditions.js',
    '/js/modules/interpreterDrawingOps.js',
    '/js/modules/interpreterGameAstRunner.js',
    '/js/modules/interpreterGameContract.js',
    '/js/modules/interpreterGameLoop.js',
    '/js/modules/interpreterLifecycleCleanup.js',
    '/js/modules/interpreterPrimitiveStatements.js',
    '/js/modules/interpreterQueueRuntime.js',
    '/js/modules/interpreterRuntimeState.js',
    '/js/modules/lessonsPageController.js',
    '/js/modules/lifecycleController.js',
    '/js/modules/manualPageController.js',
    '/js/modules/modalController.js',
    '/js/modules/navigationPrefetch.js',
    '/js/modules/parserBlocksConditions.js',
    '/js/modules/parserControlStatements.js',
    '/js/modules/parserCoreUtils.js',
    '/js/modules/parserCreateStatement.js',
    '/js/modules/parserExpressions.js',
    '/js/modules/parserMotionStatements.js',
    '/js/modules/parserStatementContext.js',
    '/js/modules/parserStatementDispatcher.js',
    '/js/modules/parserStatementHandlers.js',
    '/js/modules/parserStatements.js',
    '/js/modules/parserStateStatements.js',
    '/js/modules/parserTokenizer.js',
    '/js/modules/randomResolver.js',
    '/js/modules/ravlykInterpreter.js',
    '/js/modules/ravlykInterpreterRuntime.js',
    '/js/modules/ravlykParser.js',
    '/js/modules/share.js',
    '/js/modules/ui.js',
    '/js/modules/uiMessages.js',
    '/js/modules/uiModals.js',
    '/js/modules/workspaceTabs.js',
    '/js/quizData/basic.js',
    '/js/quizData/loops.js',
    '/js/quizData/vars.js',
    '/assets/images/editor.jpg',
    '/assets/images/lesson_01_01.jpg',
    '/assets/images/lesson_02_01.jpg',
    '/assets/images/lesson_03_01.jpg',
    '/assets/images/lesson_04_01.jpg',
    '/assets/images/lesson_05_01.jpg',
    '/assets/images/lesson_05_02.jpg',
    '/assets/images/lesson_06_01.jpg',
    '/assets/images/manual_01.jpg',
    '/assets/images/manual_02.jpg',
    '/assets/images/manual_03.jpg',
    '/assets/images/manual_04.jpg',
    '/assets/images/manual_05.jpg',
    '/assets/images/manual_06.jpg',
    '/assets/images/manual_07.jpg',
    '/assets/images/ravlyk.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/apple-touch-icon.png',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/favicon.ico',
    '/ravlyk.jpg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_CACHE)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter((cacheName) => cacheName !== APP_CACHE)
                .map((cacheName) => caches.delete(cacheName))
        );
        await self.clients.claim();
    })());
});

async function updateRuntimeCache(request, response) {
    if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
    }

    const cache = await caches.open(APP_CACHE);
    await cache.put(request, response.clone());
    return response;
}

async function handleNavigation(request) {
    try {
        const networkResponse = await fetch(request);
        return updateRuntimeCache(request, networkResponse);
    } catch {
        return caches.match(request)
            || caches.match(new URL(request.url).pathname)
            || caches.match(OFFLINE_FALLBACK_URL);
    }
}

async function handleStaticRequest(request) {
    const cachedResponse = await caches.match(request) || await caches.match(new URL(request.url).pathname);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        return updateRuntimeCache(request, networkResponse);
    } catch {
        if (request.destination === 'document') {
            return caches.match(OFFLINE_FALLBACK_URL);
        }
        throw new Error(`Offline cache miss for ${request.url}`);
    }
}

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);
    if (url.origin !== self.location.origin || url.pathname === '/sw.js') {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(handleNavigation(request));
        return;
    }

    event.respondWith(handleStaticRequest(request));
});
