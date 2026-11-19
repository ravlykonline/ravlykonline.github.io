/** Меню «⋯» нижньої панелі на телефоні: Спочатку, Очистити, швидкість. */
import { createPopupToggle } from './popupToggle.js';

export function createMoreMenu(dom) {
  return createPopupToggle({ button: dom.moreButton, panel: dom.moreMenu });
}
