export function createAppUiLayout({
  app,
  documentRef = document,
  refs,
  text,
  windowRef = window
}) {
  let mobileCommandDockEl = null;

  const sidebarEl = documentRef.querySelector('.sidebar');
  const dividerEl = documentRef.querySelector('.div-line');
  const actionsEl = documentRef.querySelector('.actions');

  function updateResponsiveLabels() {
    const compactToolbar = windowRef.innerWidth <= 640;
    refs.btnMap.textContent = compactToolbar ? 'Рівні' : text.static.mapButton;
  }

  function applyStaticText() {
    const staticText = text.static;
    const { rows, cols } = app.config;
    const skipLink = documentRef.querySelector('.skip-link');
    const sidebar = documentRef.querySelector('.sidebar');
    const logo = documentRef.querySelector('.logo');
    const logoName = documentRef.querySelector('.logo-name');
    const logoSub = documentRef.querySelector('.logo-sub');
    const commandsLabel = documentRef.querySelector('.sect-lbl');
    const mainContent = documentRef.getElementById('main-content');
    const levelBar = documentRef.querySelector('.level-bar');
    const levelNav = documentRef.querySelector('.level-nav');
    const toolbar = documentRef.querySelector('.level-toolbar');
    const introSource = documentRef.getElementById('level-intro-content');

    documentRef.title = staticText.pageTitle;
    if (skipLink) {
      skipLink.textContent = staticText.skipLink;
    }
    if (sidebar) {
      sidebar.setAttribute('aria-label', staticText.sidebarAria);
    }
    if (logo) {
      logo.setAttribute('aria-label', staticText.logoAria);
    }
    if (logoName) {
      logoName.textContent = staticText.logoName;
    }
    if (logoSub) {
      logoSub.textContent = staticText.logoSub;
    }
    if (commandsLabel) {
      commandsLabel.textContent = staticText.commandsLabel;
    }
    if (refs.paletteEl) {
      refs.paletteEl.setAttribute('aria-label', staticText.paletteAria);
    }
    refs.btnRun.setAttribute('aria-label', staticText.runAria);
    refs.btnRun.setAttribute('title', staticText.runTitle);
    refs.btnClr.setAttribute('aria-label', staticText.clearAria);
    refs.btnClr.setAttribute('title', staticText.clearTitle);
    if (mainContent) {
      mainContent.setAttribute('aria-label', staticText.mainAria(rows, cols));
    }
    if (levelBar) {
      levelBar.setAttribute('aria-label', staticText.levelBarAria);
    }
    if (levelNav) {
      levelNav.setAttribute('aria-label', staticText.levelNavAria);
    }
    refs.btnPrev.setAttribute('aria-label', staticText.prevLevelAria);
    refs.btnPrev.setAttribute('title', staticText.prevLevelTitle);
    refs.btnNext.setAttribute('aria-label', staticText.nextLevelAria);
    refs.btnNext.setAttribute('title', staticText.nextLevelTitle);
    if (toolbar) {
      toolbar.setAttribute('aria-label', staticText.toolbarAria);
    }
    refs.btnMap.textContent = staticText.mapButton;
    refs.gridEl.setAttribute('aria-label', staticText.gridAria(rows, cols));
    if (introSource) {
      introSource.setAttribute('aria-label', staticText.introSourceAria);
    }
    updateResponsiveLabels();
  }

  function ensureMobileCommandDock() {
    if (mobileCommandDockEl) {
      return mobileCommandDockEl;
    }

    mobileCommandDockEl = documentRef.createElement('div');
    mobileCommandDockEl.className = 'mobile-command-dock';
    refs.gwrap.parentNode.insertBefore(mobileCommandDockEl, refs.gwrap);
    return mobileCommandDockEl;
  }

  function syncCommandLayout() {
    if (!refs.paletteEl || !actionsEl || !sidebarEl || !dividerEl) {
      return;
    }

    const isCompact = windowRef.innerWidth <= 900;
    const mobileDock = ensureMobileCommandDock();

    if (isCompact) {
      if (refs.paletteEl.parentNode !== mobileDock) {
        mobileDock.append(refs.paletteEl, actionsEl);
      }
      return;
    }

    if (refs.paletteEl.parentNode !== sidebarEl) {
      sidebarEl.insertBefore(refs.paletteEl, dividerEl);
    }

    if (actionsEl.parentNode !== sidebarEl) {
      sidebarEl.appendChild(actionsEl);
    }
  }

  return {
    applyStaticText,
    syncCommandLayout,
    updateResponsiveLabels
  };
}
