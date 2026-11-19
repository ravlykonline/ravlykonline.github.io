import { lessons } from '../data/lessons.js';
import { SPEEDS } from '../domain/snail.js';
import { starsCaption, starsLabel, starsText } from '../core/stars.js';
import { buildSnailIcon } from './canvas.js';

export function renderLessonHeader(dom, lesson) {
  const number = lessons.indexOf(lesson) + 1;
  dom.lessonTitle.textContent = lesson.title;
  dom.lessonNavToggle.textContent = `Рівень ${number} / ${lessons.length} ▾`;
  dom.lessonNavToggle.setAttribute('aria-label', `Рівень ${number} / ${lessons.length}. ${lesson.title}. Обрати інший рівень`);
  dom.instructionText.textContent = lesson.instruction;
}

/** Точки рівнів, згруповані за розділами; пройдені показують найкращі зірки сесії. */
export function renderLessonNavigation(dom, state, onLessonSelect) {
  dom.lessonNav.replaceChildren();
  let group = null;
  let currentChapter = null;

  lessons.forEach((lesson, index) => {
    if (lesson.chapter !== currentChapter) {
      currentChapter = lesson.chapter;
      group = document.createElement('div');
      group.className = 'lesson-chapter';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', lesson.chapter);
      const heading = document.createElement('span');
      heading.className = 'lesson-chapter-title';
      heading.textContent = lesson.chapter;
      const dots = document.createElement('div');
      dots.className = 'lesson-chapter-dots';
      group.append(heading, dots);
      dom.lessonNav.appendChild(group);
    }

    const stars = state.bestStars?.get(index);
    const cell = document.createElement('div');
    cell.className = 'lcell';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ldot';
    if (index === state.currentLessonIndex) button.classList.add('active');
    if (state.doneLessons.has(index)) button.classList.add('done');
    button.textContent = String(index + 1);
    const levelLabel = `Рівень ${index + 1} — ${lesson.chapter}: ${lesson.title.replace(/^Рівень\s+\d+:\s*/, '')}`;
    button.title = levelLabel;
    button.setAttribute('aria-label', stars ? `${levelLabel}. ${starsLabel(stars)}` : levelLabel);
    if (index === state.currentLessonIndex) button.setAttribute('aria-current', 'step');
    button.addEventListener('click', () => onLessonSelect(index));
    const starsLine = document.createElement('span');
    starsLine.className = 'lstars';
    starsLine.setAttribute('aria-hidden', 'true');
    starsLine.textContent = stars ? `★${stars}` : '';
    cell.append(button, starsLine);
    group.lastChild.appendChild(cell);
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
  const paused = state.running && !state.autoRun;
  dom.runButton.disabled = state.autoRun;
  dom.runButton.textContent = paused ? '▶ Далі' : '▶ Старт';
  dom.stepButton.disabled = state.autoRun;
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
  dom.successTitle.textContent = lesson.successTitle ?? 'Чудова робота!';
  dom.successMessage.textContent = lesson.successMessage;
  dom.nextButton.textContent = isLastLesson ? 'Почати знову' : (lesson.successButton ?? 'Наступний рівень →');
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
