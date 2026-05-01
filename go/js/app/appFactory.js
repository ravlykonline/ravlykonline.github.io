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
import { createAssetIcon, createAssetIconMarkup, createTileIconByDir } from '../ui/assets.js';

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

export function createAppObject({ documentRef }) {
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
