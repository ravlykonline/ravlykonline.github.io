import { createManagedModal } from './focus.js';
import { createAssetIcon } from './assets.js';
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
  cancelText,
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
  const cancelButton = cancelText ? createTextElement({
    documentRef,
    tagName: 'button',
    className: 'mok mok-secondary',
    text: cancelText,
    id: `${actionId}-cancel`
  }) : null;
  if (cancelButton) {
    cancelButton.type = 'button';
    actions.appendChild(cancelButton);
  }
  box.append(closeButton, title, body, actions);
  backdrop.appendChild(box);

  const initialFocusSelector = `#${cancelButton ? cancelButton.id : actionId}`;
  const modal = openModal
    ? openModal(backdrop, { initialFocusSelector })
    : createManagedModal({
      backdrop,
      documentRef,
      initialFocusSelector
    });

  closeButton.addEventListener('click', () => modal.close());
  cancelButton?.addEventListener('click', () => modal.close());
  actionButton.addEventListener('click', () => {
    modal.close();
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
  onRestart,
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
      modal.close();
      onSelect?.(levelId);
    },
    text
  });

  box.append(closeButton, title, body, grid);
  if (onRestart) {
    const restart = createTextElement({
      documentRef, tagName: 'button', className: 'mok mok-secondary', text: text.ui.restartGame
    });
    restart.type = 'button';
    restart.addEventListener('click', () => {
      modal.close();
      onRestart();
    });
    box.appendChild(restart);
  }
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

export function renderResultModal({
  actionId,
  actionText,
  bodyText,
  closeId,
  documentRef = document,
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
  const icon = createAssetIcon({ documentRef, filename: 'apple.svg', className: 'mico' });
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
  documentRef = document,
  level,
  levelChipText,
  onClose,
  onSpeak,
  openModal,
  text
}) {
  const backdrop = documentRef.createElement('div');
  backdrop.className = 'mbd level-intro-modal';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'level-intro-title');

  const box = documentRef.createElement('div');
  box.className = 'mbox level-intro-box modal-box-with-close';
  const closeButton = createModalCloseButton({ documentRef, id: 'level-intro-close', text });
  const chip = createTextElement({ documentRef, tagName: 'span', className: 'level-chip', text: levelChipText });
  const title = createTextElement({ documentRef, tagName: 'h2', className: 'mttl level-intro-title', text: level.name, id: 'level-intro-title' });
  box.append(closeButton, chip, title);

  const taskCard = documentRef.createElement('div');
  taskCard.className = 'level-task-card';
  const taskText = createTextElement({ documentRef, tagName: 'p', className: 'level-hint level-task-text', text: level.hint });
  const speakButton = createTextElement({ documentRef, tagName: 'button', className: 'speak-btn level-speak-btn', text: text.ui.listenTask, id: 'level-intro-speak' });
  speakButton.type = 'button';
  taskCard.append(taskText, speakButton);

  const actions = documentRef.createElement('div');
  actions.className = 'modal-actions';
  const startButton = createTextElement({ documentRef, tagName: 'button', className: 'mok', text: text.ui.startAction, id: 'level-intro-start' });
  startButton.type = 'button';
  actions.appendChild(startButton);
  box.append(taskCard, actions);
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
      cancelText: text.ui.clearCancelAction,
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
      onRestart: openRestartConfirmModal,
      onSelect(levelId) {
        if (app.setCurrentLevel(levelId)) {
          loadCurrentLevel();
        }
      },
      openModal(backdrop, options) {
        return openManagedModal(backdrop, options);
      },
      text
    });
  }

  function openRestartConfirmModal() {
    renderMessageModal({
      actionId: 'restart-confirm',
      actionText: text.ui.restartGame,
      bodyText: text.ui.restartConfirmBody,
      cancelText: text.ui.clearCancelAction,
      closeId: 'restart-close',
      documentRef,
      modalClass: 'restart-confirm-modal',
      onAction() {
        app.restartProgress();
        loadCurrentLevel();
        refs.btnMap?.focus();
      },
      openModal: openManagedModal,
      text,
      titleId: 'restart-confirm-title',
      titleText: text.ui.restartConfirmTitle
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
      onAction() {
        if (hasNext) {
          if (app.setCurrentLevel(app.getNextLevelId())) {
            loadCurrentLevel();
          }
          return;
        }
        openRestartConfirmModal();
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
      onAction() {
        if (hasNext) {
          if (app.setCurrentLevel(app.getNextLevelId())) {
            loadCurrentLevel();
          }
          return;
        }
        if (isFinalWin) {
          openRestartConfirmModal();
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
    showWin
  };
}
