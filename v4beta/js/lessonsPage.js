import { CURRENT_YEAR } from './modules/constants.js';
import { createLessonsPageController } from './modules/lessonsPageController.js';

const documentRef = typeof document !== 'undefined' ? document : null;
const windowRef = typeof window !== 'undefined' ? window : null;

if (documentRef && windowRef) {
    documentRef.addEventListener('DOMContentLoaded', () => {
        documentRef.querySelectorAll('.current-year').forEach((element) => {
            element.textContent = CURRENT_YEAR;
        });
        const controller = createLessonsPageController({
            documentRef,
            windowRef,
        });
        controller.init();
    }, { once: true });
}
