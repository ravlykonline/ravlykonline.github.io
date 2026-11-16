export function createAppUiStartup({ app, effectsApi, statusApi }) {
  function start() {
    statusApi.setLevelIntroStatus();
    app.refs.snailEl.replaceChildren(
      app.createAssetIcon('snail.svg', 'board-icon board-icon-snail')
    );
    effectsApi.syncSizes();
  }

  return { start };
}
