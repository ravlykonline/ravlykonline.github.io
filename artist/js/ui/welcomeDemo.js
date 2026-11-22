/**
 * Жива ілюстрація вітального екрана: равлик малює будиночок за пунктиром.
 * Та сама модель, що й у грі: кроки дає runSteps, рух — interpolateTurtle,
 * равлик тримається із зовнішнього боку будиночка. Без innerHTML.
 */
import { withIds } from '../core/blockTree.js';
import { WELCOME_DEMO, welcomeDemoBlocks } from '../core/welcome.js';
import { getSnailTransform, getStepDuration, interpolateTurtle, SNAIL_SPRITE_RADIUS } from '../domain/snail.js';
import { runSteps } from '../runtime/runner.js';
import { GHOST_COLOR } from './canvas.js';
import { snailSvg } from './icons.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEMO_SPEED_FACTOR = 1.3;
const START_PAUSE_MS = 450;
const SPRITE_SCALE = 0.7;
const VIEW_PADDING = SNAIL_SPRITE_RADIUS * SPRITE_SCALE + 5;

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function lineAttributes(segment) {
  return { x1: segment.from[0], y1: segment.from[1], x2: segment.to[0], y2: segment.to[1] };
}

function fitView(svg, start, steps) {
  const poses = [start, ...steps.map(({ after }) => after)];
  const x = poses.map((pose) => pose.x);
  const y = poses.map((pose) => pose.y);
  const left = Math.min(...x);
  const top = Math.min(...y);
  const width = Math.max(...x) - left;
  const height = Math.max(...y) - top;
  const size = Math.max(width, height) + 2 * VIEW_PADDING;
  svg.setAttribute('viewBox', `${left + (width - size) / 2} ${top + (height - size) / 2} ${size} ${size}`);
}

/**
 * @param {SVGSVGElement} svg порожній <svg>
 * @param {{ reducedMotion: () => boolean }} options
 * @returns {{ start(): void, stop(): void }}
 */
export function createWelcomeDemo(svg, { reducedMotion }) {
  const blocks = withIds(welcomeDemoBlocks());
  const steps = [...runSteps(blocks, WELCOME_DEMO)];
  const start = steps[0].before;
  fitView(svg, start, steps);

  const ghostLayer = svgElement('g');
  for (const { segment } of steps) {
    if (!segment) continue;
    ghostLayer.appendChild(svgElement('line', {
      ...lineAttributes(segment),
      stroke: GHOST_COLOR,
      'stroke-width': 4,
      'stroke-linecap': 'round',
      'stroke-dasharray': '7 9',
    }));
  }
  const trailLayer = svgElement('g');
  const snail = svgElement('g');
  const sprite = svgElement('g', { transform: `scale(${-SPRITE_SCALE} ${SPRITE_SCALE})` });
  const parsed = new DOMParser().parseFromString(snailSvg, 'image/svg+xml').documentElement;
  for (const child of parsed.children) sprite.appendChild(document.importNode(child, true));
  sprite.querySelector('[data-pen-tip]')?.setAttribute('fill', start.color);
  snail.appendChild(sprite);
  svg.replaceChildren(ghostLayer, trailLayer, snail);

  let frame = 0;
  let running = false;

  function place(turtle) {
    snail.setAttribute('transform', getSnailTransform(turtle));
  }

  function addLine(segment, to = segment.to) {
    const line = svgElement('line', {
      ...lineAttributes({ from: segment.from, to }),
      stroke: segment.color,
      'stroke-width': segment.width,
      'stroke-linecap': 'round',
    });
    trailLayer.appendChild(line);
    return line;
  }

  function drawStill() {
    trailLayer.replaceChildren();
    for (const step of steps) if (step.segment) addLine(step.segment);
    place(steps.at(-1).after);
  }

  /** Розклад: [{ step, startsAt, duration }] і загальна тривалість одного проходу. */
  function schedule() {
    let time = START_PAUSE_MS;
    const plan = steps.map((step) => {
      const duration = getStepDuration(step.before, step.after, DEMO_SPEED_FACTOR);
      const item = { step, startsAt: time, duration };
      time += duration;
      return item;
    });
    return { plan, total: time };
  }

  function animate() {
    const { plan, total } = schedule();
    let startTime = null;
    let index = -1;
    let line = null;

    function tick(now) {
      if (!running) return;
      startTime ??= now;
      const elapsed = now - startTime;

      // Доводимо до кінця кроки, час яких минув, і починаємо поточний.
      while (index + 1 < plan.length && elapsed >= plan[index + 1].startsAt) {
        if (line) {
          const [x, y] = plan[index].step.segment.to;
          line.setAttribute('x2', x);
          line.setAttribute('y2', y);
        }
        index += 1;
        const { step } = plan[index];
        line = step.segment ? addLine(step.segment, step.segment.from) : null;
      }

      if (index >= 0) {
        const { step, startsAt, duration } = plan[index];
        const turtle = interpolateTurtle(step.before, step.after, (elapsed - startsAt) / duration);
        place(turtle);
        if (line) {
          line.setAttribute('x2', turtle.x);
          line.setAttribute('y2', turtle.y);
        }
      }
      running = elapsed < total;
      if (running) frame = window.requestAnimationFrame(tick);
    }

    trailLayer.replaceChildren();
    place(start);
    frame = window.requestAnimationFrame(tick);
  }

  return {
    start() {
      if (running) return;
      if (reducedMotion()) {
        drawStill();
        return;
      }
      running = true;
      animate();
    },
    stop() {
      running = false;
      window.cancelAnimationFrame(frame);
    },
  };
}
