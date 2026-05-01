const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createElement(rect) {
  return {
    style: {},
    getBoundingClientRect() {
      return rect;
    }
  };
}

test('renderSnail positions the snail relative to the board wrapper', async () => {
  const { createRenderSnail } = await importModule('js/ui/renderSnail.js');
  const gwrap = createElement({ left: 10, top: 20 });
  const snailEl = createElement({});
  const cell = createElement({ left: 42, top: 68, width: 50, height: 40 });
  const renderer = createRenderSnail({
    cellEl: () => cell,
    getSnailFacing: () => 'left',
    gwrap,
    snailEl,
    windowRef: {}
  });

  renderer.posSnail(1, 2, false);

  assert.equal(snailEl.style.width, '50px');
  assert.equal(snailEl.style.height, '40px');
  assert.equal(snailEl.style.fontSize, '26px');
  assert.equal(snailEl.style.transform, 'translate(32px,48px) scaleX(-1)');
  assert.equal(snailEl.style.transition, '');
});

test('renderSnail bump uses animation when motion is allowed', async () => {
  const { createRenderSnail } = await importModule('js/ui/renderSnail.js');
  const frames = [];
  const gwrap = createElement({ left: 0, top: 0 });
  const cell = createElement({ left: 5, top: 8, width: 50, height: 40 });
  const snailEl = createElement({});
  snailEl.animate = (nextFrames) => {
    frames.push(nextFrames);
    return { finished: Promise.resolve() };
  };

  const renderer = createRenderSnail({
    cellEl: () => cell,
    getSnailFacing: () => 'down',
    gwrap,
    snailEl,
    windowRef: {
      matchMedia() {
        return { matches: false };
      }
    }
  });

  await renderer.bumpSnail(0, 0);

  assert.equal(frames.length, 1);
  assert.equal(frames[0][0].transform, 'translate(5px,8px) rotate(90deg)');
  assert.equal(frames[0][1].transform, 'translate(5px,15px) rotate(90deg)');
  assert.equal(snailEl.style.transform, 'translate(5px,8px) rotate(90deg)');
});

test('renderSnail module stays independent from storage and global app state', () => {
  const source = fs.readFileSync(path.join(root, 'js/ui/renderSnail.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
});
