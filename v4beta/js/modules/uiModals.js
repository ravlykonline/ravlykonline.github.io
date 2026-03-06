const MODAL_CONTENT_BY_OVERLAY_ID = {
    'help-modal-overlay': 'help-modal-content',
    'clear-confirm-modal-overlay': 'clear-confirm-modal-content',
    'stop-confirm-modal-overlay': 'stop-confirm-modal-content',
    'download-modal-overlay': 'download-modal-content',
};

function toggleModal(modalId, show) {
    const modalOverlay = document.getElementById(modalId);
    const modalContentId = MODAL_CONTENT_BY_OVERLAY_ID[modalId] || `${modalId}-content`;
    const modalContent = document.getElementById(modalContentId);

    if (!modalOverlay) {
        console.error(`Modal overlay with id ${modalId} not found!`);
        return;
    }

    if (show) {
        modalOverlay.classList.remove('hidden');
        modalOverlay.setAttribute('aria-hidden', 'false');
        if (modalContent) {
            const focusable = modalContent.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable) focusable.focus();
        }
        return;
    }

    modalOverlay.classList.add('hidden');
    modalOverlay.setAttribute('aria-hidden', 'true');
}

function hideModalAndRestoreFocus(modalId, focusTargetId) {
    toggleModal(modalId, false);
    document.getElementById(focusTargetId)?.focus();
}

export function isModalOpen(modalId) {
    const modalOverlay = document.getElementById(modalId);
    if (!modalOverlay) return false;
    return !modalOverlay.classList.contains('hidden');
}

export function bindModalOverlayClose(modalId, onClose) {
    const modalOverlay = document.getElementById(modalId);
    if (!modalOverlay || typeof onClose !== 'function') return;
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) onClose();
    });
}

export function showHelpModal() {
    toggleModal('help-modal-overlay', true);
}

export function hideHelpModal() {
    hideModalAndRestoreFocus('help-modal-overlay', 'help-btn');
}

export function showClearConfirmModal() {
    toggleModal('clear-confirm-modal-overlay', true);
}

export function hideClearConfirmModal() {
    hideModalAndRestoreFocus('clear-confirm-modal-overlay', 'clear-btn');
}

export function showStopConfirmModal() {
    toggleModal('stop-confirm-modal-overlay', true);
}

export function hideStopConfirmModal() {
    hideModalAndRestoreFocus('stop-confirm-modal-overlay', 'stop-btn');
}

export function showDownloadModal() {
    toggleModal('download-modal-overlay', true);
}

export function hideDownloadModal() {
    hideModalAndRestoreFocus('download-modal-overlay', 'download-btn');
}
