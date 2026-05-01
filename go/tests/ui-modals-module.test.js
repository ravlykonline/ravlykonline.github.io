const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createElement(tagName, documentRef) {
  return {
    attrs: {},
    children: [],
    className: '',
    dataset: {},
    disabled: false,
    hidden: false,
    id: '',
    isConnected: false,
    listeners: {},
    parentNode: null,
    tagName,
    textContent: '',
    type: '',
    appendChild(child) {
      child.parentNode = this;
      child.isConnected = this.isConnected;
      this.children.push(child);
      return child;
    },
    append(...items) {
      items.forEach((item) => this.appendChild(item));
    },
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    removeEventListener(type) {
      delete this.listeners[type];
    },
    focus() {
      documentRef.activeElement = this;
    },
    getAttribute(name) {
      return this.attrs[name] ?? null;
    },
    setAttribute(name, value) {
      this.attrs[name] = String(value);
      if (name === 'id') {
        this.id = String(value);
      }
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      const results = [];
      const visit = (node) => {
        for (const child of node.children) {
          if ((selector === 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])' && child.tagName === 'button') ||
              (selector.startsWith('#') && child.id === selector.slice(1)) ||
              (selector === '.map-level' && child.className.split(/\s+/).includes('map-level'))) {
            results.push(child);
          }
          visit(child);
        }
      };
      visit(this);
      return results;
    },
    remove() {
      this.isConnected = false;
      if (!this.parentNode) {
        return;
      }
      const index = this.parentNode.children.indexOf(this);
      if (index >= 0) {
        this.parentNode.children.splice(index, 1);
      }
      this.parentNode = null;
    }
  };
}

function createDocument() {
  const documentRef = {
    activeElement: null,
    body: null,
    contains(node) {
      let current = node;
      while (current) {
        if (current === documentRef.body) {
          return true;
        }
        current = current.parentNode;
      }
      return false;
    },
    createElement(tagName) {
      return createElement(tagName, documentRef);
    }
  };
  documentRef.body = createElement('body', documentRef);
  documentRef.body.isConnected = true;
  return documentRef;
}

function collectText(node) {
  return [node.textContent || '', ...node.children.flatMap((child) => collectText(child))].join('');
}

const text = {
  mapState(isCurrent, isDone) {
    if (isCurrent) return 'поточний';
    if (isDone) return 'пройдено';
    return 'ще ні';
  },
  ui: {
    mapBody: 'Оберіть рівень',
    mapClose: 'Закрити',
    mapTitle: 'Мапа рівнів'
  }
};

test('renderLevelMapModal shows all levels and calls onSelect', async () => {
  const { renderLevelMapModal } = await importModule('js/ui/modals.js');
  const documentRef = createDocument();
  const selected = [];

  renderLevelMapModal({
    completedLevelIds: [1],
    currentLevelId: 2,
    documentRef,
    levels: [
      { id: 1, name: 'Рівень 1' },
      { id: 2, name: 'Рівень 2' },
      { id: 3, name: 'Рівень 3' }
    ],
    onSelect(levelId) {
      selected.push(levelId);
    },
    text
  });

  const backdrop = documentRef.body.children[0];
  const buttons = backdrop.querySelectorAll('.map-level');
  assert.equal(buttons.length, 3);

  buttons[2].listeners.click();
  assert.deepEqual(selected, [3]);
  assert.equal(documentRef.body.children.includes(backdrop), false);
});

test('renderMessageModal uses explicit close and action buttons', async () => {
  const { renderMessageModal } = await importModule('js/ui/modals.js');
  const documentRef = createDocument();
  let actions = 0;

  renderMessageModal({
    actionId: 'confirm',
    actionText: 'Очистити',
    bodyText: 'Цю дію треба підтвердити.',
    closeId: 'cancel',
    documentRef,
    onAction() {
      actions += 1;
    },
    text,
    titleId: 'title',
    titleText: 'Почати спочатку'
  });

  const backdrop = documentRef.body.children[0];
  assert.equal(backdrop.querySelector('#cancel').type, 'button');
  assert.equal(backdrop.querySelector('#confirm').type, 'button');

  backdrop.querySelector('#confirm').listeners.click();
  assert.equal(actions, 1);
  assert.equal(documentRef.body.children.includes(backdrop), false);
});

test('renderTurnHintModal renders optional turn guidance', async () => {
  const { renderTurnHintModal } = await importModule('js/ui/modals.js');
  const documentRef = createDocument();

  renderTurnHintModal({
    documentRef,
    includeTurnHint: true,
    text: {
      ui: {
        mapClose: 'Закрити',
        tryAgainAction: 'Добре',
        tryAgainBody: 'Маршрут не склався.',
        tryAgainTitle: 'Спробуй ще раз',
        tryAgainTurns: 'Перевір повороти.'
      }
    }
  });

  const backdrop = documentRef.body.children[0];
  assert.equal(backdrop.querySelector('#turn-hint-close').type, 'button');
  assert.equal(backdrop.querySelector('#turn-hint-ok').type, 'button');
  assert.match(collectText(backdrop), /Перевір повороти/);
});

test('renderResultModal renders icon, close and action controls', async () => {
  const { renderResultModal } = await importModule('js/ui/modals.js');
  const documentRef = createDocument();
  let actions = 0;

  renderResultModal({
    actionId: 'next',
    actionText: 'Далі',
    bodyText: 'Рівень пройдено.',
    closeId: 'result-close',
    documentRef,
    iconText: '\u{1F389}',
    onAction() {
      actions += 1;
    },
    text,
    titleId: 'result-title',
    titleText: 'Готово'
  });

  const backdrop = documentRef.body.children[0];
  assert.equal(backdrop.querySelector('#result-close').type, 'button');
  assert.equal(backdrop.querySelector('#next').type, 'button');
  assert.match(collectText(backdrop), /Готово/);

  backdrop.querySelector('#next').listeners.click();
  assert.equal(actions, 1);
  assert.equal(documentRef.body.children.includes(backdrop), false);
});

test('renderLevelIntroModal renders task controls and closes with callback', async () => {
  const { renderLevelIntroModal } = await importModule('js/ui/modals.js');
  const documentRef = createDocument();
  const calls = { close: 0, speak: 0 };

  renderLevelIntroModal({
    completedLevelIds: [],
    documentRef,
    level: {
      goal: 'Зібрати яблуко',
      hint: 'Постав стрілку',
      id: 1,
      name: 'Рівень 1',
      type: 'normal'
    },
    levelChipText: '1/20',
    onClose() {
      calls.close += 1;
    },
    onSpeak() {
      calls.speak += 1;
    },
    text: {
      earlyLevel: {
        listenAction: 'Послухати',
        startAction: 'Почати',
        taskLabel: 'Що зробити'
      },
      mode(isDebug) {
        return isDebug ? 'debug' : 'play';
      },
      onboarding: {
        body: 'Навчальний старт',
        goal: 'Дістатися яблука',
        startAction: 'Грати',
        taskLabel: 'Завдання',
        taskText: 'Допоможи равлику',
        title: 'Пригоди Равлика'
      },
      ui: {
        listenTask: 'Слухати',
        mapClose: 'Закрити',
        startAction: 'Почати',
        taskLabel: 'Завдання'
      }
    }
  });

  const backdrop = documentRef.body.children[0];
  assert.equal(backdrop.querySelector('#level-intro-close').type, 'button');
  assert.equal(backdrop.querySelector('#level-intro-speak').type, 'button');
  assert.equal(backdrop.querySelector('#level-intro-start').type, 'button');
  assert.match(collectText(backdrop), /Пригоди Равлика/);

  backdrop.querySelector('#level-intro-speak').listeners.click();
  assert.equal(calls.speak, 1);

  backdrop.querySelector('#level-intro-start').listeners.click();
  assert.equal(calls.close, 1);
  assert.equal(documentRef.body.children.includes(backdrop), false);
});

test('modals module stays independent from storage and global app state', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'js/ui/modals.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
});
