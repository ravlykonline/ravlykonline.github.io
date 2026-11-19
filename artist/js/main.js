import { lessons } from './data/lessons.js';
import { blockDefinitions, describeBlock } from './data/blocks.js';
import { buildProgramCode, programToText } from './core/codegen.js';
import { evaluateGoal } from './core/goals.js';
import { getBestBlocks, getGhostSegments } from './core/ghost.js';
import { createTurtleForLesson } from './domain/turtle.js';
import { appState, markLessonDone, resetRuntimeState, setActiveBlock, setLesson, setRunning, toggleCodePanelState } from './core/state.js';
import {
  appendToTarget, clampBlockParam, clearWorkspace, cloneDoc, countBlocks, createBlock, findInDoc, getDoc,
  liftTail, moveDownInDoc, moveOutInDoc, moveUpInDoc, placeLoose, placeTail, pruneLoose, removeFromDoc,
} from './core/workspace.js';
import { validateProgram } from './runtime/execution-limits.js';
import { runSteps } from './runtime/runner.js';
import { sleep } from './utils/sleep.js';
import { pushSnapshot, undo, redo, canUndo, canRedo, clearHistory } from './state/history.js';
import { trapFocus } from './utils/focus-trap.js';
import { playSuccess, playFailure } from './utils/sounds.js';
import { clearTurtleCanvas, drawTurtleSegment, placeTurtleSnail, renderLessonGuide, setupCanvas, wiggleSnail } from './ui/canvas.js';
import { getDomReferences } from './ui/dom.js';
import { clearFeedback, hideSuccess, renderBlockCount, renderCode, renderControls, renderHistoryControls, renderLessonHeader, renderLessonNavigation, showFeedback, showSuccess } from './ui/render.js';
import { createPaletteGhostBlock, renderPalette } from './ui/palette.js';
import {
  blockElementById, focusBlock, highlightBlocks, initWorkspaceView, openBlockMenu, renderWorkspaceView, scrollBlockIntoView,
} from './ui/workspaceView.js';
import { createDragController } from './ui/dragdrop.js';
import { closePopover } from './ui/popover.js';

const dom = getDomReferences();
const SUCCESS_CELEBRATION_DELAY_MS = 900;
let cancelRequested = false;
let dragController = null;
// Стан перетягування існуючого блока: знімок ДО підняття й сам «хвіст».
let dragSnapshot = null;
let dragTail = null;

// --- helpers ---

function announce(message) {
  dom.screenReaderAnnouncer.textContent = '';
  window.setTimeout(() => { dom.screenReaderAnnouncer.textContent = message; }, 30);
}

function applyDoc(doc) {
  appState.workspace = doc.main;
  appState.loose = doc.loose;
}

/** Ціль вставки зникає, якщо цикл більше не існує. */
function normalizeInsertTarget() {
  if (appState.insertTargetId !== null && !findInDoc(getDoc(), appState.insertTargetId)) {
    appState.insertTargetId = null;
  }
}

function setIntroOpen(isOpen) {
  dom.introOverlay.classList.toggle('show', isOpen);
  dom.introOverlay.setAttribute('aria-hidden', String(!isOpen));
  if (isOpen) dom.introOkButton.focus();
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

// --- code panel ---

function currentCodeText() {
  return programToText(buildProgramCode(appState.currentLesson, appState.workspace));
}

function updateCodePanel() {
  renderCode(dom, currentCodeText(), appState.codePanelOpen);
}

/** Усе, що залежить від моделі, крім самого полотна. */
function updateDerivedUi() {
  renderBlockCount(dom, countBlocks(), getBestBlocks(appState.currentLesson));
  renderHistoryControls(dom, canUndo(), canRedo());
  updateCodePanel();
}

function updateWorkspaceUi() {
  renderWorkspaceView(dom, appState);
  updateDerivedUi();
}

// --- зміни моделі (усі проходять через історію) ---

/**
 * Виконує зміну документа з записом в історію скасування. `mutate(doc)` повертає
 * false, якщо нічого не змінилось (тоді історія не поповнюється).
 */
function commit(mutate, { focusId = null, message = '' } = {}) {
  if (appState.running) return false;
  const before = cloneDoc(getDoc());
  const result = mutate(getDoc());
  if (result === false) return false;
  pushSnapshot(before);
  pruneLoose(getDoc());
  appState.errorBlockId = null;
  normalizeInsertTarget();
  updateWorkspaceUi();
  if (focusId !== null) focusBlock(focusId);
  if (message) announce(message);
  return true;
}

function removeBlockById(id) {
  const found = findInDoc(getDoc(), id);
  if (!found) return;
  const neighbour = found.list[found.index + 1] ?? found.list[found.index - 1];
  const focusId = neighbour?.id ?? found.parentId;
  const label = describeBlock(found.block);
  commit((doc) => removeFromDoc(doc, id) !== null, {
    focusId: focusId ?? null,
    message: `Видалено: ${label}`,
  });
}

function setInsertTarget(id) {
  if (appState.running) return;
  appState.insertTargetId = id;
  updateWorkspaceUi();
  if (id !== null) {
    focusBlock(id);
    announce('Обрано цикл: нові блоки потраплять усередину');
  }
}

function addBlockFromPalette(type) {
  if (appState.running) return;
  let addedId = null;
  const added = commit((doc) => {
    const block = createBlock(type);
    appendToTarget(doc, block, appState.insertTargetId);
    if (blockDefinitions[type].container) appState.insertTargetId = block.id;
    addedId = block.id;
    return true;
  }, { message: `Додано: ${describeBlock(createBlock(type, 0))}` });
  if (added && addedId !== null) scrollBlockIntoView(addedId);
}

const workspaceApi = {
  isLocked: () => appState.running,
  shouldSuppressClick: () => dragController?.shouldSuppressClick() ?? false,
  setInsertTarget,
  remove: removeBlockById,
  moveUp: (id) => commit((doc) => moveUpInDoc(doc, id), { focusId: id, message: 'Блок піднято' }),
  moveDown: (id) => commit((doc) => moveDownInDoc(doc, id), { focusId: id, message: 'Блок опущено' }),
  moveOut: (id) => commit((doc) => moveOutInDoc(doc, id), { focusId: id, message: 'Блок винесено з циклу' }),
  /** Зміна числа/кольору в полі. Не перемальовує полотно, щоб не губити фокус поля. */
  onParamChange(id, key, raw, session) {
    const found = findInDoc(getDoc(), id);
    if (!found) return raw;
    const definition = blockDefinitions[found.block.type];
    if (appState.running || !definition.param || definition.param.key !== key) return found.block[key];
    const value = clampBlockParam(definition, raw);
    if (value !== found.block[key]) {
      if (!session.taken) {
        pushSnapshot(getDoc());
        session.taken = true;
      }
      found.block[key] = value;
      appState.errorBlockId = null;
      blockElementById(id)?.setAttribute('aria-label', describeBlock(found.block));
      updateDerivedUi();
    }
    return value;
  },
};

// --- перетягування ---

function liftForDrag(blockId) {
  dragSnapshot = cloneDoc(getDoc());
  const lifted = liftTail(getDoc(), blockId);
  dragTail = lifted ? lifted.tail : null;
  normalizeInsertTarget();
  updateWorkspaceUi();
}

function dropBlocks({ source, mode, slot, x, y }) {
  if (appState.running) return;
  const fromPalette = source.kind === 'palette';
  const before = fromPalette ? cloneDoc(getDoc()) : dragSnapshot;
  const tail = fromPalette ? [createBlock(source.type)] : dragTail;
  dragSnapshot = null;
  dragTail = null;

  if (!before || !tail) {
    updateWorkspaceUi();
    return;
  }

  const doc = getDoc();
  let ok = true;
  let message = '';
  if (mode === 'delete') {
    if (fromPalette) {
      updateWorkspaceUi();
      return;
    }
    message = `Видалено блоків: ${tail.length}`;
  } else if (mode === 'snap') {
    ok = placeTail(doc, tail, slot);
    message = 'Блок вставлено';
  } else {
    ok = Boolean(placeLoose(doc, tail, x, y));
    message = 'Блок покладено окремо: він не виконується, доки не приєднаний до «коли ▶ натиснуто»';
  }

  if (!ok) {
    if (!fromPalette) applyDoc(before);
    normalizeInsertTarget();
    updateWorkspaceUi();
    return;
  }

  pushSnapshot(before);
  pruneLoose(doc);
  appState.errorBlockId = null;
  normalizeInsertTarget();
  updateWorkspaceUi();
  if (mode !== 'delete') focusBlock(tail[0].id);
  announce(message);
}

function cancelDrag() {
  if (dragSnapshot) applyDoc(dragSnapshot);
  dragSnapshot = null;
  dragTail = null;
  normalizeInsertTarget();
  updateWorkspaceUi();
}

// --- рівні й керування ---

function refreshUi() {
  renderLessonHeader(dom, appState.currentLesson);
  renderLessonNavigation(dom, appState, loadLesson);
  renderPalette(dom, appState.currentLesson, {
    onAddBlock: addBlockFromPalette,
    shouldSuppressClick: () => dragController?.shouldSuppressClick() ?? false,
  });
  renderLessonGuide(dom, appState.currentLesson, getGhostSegments(appState.currentLesson));
  updateWorkspaceUi();
  renderControls(dom, appState);
}

function resetBoard() {
  clearTurtleCanvas(dom);
  placeTurtleSnail(dom, createTurtleForLesson(appState.currentLesson));
  dom.canvasStatus.textContent = 'Равлик готовий малювати.';
}

function loadLesson(index) {
  setLesson(index);
  clearHistory();
  appState.insertTargetId = null;
  clearFeedback(dom);
  hideSuccess(dom);
  closePopover();
  setResetConfirmOpen(false);

  refreshUi();
  resetBoard();
  showIntroIfNeeded(appState.currentLesson);
}

function performResetLesson() {
  pushSnapshot(getDoc());
  clearWorkspace();
  resetRuntimeState();
  appState.insertTargetId = null;
  appState.errorBlockId = null;
  clearFeedback(dom);
  hideSuccess(dom);
  setResetConfirmOpen(false);
  renderControls(dom, appState);
  updateWorkspaceUi();
  resetBoard();
}

function requestResetLesson() {
  if (appState.running) return;
  if (appState.workspace.length === 0 && appState.loose.length === 0) {
    performResetLesson();
    return;
  }
  setResetConfirmOpen(true);
}

function stopProgram() {
  cancelRequested = true;
}

function restoreSnapshot(snapshot) {
  if (!snapshot) return;
  applyDoc(snapshot);
  appState.insertTargetId = null;
  appState.errorBlockId = null;
  updateWorkspaceUi();
}

function performUndo() {
  if (!canUndo() || appState.running) return;
  restoreSnapshot(undo(getDoc()));
}

function performRedo() {
  if (!canRedo() || appState.running) return;
  restoreSnapshot(redo(getDoc()));
}

async function animateProgram() {
  const lesson = appState.currentLesson;
  appState.turtleSegments = [];

  for (const step of runSteps(appState.workspace, lesson)) {
    if (!appState.running || cancelRequested) break;

    setActiveBlock(step.blockId);
    highlightBlocks(appState);

    if (step.segment) {
      appState.turtleSegments.push(step.segment);
      drawTurtleSegment(dom, step.segment);
    }

    const turtle = step.after;
    placeTurtleSnail(dom, turtle);
    dom.canvasStatus.textContent = `Равлик: x=${Math.round(turtle.x)}, y=${Math.round(turtle.y)}, напрямок=${Math.round(turtle.heading)}°.`;
    await sleep(300);
  }
}

async function runProgram() {
  if (appState.running) return;

  if (appState.workspace.length === 0) {
    showFeedback(dom, appState.loose.length > 0
      ? 'Приєднай блоки до «коли ▶ натиснуто» — окремі блоки не виконуються.'
      : 'Додай хоча б одну команду.');
    return;
  }

  const validation = validateProgram(appState.workspace);
  if (!validation.ok) {
    appState.errorBlockId = validation.blockId ?? null;
    highlightBlocks(appState);
    showFeedback(dom, validation.message);
    return;
  }

  cancelRequested = false;
  appState.errorBlockId = null;
  closePopover();
  setRunning(true);
  clearFeedback(dom);
  resetRuntimeState();
  renderControls(dom, appState);
  updateWorkspaceUi();
  resetBoard();

  await sleep(120);

  await animateProgram();

  setActiveBlock(null);
  setRunning(false);
  renderControls(dom, appState);
  updateWorkspaceUi();

  if (cancelRequested) {
    showFeedback(dom, 'Програму зупинено.', 'info');
    cancelRequested = false;
    return;
  }

  const result = evaluateGoal(appState.currentLesson, {
    segments: appState.turtleSegments,
    workspace: appState.workspace,
    expected: getGhostSegments(appState.currentLesson),
    bestBlocks: getBestBlocks(appState.currentLesson),
  });
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
  renderCode(dom, currentCodeText(), toggleCodePanelState());
}

function setBlocksStyle(pastel) {
  document.body.classList.toggle('blocks-pastel', pastel);
  dom.blocksStyleButton.setAttribute('aria-pressed', String(pastel));
  dom.blocksStyleButton.textContent = pastel ? 'Яскраві' : 'Пастельні';
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
  dom.blocksStyleButton.addEventListener('click', () => setBlocksStyle(!document.body.classList.contains('blocks-pastel')));

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

    if (key === 'Escape' && !event.defaultPrevented) {
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

  // focus traps for modals
  trapFocus(dom.introOverlay.querySelector('.intro-card'));
  trapFocus(dom.resetConfirmOverlay.querySelector('.confirm-card'));
  trapFocus(dom.overlay.querySelector('.success-card'));
}

function init() {
  setupCanvas(dom);
  initWorkspaceView(dom, workspaceApi);
  dragController = createDragController({
    canvas: dom.workspaceCanvas,
    palette: dom.paletteSection,
    isLocked: () => appState.running,
    lift: liftForDrag,
    createPaletteBlock: createPaletteGhostBlock,
    onDrop: dropBlocks,
    onCancel: cancelDrag,
    onLongPress: (el, x, y) => openBlockMenu(el, { x, y }),
  });
  bindEvents();
  setBlocksStyle(new URLSearchParams(window.location.search).get('blocks') === 'pastel');
  setResetConfirmOpen(false);
  loadLesson(0);
}

init();
