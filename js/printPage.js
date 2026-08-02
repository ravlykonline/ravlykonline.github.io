export function setupPrintPageButtons({
    documentRef = globalThis.document,
    printPage = () => globalThis.window?.print(),
} = {}) {
    if (!documentRef?.querySelectorAll || typeof printPage !== 'function') {
        return 0;
    }

    const buttons = [...documentRef.querySelectorAll('[data-print-page]')];
    buttons.forEach((button) => {
        button.addEventListener('click', printPage);
    });
    return buttons.length;
}

if (typeof document !== 'undefined') {
    setupPrintPageButtons();
}
