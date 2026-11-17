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
  storage = null,
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
    storage,
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
    statusApi,
    text
  });
  const flowApi = createAppUiLevelFlow({
    app,
    effectsApi,
    refreshLevelUi: stateApi.refreshLevelUi,
    statusApi
  });
  const startupApi = createAppUiStartup({
    app,
    documentRef: document,
    effectsApi,
    statusApi
  });

  audioApi = app.createUiAudio({
    getCurrentLevelId: () => app.state.currentLevel.id,
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
    layoutApi.bindThemeControl();
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
      modalApi,
      statusApi,
      syncSizes: effectsApi.syncSizes,
      windowRef: window
    });
    stateApi.refreshLevelUi();

    startupApi.start();
  }

  const ui = {
    clearRunHint: statusApi.clearRunHint,
    clearStatus: statusApi.clearStatus,
    clearStopMark: effectsApi.clearStopMark,
    flashCell: effectsApi.flashCell,
    flashNeighbours: effectsApi.flashNeighbours,
    setStopMark: effectsApi.setStopMark,
    goToNextLevel: flowApi.goToNextLevel,
    init,
    launchConfetti: effectsApi.launchConfetti,
    loadCurrentLevel: flowApi.loadCurrentLevel,
    onRouteChanged() {
      effectsApi.clearStopMark();
      statusApi.onRouteChanged();
    },
    updateEditHint: statusApi.updateEditHint,
    openLevelIntro: modalApi.openLevelIntro,
    openLevelMap: modalApi.openLevelMap,
    refreshLevelUi: stateApi.refreshLevelUi,
    refreshProgressUi: stateApi.refreshProgressUi,
    setDisabled: stateApi.setDisabled,
    setLevelIntroStatus: statusApi.setLevelIntroStatus,
    setStatus: statusApi.setStatus,
    playCrunchSound: audioApi.playCrunchSound,
    playErrorSound: audioApi.playErrorSound,
    playFinaleSound: audioApi.playFinaleSound,
    playStepSound: audioApi.playStepSound,
    playSuccessSound: audioApi.playSuccessSound,
    resumeAudio: audioApi.resumeAudio,
    openClearConfirmModal: modalApi.openClearConfirmModal,
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
