import { createManagedModal } from './focus.js';
import { renderLevelMap } from './renderLevelMap.js';

export function createTextElement({ className, documentRef = document, id, tagName, text }) {
  const element = documentRef.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (id) {
    element.id = id;
  }
  element.textContent = text;
  return element;
}

export function createModalCloseButton({ documentRef = document, id, text }) {
  const button = documentRef.createElement('button');
  button.className = 'modal-close-btn';
  button.id = id;
  button.type = 'button';
  button.setAttribute('aria-label', text.ui.mapClose);
  button.setAttribute('title', text.ui.mapClose);
  button.textContent = '\u00d7';
  return button;
}

export function renderMessageModal({
  actionId,
  actionText,
  bodyText,
  closeExistingModal,
  closeId,
  documentRef = document,
  modalClass,
  onAction,
  openModal,
  text,
  titleId,
  titleText
}) {
  closeExistingModal?.({ restoreFocus: false });
  const backdrop = documentRef.createElement('div');
  backdrop.className = `mbd ${modalClass || ''}`.trim();
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', titleId);

  const box = documentRef.createElement('div');
  box.className = 'mbox modal-box-with-close';

  const closeButton = createModalCloseButton({ documentRef, id: closeId, text });
  const title = createTextElement({ documentRef, tagName: 'h2', className: 'mttl', text: titleText, id: titleId });
  const body = createTextElement({ documentRef, tagName: 'p', className: 'mbdy', text: bodyText });
  const actions = documentRef.createElement('div');
  actions.className = 'modal-actions';
  const actionButton = createTextElement({ documentRef, tagName: 'button', className: 'mok', text: actionText, id: actionId });
  actionButton.type = 'button';

  actions.appendChild(actionButton);
  box.append(closeButton, title, body, actions);
  backdrop.appendChild(box);

  const modal = openModal
    ? openModal(backdrop, { initialFocusSelector: `#${actionId}` })
    : createManagedModal({
      backdrop,
      documentRef,
      initialFocusSelector: `#${actionId}`
    });

  closeButton.addEventListener('click', () => modal.close());
  actionButton.addEventListener('click', () => {
    modal.close({ restoreFocus: false });
    onAction?.();
  });

  return modal;
}

export function renderLevelMapModal({
  closeExistingModal,
  completedLevelIds,
  currentLevelId,
  documentRef = document,
  levels,
  onSelect,
  openModal,
  text
}) {
  closeExistingModal?.({ restoreFocus: false });
  const backdrop = documentRef.createElement('div');
  backdrop.className = 'mbd';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'map-title');

  const box = documentRef.createElement('div');
  box.className = 'mbox map-box modal-box-with-close';
  const closeButton = createModalCloseButton({ documentRef, id: 'map-close', text });
  const title = createTextElement({ documentRef, tagName: 'h2', className: 'mttl', text: text.ui.mapTitle, id: 'map-title' });
  const body = createTextElement({ documentRef, tagName: 'p', className: 'mbdy', text: text.ui.mapBody });
  const grid = renderLevelMap({
    completedLevelIds,
    currentLevelId,
    documentRef,
    levels,
    onSelect(levelId) {
      modal.close({ restoreFocus: false });
      onSelect?.(levelId);
    },
    text
  });

  box.append(closeButton, title, body, grid);
  backdrop.appendChild(box);

  const modal = openModal
    ? openModal(backdrop, { initialFocusSelector: '#map-close' })
    : createManagedModal({
      backdrop,
      documentRef,
      initialFocusSelector: '#map-close'
    });

  closeButton.addEventListener('click', () => modal.close());
  return modal;
}

export function renderTurnHintModal({
  documentRef = document,
  includeTurnHint = false,
  openModal,
  text
}) {
  const backdrop = documentRef.createElement('div');
  backdrop.className = 'mbd turn-hint-modal';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'turn-hint-title');

  const box = documentRef.createElement('div');
  box.className = 'mbox modal-box-with-close';
  const closeButton = createModalCloseButton({ documentRef, id: 'turn-hint-close', text });
  const title = createTextElement({ documentRef, tagName: 'h2', className: 'mttl', text: text.ui.tryAgainTitle, id: 'turn-hint-title' });
  const body = createTextElement({ documentRef, tagName: 'p', className: 'mbdy', text: text.ui.tryAgainBody });
  if (includeTurnHint) {
    body.appendChild(documentRef.createElement('br'));
    body.appendChild(createTextElement({ documentRef, tagName: 'span', text: text.ui.tryAgainTurns }));
  }
  const actions = documentRef.createElement('div');
  actions.className = 'modal-actions';
  const okButton = createTextElement({ documentRef, tagName: 'button', className: 'mok', text: text.ui.tryAgainAction, id: 'turn-hint-ok' });
  okButton.type = 'button';

  actions.appendChild(okButton);
  box.append(closeButton, title, body, actions);
  backdrop.appendChild(box);

  const modal = openModal
    ? openModal(backdrop, { initialFocusSelector: '#turn-hint-ok' })
    : createManagedModal({
      backdrop,
      documentRef,
      initialFocusSelector: '#turn-hint-ok'
    });

  closeButton.addEventListener('click', () => modal.close());
  okButton.addEventListener('click', () => modal.close());
  return modal;
}

export function renderResultModal({
  actionId,
  actionText,
  bodyText,
  closeId,
  documentRef = document,
  iconText,
  onAction,
  openModal,
  text,
  titleId,
  titleText
}) {
  const backdrop = documentRef.createElement('div');
  backdrop.className = 'mbd';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', titleId);

  const box = documentRef.createElement('div');
  box.className = 'mbox win-modal-box';
  const closeButton = createModalCloseButton({ documentRef, id: closeId, text });
  const icon = documentRef.createElement('div');
  icon.className = 'mico';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = iconText;
  const title = createTextElement({ documentRef, tagName: 'h2', className: 'mttl', text: titleText, id: titleId });
  const body = createTextElement({ documentRef, tagName: 'p', className: 'mbdy', text: bodyText });
  const actions = documentRef.createElement('div');
  actions.className = 'modal-actions';
  const actionButton = createTextElement({ documentRef, tagName: 'button', className: 'mok', text: actionText, id: actionId });
  actionButton.type = 'button';

  actions.appendChild(actionButton);
  box.append(closeButton, icon, title, body, actions);
  backdrop.appendChild(box);

  const modal = openModal
    ? openModal(backdrop, { initialFocusSelector: `#${actionId}` })
    : createManagedModal({
      backdrop,
      documentRef,
      initialFocusSelector: `#${actionId}`
    });

  closeButton.addEventListener('click', () => modal.close());
  actionButton.addEventListener('click', () => {
    modal.close({ restoreFocus: false });
    onAction?.();
  });

  return modal;
}

export function renderLevelIntroModal({
  completedLevelIds,
  documentRef = document,
  level,
  levelChipText,
  onClose,
  onSpeak,
  openModal,
  text
}) {
  const isDebug = level.type === 'debug';
  const isOnboarding = level.id === 1 && completedLevelIds.length === 0;
  const isEarlyLevel = level.id <= 3 && !isDebug;
  const onboardingText = text.onboarding || {};
  const earlyLevelText = text.earlyLevel || {};
  const debugLevelText = text.debugLevel || {};
  const introTitle = isOnboarding ? (onboardingText.title || level.name) : level.name;
  const introGoal = isOnboarding ? (onboardingText.goal || level.goal) : level.goal;
  const introTaskLabel = isOnboarding
    ? (onboardingText.taskLabel || text.ui.taskLabel)
    : isDebug
      ? (debugLevelText.taskLabel || text.ui.taskLabel)
      : isEarlyLevel
        ? (earlyLevelText.taskLabel || text.ui.taskLabel)
        : text.ui.taskLabel;
  const introTaskText = isOnboarding
    ? (onboardingText.taskText || level.hint)
    : isDebug && debugLevelText.taskTextSuffix
      ? `${level.hint} ${debugLevelText.taskTextSuffix}`
      : level.hint;
  const introListenAction = isEarlyLevel
    ? (earlyLevelText.listenAction || text.ui.listenTask)
    : text.ui.listenTask;
  const introStartAction = isOnboarding
    ? (onboardingText.startAction || text.ui.startAction)
    : isEarlyLevel
      ? (earlyLevelText.startAction || text.ui.startAction)
      : text.ui.startAction;

  const backdrop = documentRef.createElement('div');
  backdrop.className = 'mbd level-intro-modal';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'level-intro-title');

  const box = documentRef.createElement('div');
  box.className = 'mbox level-intro-box modal-box-with-close';
  const closeButton = createModalCloseButton({ documentRef, id: 'level-intro-close', text });
  const chip = createTextElement({ documentRef, tagName: 'span', className: 'level-chip', text: levelChipText });
  const title = createTextElement({ documentRef, tagName: 'h2', className: 'mttl level-intro-title', text: introTitle, id: 'level-intro-title' });
  box.append(closeButton, chip, title);

  if (isOnboarding && onboardingText.body) {
    box.appendChild(createTextElement({ documentRef, tagName: 'p', className: 'mbdy', text: onboardingText.body }));
  }

  const levelCard = documentRef.createElement('div');
  levelCard.className = 'level-card';
  const badges = documentRef.createElement('div');
  badges.className = 'level-badges';
  if (isDebug) {
    badges.appendChild(createTextElement({ documentRef, tagName: 'span', className: 'mode-chip debug', text: text.mode(true) }));
  }
  badges.appendChild(createTextElement({ documentRef, tagName: 'span', className: 'goal-chip', text: introGoal }));

  const taskCard = documentRef.createElement('div');
  taskCard.className = 'level-task-card';
  const taskLabel = createTextElement({ documentRef, tagName: 'div', className: 'level-task-label', text: introTaskLabel });
  const taskText = createTextElement({ documentRef, tagName: 'p', className: 'level-hint level-task-text', text: introTaskText });
  const speakButton = createTextElement({ documentRef, tagName: 'button', className: 'speak-btn level-speak-btn', text: introListenAction, id: 'level-intro-speak' });
  speakButton.type = 'button';
  taskCard.append(taskLabel, taskText, speakButton);
  levelCard.append(badges, taskCard);

  const actions = documentRef.createElement('div');
  actions.className = 'modal-actions';
  const startButton = createTextElement({ documentRef, tagName: 'button', className: 'mok', text: introStartAction, id: 'level-intro-start' });
  startButton.type = 'button';
  actions.appendChild(startButton);
  box.append(levelCard, actions);
  backdrop.appendChild(box);

  const modal = openModal
    ? openModal(backdrop, { initialFocusSelector: '#level-intro-start', onClose })
    : createManagedModal({
      backdrop,
      documentRef,
      initialFocusSelector: '#level-intro-start',
      onClose
    });

  speakButton.addEventListener('click', () => onSpeak?.());
  closeButton.addEventListener('click', () => modal.close());
  startButton.addEventListener('click', () => modal.close());
  return modal;
}

export function createUiModals({
  app,
  documentRef = document,
  loadCurrentLevel,
  refs,
  speakCurrentTask,
  stopTaskSpeech,
  text,
  windowRef = window
}) {
  const { levelChipEl } = refs;
  let activeModal = null;

  function closeManagedModal(modalState, options) {
    modalState?.close(options);
  }

  function closeActiveModal(options) {
    closeManagedModal(activeModal, options);
  }

  function openManagedModal(backdrop, options = {}) {
    const {
      initialFocusSelector,
      closeOnBackdrop = true,
      closeOnEscape = true,
      onClose
    } = options;

    closeActiveModal({ restoreFocus: false });

    let modalState = null;
    modalState = createManagedModal({
      backdrop,
      closeOnBackdrop,
      closeOnEscape,
      documentRef,
      initialFocusSelector,
      onClose: () => {
        if (activeModal === modalState) {
          activeModal = null;
        }
        onClose?.();
      },
      requestFrame: windowRef.requestAnimationFrame?.bind(windowRef) || ((callback) => callback())
    });
    activeModal = modalState;
    return modalState;
  }

  function closeLevelIntro() {
    if (activeModal?.backdrop?.classList.contains('level-intro-modal')) {
      closeManagedModal(activeModal);
    }
  }

  function showTurnHintModal(options = {}) {
    const { includeTurnHint = false } = options;
    if (activeModal?.backdrop?.classList.contains('turn-hint-modal')) {
      return;
    }

    renderTurnHintModal({
      documentRef,
      includeTurnHint,
      openModal(backdrop, modalOptions) {
        return openManagedModal(backdrop, modalOptions);
      },
      text
    });
  }

  function openClearConfirmModal() {
    if (app.state.running) {
      return;
    }
    if (activeModal?.backdrop?.classList.contains('clear-confirm-modal')) {
      return;
    }

    renderMessageModal({
      actionId: 'clear-confirm',
      actionText: text.ui.clearConfirmAction,
      bodyText: text.ui.clearConfirmBody,
      closeId: 'clear-close',
      documentRef,
      modalClass: 'clear-confirm-modal',
      onAction() {
        app.engine.clearAll();
      },
      openModal(backdrop, modalOptions) {
        return openManagedModal(backdrop, modalOptions);
      },
      text,
      titleId: 'clear-confirm-title',
      titleText: text.ui.clearConfirmTitle
    });
  }

  function openLevelIntro() {
    closeLevelIntro();
    stopTaskSpeech();

    renderLevelIntroModal({
      completedLevelIds: app.state.completedLevelIds,
      documentRef,
      level: app.state.currentLevel,
      levelChipText: levelChipEl.textContent,
      onClose: () => stopTaskSpeech(),
      onSpeak: speakCurrentTask,
      openModal(backdrop, options) {
        return openManagedModal(backdrop, options);
      },
      text
    });
  }

  function openLevelMap() {
    renderLevelMapModal({
      completedLevelIds: app.state.completedLevelIds,
      currentLevelId: app.state.currentLevel.id,
      documentRef,
      levels: app.levels,
      onSelect(levelId) {
        if (app.setCurrentLevel(levelId)) {
          loadCurrentLevel({ showIntro: false });
        }
      },
      openModal(backdrop, options) {
        return openManagedModal(backdrop, options);
      },
      text
    });
  }

  function showAlreadySolvedModal() {
    const hasNext = app.hasNextLevel();
    renderResultModal({
      actionId: 'already-solved-action',
      actionText: text.winAction(hasNext),
      bodyText: text.ui.alreadySolvedBody,
      closeId: 'already-solved-close',
      documentRef,
      iconText: '\u{1F3C6}',
      onAction() {
        if (hasNext) {
          if (app.setCurrentLevel(app.getNextLevelId())) {
            loadCurrentLevel({ showIntro: true });
          }
          return;
        }
        app.restartProgress();
        loadCurrentLevel({ showIntro: true });
      },
      openModal(backdrop, options) {
        return openManagedModal(backdrop, options);
      },
      text,
      titleId: 'already-solved-title',
      titleText: text.ui.alreadySolvedTitle
    });
  }

  function showWin() {
    const hasNext = app.hasNextLevel();
    const isFinalWin = !hasNext && app.state.completedLevelIds.includes(app.state.currentLevel.id);
    renderResultModal({
      actionId: 'mok',
      actionText: text.winAction(hasNext),
      bodyText: text.winBody(isFinalWin),
      closeId: 'win-close',
      documentRef,
      iconText: '\u{1F389}',
      onAction() {
        if (hasNext) {
          if (app.setCurrentLevel(app.getNextLevelId())) {
            loadCurrentLevel({ showIntro: true });
          }
          return;
        }
        if (isFinalWin) {
          app.restartProgress();
          loadCurrentLevel({ showIntro: true });
          return;
        }
        app.engine.clearAll();
      },
      openModal(backdrop, options) {
        return openManagedModal(backdrop, options);
      },
      text,
      titleId: 'win-title',
      titleText: text.winTitle(isFinalWin)
    });
  }

  return {
    closeActiveModal,
    closeLevelIntro,
    hasActiveModal: () => !!activeModal,
    openClearConfirmModal,
    openLevelIntro,
    openLevelMap,
    showAlreadySolvedModal,
    showTurnHintModal,
    showWin
  };
}
