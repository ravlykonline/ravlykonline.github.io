import { GAME_CONFIG } from '../core/config.js';
import { TILE_DEFS } from '../core/constants.js';
import { getLevelById, levels } from '../core/levels.js';
import { textsUk } from '../core/texts.uk.js';
import { analyzeRoute } from '../engine/route.js';
import { simulateLevel } from '../engine/simulator.js';
import { validateLevels } from '../engine/validation.js';
import { registerPwa } from '../features/pwaRegister.js';
import { createInitialState } from '../state/gameState.js';
import { loadSession, saveSession } from '../state/sessionStore.js';
import { installLegacyEngine } from './legacyEngine.js';
import { installLegacyGlobals } from './legacyGlobals.js';
import { installLegacyRender } from './legacyRender.js';
import { installLegacyRenderDrag } from './legacyRenderDrag.js';
import { installLegacyRenderSnail } from './legacyRenderSnail.js';
import { installLegacyState } from './legacyState.js';
import { installLegacyUiAudio } from './legacyUiAudio.js';
import { installLegacyUiModals } from './legacyUiModals.js';
import { installLegacyUi } from './legacyUi.js';
import { createAssetIcon, createTileIconByDir } from '../ui/assets.js';
import { getDomRefs } from '../ui/dom.js';
import { renderLevelMap } from '../ui/renderLevelMap.js';
import { renderPalette } from '../ui/renderPalette.js';
import { renderProgress } from '../ui/renderProgress.js';

export function createAppComposition({
  documentRef = document,
  navigatorRef = navigator,
  windowRef = window
} = {}) {
  const storage = windowRef?.sessionStorage || null;
  const savedSession = loadSession(storage);
  const state = createInitialState(levels, savedSession);

  return {
    analyzeRoute,
    config: GAME_CONFIG,
    createAssetIcon,
    createTileIconByDir,
    getDomRefs,
    getLevelById,
    installLegacyEngine: () => installLegacyEngine({ windowRef }),
    installLegacyGlobals: () => installLegacyGlobals({ documentRef, windowRef }),
    installLegacyRender: () => installLegacyRender({ documentRef, windowRef }),
    installLegacyRenderDrag: () => installLegacyRenderDrag({ documentRef, windowRef }),
    installLegacyRenderSnail: () => installLegacyRenderSnail({ windowRef }),
    installLegacyState: () => installLegacyState({ documentRef, windowRef }),
    installLegacyUi: () => installLegacyUi({ documentRef, navigatorRef, windowRef }),
    installLegacyUiAudio: () => installLegacyUiAudio({ windowRef }),
    installLegacyUiModals: () => installLegacyUiModals({ documentRef, windowRef }),
    levels,
    refs: getDomRefs(documentRef),
    registerPwa: () => registerPwa({ navigatorRef, windowRef }),
    renderLevelMap,
    renderPalette,
    renderProgress,
    saveSession: (payload) => saveSession(payload, storage),
    simulateLevel,
    state,
    texts: textsUk,
    tileDefs: TILE_DEFS,
    validateLevels: () => validateLevels(levels)
  };
}
