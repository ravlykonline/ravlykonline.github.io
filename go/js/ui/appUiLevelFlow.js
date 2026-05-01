export function createAppUiLevelFlow({
  app,
  effectsApi,
  modalApiProvider,
  refreshLevelUi,
  statusApi,
  windowRef = window
}) {
  function loadCurrentLevel(options = {}) {
    const { showIntro = true } = options;
    app.engine.clearAll();
    app.render.buildPalette();
    app.render.buildGrid();
    app.render.clearPendingDelete();
    app.render.renderAll();
    refreshLevelUi();
    statusApi.setLevelIntroStatus();
    statusApi.scheduleRunHint();
    effectsApi.syncSizes();
    const start = app.getStart();
    windowRef.requestAnimationFrame(() => {
      app.render.posSnail(start.r, start.c, false, app.state.snailFacing || 'right');
    });
    if (showIntro) {
      windowRef.requestAnimationFrame(() => modalApiProvider().openLevelIntro());
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

  return {
    goToLevel,
    goToNextLevel,
    goToPrevLevel,
    loadCurrentLevel,
    shouldAutoOpenIntroOnSessionStart
  };
}
