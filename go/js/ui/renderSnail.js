import { DIRECTION_DELTAS } from '../core/constants.js';

function getSnailTransform(x, y) {
  return `translate(${x}px,${y}px)`;
}

export function createRenderSnail({
  cellEl,
  getSnailFacing = () => 'right',
  gwrap,
  snailEl,
  windowRef = window
}) {
  function setFacing(dir) {
    snailEl.dataset.facing = dir;
    if (dir === 'left' || dir === 'right') {
      snailEl.dataset.horizontal = dir;
    }
  }

  function getSnailCellPosition(r, c) {
    const el = cellEl(r, c);
    if (!el) {
      return null;
    }

    const wrapRect = gwrap.getBoundingClientRect();
    const cellRect = el.getBoundingClientRect();
    return {
      cellRect,
      x: cellRect.left - wrapRect.left - (gwrap.clientLeft || 0),
      y: cellRect.top - wrapRect.top - (gwrap.clientTop || 0)
    };
  }

  async function bumpSnail(r, c, dir) {
    const position = getSnailCellPosition(r, c);
    if (!position) {
      return;
    }

    const { cellRect, x, y } = position;
    const facing = dir || getSnailFacing() || 'right';
    const delta = DIRECTION_DELTAS[facing] || { dr: 0, dc: 0 };
    const bumpDistance = Math.round(Math.min(cellRect.width, cellRect.height) * 0.18);
    setFacing(facing);
    const baseTransform = getSnailTransform(x, y);
    const bumpTransform = getSnailTransform(x + delta.dc * bumpDistance, y + delta.dr * bumpDistance);

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
    const position = getSnailCellPosition(r, c);
    if (!position) {
      return;
    }

    const { cellRect, x, y } = position;
    const facing = facingDir || getSnailFacing() || 'right';
    setFacing(facing);

    snailEl.style.width = `${cellRect.width}px`;
    snailEl.style.height = `${cellRect.height}px`;
    snailEl.style.fontSize = `${Math.round(Math.min(cellRect.width, cellRect.height) * 0.64)}px`;

    if (!animate) {
      snailEl.style.transition = 'none';
      snailEl.style.transform = getSnailTransform(x, y);
      snailEl.getBoundingClientRect();
      snailEl.style.transition = '';
      return;
    }

    snailEl.style.transform = getSnailTransform(x, y);
  }

  return {
    bumpSnail,
    posSnail
  };
}
