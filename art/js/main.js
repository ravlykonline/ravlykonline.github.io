import { lessons } from './data/lessons.js';
import { buildProgramCode } from './core/codegen.js';
import { moveSnail, sleep } from './core/engine.js';
import { evaluateGoal } from './core/goals.js';
import { appState, markLessonDone, resetRuntimeState, setActiveBlock, setLesson, setRunning, toggleCodePanelState } from './core/state.js';
import { addBlock, closeRepeat, countBlocks, flattenBlocks, removeBlock, updateRepeatCount } from './core/workspace.js';
import { clearTrail, drawTrail, placeSnail, setupCanvas, wiggleSnail } from './ui/canvas.js';
import { getDomReferences } from './ui/dom.js';
import { clearFeedback, hideSuccess, renderBlockCount, renderCode, renderControls, renderLessonHeader, renderLessonNavigation, renderPalette, renderWorkspace, showFeedback, showSuccess } from './ui/render.js';

const dom = getDomReferences();

function updateCodePanel() {
  renderCode(dom, buildProgramCode(appState.workspace), appState.codePanelOpen);
}

function updateWorkspaceUi() {
  renderWorkspace(dom, appState, {
    onRemoveBlock: (id) => {
      removeBlock(id);
      refreshUi();
    },
    onUpdateRepeatCount: (id, value) => {
      updateRepeatCount(id, value);
      refreshUi();
    },
    onOpenRepeat: (id) => {
      appState.openRepeatId = id;
      refreshUi();
    },
    onCloseRepeat: () => {
      closeRepeat();
      refreshUi();
    },
  });

  renderBlockCount(dom, countBlocks());
  updateCodePanel();
}

function refreshUi() {
  renderLessonHeader(dom, appState.currentLesson);
  renderLessonNavigation(dom, appState, loadLesson);
  renderPalette(dom, appState.currentLesson, (type) => {
    addBlock(type);
    refreshUi();
  });
  updateWorkspaceUi();
  renderControls(dom, appState);
}

function resetBoard() {
  clearTrail(dom);
  placeSnail(dom, appState.snail, true);
  dom.canvasStatus.textContent = `Snail is at column ${appState.snail.x + 1}, row ${appState.snail.y + 1}.`;
}

function loadLesson(index) {
  setLesson(index);
  clearFeedback(dom);
  hideSuccess(dom);
  refreshUi();
  resetBoard();
}

function resetLesson() {
  resetRuntimeState();
  clearFeedback(dom);
  hideSuccess(dom);
  renderControls(dom, appState);
  updateWorkspaceUi();
  resetBoard();
}

async function runProgram() {
  if (appState.running) {
    return;
  }

  if (appState.workspace.length === 0) {
    showFeedback(dom, 'Add at least one block first.');
    return;
  }

  setRunning(true);
  clearFeedback(dom);
  resetRuntimeState();
  renderControls(dom, appState);
  updateWorkspaceUi();
  resetBoard();

  await sleep(120);

  const actions = flattenBlocks();
  for (const action of actions) {
    if (!appState.running) {
      break;
    }

    setActiveBlock(action.id);
    updateWorkspaceUi();

    const previousSnail = { ...appState.snail };
    appState.snail = moveSnail(appState.snail, action.type);

    placeSnail(dom, appState.snail);
    drawTrail(dom, appState.currentLesson, previousSnail, appState.snail);
    appState.trailPoints.push([appState.snail.x, appState.snail.y]);
    dom.canvasStatus.textContent = `Snail moved to column ${appState.snail.x + 1}, row ${appState.snail.y + 1}.`;
    await sleep(340);
  }

  setActiveBlock(null);
  setRunning(false);
  renderControls(dom, appState);
  updateWorkspaceUi();

  const result = evaluateGoal(appState.currentLesson, appState.trailPoints);
  if (result.ok) {
    markLessonDone(appState.currentLessonIndex);
    refreshUi();
    showSuccess(dom, appState.currentLesson, appState.currentLessonIndex === lessons.length - 1);
    wiggleSnail(dom);
    dom.screenReaderAnnouncer.textContent = appState.currentLesson.successMessage;
  } else {
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
  dom.resetButton.addEventListener('click', resetLesson);
  dom.codeToggleButton.addEventListener('click', toggleCodePanel);
  dom.nextButton.addEventListener('click', goToNextLesson);
}

function init() {
  setupCanvas(dom);
  bindEvents();
  loadLesson(0);
}

init();
