import { GAME_CONFIG } from '../core/config.js';
import { TILE_DEFS } from '../core/constants.js';
import { getLevelById, levels } from '../core/levels.js';
import { textsUk } from '../core/texts.uk.js';
import { analyzeRoute } from '../engine/route.js';
import { createEngineRoute, createGameEngine } from '../engine/runtime.js';
import { simulateLevel } from '../engine/simulator.js';
import { validateLevels } from '../engine/validation.js';
import { createUiAudio } from '../features/audio.js';
import { registerPwa } from '../features/pwaRegister.js';
import { installAppStateFacade } from '../state/appStateFacade.js';
import { createInitialState } from '../state/gameState.js';
import { loadSession, saveSession } from '../state/sessionStore.js';
import { createAssetIcon, createTileIconByDir } from '../ui/assets.js';
import { createAppUi } from '../ui/appUi.js';
import { getDomRefs } from '../ui/dom.js';
import { createUiModals } from '../ui/modals.js';
import { createRender } from '../ui/render.js';
import { renderLevelMap } from '../ui/renderLevelMap.js';
import { renderPalette } from '../ui/renderPalette.js';
import { renderProgress } from '../ui/renderProgress.js';
import { createRenderDrag } from '../ui/renderDrag.js';
import { createRenderSnail } from '../ui/renderSnail.js';
import { createAppObject } from './appFactory.js';

export function createAppComposition({
  documentRef = document,
  navigatorRef = navigator,
  windowRef = window
} = {}) {
  const storage = windowRef?.sessionStorage || null;
  const savedSession = loadSession(storage);
  const state = createInitialState(levels, savedSession);
  const refs = getDomRefs(documentRef);
  const app = createAppObject({ documentRef });

  return {
    app,
    analyzeRoute,
    config: GAME_CONFIG,
    createAssetIcon,
    createTileIconByDir,
    getDomRefs,
    getLevelById,
    installEngine: () => {
      app.createEngineRoute = () => createEngineRoute(app);
      app.engine = createGameEngine({ app });
      return app.engine;
    },
    installRender: () => {
      app.render = createRender({ app, documentRef });
      return app.render;
    },
    installRenderDrag: () => {
      app.createRenderDrag = (deps) => createRenderDrag({
        createTileIconByDir: app.createTileIconByDir,
        documentRef,
        state: app.state,
        windowRef,
        ...deps
      });
      return app.createRenderDrag;
    },
    installRenderSnail: () => {
      app.createRenderSnail = (deps) => createRenderSnail({
        getSnailFacing: () => app.state.snailFacing,
        gwrap: app.refs.gwrap,
        snailEl: app.refs.snailEl,
        windowRef,
        ...deps
      });
      return app.createRenderSnail;
    },
    installAppState: () => installAppStateFacade({
      app,
      refs,
      storage
    }),
    installUi: () => createAppUi({
      app,
      documentRef,
      windowRef
    }),
    installUiAudio: () => {
      app.createUiAudio = (deps) => createUiAudio({
        windowRef,
        ...deps
      });
      return app.createUiAudio;
    },
    installUiModals: () => {
      app.createUiModals = (deps) => createUiModals({
        app,
        documentRef,
        windowRef,
        ...deps
      });
      return app.createUiModals;
    },
    levels,
    refs,
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
