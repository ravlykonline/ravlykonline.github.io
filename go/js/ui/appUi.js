import { launchConfetti as launchFeatureConfetti } from '../features/confetti.js';
import { renderLevelHeader } from './renderLevelHeader.js';
import { renderProgress } from './renderProgress.js';

export function createAppUi({
  app,
  documentRef = document,
  windowRef = window
} = {}) {
  const document = documentRef;
  const window = windowRef;
  const {
    btnRun,
    btnClr,
    btnPrev,
    btnNext,
    btnLevelInfo,
    btnSpeakTask,
    btnMap,
    confEl,
    sicoEl,
    snailEl,
    statusEl,
    stxtEl
  } = app.refs;
  const { text } = app;

  let syncTimeout = null;
  let runHintTimeout = null;
  let modalApi = null;
  let audioApi = null;
  let mobileCommandDockEl = null;

  const sidebarEl = document.querySelector('.sidebar');
  const dividerEl = document.querySelector('.div-line');
  const actionsEl = document.querySelector('.actions');

  function clearRunHint() {
    clearTimeout(runHintTimeout);
    runHintTimeout = null;
    btnRun.classList.remove('run-hint');
  }

  function routeIsReadyForRunHint() {
    const levelId = app.state.currentLevel.id;
    if (levelId < 1 || levelId > 3 || app.state.running) {
      return false;
    }

    return app.engine.analyzeCurrentRoute().canReachApple;
  }

  function scheduleRunHint() {
    clearRunHint();
    if (!routeIsReadyForRunHint()) {
      return;
    }

    runHintTimeout = window.setTimeout(() => {
      runHintTimeout = null;
      if (!app.state.running && routeIsReadyForRunHint()) {
        btnRun.classList.add('run-hint');
      }
    }, 3000);
  }

  function onRouteChanged() {
    scheduleRunHint();
  }

  function setStatus(icon, text, type) {
    sicoEl.textContent = icon;
    stxtEl.textContent = text;
    statusEl.className = type || '';
  }

  function applyStaticText() {
    const staticText = text.static;
    const { rows, cols } = app.config;
    const skipLink = document.querySelector('.skip-link');
    const sidebar = document.querySelector('.sidebar');
    const logo = document.querySelector('.logo');
    const logoName = document.querySelector('.logo-name');
    const logoSub = document.querySelector('.logo-sub');
    const commandsLabel = document.querySelector('.sect-lbl');
    const mainContent = document.getElementById('main-content');
    const levelBar = document.querySelector('.level-bar');
    const levelNav = document.querySelector('.level-nav');
    const toolbar = document.querySelector('.level-toolbar');
    const introSource = document.getElementById('level-intro-content');

    document.title = staticText.pageTitle;
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
    if (app.refs.paletteEl) {
      app.refs.paletteEl.setAttribute('aria-label', staticText.paletteAria);
    }
    btnRun.setAttribute('aria-label', staticText.runAria);
    btnRun.setAttribute('title', staticText.runTitle);
    btnClr.setAttribute('aria-label', staticText.clearAria);
    btnClr.setAttribute('title', staticText.clearTitle);
    if (mainContent) {
      mainContent.setAttribute('aria-label', staticText.mainAria(rows, cols));
    }
    if (levelBar) {
      levelBar.setAttribute('aria-label', staticText.levelBarAria);
    }
    if (levelNav) {
      levelNav.setAttribute('aria-label', staticText.levelNavAria);
    }
    btnPrev.setAttribute('aria-label', staticText.prevLevelAria);
    btnPrev.setAttribute('title', staticText.prevLevelTitle);
    btnNext.setAttribute('aria-label', staticText.nextLevelAria);
    btnNext.setAttribute('title', staticText.nextLevelTitle);
    if (toolbar) {
      toolbar.setAttribute('aria-label', staticText.toolbarAria);
    }
    btnMap.textContent = staticText.mapButton;
    app.refs.gridEl.setAttribute('aria-label', staticText.gridAria(rows, cols));
    if (introSource) {
      introSource.setAttribute('aria-label', staticText.introSourceAria);
    }
    updateResponsiveLabels();
  }

  function clearStatus() {
    setStatus('\u{1F4A1}', text.ui.defaultStatus, '');
  }

  function setLevelIntroStatus() {
    if (app.state.currentLevel.type === 'debug') {
      setStatus('\u{1F50D}', text.ui.debugStatus, 'warn');
      return;
    }
    clearStatus();
  }

  function getCurrentTaskText() {
    return text.taskSpeech(app.state.currentLevel);
  }

  function updateResponsiveLabels() {
    const compactToolbar = window.innerWidth <= 640;
    btnMap.textContent = compactToolbar ? 'Рівні' : text.static.mapButton;
  }

  function refreshProgressUi() {
    renderProgress({
      completedLevelIds: app.state.completedLevelIds,
      refs: app.refs,
      text,
      totalLevels: app.getTotalLevels()
    });
  }

  function refreshLevelUi() {
    renderLevelHeader({
      canGoNext: app.hasNextLevel(),
      canGoPrev: app.hasPrevLevel(),
      completedLevelIds: app.state.completedLevelIds,
      documentRef: document,
      isRunning: app.state.running,
      level: app.state.currentLevel,
      levelIndex: app.getCurrentLevelIndex(),
      refs: app.refs,
      text,
      totalLevels: app.getTotalLevels()
    });
    updateResponsiveLabels();
    refreshProgressUi();
  }

  function ensureMobileCommandDock() {
    if (mobileCommandDockEl) {
      return mobileCommandDockEl;
    }

    mobileCommandDockEl = document.createElement('div');
    mobileCommandDockEl.className = 'mobile-command-dock';
    app.refs.gwrap.parentNode.insertBefore(mobileCommandDockEl, app.refs.gwrap);
    return mobileCommandDockEl;
  }

  function syncCommandLayout() {
    if (!app.refs.paletteEl || !actionsEl || !sidebarEl || !dividerEl) {
      return;
    }

    const isCompact = window.innerWidth <= 900;
    const mobileDock = ensureMobileCommandDock();

    if (isCompact) {
      if (app.refs.paletteEl.parentNode !== mobileDock) {
        mobileDock.append(app.refs.paletteEl, actionsEl);
      }
      return;
    }

    if (app.refs.paletteEl.parentNode !== sidebarEl) {
      sidebarEl.insertBefore(app.refs.paletteEl, dividerEl);
    }

    if (actionsEl.parentNode !== sidebarEl) {
      sidebarEl.appendChild(actionsEl);
    }
  }

  function setDisabled(disabled) {
    if (disabled) {
      clearRunHint();
    }
    document.querySelectorAll('.atile').forEach((button) => {
      button.disabled = disabled;
    });
    btnRun.disabled = disabled;
    btnClr.disabled = disabled;
    btnPrev.disabled = disabled || !app.hasPrevLevel();
    btnNext.disabled = disabled || !app.hasNextLevel();
    btnLevelInfo.disabled = disabled;
    btnSpeakTask.disabled = disabled;
    btnMap.disabled = disabled;
  }

  function flashCell(r, c, color) {
    const el = app.render.cellEl(r, c);
    if (!el) {
      return;
    }
    el.style.outline = `4px solid ${color || '#ff9800'}`;
    el.style.outlineOffset = '-4px';
    setTimeout(() => {
      el.style.outline = '';
      el.style.outlineOffset = '';
    }, 1200);
  }

  function flashNeighbours(r, c) {
    const rows = app.config.rows;
    const cols = app.config.cols;
    Object.values(app.delta).forEach(({ dr, dc }) => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        flashCell(nr, nc, '#ff9800');
      }
    });
  }

  function launchConfetti() {
    launchFeatureConfetti({ documentRef: document, root: confEl, windowRef: window });
  }

  function loadCurrentLevel() {
    const options = arguments[0] || {};
    const { showIntro = true } = options;
    app.engine.clearAll();
    app.render.buildPalette();
    app.render.buildGrid();
    app.render.clearPendingDelete();
    app.render.renderAll();
    refreshLevelUi();
    setLevelIntroStatus();
    scheduleRunHint();
    syncSizes();
    const start = app.getStart();
    requestAnimationFrame(() => app.render.posSnail(start.r, start.c, false, app.state.snailFacing || 'right'));
    if (showIntro) {
      requestAnimationFrame(() => modalApi.openLevelIntro());
    }
  }

  function shouldAutoOpenIntroOnSessionStart() {
    return app.state.currentLevel.id === 1 && app.state.completedLevelIds.length === 0;
  }

  function goToLevel(levelId) {
    if (!levelId) {
      return false;
    }
    if (!app.setCurrentLevel(levelId)) {
      return false;
    }
    loadCurrentLevel({ showIntro: false });
    return true;
  }

  function goToPrevLevel() {
    return goToLevel(app.getPrevLevelId());
  }

  function goToNextLevel() {
    return goToLevel(app.getNextLevelId());
  }

  audioApi = app.createUiAudio({
    getCurrentTaskText,
    setLevelIntroStatus,
    setStatus,
    text
  });

  const speakCurrentTask = audioApi.speakCurrentTask;
  const stopTaskSpeech = audioApi.stopTaskSpeech;

  modalApi = app.createUiModals({
    loadCurrentLevel,
    refs: app.refs,
    speakCurrentTask: audioApi.speakCurrentTask,
    stopTaskSpeech: audioApi.stopTaskSpeech,
    text
  });

  function syncSizes() {
    const root = document.documentElement;
    const wrapRect = app.refs.gwrap.getBoundingClientRect();

    if (!wrapRect.width || !wrapRect.height) {
      return;
    }

    root.style.setProperty('--gs-w', `${Math.round(wrapRect.width)}px`);
    root.style.setProperty('--gs-h', `${Math.round(wrapRect.height)}px`);

    const compact = window.innerWidth <= 900;
    const tileSize = compact
      ? Math.max(48, Math.min(64, wrapRect.width / 6.8))
      : Math.max(52, Math.min(64, wrapRect.width / 10));
    root.style.setProperty('--tile-sz', `${Math.round(tileSize)}px`);

    requestAnimationFrame(() => {
      app.render.posSnail(app.state.snailPos.r, app.state.snailPos.c, false, app.state.snailFacing || 'right');
    });
  }

  function bindGlobalEvents() {
    audioApi.initTaskSpeech();

    const unlockAudio = () => audioApi.primeAudio();
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    window.addEventListener('pointermove', (event) => {
      if (!app.state.dragDir) {
        return;
      }
      app.state.dragMoved = true;
      app.render.moveGhost(event.clientX, event.clientY);
      app.render.updateDropTarget(event.clientX, event.clientY);
    });

    window.addEventListener('pointerup', (event) => {
      if (!app.state.dragDir) {
        return;
      }
      app.render.endPointerDrag(event.clientX, event.clientY);
    });

    window.addEventListener('pointercancel', () => {
      if (!app.state.dragDir) {
        return;
      }
      app.render.endPointerDrag(-9999, -9999);
    });

    document.addEventListener('keydown', (event) => {
      if (modalApi.hasActiveModal()) {
        return;
      }
      if (event.key === 'Escape') {
        app.render.deselect();
        app.render.clearPendingDelete();
      }
    });

    document.addEventListener('click', (event) => {
      if (modalApi.hasActiveModal()) {
        return;
      }
      if (!event.target.closest('.atile') && !event.target.closest('.cell')) {
        app.render.deselect();
        app.render.clearPendingDelete();
      }
    });

    window.addEventListener('resize', () => {
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        syncCommandLayout();
        updateResponsiveLabels();
        syncSizes();
        app.render.posSnail(app.state.snailPos.r, app.state.snailPos.c, false, app.state.snailFacing || 'right');
      }, 80);
    });

    btnRun.addEventListener('click', () => {
      clearRunHint();
      audioApi.resumeAudio();
      app.engine.run();
    });
    btnClr.addEventListener('click', modalApi.openClearConfirmModal);
    btnPrev.addEventListener('click', goToPrevLevel);
    btnNext.addEventListener('click', goToNextLevel);
    btnLevelInfo.addEventListener('click', modalApi.openLevelIntro);
    btnSpeakTask.addEventListener('click', audioApi.speakCurrentTask);
    btnMap.addEventListener('click', modalApi.openLevelMap);
  }

  function init() {
    applyStaticText();
    syncCommandLayout();
    app.render.buildPalette();
    app.render.buildGrid();
    app.render.clearPendingDelete();
    app.render.renderAll();
    bindGlobalEvents();
    refreshLevelUi();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        syncSizes();
        setLevelIntroStatus();
        const start = app.getStart();
        snailEl.innerHTML = app.getAssetIconMarkup('snail.svg', 'board-icon board-icon-snail');
        requestAnimationFrame(() => app.render.posSnail(start.r, start.c, false, app.state.snailFacing || 'right'));
        if (shouldAutoOpenIntroOnSessionStart()) {
          requestAnimationFrame(() => modalApi.openLevelIntro());
        }
      });
    });
  }

  const ui = {
    clearRunHint,
    clearStatus,
    flashCell,
    flashNeighbours,
    goToNextLevel,
    init,
    launchConfetti,
    loadCurrentLevel,
    onRouteChanged,
    openLevelIntro: modalApi.openLevelIntro,
    openLevelMap: modalApi.openLevelMap,
    refreshLevelUi,
    refreshProgressUi,
    setDisabled,
    setLevelIntroStatus,
    setStatus,
    playErrorSound: audioApi.playErrorSound,
    playStepSound: audioApi.playStepSound,
    playSuccessSound: audioApi.playSuccessSound,
    resumeAudio: audioApi.resumeAudio,
    openClearConfirmModal: modalApi.openClearConfirmModal,
    showTurnHintModal: modalApi.showTurnHintModal,
    showAlreadySolvedModal: modalApi.showAlreadySolvedModal,
    showWin: modalApi.showWin,
    speakCurrentTask,
    stopTaskSpeech,
    syncSizes
  };

  app.ui = ui;
  init();
  return ui;
}
