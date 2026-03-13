import { isModalOpen, bindModalOverlayClose } from './ui.js';

export function createModalController({
    interpreter,
    codeEditor,
    editorUi,
    fileActions,
    executionController,
    navigationPrefetch,
    showInfoMessage,
    hideHelpModal,
    showClearConfirmModal,
    hideClearConfirmModal,
    hideDownloadModal,
}) {
    function closeModalIfOpen(overlayId, closeFn) {
        if (!isModalOpen(overlayId)) return;
        closeFn();
    }

    const isDownloadModalOpen = () => isModalOpen('download-modal-overlay');

    function handleEscapeKey(event) {
        if (event.key !== 'Escape') return;

        if (isDownloadModalOpen()) {
            hideDownloadModal();
            return;
        }

        const stopModalOpen = isModalOpen('stop-confirm-modal-overlay');
        if (stopModalOpen) {
            executionController.closeStopConfirmDialog(true);
            return;
        }

        if (interpreter.isExecuting) {
            executionController.openStopConfirmDialog();
            return;
        }

        closeModalIfOpen('help-modal-overlay', hideHelpModal);
        closeModalIfOpen('clear-confirm-modal-overlay', hideClearConfirmModal);
    }

    function setupModalInteractions({
        helpModalCloseBtn,
        helpModalToManualBtn,
        clearConfirmBtn,
        clearCancelBtn,
        stopConfirmBtn,
        stopCancelBtn,
        downloadImageBtn,
        downloadCodeBtn,
        closeDownloadModalBtn,
    }) {
        if (helpModalCloseBtn) helpModalCloseBtn.addEventListener('click', hideHelpModal);
        if (helpModalToManualBtn) {
            helpModalToManualBtn.addEventListener('click', () => {
                navigationPrefetch.openInNewTab('manual.html');
                hideHelpModal();
            });
        }
        if (clearConfirmBtn) {
            clearConfirmBtn.addEventListener('click', () => {
                codeEditor.value = '';
                editorUi.updateEditorDecorations();
                interpreter.reset();
                hideClearConfirmModal();
                showInfoMessage('Полотно та код очищено.');
            });
        }
        if (clearCancelBtn) clearCancelBtn.addEventListener('click', hideClearConfirmModal);
        if (stopConfirmBtn) {
            stopConfirmBtn.addEventListener('click', () => {
                if (interpreter.isExecuting) {
                    interpreter.stopExecution();
                }
                executionController.closeStopConfirmDialog(false);
            });
        }
        if (stopCancelBtn) stopCancelBtn.addEventListener('click', () => executionController.closeStopConfirmDialog(true));
        if (downloadImageBtn) {
            downloadImageBtn.addEventListener('click', () => {
                fileActions.saveDrawing();
                hideDownloadModal();
            });
        }
        if (downloadCodeBtn) {
            downloadCodeBtn.addEventListener('click', () => {
                fileActions.saveCodeToFile();
                hideDownloadModal();
            });
        }
        if (closeDownloadModalBtn) closeDownloadModalBtn.addEventListener('click', hideDownloadModal);

        document.addEventListener('keydown', handleEscapeKey);
        bindModalOverlayClose('help-modal-overlay', hideHelpModal);
        bindModalOverlayClose('clear-confirm-modal-overlay', hideClearConfirmModal);
        bindModalOverlayClose('stop-confirm-modal-overlay', () => executionController.closeStopConfirmDialog(true));
        bindModalOverlayClose('download-modal-overlay', hideDownloadModal);
    }

    function requestClearConfirmation() {
        if (interpreter.isExecuting) return;
        showClearConfirmModal();
    }

    return {
        setupModalInteractions,
        requestClearConfirmation,
    };
}
