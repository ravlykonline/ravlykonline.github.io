const SERVICE_WORKER_URL = '/sw.js?v=2026-03-12-1';

async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
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
