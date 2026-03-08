import { CURRENT_YEAR } from './modules/constants.js';
import { createManualPageController } from './modules/manualPageController.js';

const documentRef = typeof document !== 'undefined' ? document : null;
const windowRef = typeof window !== 'undefined' ? window : null;

if (documentRef && windowRef) {
    documentRef.addEventListener('DOMContentLoaded', () => {
        documentRef.querySelectorAll('.current-year').forEach((element) => {
            element.textContent = CURRENT_YEAR;
        });
        createManualPageController({ documentRef, windowRef }).init();
    }, { once: true });
}
