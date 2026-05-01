export function bindAppUiEvents({
  app,
  audioApi,
  documentRef = document,
  goToNextLevel,
  goToPrevLevel,
  layoutApi,
  modalApi,
  statusApi,
  syncSizes,
  windowRef = window
}) {
  let syncTimeout = null;
  const { btnClr, btnLevelInfo, btnMap, btnNext, btnPrev, btnRun, btnSpeakTask } = app.refs;

  audioApi.initTaskSpeech();

  const unlockAudio = () => audioApi.primeAudio();
  windowRef.addEventListener('pointerdown', unlockAudio, { passive: true });
  windowRef.addEventListener('keydown', unlockAudio, { passive: true });

  windowRef.addEventListener('pointermove', (event) => {
    if (!app.state.dragDir) {
      return;
    }
    app.state.dragMoved = true;
    app.render.moveGhost(event.clientX, event.clientY);
    app.render.updateDropTarget(event.clientX, event.clientY);
  });

  windowRef.addEventListener('pointerup', (event) => {
    if (!app.state.dragDir) {
      return;
    }
    app.render.endPointerDrag(event.clientX, event.clientY);
  });

  windowRef.addEventListener('pointercancel', () => {
    if (!app.state.dragDir) {
      return;
    }
    app.render.endPointerDrag(-9999, -9999);
  });

  documentRef.addEventListener('keydown', (event) => {
    if (modalApi.hasActiveModal()) {
      return;
    }
    if (event.key === 'Escape') {
      app.render.deselect();
      app.render.clearPendingDelete();
    }
  });

  documentRef.addEventListener('click', (event) => {
    if (modalApi.hasActiveModal()) {
      return;
    }
    if (!event.target.closest('.atile') && !event.target.closest('.cell')) {
      app.render.deselect();
      app.render.clearPendingDelete();
    }
  });

  windowRef.addEventListener('resize', () => {
    windowRef.clearTimeout(syncTimeout);
    syncTimeout = windowRef.setTimeout(() => {
      layoutApi.syncCommandLayout();
      layoutApi.updateResponsiveLabels();
      syncSizes();
      app.render.posSnail(app.state.snailPos.r, app.state.snailPos.c, false, app.state.snailFacing || 'right');
    }, 80);
  });

  btnRun.addEventListener('click', () => {
    statusApi.clearRunHint();
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
