import { FIELD_HALF_HEIGHT, FIELD_HALF_WIDTH, GRID_STEP } from '../core/constants.js';
import { chooseSnailSide, getSnailTransform } from '../domain/snail.js';
import { getStepMarks, shouldColorGhost, shouldShowStepMarks } from '../core/ghost.js';
import { avatarSvg, snailSvg } from './icons.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GHOST_COLOR = '#7d7790';

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

/** Розбирає валідний SVG-рядок (без innerHTML). */
function parseSvg(svgString) {
  return new DOMParser().parseFromString(svgString, 'image/svg+xml').documentElement;
}

export function setupCanvas(dom) {
  const { gridSvg, snailElement, avatarBox } = dom;

  gridSvg.setAttribute('viewBox', `${-FIELD_HALF_WIDTH} ${-FIELD_HALF_HEIGHT} ${FIELD_HALF_WIDTH * 2} ${FIELD_HALF_HEIGHT * 2}`);
  gridSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  dom.fieldBackground.setAttribute('x', -FIELD_HALF_WIDTH);
  dom.fieldBackground.setAttribute('y', -FIELD_HALF_HEIGHT);
  dom.fieldBackground.setAttribute('width', FIELD_HALF_WIDTH * 2);
  dom.fieldBackground.setAttribute('height', FIELD_HALF_HEIGHT * 2);

  // Поворот належить зовнішній групі, віддзеркалення — групі з позою.
  const anchor = svgElement('circle', { 'data-pen-position': 'true', r: 2.5, fill: GHOST_COLOR });
  const sprite = svgElement('g');
  for (const child of parseSvg(snailSvg).children) sprite.appendChild(document.importNode(child, true));
  snailElement.replaceChildren(anchor, sprite);
  dom.snailSprite = sprite;
  dom.snailTip = sprite.querySelector('[data-pen-tip]');

  avatarBox.replaceChildren(parseSvg(avatarSvg));
}

function appendArrow(layer, x, y, heading) {
  const group = svgElement('g', { transform: `translate(${x} ${y}) rotate(${heading})`, opacity: 0.55 });
  group.appendChild(svgElement('path', {
    d: 'M0 11 L5 21 L-5 21 Z',
    fill: GHOST_COLOR,
    stroke: 'none',
  }));
  layer.appendChild(group);
}

/** Малює межі поля, сітку (якщо `lesson.showGrid`) і ghost-фігуру (пунктир, старт, стрілка). */
export function renderLessonGuide(dom, lesson, ghostSegments = []) {
  const guideLayer = dom.guideLayer;
  guideLayer.replaceChildren();
  dom.ghostSegments = ghostSegments;

  guideLayer.appendChild(svgElement('rect', {
    x: -FIELD_HALF_WIDTH + 1,
    y: -FIELD_HALF_HEIGHT + 1,
    width: FIELD_HALF_WIDTH * 2 - 2,
    height: FIELD_HALF_HEIGHT * 2 - 2,
    fill: 'none',
    stroke: 'var(--color-grid-line)',
    'stroke-width': 2,
  }));

  // showGrid: true — звичайна сітка, 'faint' — ледь помітна (розділ «Числа і кути»).
  const gridOpacity = lesson.showGrid === 'faint' ? 0.4 : 1;
  if (lesson.showGrid) {
    for (let x = -FIELD_HALF_WIDTH + GRID_STEP; x < FIELD_HALF_WIDTH; x += GRID_STEP) {
      guideLayer.appendChild(svgElement('line', {
        x1: x, y1: -FIELD_HALF_HEIGHT, x2: x, y2: FIELD_HALF_HEIGHT,
        stroke: 'var(--color-grid-line)', 'stroke-width': 1, opacity: gridOpacity,
      }));
    }
    for (let y = -FIELD_HALF_HEIGHT + GRID_STEP; y < FIELD_HALF_HEIGHT; y += GRID_STEP) {
      guideLayer.appendChild(svgElement('line', {
        x1: -FIELD_HALF_WIDTH, y1: y, x2: FIELD_HALF_WIDTH, y2: y,
        stroke: 'var(--color-grid-line)', 'stroke-width': 1, opacity: gridOpacity,
      }));
    }
  }

  // На кольорових рівнях риски пунктиру мають колір лінії; сіра облямівка
  // під ними тримає контраст навіть для жовтого на світлому полі.
  const colored = shouldColorGhost(lesson);
  for (const segment of ghostSegments) {
    const coords = { x1: segment.from[0], y1: segment.from[1], x2: segment.to[0], y2: segment.to[1] };
    if (colored) {
      guideLayer.appendChild(svgElement('line', {
        ...coords,
        stroke: GHOST_COLOR,
        'stroke-width': 8,
        'stroke-linecap': 'round',
        'stroke-dasharray': '9 11',
        opacity: 0.5,
      }));
    }
    guideLayer.appendChild(svgElement('line', {
      ...coords,
      stroke: colored ? segment.color : GHOST_COLOR,
      'stroke-width': 5,
      'stroke-linecap': 'round',
      'stroke-dasharray': '9 11',
      ...(colored ? { 'data-ghost-color': segment.color } : {}),
    }));
  }

  // Крапка в кінці кожного кроку: видно, скільки «кроків вперед» у лінії.
  if (shouldShowStepMarks(lesson)) {
    for (const [cx, cy] of getStepMarks(ghostSegments)) {
      guideLayer.appendChild(svgElement('circle', { cx, cy, r: 4.5, fill: GHOST_COLOR }));
    }
  }

  if (ghostSegments.length > 0) {
    const sx = lesson.start?.x ?? 0;
    const sy = lesson.start?.y ?? 0;
    // Позначка старту лежить у шарі ghost — під слідом і під равликом, ледь помітна.
    guideLayer.appendChild(svgElement('circle', {
      cx: sx, cy: sy, r: 6, fill: 'none', stroke: GHOST_COLOR, 'stroke-width': 2, opacity: 0.6,
    }));
    appendArrow(guideLayer, sx, sy, lesson.start?.heading ?? 0);
  }
}

export function clearTurtleCanvas(dom) {
  dom.trailLayer.replaceChildren();
  dom.snailSide = 1;
}

export function selectTurtlePose(dom, before, after, trail = []) {
  dom.snailSide = chooseSnailSide(before, after, [dom.ghostSegments, trail], dom.snailSide);
  dom.snailSprite.setAttribute('transform', `scale(${dom.snailSide} 1)`);
}

/** Ставить равлика в позицію й кут черепахи; колір і піднятість олівця — з її стану. */
export function placeTurtleSnail(dom, turtle) {
  dom.snailElement.setAttribute('transform', getSnailTransform(turtle));
  dom.snailTip.setAttribute('fill', turtle.color);
  dom.snailElement.classList.toggle('pen-up', !turtle.penDown);
}

/** Окремий значок равлика (для модалок) без innerHTML. */
export function buildSnailIcon() {
  return document.importNode(parseSvg(snailSvg), true);
}

/** Додає в слід лінію (повертає її, щоб анімація могла дотягувати кінець). */
export function addTrailSegment(dom, segment) {
  const line = svgElement('line', {
    x1: segment.from[0], y1: segment.from[1], x2: segment.to[0], y2: segment.to[1],
    stroke: segment.color,
    'stroke-width': segment.width,
    'stroke-linecap': 'round',
  });
  dom.trailLayer.appendChild(line);
  return line;
}

/** Миттєво малює відрізок цілком. */
export function drawTurtleSegment(dom, segment) {
  return addTrailSegment(dom, segment);
}

export function setTrailEnd(line, x, y) {
  line.setAttribute('x2', String(x));
  line.setAttribute('y2', String(y));
}

export function wiggleSnail(dom) {
  const target = dom.snailElement.querySelector('[data-snail-wiggle]');
  if (!target) return;
  target.classList.remove('snail-wiggle');
  window.requestAnimationFrame(() => target.classList.add('snail-wiggle'));
}
