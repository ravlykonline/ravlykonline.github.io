import { CELL_SIZE, GRID_HEIGHT, GRID_WIDTH, SNAIL_SIZE, directionRotation } from '../core/constants.js';
import { cellToPixels } from '../core/engine.js';
import { avatarSvg, snailSvg } from './icons.js';

export function setupCanvas(dom) {
  const { gridSvg, trailCanvas, snailElement, avatarBox } = dom;

  gridSvg.setAttribute('width', GRID_WIDTH);
  gridSvg.setAttribute('height', GRID_HEIGHT);
  gridSvg.setAttribute('viewBox', `0 0 ${GRID_WIDTH} ${GRID_HEIGHT}`);

  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('width', GRID_WIDTH);
  background.setAttribute('height', GRID_HEIGHT);
  background.setAttribute('fill', 'var(--color-grid-background)');
  gridSvg.appendChild(background);

  for (let row = 0; row < GRID_HEIGHT / CELL_SIZE; row += 1) {
    for (let column = 0; column < GRID_WIDTH / CELL_SIZE; column += 1) {
      if ((row + column) % 2 === 0) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', column * CELL_SIZE);
        rect.setAttribute('y', row * CELL_SIZE);
        rect.setAttribute('width', CELL_SIZE);
        rect.setAttribute('height', CELL_SIZE);
        rect.setAttribute('fill', 'var(--color-grid-cell-alt)');
        gridSvg.appendChild(rect);
      }
    }
  }

  for (let column = 0; column <= GRID_WIDTH / CELL_SIZE; column += 1) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', column * CELL_SIZE);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', column * CELL_SIZE);
    line.setAttribute('y2', GRID_HEIGHT);
    line.setAttribute('stroke', 'var(--color-grid-line)');
    line.setAttribute('stroke-width', '1');
    gridSvg.appendChild(line);
  }

  for (let row = 0; row <= GRID_HEIGHT / CELL_SIZE; row += 1) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', row * CELL_SIZE);
    line.setAttribute('x2', GRID_WIDTH);
    line.setAttribute('y2', row * CELL_SIZE);
    line.setAttribute('stroke', 'var(--color-grid-line)');
    line.setAttribute('stroke-width', '1');
    gridSvg.appendChild(line);
  }

  trailCanvas.width = GRID_WIDTH;
  trailCanvas.height = GRID_HEIGHT;
  snailElement.style.width = `${SNAIL_SIZE}px`;
  snailElement.style.height = `${SNAIL_SIZE}px`;
  snailElement.innerHTML = snailSvg;
  avatarBox.innerHTML = avatarSvg;
}

export function clearTrail(dom) {
  const context = dom.trailCanvas.getContext('2d');
  context.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
}

export function placeSnail(dom, snail, immediate = false) {
  if (immediate) {
    dom.snailElement.style.transition = 'none';
  }

  dom.snailElement.style.left = `${cellToPixels(snail.x)}px`;
  dom.snailElement.style.top = `${cellToPixels(snail.y)}px`;
  dom.snailElement.style.transform = `rotate(${directionRotation[snail.dir]}deg)`;

  if (immediate) {
    window.requestAnimationFrame(() => {
      dom.snailElement.style.transition = '';
    });
  }
}

export function drawTrail(dom, lesson, from, to) {
  const context = dom.trailCanvas.getContext('2d');
  const fromX = from.x * CELL_SIZE + CELL_SIZE / 2;
  const fromY = from.y * CELL_SIZE + CELL_SIZE / 2;
  const toX = to.x * CELL_SIZE + CELL_SIZE / 2;
  const toY = to.y * CELL_SIZE + CELL_SIZE / 2;

  context.save();
  context.strokeStyle = lesson.trailColor;
  context.lineWidth = 5;
  context.lineCap = 'round';
  context.shadowColor = lesson.trailColor;
  context.shadowBlur = 6;
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();

  context.fillStyle = lesson.trailColor;
  context.shadowBlur = 0;
  context.beginPath();
  context.arc(toX, toY, 4, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export function wiggleSnail(dom) {
  dom.snailElement.classList.remove('snail-wiggle');
  window.requestAnimationFrame(() => {
    dom.snailElement.classList.add('snail-wiggle');
  });
}
