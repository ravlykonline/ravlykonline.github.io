(function () {
  const app = (window.SnailGame = window.SnailGame || {});

  function assetPath(filename) {
    return `assets/${filename}`;
  }

  function assetClassName(className) {
    return ['asset-icon', className].filter(Boolean).join(' ');
  }

  function assetIcon(filename, className) {
    return `<img src="${assetPath(filename)}" class="${assetClassName(className)}" alt="" aria-hidden="true" draggable="false">`;
  }

  app.getAssetIconMarkup = function getAssetIconMarkup(filename, className) {
    return assetIcon(filename, className);
  };

  app.createAssetIcon = function createAssetIcon(filename, className) {
    const img = document.createElement('img');
    img.src = assetPath(filename);
    img.className = assetClassName(className);
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.draggable = false;
    return img;
  };

  function createTileDef(dir, group, label, iconFile) {
    return {
      dir,
      group,
      label,
      iconFile,
      icon: assetIcon(iconFile, 'tile-icon')
    };
  }

  app.createTileIconByDir = function createTileIconByDir(dir, className) {
    const tileDef = app.tileDefs.find((item) => item.dir === dir);
    if (!tileDef) {
      return null;
    }

    return app.createAssetIcon(tileDef.iconFile, className || 'tile-icon');
  };

  app.tileDefs = [
    createTileDef('up', 'str', '\u0412\u0433\u043e\u0440\u0443', 'straight_up.svg'),
    createTileDef('right', 'str', '\u0412\u043f\u0440\u0430\u0432\u043e', 'straight_right.svg'),
    createTileDef('down', 'str', '\u0412\u043d\u0438\u0437', 'straight_down.svg'),
    createTileDef('left', 'str', '\u0412\u043b\u0456\u0432\u043e', 'straight_left.svg'),
    createTileDef('right-up', 'trn', '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043b\u0456\u0432\u043e \u2192 \u0432\u0433\u043e\u0440\u0443', 'right_to_up.svg'),
    createTileDef('down-right', 'trn', '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u0433\u043e\u0440\u0443 \u2192 \u0432\u043f\u0440\u0430\u0432\u043e', 'bottom_to_right.svg'),
    createTileDef('left-down', 'trn', '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043f\u0440\u0430\u0432\u043e \u2192 \u0432\u043d\u0438\u0437', 'left_to_down.svg'),
    createTileDef('up-left', 'trn', '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043d\u0438\u0437 \u2192 \u0432\u043b\u0456\u0432\u043e', 'top_to_left.svg'),
    createTileDef('right-down', 'trn', '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043b\u0456\u0432\u043e \u2192 \u0432\u043d\u0438\u0437', 'right_to_down.svg'),
    createTileDef('down-left', 'trn', '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u0433\u043e\u0440\u0443 \u2192 \u0432\u043b\u0456\u0432\u043e', 'bottom_to_left.svg'),
    createTileDef('left-up', 'trn', '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043f\u0440\u0430\u0432\u043e \u2192 \u0432\u0433\u043e\u0440\u0443', 'left_to_up.svg'),
    createTileDef('up-right', 'trn', '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043d\u0438\u0437 \u2192 \u0432\u043f\u0440\u0430\u0432\u043e', 'top_to_right.svg')
  ];

  app.delta = {
    up: { dr: -1, dc: 0 },
    down: { dr: 1, dc: 0 },
    left: { dr: 0, dc: -1 },
    right: { dr: 0, dc: 1 }
  };

  app.oppositeDir = function oppositeDir(dir) {
    if (!dir) {
      return null;
    }

    return {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left'
    }[dir] || null;
  };

  app.resolveTileExit = function resolveTileExit(tileDir, incomingDir) {
    if (!tileDir || !incomingDir) {
      return null;
    }

    if (!tileDir.includes('-')) {
      return tileDir === incomingDir ? tileDir : null;
    }

    const [entrySide, exitDir] = tileDir.split('-');
    return app.oppositeDir(incomingDir) === entrySide ? exitDir : null;
  };

  app.resolveStartTileExit = function resolveStartTileExit(tileDir) {
    if (!tileDir) {
      return null;
    }

    if (!tileDir.includes('-')) {
      return tileDir;
    }

    const [, exitDir] = tileDir.split('-');
    return exitDir || null;
  };

  app.canEnterTile = function canEnterTile(tileDir, incomingDir) {
    return app.resolveTileExit(tileDir, incomingDir) !== null;
  };
})();