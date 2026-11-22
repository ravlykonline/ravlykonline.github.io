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

    const { welcomeDialog, paletteEl } = app.refs;
    if (typeof welcomeDialog?.showModal === 'function' && !app.storage.loadProgress()) {
      welcomeDialog.addEventListener('close', () => {
        app.storage.saveProgress();
        paletteEl.querySelector('button')?.focus();
      }, { once: true });
      welcomeDialog.showModal();
    }
  }

  return { start };
}
