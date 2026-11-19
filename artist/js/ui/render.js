import { lessons } from '../data/lessons.js';

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

/** «Блоків: N · найкраще: M» (найкраще — лише коли рівень має еталон). */
export function renderBlockCount(dom, count, best) {
  const suffix = best === undefined ? '' : ` · найкраще: ${best}`;
  dom.blockCount.textContent = `Блоків: ${count}${suffix}`;
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
