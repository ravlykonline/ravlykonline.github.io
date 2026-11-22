import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { describeGhost, describeHeading, describeTurtleStatus } from '../js/core/describe.js';
import { createTurtle } from '../js/domain/turtle.js';
import { getGhostSegments } from '../js/core/ghost.js';
import { lessons } from '../js/data/lessons.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

// ── Статус поля для екранного читача ───────────────────────────────────────────

runTest('describeHeading names the four directions and the diagonals in words', () => {
  assert.equal(describeHeading(0), 'вгору');
  assert.equal(describeHeading(90), 'праворуч');
  assert.equal(describeHeading(180), 'вниз');
  assert.equal(describeHeading(270), 'ліворуч');
  assert.equal(describeHeading(-90), 'ліворуч');
  assert.equal(describeHeading(450), 'праворуч');
  assert.equal(describeHeading(45), 'вгору й праворуч');
  assert.equal(describeHeading(225), 'вниз і ліворуч');
  assert.match(describeHeading(30), /30°/);
});

runTest('describeTurtleStatus reads like the spec sentence', () => {
  const turtle = createTurtle({ x: 50, y: -100, heading: 90 });
  assert.equal(describeTurtleStatus(turtle), 'Равлик у точці 50, -100, дивиться праворуч, олівець опущено');
  assert.match(describeTurtleStatus({ ...turtle, penDown: false }), /олівець піднято$/);
  assert.match(describeTurtleStatus({ ...turtle, x: 49.6 }), /у точці 50,/);
});

// ── Опис пунктирної фігури ─────────────────────────────────────────────────────

runTest('describeGhost is empty without a ghost and mentions the start otherwise', () => {
  assert.equal(describeGhost([], { x: 0, y: 0 }), '');
  const text = describeGhost([{ from: [0, 50], to: [0, -100], color: '#000', width: 4 }], { x: 0, y: 50 });
  assert.match(text, /Старт у точці 0, 50/);
  assert.match(text, /вгору на 150/);
});

runTest('describeGhost merges collinear steps and summarises complex shapes', () => {
  const square = [
    { from: [0, 0], to: [50, 0] }, { from: [50, 0], to: [100, 0] },
    { from: [100, 0], to: [100, 100] }, { from: [100, 100], to: [0, 100] }, { from: [0, 100], to: [0, 0] },
  ];
  const text = describeGhost(square, { x: 0, y: 0 });
  assert.match(text, /праворуч на 100; вниз на 100; ліворуч на 100; вгору на 100/);
  const many = Array.from({ length: 36 }, (_, i) => ({ from: [i, i % 2], to: [i + 1, (i + 1) % 2] }));
  assert.match(describeGhost(many, { x: 0, y: 0 }), /Складна фігура з 36 ліній/);
});

runTest('every level with a solution gets a non-empty ghost description without HTML', () => {
  for (const lesson of lessons) {
    const ghost = getGhostSegments(lesson);
    if (!lesson.solution) continue;
    const text = describeGhost(ghost, lesson.start);
    assert.ok(text.length > 20, `${lesson.id}: description exists`);
    assert.doesNotMatch(text, /[<>]/, `${lesson.id}: plain text`);
  }
});

// ── Контраст текстових пар (WCAG AA, ≥ 4.5:1) ──────────────────────────────────

const tokensCss = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');
const rootCss = tokensCss.split('body.blocks-pastel')[0];

function tokenValue(name) {
  const matches = [...rootCss.matchAll(new RegExp(`${name}:\\s*([^;]+);`, 'g'))];
  assert.ok(matches.length > 0, `token ${name} exists`);
  return matches.at(-1)[1].trim();
}

/** Колір токена як [r, g, b, a]; підтримує #rrggbb і rgba(r, g, b, a) / rgba(var(--x-rgb), a). */
function colorOf(value) {
  const text = value.startsWith('--') ? tokenValue(value) : value;
  const hex = text.match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    return [0, 2, 4].map((i) => Number.parseInt(hex[1].slice(i, i + 2), 16)).concat(1);
  }
  const viaVar = text.match(/^rgba\(var\((--[\w-]+)\),\s*([\d.]+)\)$/);
  if (viaVar) {
    const [r, g, b] = tokenValue(viaVar[1]).split(',').map((part) => Number(part));
    return [r, g, b, Number(viaVar[2])];
  }
  const plain = text.match(/^rgba?\(([^)]+)\)$/);
  assert.ok(plain, `cannot parse colour: ${text}`);
  const parts = plain[1].split(',').map((part) => Number(part));
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

function blend(top, bottom) {
  const alpha = top[3];
  return [0, 1, 2].map((i) => top[i] * alpha + bottom[i] * (1 - alpha)).concat(1);
}

function luminance([r, g, b]) {
  const [rl, gl, bl] = [r, g, b].map((value) => value / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrast(foreground, background) {
  const bg = blend(background, [255, 255, 255, 1]);
  const fg = blend(foreground, bg);
  const [light, dark] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** [назва, текст, тло, мінімум]. Усі токени з css/tokens.css. */
const TEXT_PAIRS = [
  ['основний текст на білому', '--color-text', '--color-surface'],
  ['основний текст на тлі сторінки #f0f8ff', '--color-text', '--color-page'],
  ['приглушений текст на білому', '--color-text-soft', '--color-surface'],
  ['приглушений текст на тлі сторінки', '--color-text-soft', '--color-page'],
  ['приглушений текст на панелі палітри', '--color-text-soft', '--color-primary-soft'],
  ['приглушений текст на тлі програми', '--color-text-soft', '--ws-bg'],
  ['підказка в слоті', '--ws-hint', '--ws-bg'],
  ['заголовки/бренд #4b0082 на білому (шапка, підвал, картки)', '--color-heading', '--color-surface'],
  ['заголовки на тлі сторінки', '--color-heading', '--color-page'],
  ['заголовки на лавандовій панелі (швидкість, кнопка історії)', '--color-heading', '--color-primary-soft'],
  ['білий на primary (Крок, активний рівень, вкладка)', '--color-on-solid', '--color-primary'],
  ['білий на primary hover', '--color-on-solid', '--color-primary-hover'],
  ['білий на success (Старт, пройдений рівень)', '--color-on-solid', '--color-success-solid'],
  ['білий на success hover', '--color-on-solid', '--color-success-solid-hover'],
  ['білий на info (Спочатку, Копіювати код)', '--color-on-solid', '--color-info'],
  ['білий на info hover', '--color-on-solid', '--color-info-hover'],
  ['білий на danger (Очистити)', '--color-on-solid', '--color-danger'],
  ['білий на danger hover', '--color-on-solid', '--color-danger-hover'],
  ['темний на warning (Стоп, значок зірок)', '--color-on-warning', '--color-warning'],
  ['темний на warning hover', '--color-on-warning', '--color-warning-hover'],
  ['текст поля в блоці', '--blk-field-text', '--blk-field-bg'],
  ['повідомлення про успіх у підвалі', '--color-feedback-ok', '--color-surface'],
  ['повідомлення про помилку в підвалі', '--color-feedback-error', '--color-surface'],
  ['код: звичайний текст', '--color-code-text', '--color-code-bg'],
  ['код: ключове слово', '--color-code-keyword', '--color-code-bg'],
  ['код: число', '--color-code-number', '--color-code-bg'],
  ['код: колір', '--color-code-color', '--color-code-bg'],
  ['код: коментар', '--color-code-comment', '--color-code-bg'],
  ['код: розділювач', '--color-code-punct', '--color-code-bg'],
];

runTest('main text/background token pairs meet WCAG AA (4.5:1)', () => {
  const failures = [];
  for (const [name, foreground, background] of TEXT_PAIRS) {
    const ratio = contrast(colorOf(foreground), colorOf(background));
    if (ratio < 4.5) failures.push(`${name}: ${ratio.toFixed(2)}:1 (${foreground} на ${background})`);
  }
  assert.deepEqual(failures, []);
});

runTest('dimmed code lines (setup block) still read at 4.5:1', () => {
  const css = readFileSync(new URL('../css/layout.css', import.meta.url), 'utf8');
  const opacity = Number(css.match(/\.code-line\.is-setup \.code-src\s*\{\s*opacity:\s*([\d.]+)/)?.[1] ?? 1);
  const panel = colorOf('--color-code-bg');
  for (const token of ['--color-code-text', '--color-code-keyword', '--color-code-number', '--color-code-color', '--color-code-comment']) {
    const [r, g, b] = colorOf(token);
    const dimmed = [r, g, b, opacity];
    assert.ok(contrast(dimmed, panel) >= 4.5, `${token} at opacity ${opacity}: ${contrast(dimmed, panel).toFixed(2)}`);
  }
});

runTest('graphics and focus indicators meet 3:1', () => {
  const canvasJs = readFileSync(new URL('../js/ui/canvas.js', import.meta.url), 'utf8');
  const ghost = canvasJs.match(/GHOST_COLOR = '(#[0-9a-fA-F]{6})'/)?.[1];
  assert.ok(ghost, 'ghost colour constant exists');
  assert.ok(contrast(colorOf(ghost), colorOf('--color-grid-background')) >= 3, 'ghost dashes vs field');
  assert.ok(contrast(colorOf('--color-focus-ring'), colorOf('--color-code-bg')) >= 3, 'focus ring vs dark code panel');
  assert.ok(contrast(colorOf('--color-focus-contrast'), colorOf('--color-surface')) >= 3, 'focus contrast vs white');
  assert.ok(contrast(colorOf('--color-focus-contrast'), colorOf('--color-page')) >= 3, 'focus contrast vs page');
});

// ── Розмітка: живий статус, фокус-пастки ───────────────────────────────────────

runTest('index.html has a live field status and traps focus in every modal', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="canvas-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /id="ghost-desc"/);
  assert.equal([...html.matchAll(/role="dialog" aria-modal="true"/g)].length, 3);
  const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  assert.match(main, /trapFocus\(dom\.introOverlay/);
  assert.match(main, /trapFocus\(dom\.resetConfirmOverlay/);
  assert.match(main, /trapFocus\(dom\.overlay/);
  assert.match(main, /element\.inert = open/);
});

runTest('touch-action: none is limited to blocks; the palette strip keeps horizontal panning', () => {
  const blocks = readFileSync(new URL('../css/blocks.css', import.meta.url), 'utf8');
  const responsive = readFileSync(new URL('../css/responsive.css', import.meta.url), 'utf8');
  for (const css of [blocks, responsive]) {
    for (const match of css.matchAll(/([^{}]+)\{[^}]*touch-action:\s*none/g)) {
      assert.match(match[1], /\.blk\b/, `touch-action: none outside blocks: ${match[1].trim()}`);
    }
  }
  assert.match(responsive, /\.blk-palette\s*\{[^}]*touch-action:\s*pan-x/);
});

runTest('editor chrome cannot be selected during a missed drag, but number inputs stay editable', () => {
  const css = readFileSync(new URL('../css/blocks.css', import.meta.url), 'utf8');
  assert.match(css, /#editor-panels\s*\{[^}]*user-select:\s*none/);
  assert.match(css, /input\.blk-field\s*\{[^}]*user-select:\s*text/);
});

// ── Палітра головного сайту й компактна шапка ──────────────────────────────────

runTest('tokens carry the main Ravlyk palette', () => {
  const expected = {
    '--color-page': '#f0f8ff',
    '--color-text': '#333333',
    '--color-heading': '#4b0082',
    '--color-primary': '#6a5acd',
    '--color-teal': '#00796b',
    '--color-tomato': '#ff6347',
    '--color-success': '#32cd32',
    '--color-success-hover': '#28a428',
    '--color-warning': '#ffb300',
    '--color-danger': '#c0392b',
    '--color-info': '#2f6fbf',
  };
  for (const [name, value] of Object.entries(expected)) assert.equal(tokenValue(name).toLowerCase(), value, name);
});

runTest('stylesheets use no gradients except the workspace dot pattern', () => {
  for (const file of ['base', 'layout', 'components', 'blocks', 'responsive', 'accessibility']) {
    const css = readFileSync(new URL(`../css/${file}.css`, import.meta.url), 'utf8');
    const gradients = css.match(/(?:linear|conic|repeating-[a-z]+)-gradient\(/g) ?? [];
    assert.deepEqual(gradients, [], `${file}.css`);
  }
  const blocks = readFileSync(new URL('../css/blocks.css', import.meta.url), 'utf8');
  assert.equal([...blocks.matchAll(/radial-gradient\(/g)].length, 1, 'only the dot grid');
});

runTest('the header is one light row: no chapter titles, chapter name lives in each dot label', () => {
  const layout = readFileSync(new URL('../css/layout.css', import.meta.url), 'utf8');
  assert.match(layout, /#hdr\s*\{[^}]*height:\s*var\(--size-header\)/);
  assert.match(layout, /#hdr\s*\{[^}]*background:\s*var\(--color-surface\)/);
  assert.match(layout, /\.lesson-chapter-title\s*\{\s*display:\s*none/);
  const px = Number.parseFloat(tokenValue('--size-header')) * 16;
  assert.ok(px >= 52 && px <= 56, `header height ${px}px`);
  const render = readFileSync(new URL('../js/ui/render.js', import.meta.url), 'utf8');
  assert.match(render, /Рівень \$\{index \+ 1\} — \$\{lesson\.chapter\}:/);
});
