// Only register the Service Worker on production hosts.
// On localhost / GitHub Pages preview / DigitalOcean staging the SW is skipped
// so stale caches never interfere with development or review deploys.
const PRODUCTION_HOSTS = new Set(['ravlyk.org', 'www.ravlyk.org']);

const SERVICE_WORKER_URL = '/sw.js?v=2026-08-02-2';

async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    if (!PRODUCTION_HOSTS.has(location.hostname)) {
        return;
    }

    try {
        await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' });
    } catch (error) {
        // Offline support should degrade silently when the browser refuses registration.
        console.error('RAVLYK service worker registration failed.', error);
    }
}

void registerServiceWorker();
