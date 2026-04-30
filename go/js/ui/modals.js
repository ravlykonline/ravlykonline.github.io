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
  closeId,
  documentRef = document,
  modalClass,
  onAction,
  text,
  titleId,
  titleText
}) {
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

  const modal = createManagedModal({
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
  completedLevelIds,
  currentLevelId,
  documentRef = document,
  levels,
  onSelect,
  text
}) {
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

  const modal = createManagedModal({
    backdrop,
    documentRef,
    initialFocusSelector: '#map-close'
  });

  closeButton.addEventListener('click', () => modal.close());
  return modal;
}
