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

  function getModalCloseMarkup(id) {
    return `<button class="modal-close-btn" id="${id}" type="button" aria-label="${text.ui.mapClose}" title="${text.ui.mapClose}">&times;</button>`;
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
    backdrop.innerHTML = `<div class="mbox modal-box-with-close">${getModalCloseMarkup('turn-hint-close')}<h2 class="mttl" id="turn-hint-title">${text.ui.tryAgainTitle}</h2><p class="mbdy">${text.ui.tryAgainBody}<br>${text.ui.tryAgainTurns}</p><div class="modal-actions"><button class="mok" id="turn-hint-ok">${text.ui.tryAgainAction}</button></div></div>`;

    const modalState = openManagedModal(backdrop, {
      initialFocusSelector: '#turn-hint-ok'
    });

    backdrop.querySelector('#turn-hint-close')?.addEventListener('click', () => {
      closeManagedModal(modalState);
    });
    backdrop.querySelector('#turn-hint-ok')?.addEventListener('click', () => {
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
    backdrop.innerHTML = `<div class="mbox modal-box-with-close">${getModalCloseMarkup('clear-close')}<h2 class="mttl" id="clear-confirm-title">${text.ui.clearConfirmTitle}</h2><p class="mbdy">${text.ui.clearConfirmBody}</p><div class="modal-actions"><button class="mok" id="clear-confirm">${text.ui.clearConfirmAction}</button></div></div>`;

    const modalState = openManagedModal(backdrop, {
      initialFocusSelector: '#clear-confirm'
    });

    backdrop.querySelector('#clear-close')?.addEventListener('click', () => {
      closeManagedModal(modalState);
    });
    backdrop.querySelector('#clear-confirm')?.addEventListener('click', () => {
      closeManagedModal(modalState, { restoreFocus: false });
      app.engine.clearAll();
    });
  }

  function openLevelIntro() {
    closeLevelIntro();
    stopTaskSpeech();

    const current = app.state.currentLevel;
    const isDebug = current.type === 'debug';
    const backdrop = document.createElement('div');
    backdrop.className = 'mbd level-intro-modal';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'level-intro-title');

    const debugMarkup = isDebug
      ? `<p class="debug-note">${text.ui.debugNote}</p>`
      : '';

    backdrop.innerHTML = `<div class="mbox level-intro-box modal-box-with-close">${getModalCloseMarkup('level-intro-close')}<span class="level-chip">${levelChipEl.textContent}</span><h2 class="mttl level-intro-title" id="level-intro-title">${current.name}</h2><div class="level-card"><div class="level-badges"><span class="mode-chip ${isDebug ? 'debug' : 'play'}">${text.mode(isDebug)}</span><span class="goal-chip">${current.goal}</span></div><div class="level-task-card"><div class="level-task-label">${text.ui.taskLabel}</div><p class="level-hint level-task-text">${current.hint}</p><button class="speak-btn level-speak-btn" id="level-intro-speak" type="button">${text.ui.listenTask}</button></div>${debugMarkup}</div><div class="modal-actions"><button class="mok" id="level-intro-start">${text.ui.startAction}</button></div></div>`;

    const modalState = openManagedModal(backdrop, {
      initialFocusSelector: '#level-intro-start',
      onClose: () => {
        stopTaskSpeech();
      }
    });

    const closeBtn = backdrop.querySelector('#level-intro-close');
    const startBtn = backdrop.querySelector('#level-intro-start');
    const speakBtn = backdrop.querySelector('#level-intro-speak');
    speakBtn?.addEventListener('click', speakCurrentTask);
    closeBtn?.addEventListener('click', () => {
      closeManagedModal(modalState);
    });
    startBtn.addEventListener('click', () => {
      closeManagedModal(modalState);
    });
  }

  function openLevelMap() {
    const backdrop = document.createElement('div');
    backdrop.className = 'mbd';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'map-title');

    const cards = app.levels.map((level) => {
      const isCurrent = level.id === app.state.currentLevel.id;
      const isDone = app.state.completedLevelIds.includes(level.id);
      const stateClass = isCurrent ? 'current' : isDone ? 'done' : 'todo';
      const stateLabel = text.mapState(isCurrent, isDone);
      return `<button class="map-level ${stateClass}" data-level-id="${level.id}" type="button"><span class="map-level-id">${level.id}</span><span class="map-level-name">${level.name}</span><span class="map-level-state">${stateLabel}</span></button>`;
    }).join('');

    backdrop.innerHTML = `<div class="mbox map-box modal-box-with-close">${getModalCloseMarkup('map-close')}<h2 class="mttl" id="map-title">${text.ui.mapTitle}</h2><p class="mbdy">${text.ui.mapBody}</p><div class="level-map-grid">${cards}</div></div>`;

    const modalState = openManagedModal(backdrop, {
      initialFocusSelector: '#map-close'
    });

    const closeBtn = backdrop.querySelector('#map-close');
    const buttons = Array.from(backdrop.querySelectorAll('.map-level'));

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const levelId = Number(button.dataset.levelId);
        if (!Number.isNaN(levelId) && app.setCurrentLevel(levelId)) {
          closeManagedModal(modalState, { restoreFocus: false });
          loadCurrentLevel({ showIntro: false });
        }
      });
    });

    closeBtn.addEventListener('click', () => closeManagedModal(modalState));
  }

  function showAlreadySolvedModal() {
    const hasNext = app.hasNextLevel();
    const backdrop = document.createElement('div');
    backdrop.className = 'mbd';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'already-solved-title');
    backdrop.innerHTML = `<div class="mbox win-modal-box">${getModalCloseMarkup('already-solved-close')}<div class="mico" aria-hidden="true">\u{1F3C6}</div><h2 class="mttl" id="already-solved-title">${text.ui.alreadySolvedTitle}</h2><p class="mbdy">${text.ui.alreadySolvedBody}</p><div class="modal-actions"><button class="mok" id="already-solved-action">${text.winAction(hasNext)}</button></div></div>`;

    const modalState = openManagedModal(backdrop, {
      initialFocusSelector: '#already-solved-action'
    });

    const closeBtn = backdrop.querySelector('#already-solved-close');
    const actionBtn = backdrop.querySelector('#already-solved-action');
    closeBtn?.addEventListener('click', () => {
      closeManagedModal(modalState);
    });
    actionBtn?.addEventListener('click', () => {
      closeManagedModal(modalState, { restoreFocus: false });
      if (hasNext) {
        if (app.setCurrentLevel(app.getNextLevelId())) {
          loadCurrentLevel({ showIntro: true });
        }
        return;
      }
      app.restartProgress();
      loadCurrentLevel({ showIntro: false });
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
    backdrop.setAttribute('aria-labelledby', 'mtit');
    backdrop.innerHTML = `<div class="mbox win-modal-box"><button class="modal-close-btn" id="win-close" type="button" aria-label="${text.ui.mapClose}" title="${text.ui.mapClose}">&times;</button><div class="mico" aria-hidden="true">\u{1F389}</div><h2 class="mttl" id="mtit">${text.winTitle(isFinalWin)}</h2><p class="mbdy">${text.winBody(isFinalWin)}</p><div class="modal-actions"><button class="mok" id="mok">${actionLabel}</button></div></div>`;

    const modalState = openManagedModal(backdrop, {
      initialFocusSelector: '#mok'
    });

    const closeBtn = backdrop.querySelector('#win-close');
    const ok = backdrop.querySelector('#mok');
    closeBtn?.addEventListener('click', () => {
      closeManagedModal(modalState);
    });
    ok.addEventListener('click', () => {
      closeManagedModal(modalState, { restoreFocus: false });
      if (hasNext) {
        if (app.setCurrentLevel(app.getNextLevelId())) {
          loadCurrentLevel({ showIntro: true });
        }
        return;
      }
      if (isFinalWin) {
        app.restartProgress();
        loadCurrentLevel({ showIntro: false });
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
