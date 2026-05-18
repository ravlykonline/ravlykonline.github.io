import assert from 'node:assert/strict';
import { initAnalytics, resetAnalyticsForTests } from '../js/analytics.js';
import { runAsyncTest } from './testUtils.js';

function createWindowStub() {
    const timers = [];
    const listeners = new Map();

    return {
        dataLayer: [],
        location: { hostname: 'ravlyk.org' },
        setTimeout(handler) {
            timers.push(handler);
            return timers.length;
        },
        addEventListener(eventName, handler) {
            listeners.set(eventName, handler);
        },
        removeEventListener(eventName, handler) {
            if (listeners.get(eventName) === handler) {
                listeners.delete(eventName);
            }
        },
        dispatchEvent(eventName) {
            listeners.get(eventName)?.();
        },
        getListener(eventName) {
            return listeners.get(eventName) || null;
        },
        timers,
    };
}

function createDocumentStub() {
    let analyticsScript = null;

    return {
        head: {
            appendChild(node) {
                analyticsScript = node;
            },
        },
        createElement(tagName) {
            return {
                tagName,
                async: false,
                src: '',
                onload: null,
                onerror: null,
            };
        },
        querySelector(selector) {
            if (analyticsScript && selector === `script[src="${analyticsScript.src}"]`) {
                return analyticsScript;
            }
            return null;
        },
        get analyticsScript() {
            return analyticsScript;
        },
    };
}

await runAsyncTest('analytics initialization skips offline or non-production contexts', async () => {
    resetAnalyticsForTests();

    const windowRef = createWindowStub();
    const documentRef = createDocumentStub();

    const offlineResult = await initAnalytics({
        windowRef,
        documentRef,
        navigatorRef: { onLine: false },
        locationRef: { hostname: 'ravlyk.org' },
    });
    assert.equal(offlineResult, false);
    assert.equal(documentRef.analyticsScript, null);
    assert.ok(windowRef.getListener('online'));

    resetAnalyticsForTests();
    const devResult = await initAnalytics({
        windowRef,
        documentRef,
        navigatorRef: { onLine: true },
        locationRef: { hostname: 'localhost' },
    });
    assert.equal(devResult, false);
    assert.equal(documentRef.analyticsScript, null);
});

await runAsyncTest('analytics initialization loads gtag lazily and configures dataLayer once', async () => {
    resetAnalyticsForTests();

    const windowRef = createWindowStub();
    const documentRef = createDocumentStub();
    const initPromise = initAnalytics({
        windowRef,
        documentRef,
        navigatorRef: { onLine: true },
        locationRef: { hostname: 'ravlyk.org' },
    });

    assert.ok(documentRef.analyticsScript);
    assert.match(documentRef.analyticsScript.src, /googletagmanager\.com\/gtag\/js\?id=G-QV58ZGT594$/);

    documentRef.analyticsScript.onload?.();

    const result = await initPromise;
    assert.equal(result, true);
    assert.equal(typeof windowRef.gtag, 'function');
    assert.equal(windowRef.dataLayer.length, 2);
    assert.equal(windowRef.dataLayer[1][0], 'config');
    assert.equal(windowRef.dataLayer[1][1], 'G-QV58ZGT594');

    const secondCall = await initAnalytics({
        windowRef,
        documentRef,
        navigatorRef: { onLine: true },
        locationRef: { hostname: 'ravlyk.org' },
    });
    assert.equal(secondCall, true);
    assert.equal(windowRef.dataLayer.length, 2);
});

await runAsyncTest('analytics retries initialization after the browser comes back online', async () => {
    resetAnalyticsForTests();

    const windowRef = createWindowStub();
    const documentRef = createDocumentStub();
    const navigatorRef = { onLine: false };

    const offlineResult = await initAnalytics({
        windowRef,
        documentRef,
        navigatorRef,
        locationRef: { hostname: 'ravlyk.org' },
    });
    assert.equal(offlineResult, false);
    assert.equal(documentRef.analyticsScript, null);

    navigatorRef.onLine = true;
    windowRef.dispatchEvent('online');

    assert.ok(documentRef.analyticsScript);
    documentRef.analyticsScript.onload?.();

    await Promise.resolve();

    assert.equal(windowRef.dataLayer.length, 2);
    assert.equal(windowRef.dataLayer[1][0], 'config');
    assert.equal(windowRef.dataLayer[1][1], 'G-QV58ZGT594');
});

console.log('Analytics tests completed.');
