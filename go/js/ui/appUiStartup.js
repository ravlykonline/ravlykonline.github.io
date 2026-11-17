import { createSnailSprite } from './snailSprite.js';

export function createAppUiStartup({ app, documentRef = globalThis.document, effectsApi, statusApi }) {
  function start() {
    statusApi.setLevelIntroStatus();
    app.refs.snailEl.replaceChildren(
      createSnailSprite({
        createAssetIcon: (filename, className) => app.createAssetIcon(filename, className),
        documentRef
      })
    );
    effectsApi.syncSizes();
  }

  return { start };
}
