import { createAppComposition } from './app/composition.js';

export const LEGACY_RUNTIME_SCRIPTS = [
];

export function loadClassicScript(src, documentRef = document) {
  return new Promise((resolve, reject) => {
    const script = documentRef.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => resolve(src);
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    documentRef.body.appendChild(script);
  });
}

export async function loadLegacyRuntimeScripts({
  documentRef = document,
  scripts = LEGACY_RUNTIME_SCRIPTS
} = {}) {
  for (const src of scripts) {
    await loadClassicScript(src, documentRef);
  }
}

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

  if (options.loadLegacyRuntime !== false) {
    await loadLegacyRuntimeScripts({
      documentRef: options.documentRef || document,
      scripts: options.legacyScripts || LEGACY_RUNTIME_SCRIPTS
    });
  }

  return composition;
}
