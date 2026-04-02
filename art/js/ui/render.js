import { lessons } from '../data/lessons.js';
import { blockDefinitions } from '../data/blocks.js';

function getBlockWord(count) {
  return count === 1 ? 'block' : 'blocks';
}

function setDragPayload(event, type, value) {
  if (!event.dataTransfer) {
    return;
  }

  event.dataTransfer.effectAllowed = 'copyMove';
  event.dataTransfer.setData(type, String(value));
}

function readDragPayload(event) {
  if (!event.dataTransfer) {
    return { paletteType: '', blockId: '' };
  }

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

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('active');
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('active');
    handlers.onDrop(parentId, index, readDragPayload(event));
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

function createActionButton(label, className, onClick, title = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  if (title) {
    button.title = title;
  }
  button.addEventListener('click', onClick);
  return button;
}

function renderBlockSequence(container, blocks, parentId, state, handlers, placeholderVariant = 'placeholder-root') {
  if (blocks.length === 0) {
    container.appendChild(createDropZone(parentId, 0, handlers, placeholderVariant));
    return;
  }

  container.appendChild(createDropZone(parentId, 0, handlers, 'line'));

  blocks.forEach((block, index) => {
    container.appendChild(buildBlockElement(block, state, handlers));

    const isLastBlock = index === blocks.length - 1;
    const nextVariant = isLastBlock ? placeholderVariant : 'line';
    container.appendChild(createDropZone(parentId, index + 1, handlers, nextVariant));
  });
}

function buildBlockElement(block, state, handlers) {
  const definition = blockDefinitions[block.type];
  const blockElement = document.createElement('div');
  blockElement.className = `wb ${definition.className}`;
  blockElement.draggable = true;

  if (state.activeBlockId === block.id) {
    blockElement.classList.add('active-block');
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

  if (block.type === 'repeat') {
    const row = document.createElement('div');
    row.className = 'wb-row wb-row-repeat';

    const controls = document.createElement('div');
    controls.className = 'repeat-controls';

    const input = document.createElement('input');
    input.className = 'rep-count';
    input.type = 'number';
    input.min = '1';
    input.max = '20';
    input.value = String(block.count);
    input.title = 'Repeat count';
    input.setAttribute('aria-label', 'Repeat count');
    input.addEventListener('change', (event) => {
      handlers.onUpdateRepeatCount(block.id, event.target.value);
    });

    const suffix = document.createElement('span');
    suffix.className = 'repeat-count-label';
    suffix.textContent = 'times';

    controls.append(input, suffix, createActionButton('x', 'xbtn', () => handlers.onRemoveBlock(block.id), 'Remove block'));
    row.append(createBlockTitle(definition), controls);
    blockElement.appendChild(row);

    const inner = document.createElement('div');
    inner.className = 'rep-inner';

    renderBlockSequence(inner, block.blocks, block.id, state, handlers, 'placeholder-nested');

    if (block.blocks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'repeat-empty';
      empty.textContent = 'Drop a block here';
      inner.appendChild(empty);
    }

    blockElement.appendChild(inner);
    return blockElement;
  }

  const row = document.createElement('div');
  row.className = 'wb-row';
  row.append(createBlockTitle(definition), createActionButton('x', 'xbtn', () => handlers.onRemoveBlock(block.id), 'Remove block'));
  blockElement.appendChild(row);

  return blockElement;
}

export function renderLessonHeader(dom, lesson) {
  dom.lessonTitle.textContent = lesson.title;
  dom.instructionText.innerHTML = lesson.instructionHtml;
}

export function renderLessonNavigation(dom, state, onLessonSelect) {
  dom.lessonNav.innerHTML = '';

  lessons.forEach((lesson, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ldot';
    if (index === state.currentLessonIndex) {
      button.classList.add('active');
    }
    if (state.doneLessons.has(index)) {
      button.classList.add('done');
    }
    button.textContent = String(index + 1);
    button.title = lesson.title;
    button.setAttribute('aria-label', lesson.title);
    button.addEventListener('click', () => onLessonSelect(index));
    dom.lessonNav.appendChild(button);
  });
}

export function renderPalette(dom, lesson, handlers) {
  dom.paletteList.innerHTML = '';

  lesson.toolbox.forEach((type) => {
    const definition = blockDefinitions[type];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pblock ${definition.className}`;
    button.draggable = true;
    button.innerHTML = `
      <span class="pblock-icon" aria-hidden="true">${definition.icon}</span>
      <span class="pblock-label">${definition.label}</span>
    `;
    button.addEventListener('click', () => handlers.onAddBlock(type));
    button.addEventListener('dragstart', (event) => {
      setDragPayload(event, 'application/x-ravlyk-palette', type);
      handlers.onDragStart();
    });
    button.addEventListener('dragend', () => {
      handlers.onDragEnd();
    });
    dom.paletteList.appendChild(button);
  });
}

export function renderWorkspace(dom, state, handlers) {
  dom.workspaceInner.innerHTML = '';
  dom.workspaceEmpty.hidden = state.workspace.length > 0;

  renderBlockSequence(dom.workspaceInner, state.workspace, null, state, handlers, 'placeholder-root');

  if (state.workspace.length === 0) {
    dom.workspaceInner.appendChild(dom.workspaceEmpty);
  }
}

export function renderBlockCount(dom, count) {
  dom.blockCount.textContent = `${count} ${getBlockWord(count)}`;
}

export function renderCode(dom, code, isOpen) {
  dom.codeText.textContent = code;
  dom.codePanel.classList.toggle('open', isOpen);
}

export function renderControls(dom, state) {
  dom.runButton.disabled = state.running;
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
  dom.nextButton.textContent = isLastLesson ? 'Start again' : lesson.successButton;
  dom.overlay.classList.add('show');
  dom.overlay.setAttribute('aria-hidden', 'false');
}

export function hideSuccess(dom) {
  dom.overlay.classList.remove('show');
  dom.overlay.setAttribute('aria-hidden', 'true');
}
