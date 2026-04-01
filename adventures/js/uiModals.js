(function () {
  const app = window.SnailGame;

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

  function getModalFocusable(backdrop) {
    return Array.from(backdrop.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.disabled && !element.hidden && element.getAttribute('aria-hidden') !== 'true');
  }

  function closeManagedModal(modalState, options) {
    const { restoreFocus = true } = options || {};
    if (!modalState) {
      return;
    }

    const {
      backdrop,
      onClose,
      onKeyDown,
      onBackdropClick,
      trigger
    } = modalState;

    backdrop.removeEventListener('keydown', onKeyDown);
    backdrop.removeEventListener('click', onBackdropClick);

    if (backdrop.isConnected) {
      backdrop.remove();
    }

    if (activeModal === modalState) {
      activeModal = null;
    }

    if (typeof onClose === 'function') {
      onClose();
    }

    if (restoreFocus && trigger && document.contains(trigger)) {
      trigger.focus();
    }
  }

  function closeActiveModal(options) {
    if (activeModal) {
      closeManagedModal(activeModal, options);
    }
  }

  function openManagedModal(backdrop, options) {
    const {
      initialFocusSelector,
      closeOnBackdrop = true,
      closeOnEscape = true,
      onClose
    } = options || {};

    closeActiveModal({ restoreFocus: false });

    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    backdrop.tabIndex = -1;
    document.body.appendChild(backdrop);

    const modalState = {
      backdrop,
      trigger,
      onClose,
      onKeyDown: null,
      onBackdropClick: null
    };

    modalState.onKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        closeManagedModal(modalState);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = getModalFocusable(backdrop);
      if (!focusable.length) {
        event.preventDefault();
        backdrop.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === backdrop) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    modalState.onBackdropClick = (event) => {
      if (event.target === backdrop && closeOnBackdrop) {
        event.preventDefault();
        closeManagedModal(modalState);
      }
    };

    backdrop.addEventListener('keydown', modalState.onKeyDown);
    backdrop.addEventListener('click', modalState.onBackdropClick);
    activeModal = modalState;

    requestAnimationFrame(() => {
      const focusable = getModalFocusable(backdrop);
      const initialFocus = (initialFocusSelector && backdrop.querySelector(initialFocusSelector)) || focusable[0] || backdrop;
      initialFocus.focus();
    });

    return modalState;
  }

  function closeLevelIntro() {
    if (activeModal?.backdrop?.classList.contains('level-intro-modal')) {
      closeManagedModal(activeModal);
    }
  }

  function createModalCloseButton(id) {
    const button = document.createElement('button');
    button.className = 'modal-close-btn';
    button.id = id;
    button.type = 'button';
    button.setAttribute('aria-label', text.ui.mapClose);
    button.setAttribute('title', text.ui.mapClose);
    button.textContent = '\u00d7';
    return button;
  }

  function createTextElement(tagName, className, textValue, id) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (id) {
      element.id = id;
    }
    element.textContent = textValue;
    return element;
  }

  // Shows one calm retry prompt when a route on a turn level needs rethinking.
  function showTurnHintModal() {
    if (activeModal?.backdrop?.classList.contains('turn-hint-modal')) {
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'mbd turn-hint-modal';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'turn-hint-title');

    const box = document.createElement('div');
    box.className = 'mbox modal-box-with-close';

    const closeButton = createModalCloseButton('turn-hint-close');
    const title = createTextElement('h2', 'mttl', text.ui.tryAgainTitle, 'turn-hint-title');
    const body = createTextElement('p', 'mbdy', text.ui.tryAgainBody);
    body.appendChild(document.createElement('br'));
    body.append(text.ui.tryAgainTurns);
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const okButton = createTextElement('button', 'mok', text.ui.tryAgainAction, 'turn-hint-ok');

    actions.appendChild(okButton);
    box.append(closeButton, title, body, actions);
    backdrop.appendChild(box);

    const modalState = openManagedModal(backdrop, {
      initialFocusSelector: '#turn-hint-ok'
    });

    closeButton.addEventListener('click', () => {
      closeManagedModal(modalState);
    });
    okButton.addEventListener('click', () => {
      closeManagedModal(modalState);
    });
  }

  // Confirms destructive clearing so one accidental tap does not wipe the whole route.
  function openClearConfirmModal() {
    if (app.state.running) {
      return;
    }
    if (activeModal?.backdrop?.classList.contains('clear-confirm-modal')) {
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'mbd clear-confirm-modal';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'clear-confirm-title');

    const box = document.createElement('div');
    box.className = 'mbox modal-box-with-close';

    const closeButton = createModalCloseButton('clear-close');
    const title = createTextElement('h2', 'mttl', text.ui.clearConfirmTitle, 'clear-confirm-title');
    const body = createTextElement('p', 'mbdy', text.ui.clearConfirmBody);
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const confirmButton = createTextElement('button', 'mok', text.ui.clearConfirmAction, 'clear-confirm');

    actions.appendChild(confirmButton);
    box.append(closeButton, title, body, actions);
    backdrop.appendChild(box);

    const modalState = openManagedModal(backdrop, {
      initialFocusSelector: '#clear-confirm'
    });

    closeButton.addEventListener('click', () => {
      closeManagedModal(modalState);
    });
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
    const introTitle = isOnboarding ? '\u041f\u043e\u0447\u043d\u0435\u043c\u043e \u0433\u0440\u0443!' : current.name;
    const introGoal = isOnboarding
      ? '\u0414\u043e\u043f\u043e\u043c\u043e\u0436\u0438 \u0440\u0430\u0432\u043b\u0438\u043a\u0443 \u0434\u0456\u0441\u0442\u0430\u0442\u0438\u0441\u044f \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430.'
      : current.goal;
    const introTaskLabel = (isOnboarding || isEarlyLevel) ? '\u0429\u041e \u0420\u041e\u0411\u0418\u0422\u0418' : text.ui.taskLabel;
    const introTaskText = isOnboarding
      ? '\u041f\u0435\u0440\u0435\u0442\u044f\u0433\u043d\u0438 \u0437\u0435\u043b\u0435\u043d\u0443 \u0441\u0442\u0440\u0456\u043b\u043a\u0443 \u043d\u0430 \u043a\u043b\u0456\u0442\u0438\u043d\u043a\u0438 \u043c\u0456\u0436 \u0440\u0430\u0432\u043b\u0438\u043a\u043e\u043c \u0456 \u044f\u0431\u043b\u0443\u043a\u043e\u043c, \u0430 \u043f\u043e\u0442\u0456\u043c \u043d\u0430\u0442\u0438\u0441\u043d\u0438 \u00ab\u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u0438\u00bb.'
      : current.hint;
    const introListenAction = isEarlyLevel ? '\u{1F50A} \u041f\u043e\u044f\u0441\u043d\u0438\u0442\u0438' : text.ui.listenTask;
    const introStartAction = isOnboarding ? '\u041f\u043e\u0457\u0445\u0430\u043b\u0438!' : text.ui.startAction;
    const backdrop = document.createElement('div');
    backdrop.className = 'mbd level-intro-modal';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'level-intro-title');

    const box = document.createElement('div');
    box.className = 'mbox level-intro-box modal-box-with-close';

    const closeButton = createModalCloseButton('level-intro-close');
    const chip = createTextElement('span', 'level-chip', levelChipEl.textContent);
    const title = createTextElement('h2', 'mttl level-intro-title', introTitle, 'level-intro-title');

    box.append(closeButton, chip, title);

    if (isOnboarding) {
      const onboardingBody = createTextElement('p', 'mbdy', '\u041f\u0440\u0438\u0432\u0456\u0442! \u0426\u0435 \u043f\u0435\u0440\u0448\u0438\u0439 \u0440\u0456\u0432\u0435\u043d\u044c. \u0422\u0443\u0442 \u043c\u0438 \u043f\u0440\u043e\u0441\u0442\u043e \u0432\u0447\u0438\u043c\u043e\u0441\u044f \u043a\u0435\u0440\u0443\u0432\u0430\u0442\u0438 \u0440\u0430\u0432\u043b\u0438\u043a\u043e\u043c.');
      box.appendChild(onboardingBody);
    }

    const levelCard = document.createElement('div');
    levelCard.className = 'level-card';
    const badges = document.createElement('div');
    badges.className = 'level-badges';

    if (isDebug) {
      const modeChip = createTextElement('span', 'mode-chip debug', text.mode(true));
      badges.appendChild(modeChip);
    }

    const goalChip = createTextElement('span', 'goal-chip', introGoal);
    badges.appendChild(goalChip);

    const taskCard = document.createElement('div');
    taskCard.className = 'level-task-card';
    const taskLabel = createTextElement('div', 'level-task-label', introTaskLabel);
    const taskText = createTextElement('p', 'level-hint level-task-text', introTaskText);
    const speakButton = createTextElement('button', 'speak-btn level-speak-btn', introListenAction, 'level-intro-speak');
    speakButton.type = 'button';

    taskCard.append(taskLabel, taskText, speakButton);
    levelCard.append(badges, taskCard);

    if (isDebug) {
      const debugNote = createTextElement('p', 'debug-note', text.ui.debugNote);
      levelCard.appendChild(debugNote);
    }

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const startButton = createTextElement('button', 'mok', introStartAction, 'level-intro-start');
    actions.appendChild(startButton);

    box.append(levelCard, actions);
    backdrop.appendChild(box);

    const modalState = openManagedModal(backdrop, {
      initialFocusSelector: '#level-intro-start',
      onClose: () => {
        stopTaskSpeech();
      }
    });

    speakButton.addEventListener('click', speakCurrentTask);
    closeButton.addEventListener('click', () => {
      closeManagedModal(modalState);
    });
    startButton.addEventListener('click', () => {
      closeManagedModal(modalState);
    });
  }

  function openLevelMap() {
    const backdrop = document.createElement('div');
    backdrop.className = 'mbd';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'map-title');

    const box = document.createElement('div');
    box.className = 'mbox map-box modal-box-with-close';

    const closeButton = createModalCloseButton('map-close');
    const title = createTextElement('h2', 'mttl', text.ui.mapTitle, 'map-title');
    const body = createTextElement('p', 'mbdy', text.ui.mapBody);
    const grid = document.createElement('div');
    grid.className = 'level-map-grid';

    const buttons = app.levels.map((level) => {
      const isCurrent = level.id === app.state.currentLevel.id;
      const isDone = app.state.completedLevelIds.includes(level.id);
      const stateClass = isCurrent ? 'current' : isDone ? 'done' : 'todo';
      const stateLabel = text.mapState(isCurrent, isDone);
      const button = document.createElement('button');
      button.className = 'map-level ' + stateClass;
      button.dataset.levelId = String(level.id);
      button.type = 'button';

      const idEl = createTextElement('span', 'map-level-id', String(level.id));
      const nameEl = createTextElement('span', 'map-level-name', level.name);
      const stateEl = createTextElement('span', 'map-level-state', stateLabel);

      button.append(idEl, nameEl, stateEl);
      grid.appendChild(button);
      return button;
    });

    box.append(closeButton, title, body, grid);
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

    closeButton.addEventListener('click', () => closeManagedModal(modalState));
  }

  function showAlreadySolvedModal() {
    const hasNext = app.hasNextLevel();
    const backdrop = document.createElement('div');
    backdrop.className = 'mbd';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'already-solved-title');

    const box = document.createElement('div');
    box.className = 'mbox win-modal-box';

    const closeButton = createModalCloseButton('already-solved-close');
    const icon = document.createElement('div');
    icon.className = 'mico';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '\u{1F3C6}';
    const title = createTextElement('h2', 'mttl', text.ui.alreadySolvedTitle, 'already-solved-title');
    const body = createTextElement('p', 'mbdy', text.ui.alreadySolvedBody);
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const actionButton = createTextElement('button', 'mok', text.winAction(hasNext), 'already-solved-action');

    actions.appendChild(actionButton);
    box.append(closeButton, icon, title, body, actions);
    backdrop.appendChild(box);

    const modalState = openManagedModal(backdrop, {
      initialFocusSelector: '#already-solved-action'
    });

    closeButton.addEventListener('click', () => {
      closeManagedModal(modalState);
    });
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
    const actionLabel = text.winAction(hasNext);
    const backdrop = document.createElement('div');
    backdrop.className = 'mbd';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'win-title');

    const box = document.createElement('div');
    box.className = 'mbox win-modal-box';

    const closeButton = createModalCloseButton('win-close');
    const icon = document.createElement('div');
    icon.className = 'mico';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🎉';
    const title = createTextElement('h2', 'mttl', text.winTitle(isFinalWin), 'win-title');
    const body = createTextElement('p', 'mbdy', text.winBody(isFinalWin));
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const actionButton = createTextElement('button', 'mok', actionLabel, 'mok');

    actions.appendChild(actionButton);
    box.append(closeButton, icon, title, body, actions);
    backdrop.appendChild(box);

    const modalState = openManagedModal(backdrop, {
      initialFocusSelector: '#mok'
    });

    closeButton.addEventListener('click', () => {
      closeManagedModal(modalState);
    });
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


    function hasActiveModal() {
      return !!activeModal;
    }

    return {
      closeActiveModal,
      closeLevelIntro,
      hasActiveModal,
      openClearConfirmModal,
      openLevelIntro,
      openLevelMap,
      showAlreadySolvedModal,
      showTurnHintModal,
      showWin
    };
  };
})();
