import {
  FIELD_HALF_HEIGHT,
  FIELD_HALF_WIDTH,
  GRID_HEIGHT,
  GRID_STEP,
  GRID_WIDTH,
  SNAIL_SIZE,
} from '../core/constants.js';
import { avatarSvg, snailSvg } from './icons.js';

// Початок логічних координат (0, 0) — центр полотна.
export const TURTLE_ORIGIN_X = GRID_WIDTH / 2;
export const TURTLE_ORIGIN_Y = GRID_HEIGHT / 2;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Safely parse an SVG string into a DOM element via DOMParser (avoids innerHTML). */
function parseSvg(svgString) {
  return new DOMParser().parseFromString(svgString, 'image/svg+xml').documentElement;
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function ensureGuideLayer(gridSvg) {
  let guideLayer = gridSvg.querySelector('[data-guide-layer]');
  if (!guideLayer) {
    guideLayer = svgElement('g', {
      'data-guide-layer': 'true',
      transform: `translate(${TURTLE_ORIGIN_X} ${TURTLE_ORIGIN_Y})`,
    });
    gridSvg.appendChild(guideLayer);
  }
  return guideLayer;
}

export function setupCanvas(dom) {
  const { gridSvg, trailCanvas, snailElement, avatarBox } = dom;

  gridSvg.setAttribute('width', GRID_WIDTH);
  gridSvg.setAttribute('height', GRID_HEIGHT);
  gridSvg.setAttribute('viewBox', `0 0 ${GRID_WIDTH} ${GRID_HEIGHT}`);
  gridSvg.appendChild(svgElement('rect', {
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    fill: 'var(--color-grid-background)',
  }));
  ensureGuideLayer(gridSvg);

  trailCanvas.width = GRID_WIDTH;
  trailCanvas.height = GRID_HEIGHT;
  snailElement.style.width = `${SNAIL_SIZE}px`;
  snailElement.style.height = `${SNAIL_SIZE}px`;
  snailElement.replaceChildren(parseSvg(snailSvg));
  avatarBox.replaceChildren(parseSvg(avatarSvg));
}

/** Малює межі поля, сітку (якщо `lesson.showGrid`) і ghost-фігуру (пунктир). */
export function renderLessonGuide(dom, lesson, ghostSegments = []) {
  const guideLayer = ensureGuideLayer(dom.gridSvg);
  guideLayer.replaceChildren();

  guideLayer.appendChild(svgElement('rect', {
    x: -FIELD_HALF_WIDTH,
    y: -FIELD_HALF_HEIGHT,
    width: FIELD_HALF_WIDTH * 2,
    height: FIELD_HALF_HEIGHT * 2,
    fill: 'none',
    stroke: 'var(--color-grid-line)',
    'stroke-width': 2,
  }));

  if (lesson.showGrid) {
    for (let x = -FIELD_HALF_WIDTH + GRID_STEP; x < FIELD_HALF_WIDTH; x += GRID_STEP) {
      guideLayer.appendChild(svgElement('line', {
        x1: x, y1: -FIELD_HALF_HEIGHT, x2: x, y2: FIELD_HALF_HEIGHT,
        stroke: 'var(--color-grid-line)', 'stroke-width': 1,
      }));
    }
    for (let y = -FIELD_HALF_HEIGHT + GRID_STEP; y < FIELD_HALF_HEIGHT; y += GRID_STEP) {
      guideLayer.appendChild(svgElement('line', {
        x1: -FIELD_HALF_WIDTH, y1: y, x2: FIELD_HALF_WIDTH, y2: y,
        stroke: 'var(--color-grid-line)', 'stroke-width': 1,
      }));
    }
  }

  for (const segment of ghostSegments) {
    guideLayer.appendChild(svgElement('line', {
      x1: segment.from[0], y1: segment.from[1], x2: segment.to[0], y2: segment.to[1],
      stroke: 'rgba(110, 90, 140, 0.45)',
      'stroke-width': 6,
      'stroke-linecap': 'round',
      'stroke-dasharray': '10 12',
    }));
  }
}

export function clearTurtleCanvas(dom) {
  dom.trailCanvas.getContext('2d').clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
}

/**
 * Positions and rotates the snail element at a turtle's canvas coordinates.
 * heading: 0=up, 90=right, 180=down, 270=left.
 * CSS rotation: heading - 90  (because snail head faces RIGHT at 0°)
 */
export function placeTurtleSnail(dom, turtle) {
  const cx = TURTLE_ORIGIN_X + turtle.x;
  const cy = TURTLE_ORIGIN_Y + turtle.y;
  dom.snailElement.style.left = `${cx - SNAIL_SIZE / 2}px`;
  dom.snailElement.style.top = `${cy - SNAIL_SIZE / 2}px`;
  dom.snailElement.style.transform = `rotate(${turtle.heading - 90}deg)`;
}

/** Draws a line segment. segment = { from: [x, y], to: [x, y], color (hex), width } */
export function drawTurtleSegment(dom, segment) {
  const ctx = dom.trailCanvas.getContext('2d');
  ctx.save();
  ctx.strokeStyle = segment.color;
  ctx.lineWidth = segment.width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(TURTLE_ORIGIN_X + segment.from[0], TURTLE_ORIGIN_Y + segment.from[1]);
  ctx.lineTo(TURTLE_ORIGIN_X + segment.to[0], TURTLE_ORIGIN_Y + segment.to[1]);
  ctx.stroke();
  ctx.restore();
}

export function wiggleSnail(dom) {
  dom.snailElement.classList.remove('snail-wiggle');
  window.requestAnimationFrame(() => {
    dom.snailElement.classList.add('snail-wiggle');
  });
}
