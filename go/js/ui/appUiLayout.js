import { loadThemePreference, saveSoundMuted, saveThemePreference } from '../state/sessionStore.js';

export function createAppUiLayout({ app, documentRef = document, refs, storage, text, windowRef = globalThis.window }) {
  function applyStaticText() {
    const labels = text.static;
    const { rows, cols } = app.config;
    const skipLink = documentRef.querySelector('.skip-link');

    documentRef.title = labels.pageTitle;
    if (skipLink) {
      skipLink.textContent = labels.skipLink;
    }
    refs.paletteEl?.setAttribute('aria-label', labels.paletteAria);
    refs.btnRun.setAttribute('aria-label', labels.runAria);
    refs.btnClr.setAttribute('aria-label', labels.clearAria);
    refs.btnClr.setAttribute('title', labels.clearTitle);
    documentRef.getElementById('main-content')?.setAttribute('aria-label', labels.mainAria(rows, cols));
    documentRef.querySelector('.level-bar')?.setAttribute('aria-label', labels.levelBarAria);
    documentRef.querySelector('.level-nav')?.setAttribute('aria-label', labels.levelNavAria);
    refs.btnPrev.setAttribute('aria-label', labels.prevLevelAria);
    refs.btnPrev.setAttribute('title', labels.prevLevelTitle);
    refs.btnNext.setAttribute('aria-label', labels.nextLevelAria);
    refs.btnNext.setAttribute('title', labels.nextLevelTitle);
    refs.btnMap.setAttribute('aria-label', labels.mapButton);
    refs.gridEl.setAttribute('aria-label', labels.gridAria(rows, cols));
    documentRef.getElementById('level-intro-content')?.setAttribute('aria-label', labels.introSourceAria);
  }

  function bindThemeControl() {
    const button = documentRef.querySelector('#btn-theme');
    if (!button) {
      return;
    }
    const icon = button.querySelector('.theme-icon');
    const label = button.querySelector('.theme-label');
    const meta = documentRef.querySelector('meta[name="theme-color"]');
    const prefersDark = windowRef?.matchMedia?.('(prefers-color-scheme: dark)');
    let preference = loadThemePreference(storage);

    function renderTheme() {
      const theme = preference || (prefersDark?.matches ? 'dark' : 'light');
      const isDark = theme === 'dark';
      const action = isDark ? text.static.useLightTheme : text.static.useDarkTheme;
      documentRef.documentElement.dataset.theme = theme;
      icon.dataset.icon = isDark ? 'sun' : 'moon';
      label.textContent = isDark ? text.static.lightTheme : text.static.darkTheme;
      button.setAttribute('aria-label', action);
      button.setAttribute('title', action);
      meta?.setAttribute('content', isDark ? '#1b2418' : '#f6e7c6');
    }

    renderTheme();
    prefersDark?.addEventListener?.('change', renderTheme);
    button.addEventListener('click', () => {
      preference = documentRef.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      saveThemePreference(preference, storage);
      renderTheme();
    });
  }

  function bindSoundControl(audioApi) {
    const button = documentRef.querySelector('#btn-sound');
    if (!button || !audioApi?.setMuted) {
      return;
    }

    function renderSound() {
      const muted = audioApi.isMuted();
      const action = muted ? text.static.unmuteSound : text.static.muteSound;
      button.setAttribute('aria-pressed', muted ? 'true' : 'false');
      button.setAttribute('aria-label', action);
      button.setAttribute('title', action);
      button.classList.toggle('is-muted', muted);
    }

    renderSound();
    button.addEventListener('click', () => {
      const muted = !audioApi.isMuted();
      audioApi.setMuted(muted);
      saveSoundMuted(muted, storage);
      renderSound();
    });
  }

  return { applyStaticText, bindSoundControl, bindThemeControl };
}
