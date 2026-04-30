import { DIRECTION_DELTAS } from '../core/constants.js';

function getSnailOrientation(dir) {
  switch (dir) {
    case 'up':
      return ' rotate(-90deg)';
    case 'down':
      return ' rotate(90deg)';
    case 'left':
      return ' scaleX(-1)';
    case 'right':
    default:
      return '';
  }
}

function getSnailTransform(x, y, dir) {
  return `translate(${x}px,${y}px)${getSnailOrientation(dir)}`;
}

export function installLegacyRenderSnail({ windowRef = window } = {}) {
  const app = windowRef.SnailGame;
  const { gwrap, snailEl } = app.refs;

  app.createRenderSnail = function createRenderSnail(deps) {
    const { cellEl } = deps;

    function getSnailCellPosition(r, c) {
      const el = cellEl(r, c);
      if (!el) {
        return null;
      }

      const wrapRect = gwrap.getBoundingClientRect();
      const cellRect = el.getBoundingClientRect();
      return {
        cellRect,
        x: cellRect.left - wrapRect.left,
        y: cellRect.top - wrapRect.top
      };
    }

    async function bumpSnail(r, c, dir) {
      const position = getSnailCellPosition(r, c);
      if (!position) {
        return;
      }

      const { cellRect, x, y } = position;
      const facing = dir || app.state.snailFacing || 'right';
      const delta = DIRECTION_DELTAS[facing] || { dr: 0, dc: 0 };
      const bumpDistance = Math.round(Math.min(cellRect.width, cellRect.height) * 0.18);
      const baseTransform = getSnailTransform(x, y, facing);
      const bumpTransform = getSnailTransform(x + delta.dc * bumpDistance, y + delta.dr * bumpDistance, facing);

      if (typeof snailEl.animate === 'function' && !windowRef.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const animation = snailEl.animate(
          [
            { transform: baseTransform },
            { transform: bumpTransform, offset: 0.42 },
            { transform: baseTransform }
          ],
          {
            duration: 340,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
          }
        );
        await animation.finished.catch(() => {});
        snailEl.style.transform = baseTransform;
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 340));
    }

    function posSnail(r, c, animate, facingDir) {
      const el = cellEl(r, c);
      if (!el) {
        return;
      }

      const wrapRect = gwrap.getBoundingClientRect();
      const cellRect = el.getBoundingClientRect();
      const x = cellRect.left - wrapRect.left;
      const y = cellRect.top - wrapRect.top;
      const facing = facingDir || app.state.snailFacing || 'right';

      snailEl.style.width = `${cellRect.width}px`;
      snailEl.style.height = `${cellRect.height}px`;
      snailEl.style.fontSize = `${Math.round(Math.min(cellRect.width, cellRect.height) * 0.64)}px`;

      if (!animate) {
        snailEl.style.transition = 'none';
        snailEl.style.transform = getSnailTransform(x, y, facing);
        snailEl.getBoundingClientRect();
        snailEl.style.transition = '';
        return;
      }

      snailEl.style.transform = getSnailTransform(x, y, facing);
    }

    return {
      bumpSnail,
      posSnail
    };
  };

  return app.createRenderSnail;
}
