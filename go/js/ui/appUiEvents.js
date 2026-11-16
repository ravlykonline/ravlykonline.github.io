export function bindAppUiEvents({
  app,
  audioApi,
  documentRef = document,
  goToNextLevel,
  goToPrevLevel,
  modalApi,
  statusApi,
  syncSizes,
  windowRef = window
}) {
  const { btnClr, btnLevelInfo, btnMap, btnNext, btnPrev, btnRun, btnSpeakTask, btnUndo } = app.refs;

  const unlockAudio = () => audioApi.primeAudio();
  windowRef.addEventListener('pointerdown', unlockAudio, { passive: true });
  windowRef.addEventListener('keydown', unlockAudio, { passive: true });

  windowRef.addEventListener('pointermove', (event) => {
    if (!app.state.dragDir || event.pointerId !== app.state.dragPointerId) {
      return;
    }
    if (!app.state.dragMoved &&
        Math.hypot(event.clientX - app.state.dragStartX, event.clientY - app.state.dragStartY) < 6) {
      return;
    }
    app.state.dragMoved = true;
    app.render.moveGhost(event.clientX, event.clientY);
    app.render.updateDropTarget(event.clientX, event.clientY);
  });

  windowRef.addEventListener('pointerup', (event) => {
    if (!app.state.dragDir || event.pointerId !== app.state.dragPointerId) {
      return;
    }
    app.render.endPointerDrag(event.clientX, event.clientY);
  });

  windowRef.addEventListener('pointercancel', (event) => {
    if (!app.state.dragDir || event.pointerId !== app.state.dragPointerId) {
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

  if (windowRef.ResizeObserver && app.refs.gwrap) {
    new windowRef.ResizeObserver(syncSizes).observe(app.refs.gwrap);
  } else {
    windowRef.addEventListener('resize', syncSizes);
  }

  btnRun.addEventListener('click', () => {
    audioApi.stopTaskSpeech();
    statusApi.clearRunHint();
    audioApi.resumeAudio();
    app.engine.run();
  });
  btnClr.addEventListener('click', modalApi.openClearConfirmModal);
  btnUndo?.addEventListener('click', app.render.undoArrowEdit);
  btnPrev.addEventListener('click', goToPrevLevel);
  btnNext.addEventListener('click', goToNextLevel);
  btnLevelInfo.addEventListener('click', modalApi.openLevelIntro);
  btnSpeakTask.addEventListener('click', audioApi.speakCurrentTask);
  btnMap.addEventListener('click', modalApi.openLevelMap);
}
