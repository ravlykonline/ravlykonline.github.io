import { launchConfetti as launchFeatureConfetti } from '../features/confetti.js';

export function createAppUiEffects({
  app,
  documentRef = document,
  windowRef = window
}) {
  function flashCell(r, c, color) {
    const el = app.render.cellEl(r, c);
    if (!el) {
      return;
    }
    el.style.outline = `4px solid ${color || '#ff9800'}`;
    el.style.outlineOffset = '-4px';
    windowRef.setTimeout(() => {
      el.style.outline = '';
      el.style.outlineOffset = '';
    }, 1200);
  }

  function flashNeighbours(r, c) {
    const rows = app.config.rows;
    const cols = app.config.cols;
    Object.values(app.delta).forEach(({ dr, dc }) => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        flashCell(nr, nc, '#ff9800');
      }
    });
  }

  function launchConfetti() {
    return launchFeatureConfetti({ documentRef, root: app.refs.confEl, windowRef });
  }

  function syncSizes() {
    const root = documentRef.documentElement;
    const wrapRect = app.refs.gwrap.getBoundingClientRect();

    if (!wrapRect.width || !wrapRect.height) {
      return;
    }

    root.style.setProperty('--gs-w', `${Math.round(wrapRect.width)}px`);
    root.style.setProperty('--gs-h', `${Math.round(wrapRect.height)}px`);

    const compact = windowRef.innerWidth <= 900;
    const tileSize = compact
      ? Math.max(48, Math.min(64, wrapRect.width / 6.8))
      : Math.max(52, Math.min(64, wrapRect.width / 10));
    root.style.setProperty('--tile-sz', `${Math.round(tileSize)}px`);

    windowRef.requestAnimationFrame(() => {
      app.render.posSnail(app.state.snailPos.r, app.state.snailPos.c, false, app.state.snailFacing || 'right');
    });
  }

  return {
    flashCell,
    flashNeighbours,
    launchConfetti,
    syncSizes
  };
}
