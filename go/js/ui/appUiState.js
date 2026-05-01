import { renderLevelHeader } from './renderLevelHeader.js';
import { renderProgress } from './renderProgress.js';

export function createAppUiState({
  app,
  documentRef = document,
  layoutApi,
  statusApi,
  text
}) {
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
      documentRef,
      isRunning: app.state.running,
      level: app.state.currentLevel,
      levelIndex: app.getCurrentLevelIndex(),
      refs: app.refs,
      text,
      totalLevels: app.getTotalLevels()
    });
    layoutApi.updateResponsiveLabels();
    refreshProgressUi();
  }

  function setDisabled(disabled) {
    if (disabled) {
      statusApi.clearRunHint();
    }
    documentRef.querySelectorAll('.atile').forEach((button) => {
      button.disabled = disabled;
    });
    app.refs.btnRun.disabled = disabled;
    app.refs.btnClr.disabled = disabled;
    app.refs.btnPrev.disabled = disabled || !app.hasPrevLevel();
    app.refs.btnNext.disabled = disabled || !app.hasNextLevel();
    app.refs.btnLevelInfo.disabled = disabled;
    app.refs.btnSpeakTask.disabled = disabled;
    app.refs.btnMap.disabled = disabled;
  }

  return {
    refreshLevelUi,
    refreshProgressUi,
    setDisabled
  };
}
