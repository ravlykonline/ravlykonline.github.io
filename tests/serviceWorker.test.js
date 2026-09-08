import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { runAsyncTest, runTest } from './testUtils.js';
import { buildPrecacheManifest } from '../scripts/sync-precache-manifest.mjs';

const swSource = fs.readFileSync('sw.js', 'utf8');
const registerSource = fs.readFileSync('js/registerServiceWorker.js', 'utf8');
const CACHE_VERSION = swSource.match(/const CACHE_VERSION = '([^']+)'/)?.[1];
const APP_CACHE = `ravlyk-app-${CACHE_VERSION}`;
const RUNTIME_CACHE = `ravlyk-runtime-${CACHE_VERSION}`;

function extractStringSet(source, varName) {
    const match = source.match(new RegExp(`const ${varName}\\s*=\\s*new Set\\(\\[([^\\]]+)\\]\\)`));
    return match?.[1].match(/'([^']+)'/g)?.map((value) => value.slice(1, -1)) ?? null;
}

function extractStringArray(source, varName) {
    const match = source.match(new RegExp(`const ${varName}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
    return match?.[1].match(/'([^']+)'/g)?.map((value) => value.slice(1, -1)) ?? null;
}

function cacheKey(candidate) {
    const raw = typeof candidate === 'string' ? candidate : candidate.url;
    if (!raw.startsWith('http')) return raw;
    const url = new URL(raw);
    return url.pathname + url.search;
}

// The worker precaches through `new Request(url, { cache: 'reload' })`, so the
// harness needs a Request that tolerates the relative URLs used in the manifest.
class HarnessRequest {
    constructor(url, options = {}) {
        this.url = url;
        this.cache = options.cache;
    }
}

function createServiceWorkerHarness({ entries = {}, addFailures = new Set(), fetchImpl = async () => Response.error() } = {}) {
    const listeners = new Map();
    const deleted = [];
    const cacheStores = new Map(
        Object.entries(entries).map(([name, values]) => [name, new Map(Object.entries(values))])
    );
    const precacheRequests = [];
    let skipWaitingCalls = 0;
    let claimCalls = 0;

    function getCache(name) {
        if (!cacheStores.has(name)) cacheStores.set(name, new Map());
        const store = cacheStores.get(name);
        return {
            async add(candidate) {
                const key = cacheKey(candidate);
                precacheRequests.push(candidate);
                if (addFailures.has(key)) throw new Error(`missing ${key}`);
                store.set(key, { source: `precache:${key}` });
            },
            async match(candidate) { return store.get(cacheKey(candidate)); },
            async put(candidate, response) { store.set(cacheKey(candidate), response); },
            async keys() { return [...store.keys()].map((url) => ({ url })); },
            async delete(candidate) { return store.delete(cacheKey(candidate)); },
        };
    }

    const context = vm.createContext({
        URL,
        Response,
        Request: HarnessRequest,
        console: { log() {}, warn() {}, error() {} },
        caches: {
            open: async (name) => getCache(name),
            keys: async () => [...cacheStores.keys()],
            delete: async (name) => {
                deleted.push(name);
                return cacheStores.delete(name);
            },
        },
        fetch: fetchImpl,
        self: {
            location: { origin: 'https://ravlyk.org' },
            addEventListener: (type, listener) => listeners.set(type, listener),
            skipWaiting: async () => { skipWaitingCalls += 1; },
            clients: { claim: async () => { claimCalls += 1; } },
        },
    });
    vm.runInContext(swSource, context);

    async function dispatchLifecycle(type) {
        let work = null;
        listeners.get(type)({ waitUntil: (promise) => { work = promise; } });
        return work;
    }

    return {
        dispatchLifecycle,
        getFunction: (name) => vm.runInContext(name, context),
        deleted,
        cacheStores,
        precacheRequests,
        get skipWaitingCalls() { return skipWaitingCalls; },
        get claimCalls() { return claimCalls; },
    };
}

runTest('sw: production-only registration guards against dev hosts', () => {
    assert.match(registerSource, /PRODUCTION_HOSTS\.has\(/);
    assert.match(registerSource, /ravlyk\.org/);
});

runTest('sw: generated critical and optional manifests match publication policy', () => {
    const expected = buildPrecacheManifest();
    assert.deepEqual(extractStringSet(swSource, 'CACHEABLE_EXTENSIONS'), expected.extensions);
    assert.deepEqual(extractStringArray(swSource, 'CRITICAL_PRECACHE_URLS'), expected.criticalUrls);
    assert.deepEqual(extractStringArray(swSource, 'OPTIONAL_PRECACHE_URLS'), expected.optionalUrls);
    assert.ok(expected.criticalUrls.includes('/index.html'));
    assert.ok(expected.criticalUrls.includes('/manual.html'));
    assert.ok(expected.criticalUrls.includes('/lessons.html'));
    assert.ok(expected.criticalUrls.some((url) => url.startsWith('/js/main.js?v=')));
    assert.ok(expected.criticalUrls.some((url) => url.startsWith('/css/main-editor.css?v=')));
    assert.ok(expected.optionalUrls.includes('/assets/images/ravlyk.png'));
    assert.equal(new Set(expected.urls).size, expected.urls.length);
});

runTest('sw: runtime cache policy stays same-origin, extension-allowlisted and bounded', () => {
    assert.match(swSource, /function shouldRuntimeCache\(url\)/);
    assert.match(swSource, /url\.origin !== self\.location\.origin/);
    assert.match(swSource, /const MAX_RUNTIME_CACHE_ENTRIES = \d+/);
    assert.match(swSource, /await cache\.put\(request, response\.clone\(\)\)/);
    assert.match(swSource, /await trimRuntimeCache\(cache\)/);
});

runTest('sw: lookups never search unrelated caches globally', () => {
    assert.equal(swSource.includes('caches.match('), false);
    assert.match(swSource, /caches\.open\(RUNTIME_CACHE\)/);
    assert.match(swSource, /caches\.open\(APP_CACHE\)/);
});

await runAsyncTest('sw: critical precache failure rejects install and does not skip waiting', async () => {
    const critical = extractStringArray(swSource, 'CRITICAL_PRECACHE_URLS');
    const harness = createServiceWorkerHarness({ addFailures: new Set([critical[0]]) });
    await assert.rejects(() => harness.dispatchLifecycle('install'));
    assert.equal(harness.skipWaitingCalls, 0);
});

await runAsyncTest('sw: optional precache failure permits activation handoff', async () => {
    const optional = extractStringArray(swSource, 'OPTIONAL_PRECACHE_URLS');
    const harness = createServiceWorkerHarness({ addFailures: new Set([optional[0]]) });
    await harness.dispatchLifecycle('install');
    assert.equal(harness.skipWaitingCalls, 1);
});

await runAsyncTest('sw: activation deletes only old owned caches and preserves foreign caches', async () => {
    const harness = createServiceWorkerHarness({
        entries: {
            [APP_CACHE]: {},
            [RUNTIME_CACHE]: {},
            'ravlyk-app-old': {},
            'ravlyk-runtime-old': {},
            'ravlyk-other-product': {},
            'third-party-cache': {},
        },
    });
    await harness.dispatchLifecycle('activate');
    assert.deepEqual(harness.deleted.sort(), ['ravlyk-app-old', 'ravlyk-runtime-old']);
    assert.equal(harness.cacheStores.has('ravlyk-other-product'), true);
    assert.equal(harness.cacheStores.has('third-party-cache'), true);
    assert.equal(harness.claimCalls, 1);
});

await runAsyncTest('sw: offline navigation prefers current runtime HTML over precache HTML', async () => {
    const runtimeResponse = { source: 'runtime' };
    const harness = createServiceWorkerHarness({
        entries: {
            [RUNTIME_CACHE]: { '/manual.html': runtimeResponse },
            [APP_CACHE]: { '/manual.html': { source: 'precache' }, '/index.html': { source: 'shell' } },
        },
        fetchImpl: async () => { throw new Error('offline'); },
    });
    const response = await harness.getFunction('handleNavigation')({ url: 'https://ravlyk.org/manual.html?topic=loops' });
    assert.equal(response, runtimeResponse);
});

await runAsyncTest('sw: missing navigation falls back to current offline shell', async () => {
    const shell = { source: 'shell' };
    const harness = createServiceWorkerHarness({
        entries: { [APP_CACHE]: { '/index.html': shell } },
        fetchImpl: async () => { throw new Error('offline'); },
    });
    assert.equal(
        await harness.getFunction('handleNavigation')({ url: 'https://ravlyk.org/missing?offline=1' }),
        shell,
    );
});

await runAsyncTest('sw: a new versioned static asset is never replaced by a bare cached URL', async () => {
    const networkResponse = { source: 'network', status: 200, type: 'opaque' };
    const harness = createServiceWorkerHarness({
        entries: {
            [RUNTIME_CACHE]: { '/css/global.css': { source: 'bare-runtime' } },
            [APP_CACHE]: { '/css/global.css': { source: 'bare-precache' } },
        },
        fetchImpl: async () => networkResponse,
    });
    const response = await harness.getFunction('handleStaticRequest')({
        url: 'https://ravlyk.org/css/global.css?v=new',
        destination: 'style',
    });
    assert.equal(response, networkResponse);
});

// Regression: a fresh entry point (main.js?v=NEW) imports unversioned modules
// (js/modules/*.js) whose URL never changes. A stale module made the whole graph
// fail with "does not provide an export named ...", which killed every button on
// the page for returning visitors.
await runAsyncTest('sw: precache fetches bypass the browser HTTP cache', async () => {
    const harness = createServiceWorkerHarness();
    await harness.dispatchLifecycle('install');

    assert.ok(harness.precacheRequests.length > 0, 'install must precache something');
    const notReloaded = harness.precacheRequests.filter((request) => request?.cache !== 'reload');
    assert.deepEqual(
        notReloaded.map((request) => request?.url ?? request),
        [],
        'every precached URL must be requested with cache: reload',
    );
});

runTest('headers keep unversioned ES modules revalidated', () => {
    const headers = fs.readFileSync('_headers', 'utf8');
    const block = headers.split(/\r?\n\r?\n/).find((entry) => entry.startsWith('/js/modules/*'));
    assert.ok(block, '_headers must scope a rule to /js/modules/*');
    assert.match(block, /Cache-Control:\s*no-cache/);
    // Narrow scope: published subprojects must keep their own caching.
    assert.equal(headers.includes('/go/'), false);
});

console.log('Service Worker contract tests completed.');
