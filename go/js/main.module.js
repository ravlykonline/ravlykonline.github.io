import { createAppComposition } from './app/composition.js';

export async function bootstrapApp(options = {}) {
  const composition = createAppComposition(options);
  const validationErrors = composition.validateLevels();

  if (validationErrors.length > 0) {
    throw new Error('Level validation failed');
  }

  composition.installAppState();
  composition.installEngine();
  composition.installRenderDrag();
  composition.installRenderSnail();
  composition.installRender();
  composition.installUiAudio();
  composition.installUiModals();
  composition.registerPwa();

  if (options.initializeUi !== false) {
    composition.installUi();
  }

  return composition;
}
