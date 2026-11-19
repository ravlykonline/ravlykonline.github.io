import { lessons } from '../data/lessons.js';
import { SPEEDS } from '../domain/snail.js';
import { starsCaption, starsLabel, starsText } from '../core/stars.js';
import { buildSnailIcon } from './canvas.js';

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

export function renderControls(dom, state) {
  const paused = state.running && !state.animating;
  dom.runButton.disabled = state.animating;
  dom.runButton.textContent = paused ? '▶ Далі' : '▶ Старт';
  dom.stepButton.disabled = state.animating;
  dom.stopButton.disabled = !state.running;
  dom.resetButton.disabled = state.running;
  dom.helpButton.hidden = !state.currentLesson.intro;
  for (const button of dom.speedSwitch.querySelectorAll('[data-speed]')) {
    const name = button.dataset.speed;
    button.textContent = SPEEDS[name].label;
    button.setAttribute('aria-pressed', String(name === state.speed));
  }
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

export function showSuccess(dom, lesson, isLastLesson, result = {}) {
  const stars = result.stars ?? 3;
  dom.successSnail.replaceChildren(buildSnailIcon());
  dom.successStars.textContent = starsText(stars);
  dom.successStars.setAttribute('aria-label', starsLabel(stars));
  dom.successCaption.textContent = starsCaption(stars, result.blockCount ?? 0, result.bestBlocks);
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

export function isSuccessOpen(dom) {
  return dom.overlay.classList.contains('show');
}
