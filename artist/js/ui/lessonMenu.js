/** Згортання навігації по рівнях у «Рівень N / 20 ▾» на телефоні. */
import { createPopupToggle } from './popupToggle.js';

export function createLessonMenu(dom) {
  return createPopupToggle({ button: dom.lessonNavToggle, panel: dom.lessonNav });
}
