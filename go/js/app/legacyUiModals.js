import { createManagedModal } from '../ui/focus.js';
import { createModalCloseButton, createTextElement } from '../ui/modals.js';

export function installLegacyUiModals({ documentRef = document, windowRef = window } = {}) {
  const app = windowRef.SnailGame;

  app.createUiModals = function createUiModals(deps) {
    const {
      loadCurrentLevel,
      refs,
      speakCurrentTask,
      stopTaskSpeech,
      text
    } = deps;
    const { levelChipEl } = refs;
    let activeModal = null;

    function textEl(tagName, className, textValue, id) {
      return createTextElement({
        className,
        documentRef,
        id,
        tagName,
        text: textValue
      });
    }

    function closeButton(id) {
      return createModalCloseButton({ documentRef, id, text });
    }

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

      const backdrop = documentRef.createElement('div');
      backdrop.className = 'mbd turn-hint-modal';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-labelledby', 'turn-hint-title');

      const box = documentRef.createElement('div');
      box.className = 'mbox modal-box-with-close';
      const close = closeButton('turn-hint-close');
      const title = textEl('h2', 'mttl', text.ui.tryAgainTitle, 'turn-hint-title');
      const body = textEl('p', 'mbdy', text.ui.tryAgainBody);
      if (includeTurnHint) {
        body.appendChild(documentRef.createElement('br'));
        body.append(text.ui.tryAgainTurns);
      }
      const actions = documentRef.createElement('div');
      actions.className = 'modal-actions';
      const okButton = textEl('button', 'mok', text.ui.tryAgainAction, 'turn-hint-ok');
      okButton.type = 'button';

      actions.appendChild(okButton);
      box.append(close, title, body, actions);
      backdrop.appendChild(box);

      const modalState = openManagedModal(backdrop, {
        initialFocusSelector: '#turn-hint-ok'
      });

      close.addEventListener('click', () => closeManagedModal(modalState));
      okButton.addEventListener('click', () => closeManagedModal(modalState));
    }

    function openClearConfirmModal() {
      if (app.state.running) {
        return;
      }
      if (activeModal?.backdrop?.classList.contains('clear-confirm-modal')) {
        return;
      }

      const backdrop = documentRef.createElement('div');
      backdrop.className = 'mbd clear-confirm-modal';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-labelledby', 'clear-confirm-title');

      const box = documentRef.createElement('div');
      box.className = 'mbox modal-box-with-close';
      const close = closeButton('clear-close');
      const title = textEl('h2', 'mttl', text.ui.clearConfirmTitle, 'clear-confirm-title');
      const body = textEl('p', 'mbdy', text.ui.clearConfirmBody);
      const actions = documentRef.createElement('div');
      actions.className = 'modal-actions';
      const confirmButton = textEl('button', 'mok', text.ui.clearConfirmAction, 'clear-confirm');
      confirmButton.type = 'button';

      actions.appendChild(confirmButton);
      box.append(close, title, body, actions);
      backdrop.appendChild(box);

      const modalState = openManagedModal(backdrop, {
        initialFocusSelector: '#clear-confirm'
      });

      close.addEventListener('click', () => closeManagedModal(modalState));
      confirmButton.addEventListener('click', () => {
        closeManagedModal(modalState, { restoreFocus: false });
        app.engine.clearAll();
      });
    }

    function openLevelIntro() {
      closeLevelIntro();
      stopTaskSpeech();

      const current = app.state.currentLevel;
      const isDebug = current.type === 'debug';
      const isOnboarding = current.id === 1 && app.state.completedLevelIds.length === 0;
      const isEarlyLevel = current.id <= 3 && !isDebug;
      const onboardingText = text.onboarding || {};
      const earlyLevelText = text.earlyLevel || {};
      const debugLevelText = text.debugLevel || {};
      const introTitle = isOnboarding ? (onboardingText.title || current.name) : current.name;
      const introGoal = isOnboarding ? (onboardingText.goal || current.goal) : current.goal;
      const introTaskLabel = isOnboarding
        ? (onboardingText.taskLabel || text.ui.taskLabel)
        : isDebug
          ? (debugLevelText.taskLabel || text.ui.taskLabel)
          : isEarlyLevel
            ? (earlyLevelText.taskLabel || text.ui.taskLabel)
            : text.ui.taskLabel;
      const introTaskText = isOnboarding
        ? (onboardingText.taskText || current.hint)
        : isDebug && debugLevelText.taskTextSuffix
          ? `${current.hint} ${debugLevelText.taskTextSuffix}`
          : current.hint;
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
      const close = closeButton('level-intro-close');
      const chip = textEl('span', 'level-chip', levelChipEl.textContent);
      const title = textEl('h2', 'mttl level-intro-title', introTitle, 'level-intro-title');
      box.append(close, chip, title);

      if (isOnboarding && onboardingText.body) {
        box.appendChild(textEl('p', 'mbdy', onboardingText.body));
      }

      const levelCard = documentRef.createElement('div');
      levelCard.className = 'level-card';
      const badges = documentRef.createElement('div');
      badges.className = 'level-badges';
      if (isDebug) {
        badges.appendChild(textEl('span', 'mode-chip debug', text.mode(true)));
      }
      badges.appendChild(textEl('span', 'goal-chip', introGoal));

      const taskCard = documentRef.createElement('div');
      taskCard.className = 'level-task-card';
      const taskLabel = textEl('div', 'level-task-label', introTaskLabel);
      const taskText = textEl('p', 'level-hint level-task-text', introTaskText);
      const speakButton = textEl('button', 'speak-btn level-speak-btn', introListenAction, 'level-intro-speak');
      speakButton.type = 'button';
      taskCard.append(taskLabel, taskText, speakButton);
      levelCard.append(badges, taskCard);

      const actions = documentRef.createElement('div');
      actions.className = 'modal-actions';
      const startButton = textEl('button', 'mok', introStartAction, 'level-intro-start');
      startButton.type = 'button';
      actions.appendChild(startButton);
      box.append(levelCard, actions);
      backdrop.appendChild(box);

      const modalState = openManagedModal(backdrop, {
        initialFocusSelector: '#level-intro-start',
        onClose: () => stopTaskSpeech()
      });

      speakButton.addEventListener('click', speakCurrentTask);
      close.addEventListener('click', () => closeManagedModal(modalState));
      startButton.addEventListener('click', () => closeManagedModal(modalState));
    }

    function openLevelMap() {
      const backdrop = documentRef.createElement('div');
      backdrop.className = 'mbd';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-labelledby', 'map-title');

      const box = documentRef.createElement('div');
      box.className = 'mbox map-box modal-box-with-close';
      const close = closeButton('map-close');
      const title = textEl('h2', 'mttl', text.ui.mapTitle, 'map-title');
      const body = textEl('p', 'mbdy', text.ui.mapBody);
      const grid = documentRef.createElement('div');
      grid.className = 'level-map-grid';

      const buttons = app.levels.map((level) => {
        const isCurrent = level.id === app.state.currentLevel.id;
        const isDone = app.state.completedLevelIds.includes(level.id);
        const stateClass = isCurrent ? 'current' : isDone ? 'done' : 'todo';
        const button = documentRef.createElement('button');
        button.className = `map-level ${stateClass}`;
        button.dataset.levelId = String(level.id);
        button.type = 'button';
        button.append(
          textEl('span', 'map-level-id', String(level.id)),
          textEl('span', 'map-level-name', level.name),
          textEl('span', 'map-level-state', text.mapState(isCurrent, isDone))
        );
        grid.appendChild(button);
        return button;
      });

      box.append(close, title, body, grid);
      backdrop.appendChild(box);

      const modalState = openManagedModal(backdrop, {
        initialFocusSelector: '#map-close'
      });

      buttons.forEach((button) => {
        button.addEventListener('click', () => {
          const levelId = Number(button.dataset.levelId);
          if (!Number.isNaN(levelId) && app.setCurrentLevel(levelId)) {
            closeManagedModal(modalState, { restoreFocus: false });
            loadCurrentLevel({ showIntro: false });
          }
        });
      });
      close.addEventListener('click', () => closeManagedModal(modalState));
    }

    function showAlreadySolvedModal() {
      const hasNext = app.hasNextLevel();
      const backdrop = documentRef.createElement('div');
      backdrop.className = 'mbd';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-labelledby', 'already-solved-title');

      const box = documentRef.createElement('div');
      box.className = 'mbox win-modal-box';
      const close = closeButton('already-solved-close');
      const icon = documentRef.createElement('div');
      icon.className = 'mico';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '\u{1F3C6}';
      const title = textEl('h2', 'mttl', text.ui.alreadySolvedTitle, 'already-solved-title');
      const body = textEl('p', 'mbdy', text.ui.alreadySolvedBody);
      const actions = documentRef.createElement('div');
      actions.className = 'modal-actions';
      const actionButton = textEl('button', 'mok', text.winAction(hasNext), 'already-solved-action');
      actionButton.type = 'button';

      actions.appendChild(actionButton);
      box.append(close, icon, title, body, actions);
      backdrop.appendChild(box);

      const modalState = openManagedModal(backdrop, {
        initialFocusSelector: '#already-solved-action'
      });

      close.addEventListener('click', () => closeManagedModal(modalState));
      actionButton.addEventListener('click', () => {
        closeManagedModal(modalState, { restoreFocus: false });
        if (hasNext) {
          if (app.setCurrentLevel(app.getNextLevelId())) {
            loadCurrentLevel({ showIntro: true });
          }
          return;
        }
        app.restartProgress();
        loadCurrentLevel({ showIntro: true });
      });
    }

    function showWin() {
      const hasNext = app.hasNextLevel();
      const isFinalWin = !hasNext && app.state.completedLevelIds.includes(app.state.currentLevel.id);
      const backdrop = documentRef.createElement('div');
      backdrop.className = 'mbd';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-labelledby', 'win-title');

      const box = documentRef.createElement('div');
      box.className = 'mbox win-modal-box';
      const close = closeButton('win-close');
      const icon = documentRef.createElement('div');
      icon.className = 'mico';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '\u{1F389}';
      const title = textEl('h2', 'mttl', text.winTitle(isFinalWin), 'win-title');
      const body = textEl('p', 'mbdy', text.winBody(isFinalWin));
      const actions = documentRef.createElement('div');
      actions.className = 'modal-actions';
      const actionButton = textEl('button', 'mok', text.winAction(hasNext), 'mok');
      actionButton.type = 'button';

      actions.appendChild(actionButton);
      box.append(close, icon, title, body, actions);
      backdrop.appendChild(box);

      const modalState = openManagedModal(backdrop, {
        initialFocusSelector: '#mok'
      });

      close.addEventListener('click', () => closeManagedModal(modalState));
      actionButton.addEventListener('click', () => {
        closeManagedModal(modalState, { restoreFocus: false });
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
  };
}
