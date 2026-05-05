import { lessons } from './data/lessons.js';
import { buildProgramCode } from './core/codegen.js';
import { moveSnail, sleep } from './core/engine.js';
import { createTurtle, moveForward, turnLeft, turnRight, penUp, penDown } from './domain/turtle.js';
import { evaluateGoal } from './core/goals.js';
import { appState, markLessonDone, resetRuntimeState, setActiveBlock, setLesson, setRunning, toggleCodePanelState } from './core/state.js';
import { addBlock, addBlockAt, clearWorkspace, countBlocks, flattenBlocks, moveBlock, moveBlockDown, moveBlockOut, moveBlockUp, removeBlock, updateBlockParam, updateRepeatCount } from './core/workspace.js';
import { validateProgram } from './runtime/execution-limits.js';
import { pushSnapshot, undo, redo, canUndo, canRedo, clearHistory } from './state/history.js';
import { trapFocus } from './utils/focus-trap.js';
import { playSuccess, playFailure } from './utils/sounds.js';
import { clearTrail, clearTurtleCanvas, drawTrail, placeSnail, renderLessonGuide, renderTurtle, setupCanvas, setupTurtleMode, teardownTurtleMode, wiggleSnail } from './ui/canvas.js';
import { getDomReferences } from './ui/dom.js';
import { clearFeedback, hideSuccess, renderBlockCount, renderCode, renderControls, renderHistoryControls, renderLessonHeader, renderLessonNavigation, renderPalette, renderWorkspace, showFeedback, showSuccess } from './ui/render.js';

const dom = getDomReferences();
const SUCCESS_CELEBRATION_DELAY_MS = 900;
let workspaceDragDepth = 0;
let cancelRequested = false;
let lastFocusedBlockId = null;

// --- focus helpers ---

function focusBlockById(id) {
  const el = dom.workspaceInner.querySelector(`[data-block-id="${id}"]`);
  if (el) el.focus();
}

function rememberFocus() {
  const el = document.activeElement;
  const blockEl = el?.closest('[data-block-id]');
  lastFocusedBlockId = blockEl ? Number(blockEl.dataset.blockId) : null;
}

function restoreFocus() {
  if (lastFocusedBlockId !== null) {
    focusBlockById(lastFocusedBlockId);
    lastFocusedBlockId = null;
  }
}

// --- insert target ---

function setInsertTarget(id) {
  appState.insertTargetId = id;
  updateWorkspaceUi();
}

// --- drag ---

function setWorkspaceDragActive(isActive) {
  dom.workspaceSection.classList.toggle('workspace-drag-active', isActive);
}

function setWorkspaceDropTarget(isActive) {
  dom.workspaceSection.classList.toggle('workspace-drop-target', isActive);
}

function setResetConfirmOpen(isOpen) {
  dom.resetConfirmOverlay.classList.toggle('show', isOpen);
  dom.resetConfirmOverlay.setAttribute('aria-hidden', String(!isOpen));

  if (isOpen) {
    dom.resetCancelButton.focus();
  } else {
    dom.resetButton.focus();
  }
}

function setIntroOpen(isOpen) {
  dom.introOverlay.classList.toggle('show', isOpen);
  dom.introOverlay.setAttribute('aria-hidden', String(!isOpen));
  if (isOpen) dom.introOkButton.focus();
}

function showIntroIfNeeded(lesson) {
  if (!lesson.intro) return;
  dom.introIcon.textContent = lesson.intro.icon ?? '';
  dom.introTitle.textContent = lesson.intro.title;
  dom.introBody.textContent = lesson.intro.body;
  if (lesson.intro.code) {
    dom.introCode.textContent = lesson.intro.code;
    dom.introCode.hidden = false;
  } else {
    dom.introCode.hidden = true;
  }
  setIntroOpen(true);
}

function resetWorkspaceDragState() {
  workspaceDragDepth = 0;
  setWorkspaceDragActive(false);
  setWorkspaceDropTarget(false);
}

// --- code panel ---

function updateCodePanel() {
  renderCode(dom, buildProgramCode(appState.workspace), appState.codePanelOpen);
}

// --- workspace mutation helpers (all go through history) ---

function withSnapshot(mutate, focusId = null) {
  pushSnapshot(appState.workspace);
  const result = mutate();
  refreshUi();
  if (focusId !== null) focusBlockById(focusId);
  return result;
}

function handleDrop(parentId, index, payload) {
  if (appState.running) return;

  if (payload.paletteType) {
    withSnapshot(() => addBlockAt(payload.paletteType, parentId, index));
    return;
  }

  const blockId = Number.parseInt(payload.blockId, 10);
  if (Number.isFinite(blockId)) {
    withSnapshot(() => moveBlock(blockId, parentId, index), blockId);
  }
}

function updateWorkspaceUi() {
  renderWorkspace(dom, appState, {
    onRemoveBlock: (id) => {
      rememberFocus();
      withSnapshot(() => {
        removeBlock(id);
        if (appState.insertTargetId === id) appState.insertTargetId = null;
      });
      restoreFocus();
    },
    onUpdateRepeatCount: (id, value) => {
      withSnapshot(() => updateRepeatCount(id, value), id);
    },
    onUpdateBlockParam: (id, paramKey, value) => {
      withSnapshot(() => updateBlockParam(id, paramKey, value), id);
    },
    onMoveBlockUp: (id) => {
      withSnapshot(() => moveBlockUp(id), id);
    },
    onMoveBlockDown: (id) => {
      withSnapshot(() => moveBlockDown(id), id);
    },
    onMoveBlockOut: (id) => {
      withSnapshot(() => {
        moveBlockOut(id);
        if (appState.insertTargetId === id) appState.insertTargetId = null;
      }, id);
    },
    onSetInsertTarget: (id) => setInsertTarget(id),
    onDrop: handleDrop,
    onDragStart: () => setWorkspaceDragActive(true),
    onDragEnd: resetWorkspaceDragState,
  });

  renderBlockCount(dom, countBlocks());
  renderHistoryControls(dom, canUndo(), canRedo());
  updateCodePanel();
}

function refreshUi() {
  renderLessonHeader(dom, appState.currentLesson);
  renderLessonNavigation(dom, appState, loadLesson);
  renderPalette(dom, appState.currentLesson, {
    onAddBlock: (type) => {
      const targetId = appState.insertTargetId;
      withSnapshot(() => {
        const block = addBlockAt(type, targetId);
        return block;
      });
    },
    onDragStart: () => setWorkspaceDragActive(true),
    onDragEnd: resetWorkspaceDragState,
  });
  renderLessonGuide(dom, appState.currentLesson);
  updateWorkspaceUi();
  renderControls(dom, appState);
}

function isTurtleLesson() {
  return appState.currentLesson.mode === 'turtle';
}

function resetBoard() {
  if (isTurtleLesson()) {
    clearTurtleCanvas(dom);
    const lesson = appState.currentLesson;
    const t = createTurtle({ x: lesson.start.x ?? 0, y: lesson.start.y ?? 0, heading: lesson.start.heading ?? 0 });
    renderTurtle(dom, t, [], lesson.goalSegments);
    dom.canvasStatus.textContent = 'Черепаха готова малювати.';
  } else {
    clearTrail(dom);
    placeSnail(dom, appState.snail, true);
    dom.canvasStatus.textContent = `Равлик на стовпці ${appState.snail.x + 1}, рядку ${appState.snail.y + 1}.`;
  }
}

function loadLesson(index) {
  const prevWasTurtle = isTurtleLesson();
  setLesson(index);
  clearHistory();
  appState.insertTargetId = null;
  clearFeedback(dom);
  hideSuccess(dom);
  resetWorkspaceDragState();
  setResetConfirmOpen(false);

  const nowTurtle = isTurtleLesson();
  if (nowTurtle && !prevWasTurtle) {
    setupTurtleMode(dom);
  } else if (!nowTurtle && prevWasTurtle) {
    teardownTurtleMode(dom);
  }

  refreshUi();
  resetBoard();
  showIntroIfNeeded(appState.currentLesson);
}

function performResetLesson() {
  pushSnapshot(appState.workspace);
  clearWorkspace();
  resetRuntimeState();
  appState.insertTargetId = null;
  clearFeedback(dom);
  hideSuccess(dom);
  resetWorkspaceDragState();
  setResetConfirmOpen(false);
  renderControls(dom, appState);
  updateWorkspaceUi();
  resetBoard();
}

function requestResetLesson() {
  if (appState.running) return;
  if (appState.workspace.length === 0) {
    performResetLesson();
    return;
  }
  setResetConfirmOpen(true);
}

function stopProgram() {
  cancelRequested = true;
}

function performUndo() {
  if (!canUndo() || appState.running) return;
  const snapshot = undo(appState.workspace);
  if (snapshot) {
    appState.workspace = snapshot;
    appState.insertTargetId = null;
    updateWorkspaceUi();
  }
}

function performRedo() {
  if (!canRedo() || appState.running) return;
  const snapshot = redo(appState.workspace);
  if (snapshot) {
    appState.workspace = snapshot;
    appState.insertTargetId = null;
    updateWorkspaceUi();
  }
}

async function runTurtleProgram() {
  const lesson = appState.currentLesson;
  const start = lesson.start;
  let turtle = createTurtle({ x: start.x ?? 0, y: start.y ?? 0, heading: start.heading ?? 0 });
  appState.turtleSegments = [];

  // Draw ghost guide before first step (renderTurtle handles the guide internally)
  renderTurtle(dom, turtle, [], lesson.goalSegments);

  const actions = flattenBlocks();
  for (const action of actions) {
    if (!appState.running || cancelRequested) break;

    setActiveBlock(action.id);
    updateWorkspaceUi();

    let segment = null;
    if (action.type === 'turtle_forward') {
      const result = moveForward(turtle, action.steps ?? 50);
      turtle = result.turtle;
      segment = result.segment;
      if (segment) appState.turtleSegments.push(segment);
    } else if (action.type === 'turtle_right') {
      turtle = turnRight(turtle, action.degrees ?? 90);
    } else if (action.type === 'turtle_left') {
      turtle = turnLeft(turtle, action.degrees ?? 90);
    } else if (action.type === 'turtle_pen_up') {
      turtle = penUp(turtle);
    } else if (action.type === 'turtle_pen_down') {
      turtle = penDown(turtle);
    }

    renderTurtle(dom, turtle, appState.turtleSegments, lesson.goalSegments);
    dom.canvasStatus.textContent = `Черепаха: x=${Math.round(turtle.x)}, y=${Math.round(turtle.y)}, напрямок=${turtle.heading}°.`;
    await sleep(300);
  }
}

async function runProgram() {
  if (appState.running) return;

  if (appState.workspace.length === 0) {
    showFeedback(dom, 'Додай хоча б одну команду.');
    return;
  }

  const validation = validateProgram(appState.workspace);
  if (!validation.ok) {
    showFeedback(dom, validation.message);
    return;
  }

  cancelRequested = false;
  setRunning(true);
  clearFeedback(dom);
  resetRuntimeState();
  renderControls(dom, appState);
  updateWorkspaceUi();
  resetBoard();

  await sleep(120);

  if (isTurtleLesson()) {
    await runTurtleProgram();
  } else {
    const actions = flattenBlocks();
    for (const action of actions) {
      if (!appState.running || cancelRequested) break;

      setActiveBlock(action.id);
      updateWorkspaceUi();

      const previousSnail = { ...appState.snail };
      appState.snail = moveSnail(appState.snail, action.type);

      placeSnail(dom, appState.snail);
      drawTrail(dom, appState.currentLesson, previousSnail, appState.snail);
      appState.trailPoints.push([appState.snail.x, appState.snail.y]);
      dom.canvasStatus.textContent = `Равлик перемістився до стовпця ${appState.snail.x + 1}, рядку ${appState.snail.y + 1}.`;
      await sleep(340);
    }
  }

  setActiveBlock(null);
  setRunning(false);
  renderControls(dom, appState);
  updateWorkspaceUi();

  if (cancelRequested) {
    showFeedback(dom, 'Програму зупинено.', 'info');
    cancelRequested = false;
    return;
  }

  const goalData = isTurtleLesson() ? appState.turtleSegments.length : appState.trailPoints;
  const result = evaluateGoal(appState.currentLesson, goalData);
  if (result.ok) {
    playSuccess();
    markLessonDone(appState.currentLessonIndex);
    refreshUi();
    wiggleSnail(dom);
    dom.screenReaderAnnouncer.textContent = appState.currentLesson.successMessage;
    await sleep(SUCCESS_CELEBRATION_DELAY_MS);
    showSuccess(dom, appState.currentLesson, appState.currentLessonIndex === lessons.length - 1);
  } else {
    playFailure();
    showFeedback(dom, result.message);
  }
}

function goToNextLesson() {
  hideSuccess(dom);
  if (appState.currentLessonIndex < lessons.length - 1) {
    loadLesson(appState.currentLessonIndex + 1);
  } else {
    loadLesson(0);
  }
}

function toggleCodePanel() {
  renderCode(dom, buildProgramCode(appState.workspace), toggleCodePanelState());
}

function bindEvents() {
  dom.runButton.addEventListener('click', runProgram);
  dom.stopButton.addEventListener('click', stopProgram);
  dom.resetButton.addEventListener('click', requestResetLesson);
  dom.resetConfirmButton.addEventListener('click', performResetLesson);
  dom.resetCancelButton.addEventListener('click', () => setResetConfirmOpen(false));
  dom.codeToggleButton.addEventListener('click', toggleCodePanel);
  dom.nextButton.addEventListener('click', goToNextLesson);
  dom.undoButton.addEventListener('click', performUndo);
  dom.redoButton.addEventListener('click', performRedo);

  dom.introOkButton.addEventListener('click', () => setIntroOpen(false));
  dom.introOverlay.addEventListener('click', (event) => {
    if (event.target === dom.introOverlay) setIntroOpen(false);
  });

  dom.resetConfirmOverlay.addEventListener('click', (event) => {
    if (event.target === dom.resetConfirmOverlay) setResetConfirmOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    const { key, ctrlKey } = event;
    const isInput = document.activeElement?.tagName === 'INPUT';

    if (key === 'Escape') {
      if (dom.introOverlay.classList.contains('show')) {
        setIntroOpen(false);
      } else if (dom.resetConfirmOverlay.classList.contains('show')) {
        setResetConfirmOpen(false);
      } else if (appState.insertTargetId !== null) {
        setInsertTarget(null);
      }
    }

    if (ctrlKey && !isInput) {
      if (key === 'z' || key === 'Z') {
        event.preventDefault();
        performUndo();
      } else if (key === 'y' || key === 'Y') {
        event.preventDefault();
        performRedo();
      } else if (key === 'Enter') {
        event.preventDefault();
        runProgram();
      }
    }
  });

  dom.workspaceSection.addEventListener('dragenter', (event) => {
    if (!dom.workspaceSection.classList.contains('workspace-drag-active')) return;
    event.preventDefault();
    workspaceDragDepth += 1;
    setWorkspaceDropTarget(true);
  });

  dom.workspaceSection.addEventListener('dragover', (event) => {
    if (!dom.workspaceSection.classList.contains('workspace-drag-active')) return;
    event.preventDefault();
    setWorkspaceDropTarget(true);
  });

  dom.workspaceSection.addEventListener('dragleave', () => {
    if (!dom.workspaceSection.classList.contains('workspace-drag-active')) return;
    workspaceDragDepth = Math.max(0, workspaceDragDepth - 1);
    if (workspaceDragDepth === 0) setWorkspaceDropTarget(false);
  });

  dom.workspaceSection.addEventListener('drop', () => {
    workspaceDragDepth = 0;
    setWorkspaceDropTarget(false);
  });

  // focus traps for modals
  trapFocus(dom.introOverlay.querySelector('.intro-card'));
  trapFocus(dom.resetConfirmOverlay.querySelector('.confirm-card'));
  trapFocus(dom.overlay.querySelector('.success-card'));
}

function init() {
  setupCanvas(dom);
  bindEvents();
  setResetConfirmOpen(false);
  loadLesson(0);
}

init();
