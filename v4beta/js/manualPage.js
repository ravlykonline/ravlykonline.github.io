import { createManualPageController } from './modules/manualPageController.js';

const documentRef = typeof document !== 'undefined' ? document : null;
const windowRef = typeof window !== 'undefined' ? window : null;

if (documentRef && windowRef) {
    documentRef.addEventListener('DOMContentLoaded', () => {
        createManualPageController({ documentRef, windowRef }).init();
    }, { once: true });
}
