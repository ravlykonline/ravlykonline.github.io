const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { readUtf8, root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createButton() {
  const listeners = {};
  return {
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    click() {
      listeners.click();
    }
  };
}

function createEventTarget() {
  const listeners = {};
  return {
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    dispatch(type, event = {}) {
      listeners[type](event);
    },
    listeners
  };
}

function createHarness() {
  const calls = [];
  const timers = [];
  const refs = {
    btnClr: createButton(),
    btnLevelInfo: createButton(),
    btnMap: createButton(),
    btnNext: createButton(),
    btnPrev: createButton(),
    btnRun: createButton(),
    btnSpeakTask: createButton()
  };
  const app = {
    engine: {
      run() {
        calls.push('run');
      }
    },
    refs,
    render: {
      clearPendingDelete() {
        calls.push('clear-pending-delete');
      },
      deselect() {
        calls.push('deselect');
      },
      endPointerDrag(x, y) {
        calls.push(['end-drag', x, y]);
      },
      moveGhost(x, y) {
        calls.push(['move-ghost', x, y]);
      },
      posSnail(r, c, animate, facing) {
        calls.push(['pos-snail', r, c, animate, facing]);
      },
      updateDropTarget(x, y) {
        calls.push(['update-drop-target', x, y]);
      }
    },
    state: {
      dragDir: null,
      dragMoved: false,
      snailFacing: 'right',
      snailPos: { c: 2, r: 1 }
    }
  };
  const audioApi = {
    stopTaskSpeech() {
      calls.push('stop-speech');
    },
    primeAudio() {
      calls.push('prime-audio');
    },
    resumeAudio() {
      calls.push('resume-audio');
    },
    speakCurrentTask() {
      calls.push('speak-task');
    }
  };
  const modalApi = {
    hasActiveModal() {
      return false;
    },
    openClearConfirmModal() {
      calls.push('clear-modal');
    },
    openLevelIntro() {
      calls.push('level-intro');
    },
    openLevelMap() {
      calls.push('level-map');
    }
  };
  const statusApi = {
    clearRunHint() {
      calls.push('clear-run-hint');
    }
  };
  const documentRef = createEventTarget();
  const windowRef = {
    ...createEventTarget(),
    clearTimeout(timerId) {
      const timer = timers.find((item) => item.id === timerId);
      if (timer) {
        timer.cleared = true;
      }
    },
    setTimeout(callback, delay) {
      const timer = { callback, cleared: false, delay, id: timers.length + 1 };
      timers.push(timer);
      return timer.id;
    }
  };

  return {
    app,
    audioApi,
    calls,
    documentRef,
    goToNextLevel() {
      calls.push('next-level');
    },
    goToPrevLevel() {
      calls.push('prev-level');
    },
    modalApi,
    statusApi,
    syncSizes() {
      calls.push('sync-sizes');
    },
    timers,
    windowRef
  };
}

test('appUiEvents wires buttons to UI actions and primes audio input', async () => {
  const { bindAppUiEvents } = await importModule('js/ui/appUiEvents.js');
  const harness = createHarness();

  bindAppUiEvents(harness);

  harness.windowRef.dispatch('pointerdown');
  harness.windowRef.dispatch('keydown');
  harness.app.refs.btnRun.click();
  harness.app.refs.btnClr.click();
  harness.app.refs.btnPrev.click();
  harness.app.refs.btnNext.click();
  harness.app.refs.btnLevelInfo.click();
  harness.app.refs.btnSpeakTask.click();
  harness.app.refs.btnMap.click();

  assert.deepEqual(harness.calls, [
    'prime-audio',
    'prime-audio',
    'stop-speech',
    'clear-run-hint',
    'resume-audio',
    'run',
    'clear-modal',
    'prev-level',
    'next-level',
    'level-intro',
    'speak-task',
    'level-map'
  ]);
});

test('appUiEvents handles drag, escape and outside-click clearing', async () => {
  const { bindAppUiEvents } = await importModule('js/ui/appUiEvents.js');
  const harness = createHarness();

  bindAppUiEvents(harness);

  harness.windowRef.dispatch('pointermove', { clientX: 4, clientY: 5 });
  assert.equal(harness.calls.includes('move-ghost'), false);

  Object.assign(harness.app.state, { dragDir: 'right', dragPointerId: 1, dragStartX: 0, dragStartY: 0 });
  harness.windowRef.dispatch('pointermove', { clientX: 3, clientY: 4, pointerId: 1 });
  harness.windowRef.dispatch('pointerup', { clientX: 9, clientY: 10, pointerId: 2 });
  harness.windowRef.dispatch('pointermove', { clientX: 7, clientY: 8, pointerId: 1 });
  harness.windowRef.dispatch('pointerup', { clientX: 9, clientY: 10, pointerId: 1 });
  harness.windowRef.dispatch('pointercancel', { pointerId: 1 });
  harness.documentRef.dispatch('keydown', { key: 'Escape' });
  harness.documentRef.dispatch('click', {
    target: {
      closest() {
        return null;
      }
    }
  });

  assert.equal(harness.app.state.dragMoved, true);
  assert.deepEqual(harness.calls, [
    ['move-ghost', 7, 8],
    ['update-drop-target', 7, 8],
    ['end-drag', 9, 10],
    ['end-drag', -9999, -9999],
    'deselect',
    'clear-pending-delete',
    'deselect',
    'clear-pending-delete'
  ]);
});

test('appUiEvents refreshes the snail position on resize without ResizeObserver', async () => {
  const { bindAppUiEvents } = await importModule('js/ui/appUiEvents.js');
  const harness = createHarness();

  bindAppUiEvents(harness);

  harness.windowRef.dispatch('resize');
  assert.deepEqual(harness.calls, ['sync-sizes']);
});

test('appUiEvents remains a wiring helper without storage or global app contracts', () => {
  const source = readUtf8('js/ui/appUiEvents.js');

  assert.match(source, /export function bindAppUiEvents/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.doesNotMatch(source, /eval\(|new Function|document\.write/);
});
