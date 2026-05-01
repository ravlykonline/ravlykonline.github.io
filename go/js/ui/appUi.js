import { createAppUiEffects } from './appUiEffects.js';
import { bindAppUiEvents } from './appUiEvents.js';
import { createAppUiLevelFlow } from './appUiLevelFlow.js';
import { createAppUiLayout } from './appUiLayout.js';
import { createAppUiState } from './appUiState.js';
import { createAppUiStartup } from './appUiStartup.js';
import { createAppUiStatus } from './appUiStatus.js';

export function createAppUi({
  app,
  documentRef = document,
  windowRef = window
} = {}) {
  const document = documentRef;
  const window = windowRef;
  const { text } = app;

  let modalApi = null;
  let audioApi = null;
  const layoutApi = createAppUiLayout({
    app,
    documentRef: document,
    refs: app.refs,
    text,
    windowRef: window
  });
  const statusApi = createAppUiStatus({
    app,
    refs: app.refs,
    text,
    windowRef: window
  });
  const effectsApi = createAppUiEffects({
    app,
    documentRef: document,
    windowRef: window
  });
  const stateApi = createAppUiState({
    app,
    documentRef: document,
    layoutApi,
    statusApi,
    text
  });
  const flowApi = createAppUiLevelFlow({
    app,
    effectsApi,
    modalApiProvider: () => modalApi,
    refreshLevelUi: stateApi.refreshLevelUi,
    statusApi,
    windowRef: window
  });
  const startupApi = createAppUiStartup({
    app,
    effectsApi,
    modalApiProvider: () => modalApi,
    statusApi,
    windowRef: window
  });

  function getCurrentTaskText() {
    return text.taskSpeech(app.state.currentLevel);
  }

  audioApi = app.createUiAudio({
    getCurrentTaskText,
    setLevelIntroStatus: statusApi.setLevelIntroStatus,
    setStatus: statusApi.setStatus,
    text
  });

  const speakCurrentTask = audioApi.speakCurrentTask;
  const stopTaskSpeech = audioApi.stopTaskSpeech;

  modalApi = app.createUiModals({
    loadCurrentLevel: flowApi.loadCurrentLevel,
    refs: app.refs,
    speakCurrentTask: audioApi.speakCurrentTask,
    stopTaskSpeech: audioApi.stopTaskSpeech,
    text
  });

  function init() {
    layoutApi.applyStaticText();
    layoutApi.syncCommandLayout();
    app.render.buildPalette();
    app.render.buildGrid();
    app.render.clearPendingDelete();
    app.render.renderAll();
    bindAppUiEvents({
      app,
      audioApi,
      documentRef: document,
      goToNextLevel: flowApi.goToNextLevel,
      goToPrevLevel: flowApi.goToPrevLevel,
      layoutApi,
      modalApi,
      statusApi,
      syncSizes: effectsApi.syncSizes,
      windowRef: window
    });
    stateApi.refreshLevelUi();

    startupApi.start({
      shouldAutoOpenIntro: flowApi.shouldAutoOpenIntroOnSessionStart
    });
  }

  const ui = {
    clearRunHint: statusApi.clearRunHint,
    clearStatus: statusApi.clearStatus,
    flashCell: effectsApi.flashCell,
    flashNeighbours: effectsApi.flashNeighbours,
    goToNextLevel: flowApi.goToNextLevel,
    init,
    launchConfetti: effectsApi.launchConfetti,
    loadCurrentLevel: flowApi.loadCurrentLevel,
    onRouteChanged: statusApi.onRouteChanged,
    openLevelIntro: modalApi.openLevelIntro,
    openLevelMap: modalApi.openLevelMap,
    refreshLevelUi: stateApi.refreshLevelUi,
    refreshProgressUi: stateApi.refreshProgressUi,
    setDisabled: stateApi.setDisabled,
    setLevelIntroStatus: statusApi.setLevelIntroStatus,
    setStatus: statusApi.setStatus,
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
    syncSizes: effectsApi.syncSizes
  };

  app.ui = ui;
  init();
  return ui;
}
