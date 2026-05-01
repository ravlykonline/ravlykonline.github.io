export function createAppUiStartup({
  app,
  effectsApi,
  modalApiProvider,
  statusApi,
  windowRef = window
}) {
  function renderSnailIcon() {
    app.refs.snailEl.replaceChildren(
      app.createAssetIcon('snail.svg', 'board-icon board-icon-snail')
    );
  }

  function runInitialFrame() {
    effectsApi.syncSizes();
    statusApi.setLevelIntroStatus();
    const start = app.getStart();
    renderSnailIcon();
    windowRef.requestAnimationFrame(() => {
      app.render.posSnail(start.r, start.c, false, app.state.snailFacing || 'right');
    });
  }

  function start({ shouldAutoOpenIntro }) {
    windowRef.requestAnimationFrame(() => {
      windowRef.requestAnimationFrame(() => {
        runInitialFrame();
        if (shouldAutoOpenIntro()) {
          windowRef.requestAnimationFrame(() => modalApiProvider().openLevelIntro());
        }
      });
    });
  }

  return {
    start
  };
}
