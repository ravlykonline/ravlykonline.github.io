import { CELL_SIZE, GRID_HEIGHT, GRID_WIDTH, SNAIL_SIZE, directionRotation } from '../core/constants.js';

export const TURTLE_ORIGIN_X = GRID_WIDTH / 2;
export const TURTLE_ORIGIN_Y = GRID_HEIGHT / 2;
import { cellToGridIntersection } from '../core/engine.js';
import { avatarSvg, snailSvg } from './icons.js';

function ensureGuideLayer(gridSvg) {
  let guideLayer = gridSvg.querySelector('[data-guide-layer]');
  if (!guideLayer) {
    guideLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    guideLayer.setAttribute('data-guide-layer', 'true');
    gridSvg.appendChild(guideLayer);
  }

  return guideLayer;
}

function getBrushElement(dom) {
  return dom.snailElement.querySelector('[data-brush]');
}

export function getLessonGuidePoints(lesson) {
  const mode = lesson?.success?.mode;
  if (mode !== 'path-match' && mode !== 'exact-path') {
    return [];
  }

  return [lesson.start, ...lesson.success.goal.map(([x, y]) => ({ x, y }))];
}

export function getSnailScreenPosition(snail) {
  return {
    left: cellToGridIntersection(snail.x) - (SNAIL_SIZE / 2),
    top: cellToGridIntersection(snail.y) - (SNAIL_SIZE / 2),
  };
}

export function getBrushTransform(direction) {
  return `rotate(${directionRotation[direction] ?? 0} 36 36)`;
}

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

  ensureGuideLayer(gridSvg);

  trailCanvas.width = GRID_WIDTH;
  trailCanvas.height = GRID_HEIGHT;
  snailElement.style.width = `${SNAIL_SIZE}px`;
  snailElement.style.height = `${SNAIL_SIZE}px`;
  snailElement.innerHTML = snailSvg;
  avatarBox.innerHTML = avatarSvg;
}

export function renderLessonGuide(dom, lesson) {
  const guideLayer = ensureGuideLayer(dom.gridSvg);
  guideLayer.innerHTML = '';

  const points = getLessonGuidePoints(lesson);
  if (points.length < 2) {
    return;
  }

  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', 'rgba(123, 79, 46, 0.22)');
  polyline.setAttribute('stroke-width', '6');
  polyline.setAttribute('stroke-linecap', 'round');
  polyline.setAttribute('stroke-linejoin', 'round');
  polyline.setAttribute('stroke-dasharray', '10 12');
  polyline.setAttribute(
    'points',
    points.map(({ x, y }) => `${cellToGridIntersection(x)},${cellToGridIntersection(y)}`).join(' '),
  );
  guideLayer.appendChild(polyline);

  points.slice(1).forEach(({ x, y }) => {
    const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    point.setAttribute('cx', cellToGridIntersection(x));
    point.setAttribute('cy', cellToGridIntersection(y));
    point.setAttribute('r', '4.5');
    point.setAttribute('fill', 'rgba(123, 79, 46, 0.24)');
    guideLayer.appendChild(point);
  });
}

export function clearTrail(dom) {
  const context = dom.trailCanvas.getContext('2d');
  context.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
}

export function placeSnail(dom, snail, immediate = false) {
  if (immediate) {
    dom.snailElement.style.transition = 'none';
  }

  const { left, top } = getSnailScreenPosition(snail);
  dom.snailElement.style.left = `${left}px`;
  dom.snailElement.style.top = `${top}px`;

  const brush = getBrushElement(dom);
  if (brush) {
    brush.setAttribute('transform', getBrushTransform(snail.dir));
  }

  if (immediate) {
    window.requestAnimationFrame(() => {
      dom.snailElement.style.transition = '';
    });
  }
}

export function drawTrail(dom, lesson, from, to) {
  const context = dom.trailCanvas.getContext('2d');
  const fromX = cellToGridIntersection(from.x);
  const fromY = cellToGridIntersection(from.y);
  const toX = cellToGridIntersection(to.x);
  const toY = cellToGridIntersection(to.y);

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
  context.arc(toX, toY, 4.5, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

// ── Turtle mode ──────────────────────────────────────────────────────────────

export function setupTurtleMode(dom) {
  // visibility:hidden keeps layout so canvas (position:absolute) stays in flow
  dom.gridSvg.style.visibility = 'hidden';
  dom.snailElement.style.visibility = 'hidden';
  dom.trailCanvas.width = GRID_WIDTH;
  dom.trailCanvas.height = GRID_HEIGHT;
  clearTurtleCanvas(dom);
}

export function teardownTurtleMode(dom) {
  dom.gridSvg.style.visibility = '';
  dom.snailElement.style.visibility = '';
}

export function clearTurtleCanvas(dom) {
  const ctx = dom.trailCanvas.getContext('2d');
  ctx.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
}

/**
 * Draws ghost (expected) segments in a translucent grey dashed style.
 * goalSegments = [{from:[x,y], to:[x,y]}, ...]  (pixel coords relative to center)
 */
export function renderTurtleGuide(dom, goalSegments) {
  if (!goalSegments || goalSegments.length === 0) return;
  const ctx = dom.trailCanvas.getContext('2d');

  ctx.save();
  ctx.strokeStyle = 'rgba(130, 100, 200, 0.28)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.setLineDash([12, 10]);

  for (const seg of goalSegments) {
    ctx.beginPath();
    ctx.moveTo(TURTLE_ORIGIN_X + seg.from[0], TURTLE_ORIGIN_Y + seg.from[1]);
    ctx.lineTo(TURTLE_ORIGIN_X + seg.to[0], TURTLE_ORIGIN_Y + seg.to[1]);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws a line segment. segment = { from: [x, y], to: [x, y], color, width }
 * Coordinates are in pixels relative to center.
 */
export function drawTurtleSegment(dom, segment) {
  const ctx = dom.trailCanvas.getContext('2d');
  const fx = TURTLE_ORIGIN_X + segment.from[0];
  const fy = TURTLE_ORIGIN_Y + segment.from[1];
  const tx = TURTLE_ORIGIN_X + segment.to[0];
  const ty = TURTLE_ORIGIN_Y + segment.to[1];

  ctx.save();
  ctx.strokeStyle = segment.color;
  ctx.lineWidth = segment.width;
  ctx.lineCap = 'round';
  ctx.shadowColor = segment.color;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders the turtle indicator (small triangle) at turtle's position + heading.
 * Redraws all segments + indicator on each call.
 */
export function renderTurtle(dom, turtle, segments, goalSegments = null) {
  clearTurtleCanvas(dom);

  // ghost guide below user segments
  if (goalSegments) renderTurtleGuide(dom, goalSegments);

  for (const seg of segments) {
    drawTurtleSegment(dom, seg);
  }

  const ctx = dom.trailCanvas.getContext('2d');
  const px = TURTLE_ORIGIN_X + turtle.x;
  const py = TURTLE_ORIGIN_Y + turtle.y;
  const rad = (turtle.heading - 90) * (Math.PI / 180);
  const size = 16;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rad);
  // body
  ctx.fillStyle = '#1a9080';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.65, size * 0.65);
  ctx.lineTo(-size * 0.65, size * 0.65);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // head dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -size + 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function wiggleSnail(dom) {
  dom.snailElement.classList.remove('snail-wiggle');
  window.requestAnimationFrame(() => {
    dom.snailElement.classList.add('snail-wiggle');
  });
}
