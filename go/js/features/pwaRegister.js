export function registerPwa({ navigatorRef = navigator, windowRef = window } = {}) {
  if (!navigatorRef?.serviceWorker || windowRef.location?.protocol === 'file:') {
    return false;
  }

  windowRef.addEventListener('load', () => {
    navigatorRef.serviceWorker.register('./sw.js').catch(() => {
      // Keep the game playable even when service workers are unavailable.
    });
  }, { once: true });

  return true;
}
