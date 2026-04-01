const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { root } = require('./testHelpers.cjs');

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.dataset = {};
    this.eventListeners = new Map();
    this.className = '';
    this.id = '';
    this.type = '';
    this.disabled = false;
    this.hidden = false;
    this.tabIndex = undefined;
    this._textContent = '';
  }

  get textContent() {
    if (this.children.length) {
      return this.children.map((child) => child.textContent).join('');
    }
    return this._textContent;
  }

  set textContent(value) {
    this.children = [];
    this._textContent = String(value);
  }

  get isConnected() {
    let current = this;
    while (current) {
      if (current === this.ownerDocument.body) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  }

  get classList() {
    return {
      contains: (name) => this.className.split(/\s+/).filter(Boolean).includes(name)
    };
  }

  setAttribute(name, value) {
    const normalized = String(value);
    this.attributes.set(name, normalized);
    if (name === 'id') {
      this.id = normalized;
    }
    if (name === 'class') {
      this.className = normalized;
    }
    if (name === 'type') {
      this.type = normalized;
    }
    if (name === 'tabindex') {
      this.tabIndex = Number(normalized);
    }
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      this.dataset[key] = normalized;
    }
  }

  getAttribute(name) {
    if (name === 'id') return this.id || null;
    if (name === 'class') return this.className || null;
    if (name === 'type') return this.type || null;
    if (name === 'tabindex') return this.tabIndex == null ? null : String(this.tabIndex);
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  appendChild(child) {
    if (typeof child === 'string') {
      const textNode = new FakeElement('#text', this.ownerDocument);
      textNode.textContent = child;
      child = textNode;
    }
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  append(...nodes) {
    nodes.forEach((node) => this.appendChild(node));
  }

  remove() {
    if (!this.parentNode) {
      return;
    }
    const siblings = this.parentNode.children;
    const index = siblings.indexOf(this);
    if (index >= 0) {
      siblings.splice(index, 1);
    }
    this.parentNode = null;
  }

  addEventListener(type, listener) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type).push(listener);
  }

  removeEventListener(type, listener) {
    if (!this.eventListeners.has(type)) {
      return;
    }
    const listeners = this.eventListeners.get(type);
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  }

  dispatchEvent(event) {
    event.target = event.target || this;
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach((listener) => listener(event));
  }

  click() {
    this.dispatchEvent({ type: 'click', preventDefault() {} });
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(',').map((item) => item.trim()).filter(Boolean);
    const results = [];
    const visit = (node) => {
      node.children.forEach((child) => {
        if (selectors.some((item) => matchesSelector(child, item))) {
          results.push(child);
        }
        visit(child);
      });
    };
    visit(this);
    return results;
  }
}

function matchesSelector(node, selector) {
  if (selector.startsWith('#')) {
    return node.id === selector.slice(1);
  }
  if (selector.startsWith('.')) {
    return node.className.split(/\s+/).filter(Boolean).includes(selector.slice(1));
  }
  if (selector === 'button') {
    return node.tagName === 'BUTTON';
  }
  if (selector === '[href]') {
    return node.getAttribute('href') != null;
  }
  if (selector === 'input') {
    return node.tagName === 'INPUT';
  }
  if (selector === 'select') {
    return node.tagName === 'SELECT';
  }
  if (selector === 'textarea') {
    return node.tagName === 'TEXTAREA';
  }
  if (selector === '[tabindex]:not([tabindex="-1"])') {
    const value = node.getAttribute('tabindex');
    return value != null && value !== '-1';
  }
  return false;
}

function createDocument() {
  const document = {
    activeElement: null,
    body: null,
    createElement(tagName) {
      return new FakeElement(tagName, document);
    },
    contains(node) {
      let current = node;
      while (current) {
        if (current === document.body) {
          return true;
        }
        current = current.parentNode;
      }
      return false;
    }
  };
  document.body = new FakeElement('body', document);
  return document;
}

function createModalHarness(options = {}) {
  const document = createDocument();
  const context = {
    window: {},
    document,
    console,
    requestAnimationFrame(fn) {
      fn();
    },
    HTMLElement: FakeElement
  };
  context.window = context;
  context.SnailGame = {
    state: {
      running: false,
      completedLevelIds: options.completedLevelIds || [],
      currentLevel: options.currentLevel || {
        id: 2,
        type: 'normal',
        name: '?????? 2',
        goal: '????? ?? ??????',
        hint: '?????? ???????'
      }
    },
    levels: options.levels || [
      { id: 1, name: '?????? 1' },
      { id: 2, name: '?????? 2' },
      { id: 3, name: '?????? 3' }
    ],
    engine: {
      clearAllCalls: 0,
      clearAll() {
        this.clearAllCalls += 1;
      }
    },
    hasNextLevel() {
      return this.state.currentLevel.id < this.levels.length;
    },
    getNextLevelId() {
      return this.state.currentLevel.id + 1;
    },
    setCurrentLevelCalls: [],
    setCurrentLevel(levelId) {
      this.setCurrentLevelCalls.push(levelId);
      const nextLevel = this.levels.find((level) => level.id === levelId);
      if (!nextLevel) {
        return false;
      }
      this.state.currentLevel = { ...this.state.currentLevel, ...nextLevel };
      return true;
    },
    restartProgressCalls: 0,
    restartProgress() {
      this.restartProgressCalls += 1;
    }
  };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(root, 'js/uiModals.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'js/uiModals.js' });

  const calls = {
    loadCurrentLevel: [],
    speakCurrentTask: 0,
    stopTaskSpeech: 0
  };

  const modalApi = context.SnailGame.createUiModals({
    loadCurrentLevel(args) {
      calls.loadCurrentLevel.push(args);
    },
    refs: {
      levelChipEl: { textContent: options.levelChipText || '?????? 2' }
    },
    speakCurrentTask() {
      calls.speakCurrentTask += 1;
    },
    stopTaskSpeech() {
      calls.stopTaskSpeech += 1;
    },
    text: {
      ui: {
        mapClose: '???????',
        tryAgainTitle: '??????? ?? ???',
        tryAgainBody: '??????? ?? ?????????.',
        tryAgainTurns: '??????? ????????.',
        tryAgainAction: '?????',
        clearConfirmTitle: '?????????',
        clearConfirmBody: '??? ??????? ???? ????????.',
        clearConfirmAction: '????????',
        taskLabel: '?? ??????',
        listenTask: '???????? ????????',
        startAction: '??????',
        debugNote: '????? ?????????',
        mapTitle: '???? ??????',
        mapBody: '??????? ??????',
        alreadySolvedTitle: '??? ????????',
        alreadySolvedBody: '????? ??????? ????.'
      },
      mode(isDebug) {
        return isDebug ? '????????????' : '?????????';
      },
      mapState(isCurrent, isDone) {
        if (isCurrent) return '????????';
        if (isDone) return '????????';
        return '?? ??';
      },
      winAction(hasNext) {
        return hasNext ? '????' : '????????';
      },
      winTitle(isFinalWin) {
        return isFinalWin ? '??? ????? ????????' : '????????';
      },
      winBody(isFinalWin) {
        return isFinalWin ? '??? ?????? ????????.' : '?????? ????????.';
      }
    }
  });

  const trigger = document.createElement('button');
  trigger.id = 'trigger';
  document.body.appendChild(trigger);
  trigger.focus();

  return {
    app: context.SnailGame,
    calls,
    document,
    modalApi
  };
}

test('openLevelIntro renders controls, speaks task and closes cleanly', () => {
  const harness = createModalHarness({
    currentLevel: {
      id: 2,
      type: 'normal',
      name: '?????? 2',
      goal: '????? ?? ??????',
      hint: '?????? ???????'
    }
  });

  harness.modalApi.openLevelIntro();

  const title = harness.document.body.querySelector('#level-intro-title');
  const speakButton = harness.document.body.querySelector('#level-intro-speak');
  const startButton = harness.document.body.querySelector('#level-intro-start');
  assert.equal(title.textContent, '?????? 2');
  assert.equal(harness.document.activeElement, startButton);

  speakButton.click();
  assert.equal(harness.calls.speakCurrentTask, 1);

  startButton.click();
  assert.equal(harness.calls.stopTaskSpeech, 2);
  assert.equal(harness.document.body.querySelector('#level-intro-title'), null);
});

test('openLevelMap changes level and reloads UI without intro', () => {
  const harness = createModalHarness();

  harness.modalApi.openLevelMap();

  const buttons = harness.document.body.querySelectorAll('.map-level');
  assert.equal(buttons.length, 3);
  assert.equal(harness.document.activeElement.id, 'map-close');

  buttons[2].click();
  assert.deepEqual(harness.app.setCurrentLevelCalls, [3]);
  assert.equal(harness.calls.loadCurrentLevel.length, 1);
  assert.equal(harness.calls.loadCurrentLevel[0].showIntro, false);
  assert.equal(harness.document.body.querySelector('#map-close'), null);
});
