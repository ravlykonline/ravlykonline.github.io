/** Меню «⋯» під сценою: повернення на старт і швидкість виконання. */
import { createPopupToggle } from './popupToggle.js';

export function createMoreMenu(dom) {
  return createPopupToggle({ button: dom.moreButton, panel: dom.moreMenu });
}
