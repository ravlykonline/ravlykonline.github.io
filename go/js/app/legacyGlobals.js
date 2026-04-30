import {
  DIRECTION_DELTAS,
  TILE_DEFS,
  canEnterTile,
  oppositeDir,
  resolveStartTileExit,
  resolveTileExit
} from '../core/constants.js';
import { levels } from '../core/levels.js';
import { textsUk } from '../core/texts.uk.js';
import { assetClassName, assetPath, createAssetIcon, createTileIconByDir } from '../ui/assets.js';

export function createAssetIconMarkup(filename, className) {
  return `<img src="${assetPath(filename)}" class="${assetClassName(className)}" alt="" aria-hidden="true" draggable="false">`;
}

function createLegacyTileDef(tileDef) {
  return {
    ...tileDef,
    icon: createAssetIconMarkup(tileDef.iconFile, 'tile-icon')
  };
}

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

export function installLegacyGlobals({
  documentRef = document,
  windowRef = window
} = {}) {
  const app = (windowRef.SnailGame = windowRef.SnailGame || {});

  app.getAssetIconMarkup = createAssetIconMarkup;
  app.createAssetIcon = function createLegacyAssetIcon(filename, className) {
    return createAssetIcon({ className, documentRef, filename });
  };
  app.createTileIconByDir = function createLegacyTileIconByDir(dir, className) {
    return createTileIconByDir({
      className: className || 'tile-icon',
      dir,
      documentRef,
      tileDefs: app.tileDefs
    });
  };

  app.tileDefs = TILE_DEFS.map(createLegacyTileDef);
  app.levels = levels.map(cloneLevel);
  app.textUk = textsUk;
  app.delta = { ...DIRECTION_DELTAS };
  app.oppositeDir = oppositeDir;
  app.resolveTileExit = resolveTileExit;
  app.resolveStartTileExit = resolveStartTileExit;
  app.canEnterTile = canEnterTile;

  return app;
}
