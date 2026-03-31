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

  app.tileDefs = [
    { dir: 'up', group: 'str', label: '\u0412\u0433\u043e\u0440\u0443', icon: assetIcon('straight_up.svg', 'tile-icon') },
    { dir: 'right', group: 'str', label: '\u0412\u043f\u0440\u0430\u0432\u043e', icon: assetIcon('straight_right.svg', 'tile-icon') },
    { dir: 'down', group: 'str', label: '\u0412\u043d\u0438\u0437', icon: assetIcon('straight_down.svg', 'tile-icon') },
    { dir: 'left', group: 'str', label: '\u0412\u043b\u0456\u0432\u043e', icon: assetIcon('straight_left.svg', 'tile-icon') },
    { dir: 'right-up', group: 'trn', label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0441\u043f\u0440\u0430\u0432\u0430 \u2192 \u0432\u0433\u043e\u0440\u0443', icon: assetIcon('right_to_up.svg', 'tile-icon') },
    { dir: 'down-right', group: 'trn', label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0437\u043d\u0438\u0437\u0443 \u2192 \u0432\u043f\u0440\u0430\u0432\u043e', icon: assetIcon('bottom_to_right.svg', 'tile-icon') },
    { dir: 'left-down', group: 'trn', label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0437\u043b\u0456\u0432\u0430 \u2192 \u0432\u043d\u0438\u0437', icon: assetIcon('left_to_down.svg', 'tile-icon') },
    { dir: 'up-left', group: 'trn', label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0437\u0433\u043e\u0440\u0438 \u2192 \u0432\u043b\u0456\u0432\u043e', icon: assetIcon('top_to_left.svg', 'tile-icon') },
    { dir: 'right-down', group: 'trn', label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0441\u043f\u0440\u0430\u0432\u0430 \u2192 \u0432\u043d\u0438\u0437', icon: assetIcon('right_to_down.svg', 'tile-icon') },
    { dir: 'down-left', group: 'trn', label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0437\u043d\u0438\u0437\u0443 \u2192 \u0432\u043b\u0456\u0432\u043e', icon: assetIcon('bottom_to_left.svg', 'tile-icon') },
    { dir: 'left-up', group: 'trn', label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0437\u043b\u0456\u0432\u0430 \u2192 \u0432\u0433\u043e\u0440\u0443', icon: assetIcon('left_to_up.svg', 'tile-icon') },
    { dir: 'up-right', group: 'trn', label: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0437\u0433\u043e\u0440\u0438 \u2192 \u0432\u043f\u0440\u0430\u0432\u043e', icon: assetIcon('top_to_right.svg', 'tile-icon') }
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