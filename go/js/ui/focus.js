const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(container) {
  if (!container?.querySelectorAll) {
    return [];
  }

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter((element) => !element.disabled && !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}

export function moveFocusInside({ container, documentRef = document, event }) {
  if (!container || event.key !== 'Tab') {
    return false;
  }

  const focusable = getFocusableElements(container);
  if (!focusable.length) {
    event.preventDefault();
    container.focus?.();
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = documentRef.activeElement;

  if (event.shiftKey) {
    if (active === first || active === container) {
      event.preventDefault();
      last.focus();
      return true;
    }
    return false;
  }

  if (active === last) {
    event.preventDefault();
    first.focus();
    return true;
  }

  return false;
}

export function createManagedModal({
  backdrop,
  closeOnBackdrop = true,
  closeOnEscape = true,
  documentRef = document,
  initialFocusSelector,
  onClose,
  requestFrame
}) {
  const scheduleFrame = requestFrame || (typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (callback) => callback());
  const hasHTMLElement = typeof HTMLElement !== 'undefined';
  const trigger = hasHTMLElement && documentRef.activeElement instanceof HTMLElement
    ? documentRef.activeElement
    : documentRef.activeElement || null;
  const modalState = {
    backdrop,
    trigger,
    close
  };

  function close(options = {}) {
    const { restoreFocus = true } = options;

    backdrop.removeEventListener('keydown', onKeyDown);
    backdrop.removeEventListener('click', onBackdropClick);
    if (backdrop.isConnected) {
      backdrop.remove();
    }
    if (typeof onClose === 'function') {
      onClose();
    }
    if (restoreFocus && trigger && documentRef.contains(trigger)) {
      trigger.focus();
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Escape' && closeOnEscape) {
      event.preventDefault();
      close();
      return;
    }

    moveFocusInside({ container: backdrop, documentRef, event });
  }

  function onBackdropClick(event) {
    if (event.target === backdrop && closeOnBackdrop) {
      event.preventDefault();
      close();
    }
  }

  backdrop.tabIndex = -1;
  documentRef.body.appendChild(backdrop);
  backdrop.addEventListener('keydown', onKeyDown);
  backdrop.addEventListener('click', onBackdropClick);

  scheduleFrame(() => {
    const focusable = getFocusableElements(backdrop);
    const initialFocus = (initialFocusSelector && backdrop.querySelector(initialFocusSelector)) || focusable[0] || backdrop;
    initialFocus.focus();
  });

  return modalState;
}
