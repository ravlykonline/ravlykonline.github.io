export function createAppUiLevelFlow({ app, effectsApi, refreshLevelUi, statusApi }) {
  function loadCurrentLevel() {
    app.ui?.stopTaskSpeech();
    app.render.setSnailMood?.(null);
    effectsApi.clearStopMark();
    app.render.buildPalette();
    app.render.buildGrid();
    app.render.clearPendingDelete();
    app.render.renderAll();
    refreshLevelUi();
    statusApi.setLevelIntroStatus();
    statusApi.scheduleRunHint();
    effectsApi.syncSizes();
  }

  function goToLevel(levelId) {
    if (!levelId || !app.setCurrentLevel(levelId)) {
      return false;
    }
    loadCurrentLevel();
    return true;
  }

  function goToPrevLevel() {
    return goToLevel(app.getPrevLevelId());
  }

  function goToNextLevel() {
    return goToLevel(app.getNextLevelId());
  }

  return { goToLevel, goToNextLevel, goToPrevLevel, loadCurrentLevel };
}
