import { lessons } from '../data/lessons.js';
import { blockDefinitions } from '../data/blocks.js';
import { makeTouchDraggable, makeDropTarget } from '../utils/touch-drag.js';

function getBlockWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'команда';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'команди';
  return 'команд';
}

function setDragPayload(event, type, value) {
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = 'copyMove';
  event.dataTransfer.setData(type, String(value));
}

function readDragPayload(event) {
  if (!event.dataTransfer) return { paletteType: '', blockId: '' };
  return {
    paletteType: event.dataTransfer.getData('application/x-ravlyk-palette'),
    blockId: event.dataTransfer.getData('application/x-ravlyk-block-id'),
  };
}

function createDropZone(parentId, index, handlers, variant = 'line') {
  const dropZone = document.createElement('div');
  dropZone.className = `ws-drop-zone ws-drop-zone-${variant}`;
  dropZone.setAttribute('aria-hidden', 'true');

  dropZone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dropZone.classList.add('active');
  });
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('active');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('active');
    handlers.onDrop(parentId, index, readDragPayload(event));
  });

  makeDropTarget(dropZone, (payload) => {
    handlers.onDrop(parentId, index, payload);
  });

  return dropZone;
}

function createBlockTitle(definition) {
  const title = document.createElement('span');
  title.className = 'wb-title';

  const icon = document.createElement('span');
  icon.className = 'wb-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = definition.icon;

  const label = document.createElement('span');
  label.className = 'wb-label';
  label.textContent = definition.label;

  title.append(icon, label);
  return title;
}

function createCtrlBtn(label, title, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'wb-ctrl-btn';
  button.textContent = label;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

function createCtrlGroup(block, handlers, ctx) {
  const { isFirst, isLast, hasParent } = ctx;
  const group = document.createElement('div');
  group.className = 'wb-ctrl-group';

  if (!isFirst) {
    group.appendChild(createCtrlBtn('↑', 'Вгору', () => handlers.onMoveBlockUp(block.id)));
  }
  if (!isLast) {
    group.appendChild(createCtrlBtn('↓', 'Вниз', () => handlers.onMoveBlockDown(block.id)));
  }
  if (hasParent) {
    group.appendChild(createCtrlBtn('↖', 'Назовні', () => handlers.onMoveBlockOut(block.id)));
  }
  group.appendChild(createCtrlBtn('×', 'Видалити блок', () => handlers.onRemoveBlock(block.id)));

  return group;
}

function renderBlockSequence(container, blocks, parentId, state, handlers, placeholderVariant = 'placeholder-root') {
  if (blocks.length === 0) {
    container.appendChild(createDropZone(parentId, 0, handlers, placeholderVariant));
    return;
  }

  container.appendChild(createDropZone(parentId, 0, handlers, 'line'));

  blocks.forEach((block, index) => {
    const ctx = {
      isFirst: index === 0,
      isLast: index === blocks.length - 1,
      hasParent: parentId !== null,
    };
    container.appendChild(buildBlockElement(block, state, handlers, ctx));
    const nextVariant = index === blocks.length - 1 ? placeholderVariant : 'line';
    container.appendChild(createDropZone(parentId, index + 1, handlers, nextVariant));
  });
}

function buildBlockElement(block, state, handlers, ctx = { isFirst: true, isLast: true, hasParent: false }) {
  const definition = blockDefinitions[block.type];
  const blockElement = document.createElement('div');
  blockElement.className = `wb ${definition.className}`;
  blockElement.draggable = true;
  blockElement.setAttribute('tabindex', '0');
  blockElement.dataset.blockId = block.id;

  if (state.activeBlockId === block.id) {
    blockElement.classList.add('active-block');
  }
  if (state.insertTargetId === block.id) {
    blockElement.classList.add('insert-target');
  }

  blockElement.addEventListener('dragstart', (event) => {
    event.stopPropagation();
    blockElement.classList.add('dragging');
    setDragPayload(event, 'application/x-ravlyk-block-id', block.id);
    handlers.onDragStart();
  });
  blockElement.addEventListener('dragend', () => {
    blockElement.classList.remove('dragging');
    handlers.onDragEnd();
  });
  makeTouchDraggable(
    blockElement,
    () => ({ blockId: String(block.id) }),
    handlers.onDragStart,
    handlers.onDragEnd,
  );

  blockElement.addEventListener('keydown', (event) => {
    const { key, ctrlKey, shiftKey } = event;
    if (ctrlKey || shiftKey) return;

    if (key === 'ArrowUp' && !ctx.isFirst) {
      event.preventDefault();
      handlers.onMoveBlockUp(block.id);
    } else if (key === 'ArrowDown' && !ctx.isLast) {
      event.preventDefault();
      handlers.onMoveBlockDown(block.id);
    } else if ((key === 'Delete' || key === 'Backspace') && document.activeElement === blockElement) {
      event.preventDefault();
      handlers.onRemoveBlock(block.id);
    } else if (key === 'Escape' && ctx.hasParent) {
      event.preventDefault();
      handlers.onMoveBlockOut(block.id);
    } else if (key === 'Enter' && block.type === 'repeat') {
      event.preventDefault();
      handlers.onSetInsertTarget(block.id);
    }
  });

  if (block.type === 'repeat') {
    const row = document.createElement('div');
    row.className = 'wb-row wb-row-repeat';

    const countArea = document.createElement('div');
    countArea.className = 'repeat-controls';

    const input = document.createElement('input');
    input.className = 'rep-count';
    input.type = 'number';
    input.min = '1';
    input.max = '20';
    input.value = String(block.count);
    input.title = 'Кількість повторів';
    input.setAttribute('aria-label', 'Кількість повторів');
    input.addEventListener('change', (event) => {
      handlers.onUpdateRepeatCount(block.id, event.target.value);
    });

    const suffix = document.createElement('span');
    suffix.className = 'repeat-count-label';
    suffix.textContent = 'разів';

    countArea.append(input, suffix);

    const insertBtn = document.createElement('button');
    insertBtn.type = 'button';
    insertBtn.className = 'wb-insert-btn';
    insertBtn.textContent = state.insertTargetId === block.id ? '▼ Обрано' : '+ Додати';
    insertBtn.title = 'Обрати цей repeat як ціль для вставки з палітри';
    insertBtn.setAttribute('aria-pressed', String(state.insertTargetId === block.id));
    insertBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      handlers.onSetInsertTarget(state.insertTargetId === block.id ? null : block.id);
    });

    row.append(createBlockTitle(definition), countArea, insertBtn, createCtrlGroup(block, handlers, ctx));
    blockElement.appendChild(row);

    const inner = document.createElement('div');
    inner.className = 'rep-inner';
    renderBlockSequence(inner, block.blocks, block.id, state, handlers, 'placeholder-nested');

    if (block.blocks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'repeat-empty';
      empty.textContent = state.insertTargetId === block.id
        ? 'Натисни команду у палітрі →'
        : 'Перетягни блок сюди';
      inner.appendChild(empty);
    }

    blockElement.appendChild(inner);
    return blockElement;
  }

  const row = document.createElement('div');
  row.className = 'wb-row';
  row.appendChild(createBlockTitle(definition));

  if (definition.paramKey) {
    const paramWrap = document.createElement('span');
    paramWrap.className = 'wb-param';

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'wb-param-input';
    input.min = String(definition.paramMin);
    input.max = String(definition.paramMax);
    input.value = String(block[definition.paramKey]);
    input.setAttribute('aria-label', definition.paramLabel);
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('change', (event) => {
      handlers.onUpdateBlockParam(block.id, definition.paramKey, event.target.value);
    });

    const paramLabel = document.createElement('span');
    paramLabel.className = 'wb-param-label';
    paramLabel.textContent = definition.paramLabel;

    paramWrap.append(input, paramLabel);
    row.appendChild(paramWrap);
  }

  row.appendChild(createCtrlGroup(block, handlers, ctx));
  blockElement.appendChild(row);

  return blockElement;
}

export function renderLessonHeader(dom, lesson) {
  dom.lessonTitle.textContent = lesson.title;
  dom.instructionText.textContent = lesson.instruction;
}

export function renderLessonNavigation(dom, state, onLessonSelect) {
  dom.lessonNav.replaceChildren();

  lessons.forEach((lesson, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ldot';
    if (index === state.currentLessonIndex) button.classList.add('active');
    if (state.doneLessons.has(index)) button.classList.add('done');
    button.textContent = String(index + 1);
    button.title = lesson.title;
    button.setAttribute('aria-label', lesson.title);
    button.addEventListener('click', () => onLessonSelect(index));
    dom.lessonNav.appendChild(button);
  });
}

export function renderPalette(dom, lesson, handlers) {
  dom.paletteList.replaceChildren();

  lesson.toolbox.forEach((type) => {
    const definition = blockDefinitions[type];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pblock ${definition.className}`;
    button.draggable = true;

    const icon = document.createElement('span');
    icon.className = 'pblock-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = definition.icon;

    const label = document.createElement('span');
    label.className = 'pblock-label';
    label.textContent = definition.label;

    button.append(icon, label);
    button.addEventListener('click', () => handlers.onAddBlock(type));
    button.addEventListener('dragstart', (event) => {
      setDragPayload(event, 'application/x-ravlyk-palette', type);
      handlers.onDragStart();
    });
    button.addEventListener('dragend', handlers.onDragEnd);
    makeTouchDraggable(
      button,
      () => ({ paletteType: type }),
      handlers.onDragStart,
      handlers.onDragEnd,
    );
    dom.paletteList.appendChild(button);
  });
}

export function renderWorkspace(dom, state, handlers) {
  dom.workspaceInner.replaceChildren();
  dom.workspaceEmpty.hidden = state.workspace.length > 0;

  renderBlockSequence(dom.workspaceInner, state.workspace, null, state, handlers, 'placeholder-root');

  if (state.workspace.length === 0) {
    dom.workspaceInner.appendChild(dom.workspaceEmpty);
  }
}

export function renderBlockCount(dom, count) {
  dom.blockCount.textContent = `${count} ${getBlockWord(count)}`;
}

export function renderHistoryControls(dom, canUndo, canRedo) {
  dom.undoButton.disabled = !canUndo;
  dom.redoButton.disabled = !canRedo;
}

export function renderCode(dom, code, isOpen) {
  dom.codeText.textContent = code;
  dom.codePanel.classList.toggle('open', isOpen);
}

export function renderControls(dom, state) {
  dom.runButton.hidden = state.running;
  dom.stopButton.hidden = !state.running;
  dom.resetButton.disabled = state.running;
}

export function showFeedback(dom, message, variant = 'error') {
  dom.feedback.textContent = message;
  dom.feedback.className = `show ${variant}`;
  dom.screenReaderAnnouncer.textContent = message;

  window.clearTimeout(dom.feedbackTimer);
  dom.feedbackTimer = window.setTimeout(() => {
    dom.feedback.className = '';
  }, 3800);
}

export function clearFeedback(dom) {
  dom.feedback.className = '';
  dom.feedback.textContent = '';
}

export function showSuccess(dom, lesson, isLastLesson) {
  dom.successTitle.textContent = lesson.successTitle;
  dom.successMessage.textContent = lesson.successMessage;
  dom.nextButton.textContent = isLastLesson ? 'Почати знову' : lesson.successButton;
  dom.overlay.classList.add('show');
  dom.overlay.setAttribute('aria-hidden', 'false');
  dom.nextButton.focus();
}

export function hideSuccess(dom) {
  dom.overlay.classList.remove('show');
  dom.overlay.setAttribute('aria-hidden', 'true');
}
