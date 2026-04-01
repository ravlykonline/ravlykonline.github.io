import { lessons } from '../data/lessons.js';
import { blockDefinitions } from '../data/blocks.js';

function getBlockWord(count) {
  return count === 1 ? 'block' : 'blocks';
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

export function renderPalette(dom, lesson, onAddBlock) {
  dom.paletteList.innerHTML = '';

  lesson.toolbox.forEach((type) => {
    const definition = blockDefinitions[type];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pblock ${definition.className}`;
    button.innerHTML = `
      <span class="pblock-icon" aria-hidden="true">${definition.icon}</span>
      <span class="pblock-label">${definition.label}</span>
    `;
    button.addEventListener('click', () => onAddBlock(type));
    dom.paletteList.appendChild(button);
  });
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

function buildBlockElement(block, state, handlers) {
  const definition = blockDefinitions[block.type];
  const blockElement = document.createElement('div');
  blockElement.className = `wb ${definition.className}`;

  if (state.activeBlockId === block.id) {
    blockElement.classList.add('active-block');
  }

  if (block.type === 'repeat') {
    if (state.openRepeatId === block.id) {
      blockElement.classList.add('repeat-open');
    }

    const row = document.createElement('div');
    row.className = 'wb-row';

    const title = document.createElement('span');
    title.textContent = `${definition.icon} ${definition.label}`;

    const controls = document.createElement('div');
    controls.className = 'repeat-controls';

    const input = document.createElement('input');
    input.className = 'rep-count';
    input.type = 'number';
    input.min = '1';
    input.max = '20';
    input.value = String(block.count);
    input.title = 'Repeat count';
    input.addEventListener('change', (event) => {
      handlers.onUpdateRepeatCount(block.id, event.target.value);
    });

    const suffix = document.createElement('span');
    suffix.className = 'repeat-count-label';
    suffix.textContent = 'times';

    controls.append(input, suffix, createActionButton('x', 'xbtn', () => handlers.onRemoveBlock(block.id), 'Remove block'));
    row.append(title, controls);
    blockElement.appendChild(row);

    const inner = document.createElement('div');
    inner.className = 'rep-inner';
    inner.addEventListener('click', () => handlers.onOpenRepeat(block.id));

    if (block.blocks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'repeat-empty';
      empty.textContent = 'Tap a block to add it inside the loop';
      inner.appendChild(empty);
    } else {
      block.blocks.forEach((childBlock) => {
        inner.appendChild(buildBlockElement(childBlock, state, handlers));
      });
    }

    blockElement.appendChild(inner);
    return blockElement;
  }

  const row = document.createElement('div');
  row.className = 'wb-row';

  const title = document.createElement('span');
  title.textContent = `${definition.icon} ${definition.label}`;

  row.append(title, createActionButton('x', 'xbtn', () => handlers.onRemoveBlock(block.id), 'Remove block'));
  blockElement.appendChild(row);

  return blockElement;
}

export function renderWorkspace(dom, state, handlers) {
  dom.workspaceInner.innerHTML = '';
  dom.workspaceEmpty.hidden = state.workspace.length > 0;

  if (state.workspace.length === 0) {
    dom.workspaceInner.appendChild(dom.workspaceEmpty);
  } else {
    state.workspace.forEach((block) => {
      dom.workspaceInner.appendChild(buildBlockElement(block, state, handlers));
    });
  }

  if (state.openRepeatId !== null) {
    const hint = document.createElement('div');
    hint.className = 'repeat-hint';
    hint.append('You are editing a loop.');
    hint.append(createActionButton('Close loop', 'repeat-close-btn', handlers.onCloseRepeat));
    dom.workspaceInner.appendChild(hint);
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
