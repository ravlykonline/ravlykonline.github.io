import { CURRENT_YEAR } from './modules/constants.js';
import { createLessonsPageController } from './modules/lessonsPageController.js';

const documentRef = typeof document !== 'undefined' ? document : null;
const windowRef = typeof window !== 'undefined' ? window : null;

function resetInitialKeyboardFocus(documentNode) {
    const body = documentNode?.body;
    if (!body || typeof body.focus !== 'function') return;

    const previousTabIndex = body.getAttribute('tabindex');
    body.setAttribute('tabindex', '-1');
    body.focus({ preventScroll: true });
    if (previousTabIndex === null) body.removeAttribute('tabindex');
    else body.setAttribute('tabindex', previousTabIndex);
}

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
        resetInitialKeyboardFocus(documentRef);
    }, { once: true });
}
