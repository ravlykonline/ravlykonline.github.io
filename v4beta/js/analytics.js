const ANALYTICS_MEASUREMENT_ID = 'G-QV58ZGT594';
const ANALYTICS_SCRIPT_URL = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_MEASUREMENT_ID}`;
const PRODUCTION_HOSTS = new Set(['ravlyk.org', 'www.ravlyk.org']);

let analyticsInitPromise = null;
let analyticsConfigured = false;
let analyticsRetryWindowRef = null;
let analyticsRetryHandler = null;

function canUseDom(documentRef) {
    return Boolean(documentRef?.head && typeof documentRef.createElement === 'function');
}

function isOnline(navigatorRef) {
    return navigatorRef?.onLine !== false;
}

function isProductionHost(locationRef) {
    const hostname = locationRef?.hostname || '';
    return PRODUCTION_HOSTS.has(hostname);
}

function ensureDataLayer(windowRef) {
    if (!Array.isArray(windowRef.dataLayer)) {
        windowRef.dataLayer = [];
    }

    if (typeof windowRef.gtag !== 'function') {
        windowRef.gtag = function gtag() {
            windowRef.dataLayer.push(arguments);
        };
    }
}

function configureAnalytics(windowRef) {
    if (analyticsConfigured) {
        return;
    }
    ensureDataLayer(windowRef);
    windowRef.gtag('js', new Date());
    windowRef.gtag('config', ANALYTICS_MEASUREMENT_ID);
    analyticsConfigured = true;
}

function attachOnlineRetry({ windowRef, documentRef, navigatorRef, locationRef }) {
    if (!windowRef || typeof windowRef.addEventListener !== 'function') {
        return;
    }

    if (analyticsRetryWindowRef === windowRef && analyticsRetryHandler) {
        return;
    }

    if (analyticsRetryWindowRef && analyticsRetryHandler && typeof analyticsRetryWindowRef.removeEventListener === 'function') {
        analyticsRetryWindowRef.removeEventListener('online', analyticsRetryHandler);
    }

    analyticsRetryHandler = () => {
        void initAnalytics({ windowRef, documentRef, navigatorRef, locationRef });
    };
    analyticsRetryWindowRef = windowRef;
    windowRef.addEventListener('online', analyticsRetryHandler);
}

function appendAnalyticsScript({ documentRef, windowRef }) {
    return new Promise((resolve, reject) => {
        const existingScript = documentRef.querySelector(`script[src="${ANALYTICS_SCRIPT_URL}"]`);
        if (existingScript) {
            resolve(existingScript);
            return;
        }

        const script = documentRef.createElement('script');
        script.async = true;
        script.src = ANALYTICS_SCRIPT_URL;
        script.onload = () => resolve(script);
        script.onerror = () => reject(new Error('Analytics script failed to load.'));

        documentRef.head.appendChild(script);
        windowRef.setTimeout(() => reject(new Error('Analytics script load timed out.')), 8000);
    });
}

export async function initAnalytics(options = {}) {
    const windowRef = options.windowRef ?? (typeof window !== 'undefined' ? window : null);
    const documentRef = options.documentRef ?? (typeof document !== 'undefined' ? document : null);
    const navigatorRef = options.navigatorRef ?? (typeof navigator !== 'undefined' ? navigator : null);
    const locationRef = options.locationRef ?? windowRef?.location ?? null;

    attachOnlineRetry({ windowRef, documentRef, navigatorRef, locationRef });

    if (!windowRef || !canUseDom(documentRef) || !isOnline(navigatorRef) || !isProductionHost(locationRef)) {
        return false;
    }

    if (analyticsConfigured) {
        return true;
    }

    if (!analyticsInitPromise) {
        analyticsInitPromise = appendAnalyticsScript({ documentRef, windowRef })
            .then(() => {
                configureAnalytics(windowRef);
                return true;
            })
            .catch(() => false);
    }

    return analyticsInitPromise;
}

export function resetAnalyticsForTests() {
    analyticsInitPromise = null;
    analyticsConfigured = false;
    if (analyticsRetryWindowRef && analyticsRetryHandler && typeof analyticsRetryWindowRef.removeEventListener === 'function') {
        analyticsRetryWindowRef.removeEventListener('online', analyticsRetryHandler);
    }
    analyticsRetryWindowRef = null;
    analyticsRetryHandler = null;
}

void initAnalytics();
