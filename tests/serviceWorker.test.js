import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { runAsyncTest, runTest } from './testUtils.js';
import { buildPrecacheManifest } from '../scripts/sync-precache-manifest.mjs';

const swSource = fs.readFileSync('sw.js', 'utf8');
const registerSource = fs.readFileSync('js/registerServiceWorker.js', 'utf8');

// ---------------------------------------------------------------------------
// Helpers: extract key parts of the SW source without executing it
// ---------------------------------------------------------------------------

function extractStringSet(source, varName) {
    // Matches: const FOO = new Set(['a', 'b', ...]);
    const re = new RegExp(`const ${varName}\\s*=\\s*new Set\\(\\[([^\\]]+)\\]\\)`);
    const match = source.match(re);
    if (!match) return null;
    return match[1].match(/'([^']+)'/g)?.map((s) => s.replace(/'/g, '')) ?? [];
}

function extractNumberConst(source, varName) {
    const re = new RegExp(`const ${varName}\\s*=\\s*(\\d+)`);
    const match = source.match(re);
    return match ? Number(match[1]) : null;
}

function extractStringArray(source, varName) {
    const re = new RegExp(`const ${varName}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
    const match = source.match(re);
    if (!match) return null;
    return match[1].match(/'([^']+)'/g)?.map((value) => value.slice(1, -1)) ?? [];
}

function loadServiceWorkerFunction(functionName, { cacheMatch, fetchImpl }) {
    const context = vm.createContext({
        URL,
        console: {
            log() {},
            warn() {},
            error() {},
        },
        caches: {
            match: cacheMatch,
            open: async () => ({
                keys: async () => [],
                put: async () => {},
            }),
            keys: async () => [],
            delete: async () => true,
        },
        fetch: fetchImpl,
        self: {
            location: { origin: 'https://ravlyk.org' },
            addEventListener() {},
            skipWaiting: async () => {},
            clients: { claim: async () => {} },
        },
        setTimeout,
        clearTimeout,
    });
    vm.runInContext(swSource, context);
    return vm.runInContext(functionName, context);
}

// ---------------------------------------------------------------------------

runTest('sw: production-only registration guards against dev hosts', () => {
    // registerServiceWorker.js must contain a PRODUCTION_HOSTS set
    assert.ok(
        registerSource.includes('PRODUCTION_HOSTS'),
        'registerServiceWorker.js must define PRODUCTION_HOSTS'
    );
    // Must have a guard that returns early when hostname is not in the set
    assert.ok(
        registerSource.includes('PRODUCTION_HOSTS.has(') && registerSource.includes('return'),
        'registerServiceWorker.js must guard registration with PRODUCTION_HOSTS check'
    );
    // Production hosts must include ravlyk.org
    assert.ok(
        registerSource.includes('ravlyk.org'),
        'PRODUCTION_HOSTS must include ravlyk.org'
    );
});

runTest('sw: CACHEABLE_EXTENSIONS allowlist covers required asset types', () => {
    const exts = extractStringSet(swSource, 'CACHEABLE_EXTENSIONS');
    assert.ok(exts, 'sw.js must define CACHEABLE_EXTENSIONS');

    for (const required of ['.html', '.css', '.js', '.svg', '.png', '.webmanifest']) {
        assert.ok(exts.includes(required), `CACHEABLE_EXTENSIONS must include ${required}`);
    }
});

runTest('sw: shouldRuntimeCache blocks cross-origin and extensionless URLs', () => {
    // Verify the guard is present by checking the source pattern
    assert.ok(
        swSource.includes('function shouldRuntimeCache(url)'),
        'sw.js must define shouldRuntimeCache'
    );
    assert.ok(
        swSource.includes('url.origin !== self.location.origin'),
        'shouldRuntimeCache must reject cross-origin requests'
    );
    assert.ok(
        swSource.includes('CACHEABLE_EXTENSIONS'),
        'shouldRuntimeCache must use CACHEABLE_EXTENSIONS allowlist'
    );
});

runTest('sw: cache.put is wrapped in try/catch to survive quota errors', () => {
    const putIndex = swSource.indexOf('cache.put(request,');
    assert.ok(putIndex !== -1, 'sw.js must call cache.put');

    // Find the try block that contains cache.put
    const before = swSource.slice(0, putIndex);
    const lastTry = before.lastIndexOf('try {');
    assert.ok(lastTry !== -1, 'cache.put must be inside a try block');

    // There must be a catch after cache.put
    const afterPut = swSource.slice(putIndex);
    assert.ok(afterPut.includes('} catch {'), 'cache.put must have a catch block');
});

runTest('sw: RUNTIME_CACHE is separate from APP_CACHE so trim never evicts precache', () => {
    assert.ok(
        swSource.includes("const RUNTIME_CACHE = `ravlyk-runtime-"),
        'sw.js must define a separate RUNTIME_CACHE'
    );
    // updateRuntimeCache must open RUNTIME_CACHE, not APP_CACHE
    const updateFnStart = swSource.indexOf('async function updateRuntimeCache');
    const updateFnBody = swSource.slice(updateFnStart, updateFnStart + 500);
    assert.ok(
        updateFnBody.includes('RUNTIME_CACHE'),
        'updateRuntimeCache must write to RUNTIME_CACHE, not APP_CACHE'
    );
    assert.ok(
        !updateFnBody.includes("caches.open(APP_CACHE)"),
        'updateRuntimeCache must not write to APP_CACHE'
    );
});

runTest('sw: MAX_RUNTIME_CACHE_ENTRIES is defined and positive', () => {
    const limit = extractNumberConst(swSource, 'MAX_RUNTIME_CACHE_ENTRIES');
    assert.ok(limit !== null, 'sw.js must define MAX_RUNTIME_CACHE_ENTRIES');
    assert.ok(limit > 0, 'MAX_RUNTIME_CACHE_ENTRIES must be a positive number');
});

runTest('sw: trimRuntimeCache is called after cache.put', () => {
    assert.ok(
        swSource.includes('trimRuntimeCache'),
        'sw.js must define trimRuntimeCache'
    );
    // trimRuntimeCache must be *called* (await trimRuntimeCache) after cache.put
    const putIndex = swSource.indexOf('cache.put(request,');
    const trimIndex = swSource.indexOf('await trimRuntimeCache(cache)');
    assert.ok(trimIndex > putIndex, 'trimRuntimeCache must be called after cache.put');
});

runTest('sw: precache install uses allSettled so one miss does not abort install', () => {
    assert.ok(
        swSource.includes('Promise.allSettled'),
        'sw.js install handler must use Promise.allSettled for graceful precache'
    );
    assert.ok(
        !swSource.includes('cache.addAll('),
        'sw.js must not use cache.addAll (fails on first miss)'
    );
    // Failures must be tracked in a separate array, not via allSettled result status,
    // because each cache.add has an inner .catch() that converts rejections to fulfillments.
    assert.ok(
        swSource.includes('failures.push(url)'),
        'precache must track failures in a dedicated array for accurate logging'
    );
});

runTest('sw: PRECACHE_URLS has no duplicate entries', () => {
    const urls = extractStringArray(swSource, 'PRECACHE_URLS');
    assert.ok(urls, 'sw.js must define PRECACHE_URLS array');
    const unique = new Set(urls);
    assert.equal(
        urls.length,
        unique.size,
        `PRECACHE_URLS has ${urls.length - unique.size} duplicate(s): ` +
        urls.filter((u, i) => urls.indexOf(u) !== i).join(', ')
    );
});

runTest('sw: versioned assets do not duplicate their unversioned cache keys', () => {
    const urls = extractStringArray(swSource, 'PRECACHE_URLS');
    const urlSet = new Set(urls);
    const redundantPairs = urls
        .filter((url) => url.includes('?'))
        .filter((url) => urlSet.has(url.split('?')[0]));

    assert.deepEqual(
        redundantPairs,
        [],
        `PRECACHE_URLS should not cache versioned and unversioned copies: ${redundantPairs.join(', ')}`
    );
    assert.equal(
        urls.includes('/js/modules/ravlykParser.js'),
        true,
        'unversioned ES module imports must remain available offline'
    );
    assert.equal(
        urls.some((url) => url.startsWith('/css/global.css?v=')),
        true,
        'the HTML-referenced version of global.css must remain available offline'
    );
    assert.equal(urls.includes('/css/global.css'), false);
});

runTest('sw: generated cache policy and URLs match the Pages publication manifest', () => {
    const expected = buildPrecacheManifest();
    const extensions = extractStringSet(swSource, 'CACHEABLE_EXTENSIONS');
    const urls = extractStringArray(swSource, 'PRECACHE_URLS');

    assert.deepEqual(extensions, expected.extensions);
    assert.deepEqual(urls, expected.urls);
    assert.equal(urls.includes('/sw.js'), false, 'service worker must not precache itself');
    assert.equal(
        urls.some((url) => url.endsWith('.pdf')),
        false,
        'large downloadable PDFs should remain runtime downloads, not install-time assets'
    );
});

await runAsyncTest('sw: navigation fallback returns an exact cached request without extra lookups', async () => {
    const request = { url: 'https://ravlyk.org/manual.html?lesson=loops' };
    const exactResponse = { source: 'exact' };
    const calls = [];
    const handleNavigation = loadServiceWorkerFunction('handleNavigation', {
        fetchImpl: async () => {
            throw new Error('offline');
        },
        cacheMatch: async (candidate) => {
            calls.push(candidate);
            return candidate === request ? exactResponse : undefined;
        },
    });

    assert.equal(await handleNavigation(request), exactResponse);
    assert.deepEqual(calls, [request]);
});

await runAsyncTest('sw: navigation fallback awaits exact, pathname, and shell matches in order', async () => {
    const request = { url: 'https://ravlyk.org/manual.html?lesson=loops' };
    const pathnameResponse = { source: 'pathname' };
    const calls = [];
    const handleNavigation = loadServiceWorkerFunction('handleNavigation', {
        fetchImpl: async () => {
            throw new Error('offline');
        },
        cacheMatch: async (candidate) => {
            calls.push(candidate);
            if (candidate === '/manual.html') return pathnameResponse;
            return undefined;
        },
    });

    assert.equal(await handleNavigation(request), pathnameResponse);
    assert.deepEqual(calls, [request, '/manual.html']);
});

await runAsyncTest('sw: navigation fallback returns the offline shell after two cache misses', async () => {
    const request = { url: 'https://ravlyk.org/missing-page?offline=1' };
    const shellResponse = { source: 'shell' };
    const calls = [];
    const handleNavigation = loadServiceWorkerFunction('handleNavigation', {
        fetchImpl: async () => {
            throw new Error('offline');
        },
        cacheMatch: async (candidate) => {
            calls.push(candidate);
            if (candidate === '/index.html') return shellResponse;
            return undefined;
        },
    });

    assert.equal(await handleNavigation(request), shellResponse);
    assert.deepEqual(calls, [request, '/missing-page', '/index.html']);
});

console.log('Service Worker contract tests completed.');
