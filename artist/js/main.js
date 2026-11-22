import { lessons } from './data/lessons.js';
import { blockDefinitions, describeBlock } from './data/blocks.js';
import { buildProgramCode, programToText } from './core/codegen.js';
import { buildEditorLink } from './core/editorLink.js';
import { evaluateGoal } from './core/goals.js';
import { getBestBlocks, getGhostSegments } from './core/ghost.js';
import { describeGhost, describeTurtleStatus } from './core/describe.js';
import { createLessonMenu } from './ui/lessonMenu.js';
import { createMoreMenu } from './ui/moreMenu.js';
import { createTurtleForLesson } from './domain/turtle.js';
import { appState, markLessonDone, resetRuntimeState, setActiveBlock, setLesson, setRunning, setSpeed, setView } from './core/state.js';
import {
  appendToTarget, attachAbove, clampBlockParam, clearWorkspace, cloneDoc, countBlocks, createBlock, findInDoc, getDoc,
  liftTail, moveDownInDoc, moveOutInDoc, moveUpInDoc, placeLoose, placeTail, pruneLoose, removeFromDoc,
} from './core/workspace.js';
import { validateProgram } from './runtime/execution-limits.js';
import { createStepper } from './runtime/stepper.js';
import { createStepController } from './runtime/stepController.js';
import { sleep } from './utils/sleep.js';
import { pushSnapshot, undo, redo, canUndo, canRedo, clearHistory } from './state/history.js';
import { trapFocus } from './utils/focus-trap.js';
import { playSuccess, playFailure, playSnap } from './utils/sounds.js';
import { addTrailSegment, clearTurtleCanvas, placeTurtleSnail, renderLessonGuide, selectTurtlePose, setTrailEnd, setupCanvas, wiggleSnail } from './ui/canvas.js';
import { REDUCED_MOTION_STEP_PAUSE_MS, SPEEDS, getStepDuration, interpolateTurtle, speedFactor } from './domain/snail.js';
import { getDomReferences } from './ui/dom.js';
import { clearFeedback, hideSuccess, isSuccessOpen, renderBlockCount, renderControls, renderHistoryControls, renderHint, renderLessonHeader, renderLessonNavigation, showFeedback, showSuccess } from './ui/render.js';
import { highlightCodeLine, renderCodeView, setEditorView } from './ui/codeView.js';
import { copyText } from './ui/clipboard.js';
import { createPaletteGhostBlock, renderPalette } from './ui/palette.js';
import {
  blockElementById, focusBlock, highlightBlocks, initWorkspaceView, renderWorkspaceView, scrollBlockIntoView,
} from './ui/workspaceView.js';
import { createDragController } from './ui/dragdrop.js';
import { closePopover } from './ui/popover.js';

const dom = getDomReferences();
const SUCCESS_CELEBRATION_DELAY_MS = 900;
const COPY_STATUS_MS = 6000;
let session = null; // { stepper, controller } — поточний сеанс виконання (автоматичний або покроковий)
let finishAnimation = () => {}; // миттєво доводить поточний крок до кінця
let programCode = null; // { setup, body, lineByBlockId } для вкладки «Код»
let introReturnFocus = null;
let copyStatusTimer = 0;
let dragController = null;
let moreMenu = null;
let lessonMenu = null;
const BACKGROUND_SELECTOR = '#hdr, .folk-divider, #app-main, #footer';
const MODAL_OVERLAY_IDS = ['overlay', 'intro-overlay', 'reset-confirm-overlay'];
// Стан перетягування існуючого блока: знімок ДО підняття й сам «хвіст».
let dragSnapshot = null;
let dragTail = null;

// --- helpers ---

function announce(message) {
  dom.screenReaderAnnouncer.textContent = '';
  window.setTimeout(() => { dom.screenReaderAnnouncer.textContent = message; }, 30);
}

/** Поки відкрита модалка, решта сторінки недоступна для Tab і читача екрана. */
function syncModalInert() {
  const open = MODAL_OVERLAY_IDS.some((id) => document.getElementById(id).classList.contains('show'));
  for (const element of document.querySelectorAll(BACKGROUND_SELECTOR)) {
    element.inert = open;
  }
}

function showSuccessModal(...args) {
  showSuccess(dom, ...args);
  syncModalInert();
}

function hideSuccessModal() {
  hideSuccess(dom);
  syncModalInert();
}

/** Лише коли поле бачить дитина на телефоні: прокрутити сторінку до поля перед виконанням. */
function ensureFieldVisible() {
  const rect = dom.gridSvg.getBoundingClientRect();
  if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
  if (window.matchMedia('(min-width: 700px) and (min-height: 501px)').matches) return;
  dom.gridSvg.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
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
  syncModalInert();
  if (isOpen) {
    introReturnFocus = document.activeElement;
    dom.introOkButton.focus();
  } else if (introReturnFocus?.isConnected) {
    introReturnFocus.focus();
    introReturnFocus = null;
  }
}

function setResetConfirmOpen(isOpen) {
  const wasOpen = dom.resetConfirmOverlay.classList.contains('show');
  dom.resetConfirmOverlay.classList.toggle('show', isOpen);
  dom.resetConfirmOverlay.setAttribute('aria-hidden', String(!isOpen));
  syncModalInert();

  if (isOpen) {
    dom.resetCancelButton.focus();
  } else if (wasOpen) {
    // На телефоні «Очистити» живе в меню «⋯» і може бути прихованою.
    (dom.resetButton.offsetParent ? dom.resetButton : dom.moreButton).focus();
  }
}

function openIntro(lesson) {
  if (!lesson.intro) return;
  dom.introIcon.textContent = lesson.intro.icon ?? '';
  dom.introTitle.textContent = lesson.intro.title;
  dom.introBody.textContent = lesson.intro.body;
  setIntroOpen(true);
}

/** Інтро нової команди — лише при першому відкритті рівня за сесію; далі — кнопка «?». */
function showIntroIfNeeded(lesson) {
  if (!lesson.intro || appState.introSeen.has(lesson.id)) return;
  appState.introSeen.add(lesson.id);
  openIntro(lesson);
}

// --- code panel ---

function currentCodeText() {
  return programToText(buildProgramCode(appState.currentLesson, appState.workspace));
}

function activeCodeLine() {
  if (appState.activeBlockId === null || !programCode) return null;
  return programCode.lineByBlockId.get(appState.activeBlockId) ?? null;
}

function updateCodePanel() {
  programCode = buildProgramCode(appState.currentLesson, appState.workspace);
  renderCodeView(dom, programCode);
  highlightCodeLine(dom, activeCodeLine());
  updateEditorLink();
}

/** «Відкрити в Равлику» несе код у фрагменті #code=…, тож редактор відкривається з ним. */
function updateEditorLink() {
  if (!dom.openRavlykLink) return;
  const { href, fits } = buildEditorLink(programToText(programCode));
  dom.openRavlykLink.href = href;
  dom.openRavlykLink.dataset.fits = String(fits);
}

function onOpenRavlykClick() {
  if (dom.openRavlykLink.dataset.fits !== 'false') return;
  // Код задовгий для адреси: копіюємо його, а редактор відкривається порожнім.
  void copyCode();
}

function switchView(view) {
  setView(view);
  setEditorView(dom, appState.view);
  if (appState.view === 'code') {
    updateCodePanel();
  } else {
    dom.copyStatus.textContent = '';
  }
}

async function copyCode() {
  const ok = await copyText(currentCodeText());
  const message = ok
    ? 'Код скопійовано — встав його в редактор Равлика'
    : 'Не вдалося скопіювати. Виділи код мишкою й натисни Ctrl+C.';
  dom.copyStatus.textContent = message;
  dom.copyStatus.classList.toggle('is-error', !ok);
  announce(message);
  window.clearTimeout(copyStatusTimer);
  copyStatusTimer = window.setTimeout(() => { dom.copyStatus.textContent = ''; }, COPY_STATUS_MS);
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

function dropBlocks({ source, mode, slot, height, x, y }) {
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
    ok = slot.anchor === 'bottom'
      ? attachAbove(doc, tail, slot.owner, height)
      : placeTail(doc, tail, slot);
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
  const ghost = getGhostSegments(appState.currentLesson);
  renderLessonGuide(dom, appState.currentLesson, ghost);
  dom.ghostDescription.textContent = describeGhost(ghost, appState.currentLesson.start);
  updateWorkspaceUi();
  renderControls(dom, appState);
}

function resetBoard() {
  const turtle = createTurtleForLesson(appState.currentLesson);
  clearTurtleCanvas(dom);
  selectTurtlePose(dom, turtle, turtle);
  placeTurtleSnail(dom, turtle);
  dom.canvasStatus.textContent = `${describeTurtleStatus(turtle)}. Готовий малювати.`;
}

function loadLesson(index) {
  session = null;
  appState.animating = false;
  appState.autoRun = false;
  setRunning(false);
  setLesson(index);
  clearHistory();
  appState.insertTargetId = null;
  clearFeedback(dom);
  hideSuccessModal();
  closePopover();
  setResetConfirmOpen(false);
  moreMenu?.close();
  lessonMenu?.close();

  refreshUi();
  resetBoard();
  highlightCodeLine(dom, null);
  showIntroIfNeeded(appState.currentLesson);
}

function performResetLesson() {
  pushSnapshot(getDoc());
  clearWorkspace();
  resetRuntimeState();
  appState.insertTargetId = null;
  appState.errorBlockId = null;
  clearFeedback(dom);
  hideSuccessModal();
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

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Плавно проводить равлика від step.before до step.after; лінія росте разом із ним.
 * `finishAnimation()` у будь-який момент миттєво ставить кінцевий стан кроку.
 */
function animateStep(step, duration, isCancelled) {
  const { before, after, segment } = step;
  const line = segment ? addTrailSegment(dom, { ...segment, to: [before.x, before.y] }) : null;

  return new Promise((resolve) => {
    const startedAt = window.performance.now();
    let settled = false;

    function finish(value) {
      if (settled) return;
      settled = true;
      finishAnimation = () => {};
      resolve(value);
    }

    function showFinal() {
      placeTurtleSnail(dom, after);
      if (line) setTrailEnd(line, after.x, after.y);
    }

    finishAnimation = () => {
      if (settled) return;
      showFinal();
      finish(true);
    };

    function frame(now) {
      if (settled) return;
      if (isCancelled()) {
        // Зупинка або перехід на інший рівень: нічого не чіпаємо, лінія лишається як є.
        finish(false);
        return;
      }
      const t = Math.min(1, (now - startedAt) / duration);
      const turtle = interpolateTurtle(before, after, t);
      placeTurtleSnail(dom, turtle);
      if (line) setTrailEnd(line, turtle.x, turtle.y);
      if (t >= 1) {
        finish(true);
      } else {
        window.requestAnimationFrame(frame);
      }
    }
    window.requestAnimationFrame(frame);
  });
}

/** Завершує сеанс виконання: знімає блокування й підсвітку. */
function endSession() {
  session = null;
  appState.animating = false;
  appState.autoRun = false;
  setRunning(false);
  setActiveBlock(null);
  highlightCodeLine(dom, null);
  renderControls(dom, appState);
  updateWorkspaceUi();
}

/** Перевіряє програму й починає сеанс: поле скидається, програма заморожується. */
function beginSession() {
  if (appState.workspace.length === 0) {
    showFeedback(dom, appState.loose.length > 0
      ? 'Приєднай блоки до «коли ▶ натиснуто» — окремі блоки не виконуються.'
      : 'Додай хоча б одну команду.');
    return null;
  }

  const validation = validateProgram(appState.workspace);
  if (!validation.ok) {
    appState.errorBlockId = validation.blockId ?? null;
    highlightBlocks(appState);
    showFeedback(dom, validation.message);
    return null;
  }

  appState.errorBlockId = null;
  closePopover();
  clearFeedback(dom);
  hideSuccessModal();
  resetRuntimeState();
  resetBoard();
  const created = { stepper: createStepper(appState.workspace, appState.currentLesson), controller: null };
  created.controller = createStepController({
    playStep: () => playStep(created),
    finishNow: () => finishAnimation(),
  });
  session = created;
  setRunning(true);
  renderControls(dom, appState);
  updateWorkspaceUi();
  return created;
}

/**
 * Виконує рівно один примітив сеансу й показує його.
 * @returns {Promise<{ status: 'ok'|'done'|'cancelled'|'error', message?: string }>}
 */
async function playStep(current) {
  let step;
  try {
    step = current.stepper.next();
  } catch (error) {
    return { status: 'error', message: error?.message || 'Програму не вдалося виконати.' };
  }
  if (!step) return { status: 'done' };

  setActiveBlock(step.blockId);
  highlightBlocks(appState);
  highlightCodeLine(dom, activeCodeLine());
  if (step.segment) appState.turtleSegments.push(step.segment);
  selectTurtlePose(dom, step.before, step.after, appState.turtleSegments);

  const turtle = step.after;
  if (prefersReducedMotion()) {
    // «Менше руху» сильніше за перемикач швидкості: без анімації, лише кроки.
    if (step.segment) addTrailSegment(dom, step.segment);
    placeTurtleSnail(dom, turtle);
    await sleep(REDUCED_MOTION_STEP_PAUSE_MS);
  } else {
    const duration = getStepDuration(step.before, step.after, speedFactor(appState.speed));
    const finished = await animateStep(step, duration, () => session !== current);
    if (!finished) return { status: 'cancelled' };
  }
  if (session !== current) return { status: 'cancelled' };

  // Під час автозапуску повідомляємо лише підсумок, щоб читач екрана не тараторив на кожен крок.
  if (!appState.autoRun || current.stepper.done) dom.canvasStatus.textContent = describeTurtleStatus(turtle);
  return { status: current.stepper.done ? 'done' : 'ok' };
}

async function finishProgram() {
  endSession();

  const result = evaluateGoal(appState.currentLesson, {
    segments: appState.turtleSegments,
    workspace: appState.workspace,
    expected: getGhostSegments(appState.currentLesson),
    bestBlocks: getBestBlocks(appState.currentLesson),
  });
  if (result.ok) {
    playSuccess();
    markLessonDone(appState.currentLessonIndex, result.stars);
    refreshUi();
    wiggleSnail(dom);
    dom.screenReaderAnnouncer.textContent = appState.currentLesson.successMessage;
    const lessonIndex = appState.currentLessonIndex;
    await sleep(SUCCESS_CELEBRATION_DELAY_MS);
    // Користувач міг почати інший сеанс або перейти на інший рівень.
    if (appState.currentLessonIndex !== lessonIndex || appState.running) return;
    showSuccessModal(appState.currentLesson, lessonIndex === lessons.length - 1, {
      stars: result.stars,
      blockCount: countBlocks(),
      bestBlocks: getBestBlocks(appState.currentLesson),
    });
  } else {
    playFailure();
    showFeedback(dom, result.message);
  }
}

/** Розбирає підсумок playStep: завершення програми, помилка рушія або пауза. */
async function settleStep(current, outcome) {
  if (session !== current) return; // зупинено або скинуто — стан уже прибрано
  if (outcome.status === 'done') {
    await finishProgram();
  } else if (outcome.status === 'error') {
    endSession();
    showFeedback(dom, outcome.message);
  }
}

/**
 * Спільний вхід для «Старт/Далі» і «Крок». Натискання під час анімації кроку
 * доводить його до кінця й виконує наступне (див. stepController.js).
 */
async function drive(kind) {
  const fresh = session === null;
  ensureFieldVisible();
  const current = session ?? beginSession();
  if (!current) return;
  if (kind === 'step' && appState.autoRun) return;
  if (kind === 'run' && appState.autoRun) return;

  if (kind === 'run') appState.autoRun = true;
  appState.animating = true;
  renderControls(dom, appState);
  if (fresh && kind === 'run') await sleep(120);

  const pending = kind === 'run' ? current.controller.pressRun() : current.controller.pressStep();
  if (pending === null) {
    renderControls(dom, appState);
    return; // натискання приєднано до циклу, що вже працює
  }
  const outcome = await pending;
  if (session !== current) return;
  appState.animating = false;
  appState.autoRun = false;
  renderControls(dom, appState);
  if (outcome.status === 'ok') {
    announce('Крок виконано');
  } else {
    await settleStep(current, outcome);
  }
}

const runProgram = () => drive('run');
const stepProgram = () => drive('step');

function stopProgram() {
  if (!session) return;
  session.controller.cancel();
  endSession();
  showFeedback(dom, 'Програму зупинено.', 'info');
}

/** Спочатку: поле й равлик як на старті, програма лишається. */
function restartBoard() {
  if (session) endSession();
  clearFeedback(dom);
  hideSuccessModal();
  resetRuntimeState();
  resetBoard();
  highlightCodeLine(dom, null);
  announce('Поле очищено, програма лишилась');
}

function closeSuccess() {
  hideSuccessModal();
  dom.runButton.focus();
}

function goToNextLesson() {
  hideSuccessModal();
  if (appState.currentLessonIndex < lessons.length - 1) {
    loadLesson(appState.currentLessonIndex + 1);
  } else {
    loadLesson(0);
  }
}

function setBlocksStyle(pastel) {
  document.body.classList.toggle('blocks-pastel', pastel);
  dom.blocksStyleButton.setAttribute('aria-pressed', String(pastel));
  dom.blocksStyleButton.textContent = pastel ? 'Яскраві' : 'Пастельні';
}

function bindEvents() {
  dom.runButton.addEventListener('click', runProgram);
  dom.stopButton.addEventListener('click', stopProgram);
  dom.resetButton.addEventListener('click', () => { moreMenu.close(); requestResetLesson(); });
  dom.resetConfirmButton.addEventListener('click', performResetLesson);
  dom.resetCancelButton.addEventListener('click', () => setResetConfirmOpen(false));
  dom.stepButton.addEventListener('click', stepProgram);
  dom.restartButton.addEventListener('click', () => { moreMenu.close(); restartBoard(); });
  dom.stayButton.addEventListener('click', closeSuccess);
  dom.helpButton.addEventListener('click', () => openIntro(appState.currentLesson));
  dom.hintButton?.addEventListener('click', () => {
    const open = dom.hintButton.getAttribute('aria-expanded') !== 'true';
    renderHint(dom, appState.currentLesson, open);
    if (open) announce(appState.currentLesson.hint);
  });
  dom.tabBlocks.addEventListener('click', () => switchView('blocks'));
  dom.tabCode.addEventListener('click', () => switchView('code'));
  dom.copyCodeButton.addEventListener('click', copyCode);
  dom.openRavlykLink?.addEventListener('click', onOpenRavlykClick);
  dom.speedSwitch.addEventListener('click', (event) => {
    const button = event.target.closest('[data-speed]');
    if (!button || !(button.dataset.speed in SPEEDS)) return;
    setSpeed(button.dataset.speed);
    renderControls(dom, appState);
  });
  dom.tabBlocks.parentElement.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = appState.view === 'blocks' ? 'code' : 'blocks';
    switchView(next);
    (next === 'code' ? dom.tabCode : dom.tabBlocks).focus();
  });
  dom.overlay.addEventListener('click', (event) => {
    if (event.target === dom.overlay) closeSuccess();
  });
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
      if (moreMenu?.isOpen()) {
        moreMenu.close({ restoreFocus: true });
      } else if (lessonMenu?.isOpen()) {
        lessonMenu.close({ restoreFocus: true });
      } else if (isSuccessOpen(dom)) {
        closeSuccess();
      } else if (dom.introOverlay.classList.contains('show')) {
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
    onSnap: playSnap,
  });
  moreMenu = createMoreMenu(dom);
  lessonMenu = createLessonMenu(dom);
  bindEvents();
  setBlocksStyle(new URLSearchParams(window.location.search).get('blocks') === 'pastel');
  setEditorView(dom, appState.view);
  setResetConfirmOpen(false);
  loadLesson(0);
}

init();
