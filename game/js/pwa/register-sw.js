export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((registration) => {
            // Detect when a new SW version is waiting to activate
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // A new version is ready — show a subtle banner
                        showUpdateBanner();
                    }
                });
            });
        }).catch((error) => {
            console.error('Service worker registration failed:', error);
        });
    });
}

function showUpdateBanner() {
    // Avoid duplicate banners
    if (document.getElementById('sw-update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');

    const text = document.createElement('span');
    text.textContent = '🆕 Доступна нова версія гри!';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Оновити';
    btn.addEventListener('click', () => {
        banner.remove();
        // Reload to activate the waiting SW
        window.location.reload();
    });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Закрити');
    closeBtn.addEventListener('click', () => banner.remove());

    banner.append(text, btn, closeBtn);
    document.body.appendChild(banner);
}
