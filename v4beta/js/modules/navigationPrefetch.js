export function createNavigationPrefetchController() {
    function shouldPrefetchSecondaryPages() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection) return true;
        if (connection.saveData) return false;
        const effectiveType = String(connection.effectiveType || '').toLowerCase();
        if (effectiveType === 'slow-2g' || effectiveType === '2g') return false;
        return true;
    }

    function prefetchDocument(url) {
        if (!url) return;
        if (document.head.querySelector(`link[rel="prefetch"][href="${url}"]`)) return;
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = 'document';
        document.head.appendChild(link);
    }

    function scheduleSecondaryPagesPrefetch() {
        if (!shouldPrefetchSecondaryPages()) return;
        if (document.visibilityState === 'hidden') return;

        const prefetchTargets = ['manual.html', 'lessons.html', 'quiz.html'];
        const startPrefetch = () => prefetchTargets.forEach(prefetchDocument);

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(startPrefetch, { timeout: 2500 });
            return;
        }
        window.setTimeout(startPrefetch, 1200);
    }

    function openInNewTab(url) {
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    return {
        scheduleSecondaryPagesPrefetch,
        openInNewTab,
    };
}
