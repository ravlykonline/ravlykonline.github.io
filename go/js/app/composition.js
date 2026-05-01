import { GAME_CONFIG } from '../core/config.js';
import {
  DIRECTION_DELTAS,
  TILE_DEFS,
  canEnterTile,
  oppositeDir,
  resolveStartTileExit,
  resolveTileExit
} from '../core/constants.js';
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
import { createAssetIcon, createAssetIconMarkup, createTileIconByDir } from '../ui/assets.js';
import { createAppUi } from '../ui/appUi.js';
import { getDomRefs } from '../ui/dom.js';
import { createUiModals } from '../ui/modals.js';
import { createRender } from '../ui/render.js';
import { renderLevelMap } from '../ui/renderLevelMap.js';
import { renderPalette } from '../ui/renderPalette.js';
import { renderProgress } from '../ui/renderProgress.js';
import { createRenderDrag } from '../ui/renderDrag.js';
import { createRenderSnail } from '../ui/renderSnail.js';

function cloneArrowMap(source = {}) {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, value]));
}

function cloneLevel(level) {
  return {
    ...level,
    allowedTiles: [...(level.allowedTiles || [])],
    apple: { ...level.apple },
    obstacles: (level.obstacles || []).map((item) => ({ ...item })),
    presetArrows: cloneArrowMap(level.presetArrows),
    start: { ...level.start }
  };
}

function createApp({ documentRef }) {
  const app = {};
  app.getAssetIconMarkup = createAssetIconMarkup;
  app.createAssetIcon = function createAppAssetIcon(filename, className) {
    return createAssetIcon({ className, documentRef, filename });
  };
  app.createTileIconByDir = function createAppTileIconByDir(dir, className) {
    return createTileIconByDir({
      className: className || 'tile-icon',
      dir,
      documentRef,
      tileDefs: app.tileDefs
    });
  };

  app.tileDefs = TILE_DEFS.map((tileDef) => ({
    ...tileDef,
    icon: createAssetIconMarkup(tileDef.iconFile, 'tile-icon')
  }));
  app.levels = levels.map(cloneLevel);
  app.textUk = textsUk;
  app.delta = { ...DIRECTION_DELTAS };
  app.oppositeDir = oppositeDir;
  app.resolveTileExit = resolveTileExit;
  app.resolveStartTileExit = resolveStartTileExit;
  app.canEnterTile = canEnterTile;
  return app;
}

export function createAppComposition({
  documentRef = document,
  navigatorRef = navigator,
  windowRef = window
} = {}) {
  const storage = windowRef?.sessionStorage || null;
  const savedSession = loadSession(storage);
  const state = createInitialState(levels, savedSession);
  const refs = getDomRefs(documentRef);
  const app = createApp({ documentRef });

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
