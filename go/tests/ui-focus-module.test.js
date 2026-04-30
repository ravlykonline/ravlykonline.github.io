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
    disabled: false,
    hidden: false,
    isConnected: false,
    listeners: {},
    parentNode: null,
    tagName,
    tabIndex: null,
    appendChild(child) {
      child.parentNode = this;
      child.isConnected = this.isConnected;
      this.children.push(child);
      return child;
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
      if (name === 'tabindex') {
        this.tabIndex = Number(value);
      }
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll() {
      const nodes = [];
      const visit = (node) => {
        for (const child of node.children) {
          if (['button', 'a', 'input', 'select', 'textarea'].includes(child.tagName)) {
            nodes.push(child);
          }
          visit(child);
        }
      };
      visit(this);
      return nodes;
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

test('focus module traps Tab inside a modal container', async () => {
  const { moveFocusInside } = await importModule('js/ui/focus.js');
  const documentRef = createDocument();
  const container = documentRef.createElement('div');
  const first = documentRef.createElement('button');
  const last = documentRef.createElement('button');
  container.appendChild(first);
  container.appendChild(last);
  documentRef.activeElement = last;

  let prevented = false;
  const handled = moveFocusInside({
    container,
    documentRef,
    event: {
      key: 'Tab',
      preventDefault() {
        prevented = true;
      },
      shiftKey: false
    }
  });

  assert.equal(handled, true);
  assert.equal(prevented, true);
  assert.equal(documentRef.activeElement, first);
});

test('createManagedModal appends, focuses, closes, and restores focus', async () => {
  const { createManagedModal } = await importModule('js/ui/focus.js');
  const documentRef = createDocument();
  const trigger = documentRef.createElement('button');
  documentRef.body.appendChild(trigger);
  trigger.focus();

  const backdrop = documentRef.createElement('div');
  const ok = documentRef.createElement('button');
  backdrop.appendChild(ok);
  let closed = 0;

  const modal = createManagedModal({
    backdrop,
    documentRef,
    onClose() {
      closed += 1;
    },
    requestFrame(fn) {
      fn();
    }
  });

  assert.equal(documentRef.body.children.includes(backdrop), true);
  assert.equal(documentRef.activeElement, ok);

  modal.close();

  assert.equal(closed, 1);
  assert.equal(documentRef.body.children.includes(backdrop), false);
  assert.equal(documentRef.activeElement, trigger);
});

test('focus module stays independent from storage and global app state', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'js/ui/focus.js'), 'utf8');

  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
});
