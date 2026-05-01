const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { readUtf8, root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createElement(tagName = 'div') {
  return {
    attributes: {},
    children: [],
    className: '',
    parentNode: null,
    tagName,
    textContent: '',
    append(...nodes) {
      nodes.forEach((node) => {
        node.parentNode = this;
        this.children.push(node);
      });
    },
    appendChild(node) {
      node.parentNode = this;
      this.children.push(node);
      return node;
    },
    insertBefore(node, beforeNode) {
      node.parentNode = this;
      const beforeIndex = this.children.indexOf(beforeNode);
      if (beforeIndex === -1) {
        this.children.push(node);
        return node;
      }
      this.children.splice(beforeIndex, 0, node);
      return node;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
  };
}

function createDocument(elements) {
  const created = [];
  return {
    created,
    title: '',
    createElement(tagName) {
      const element = createElement(tagName);
      created.push(element);
      return element;
    },
    getElementById(id) {
      return elements[`#${id}`] || null;
    },
    querySelector(selector) {
      return elements[selector] || null;
    }
  };
}

function createHarness(width = 1024) {
  const shell = createElement('div');
  const sidebar = createElement('aside');
  const divider = createElement('div');
  const actions = createElement('div');
  const gridWrap = createElement('div');
  const palette = createElement('div');
  const elements = {
    '.actions': actions,
    '.div-line': divider,
    '.level-bar': createElement('div'),
    '.level-nav': createElement('div'),
    '.level-toolbar': createElement('div'),
    '.logo': createElement('div'),
    '.logo-name': createElement('div'),
    '.logo-sub': createElement('div'),
    '.sect-lbl': createElement('div'),
    '.sidebar': sidebar,
    '.skip-link': createElement('a'),
    '#level-intro-content': createElement('div'),
    '#main-content': createElement('main')
  };
  const refs = {
    btnClr: createElement('button'),
    btnMap: createElement('button'),
    btnNext: createElement('button'),
    btnPrev: createElement('button'),
    btnRun: createElement('button'),
    gridEl: createElement('div'),
    gwrap: gridWrap,
    paletteEl: palette
  };
  const text = {
    static: {
      clearAria: 'Очистити поле',
      clearTitle: 'Очистити поле',
      commandsLabel: 'Команди',
      gridAria: (rows, cols) => `${rows} на ${cols}`,
      introSourceAria: 'Опис рівня',
      levelBarAria: 'Поточний рівень',
      levelNavAria: 'Навігація рівнями',
      logoAria: 'Равлик',
      logoName: 'Пригоди Равлика',
      logoSub: 'Навчальна гра',
      mainAria: (rows, cols) => `Поле ${rows} на ${cols}`,
      mapButton: 'Усі рівні',
      nextLevelAria: 'Наступний рівень',
      nextLevelTitle: 'Наступний рівень',
      pageTitle: 'Пригоди Равлика',
      paletteAria: 'Палітра команд',
      prevLevelAria: 'Попередній рівень',
      prevLevelTitle: 'Попередній рівень',
      runAria: 'Запустити',
      runTitle: 'Запустити',
      sidebarAria: 'Бічна панель',
      skipLink: 'До гри',
      toolbarAria: 'Інструменти рівня'
    }
  };

  shell.appendChild(gridWrap);
  shell.appendChild(sidebar);
  sidebar.appendChild(palette);
  sidebar.appendChild(divider);
  sidebar.appendChild(actions);

  return {
    app: { config: { cols: 8, rows: 6 }, refs, text },
    documentRef: createDocument(elements),
    refs,
    shell,
    sidebar,
    actions,
    palette,
    text,
    windowRef: { innerWidth: width }
  };
}

test('appUiLayout applies static labels and compact map text', async () => {
  const { createAppUiLayout } = await importModule('js/ui/appUiLayout.js');
  const harness = createHarness(620);
  const layout = createAppUiLayout(harness);

  layout.applyStaticText();

  assert.equal(harness.documentRef.title, 'Пригоди Равлика');
  assert.equal(harness.refs.btnMap.textContent, 'Рівні');
  assert.equal(harness.refs.btnRun.attributes['aria-label'], 'Запустити');
  assert.equal(harness.refs.gridEl.attributes['aria-label'], '6 на 8');
  assert.equal(harness.refs.paletteEl.attributes['aria-label'], 'Палітра команд');

  harness.windowRef.innerWidth = 800;
  layout.updateResponsiveLabels();

  assert.equal(harness.refs.btnMap.textContent, 'Усі рівні');
});

test('appUiLayout moves command controls between sidebar and mobile dock', async () => {
  const { createAppUiLayout } = await importModule('js/ui/appUiLayout.js');
  const harness = createHarness(880);
  const layout = createAppUiLayout(harness);

  layout.syncCommandLayout();

  const mobileDock = harness.documentRef.created.find((element) => element.className === 'mobile-command-dock');
  assert.ok(mobileDock);
  assert.equal(harness.palette.parentNode, mobileDock);
  assert.equal(harness.actions.parentNode, mobileDock);

  harness.windowRef.innerWidth = 1200;
  layout.syncCommandLayout();

  assert.equal(harness.palette.parentNode, harness.sidebar);
  assert.equal(harness.actions.parentNode, harness.sidebar);
});

test('appUiLayout remains a focused UI helper without storage or global app contracts', () => {
  const source = readUtf8('js/ui/appUiLayout.js');

  assert.match(source, /export function createAppUiLayout/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /eval\(|new Function|document\.write/);
});
