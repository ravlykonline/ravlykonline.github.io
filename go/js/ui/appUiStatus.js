export function createAppUiStatus({
  app,
  refs,
  text,
  windowRef = window
}) {
  let runHintTimeout = null;

  function clearRunHint() {
    windowRef.clearTimeout(runHintTimeout);
    runHintTimeout = null;
    refs.btnRun.classList.remove('run-hint');
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

    runHintTimeout = windowRef.setTimeout(() => {
      runHintTimeout = null;
      if (!app.state.running && routeIsReadyForRunHint()) {
        refs.btnRun.classList.add('run-hint');
      }
    }, 3000);
  }

  function onRouteChanged() {
    scheduleRunHint();
  }

  function setStatus(icon, message, type) {
    refs.sicoEl.textContent = icon;
    refs.stxtEl.textContent = message;
    refs.statusEl.className = type || '';
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

  return {
    clearRunHint,
    clearStatus,
    onRouteChanged,
    scheduleRunHint,
    setLevelIntroStatus,
    setStatus
  };
}
