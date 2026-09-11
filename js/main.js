// js/main.js
import { RavlykInterpreter } from './modules/ravlykInterpreter.js';
import {
    showError, showSuccessMessage, showInfoMessage,
    showHelpModal, hideHelpModal,
    showCanvasStateModal, hideCanvasStateModal,
    showClearConfirmModal, hideClearConfirmModal,
    showExampleConfirmModal, hideExampleConfirmModal,
    showStopConfirmModal, hideStopConfirmModal,
    showDownloadModal, hideDownloadModal,
    createRavlykSprite, updateRavlykVisualsOnScreen,
    updateCommandIndicator, resizeCanvas, setFooterYear
} from './modules/ui.js';
import {
    ERROR_MESSAGES, SUCCESS_MESSAGES, INFO_MESSAGES,
    MAX_CODE_LENGTH_CHARS, EXECUTION_TIMEOUT_MS,
    DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND,
    GRID_ALIGN_OFFSET_X, GRID_ALIGN_OFFSET_Y
} from './modules/constants.js';
import {
    setupCommandTabs,
    setupWorkspaceTabs
} from './modules/workspaceTabs.js';
import {
    createEditorUiController
} from './modules/editorUi.js';
import {
    createGridOverlayController
} from './modules/gridOverlay.js';
import {
    createExecutionController
} from './modules/executionController.js';
import {
    createFileActionsController
} from './modules/fileActionsController.js';
import {
    createNavigationPrefetchController
} from './modules/navigationPrefetch.js';
import {
    createModalController
} from './modules/modalController.js';
import {
    createEditorInputController
} from './modules/editorInputController.js';
import {
    createLifecycleController
} from './modules/lifecycleController.js';
import { createCanvasStateController } from './modules/canvasStateController.js';

document.addEventListener('DOMContentLoaded', () => {
    const codeEditor = document.getElementById("code-editor");
    const codeLineNumbers = document.getElementById("code-line-numbers");
    const codeActiveLine = document.getElementById("code-active-line");
    const codeErrorLine = document.getElementById("code-error-line");
    const backgroundCanvas = document.getElementById("ravlyk-background-canvas");
    const canvas = document.getElementById("ravlyk-canvas");
    const canvasContainer = document.querySelector(".canvas-stage") || document.querySelector(".canvas-box");

    const runBtn = document.getElementById("run-btn");
    const stopBtn = document.getElementById("stop-btn");
    const clearBtn = document.getElementById("clear-btn");
    const downloadBtn = document.getElementById("download-btn");
    const shareBtn = document.getElementById("share-btn");
    const gridBtn = document.getElementById("grid-btn");
    const helpBtn = document.getElementById("help-btn");
    const gridCanvas = document.getElementById("ravlyk-grid-canvas");

    const exampleBlocks = document.querySelectorAll(".example-block");
    const commandTabs = document.querySelectorAll(".commands-tab");
    const commandTabPanels = document.querySelectorAll(".commands-tab-panels [data-tab-panel]");
    const workspaceTabs = document.querySelectorAll(".workspace-tab");
    const workspacePanels = document.querySelectorAll(".main-area [data-workspace-panel]");
    const toManualBtnMain = document.getElementById("to-manual-btn");
    const toLessonsBtnMain = document.getElementById("to-lessons-btn");

    // Modal buttons
    const helpModalCloseBtn = document.getElementById("close-help-modal-btn");
    const helpModalToManualBtn = document.getElementById("to-manual-btn-modal");
    const clearConfirmBtn = document.getElementById("confirm-clear-btn");
    const clearCancelBtn = document.getElementById("cancel-clear-btn");
    const exampleConfirmBtn = document.getElementById("confirm-example-btn");
    const exampleCancelBtn = document.getElementById("cancel-example-btn");
    const stopConfirmBtn = document.getElementById("confirm-stop-btn");
    const stopCancelBtn = document.getElementById("cancel-stop-btn");
    const downloadImageBtn = document.getElementById("download-image-btn");
    const downloadGifBtn = document.getElementById("download-gif-btn");
    const downloadCodeBtn = document.getElementById("download-code-btn");
    const closeDownloadModalBtn = document.getElementById("close-download-modal-btn");
    const gifProgressOverlay = document.getElementById("gif-progress-overlay");
    const gifProgressLabel = document.getElementById("gif-progress-label");
    const gifProgressBar = document.getElementById("gif-progress-bar");
    const cancelGifBtn = document.getElementById("cancel-gif-btn");
    const canvasStateBtn = document.getElementById("canvas-state-btn");
    const closeCanvasStateModalBtn = document.getElementById("close-canvas-state-modal-btn");
    const gifProgressTrack = gifProgressOverlay?.querySelector('.gif-progress-bar-track');

    function onGifProgress(phase, pct) {
        if (!gifProgressOverlay) return;
        if (phase === null) {
            gifProgressOverlay.classList.add('hidden');
            downloadBtn?.focus();
            return;
        }
        gifProgressOverlay.classList.remove('hidden');
        if (gifProgressLabel) {
            gifProgressLabel.textContent = phase === 'encode' ? 'Кодую GIF…' : 'Записую анімацію…';
        }
        if (gifProgressBar) gifProgressBar.style.width = pct + '%';
        if (gifProgressTrack) gifProgressTrack.setAttribute('aria-valuenow', pct);
    }

    if (!canvas || typeof canvas.getContext !== 'function') {
        showError(ERROR_MESSAGES.CANVAS_NOT_SUPPORTED, 0);
        return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); // willReadFrequently for getImageData
    if (!ctx) {
        showError(ERROR_MESSAGES.CANVAS_CONTEXT_ERROR, 0);
        return;
    }
    const backgroundCtx = backgroundCanvas ? backgroundCanvas.getContext("2d") : null;
    const gridCtx = gridCanvas ? gridCanvas.getContext("2d") : null;
    const MAX_SHARE_URL_LENGTH_CHARS = 7000;
    const editorUi = createEditorUiController({
        codeEditor,
        codeLineNumbers,
        codeActiveLine,
        codeErrorLine,
    });

    if (window.ravlykInterpreterInstance && typeof window.ravlykInterpreterInstance.destroy === 'function') {
        window.ravlykInterpreterInstance.destroy();
    }

    createRavlykSprite(canvasContainer);
    const interpreter = new RavlykInterpreter(
        ctx,
        canvas,
        updateRavlykVisualsOnScreen,
        updateCommandIndicator,
        showInfoMessage,
        {
            backgroundCanvas,
            backgroundCtx,
        }
    );
    const canvasStateController = createCanvasStateController({
        documentRef: document,
        canvas,
        getState: () => interpreter.state,
    });
    interpreter.setStateObservers({
        onStateChanged: (_state, _canvas, reason) => canvasStateController.update(reason),
        onPrimitiveCompleted: (primitive) => canvasStateController.recordPrimitive(primitive),
    });
    canvasStateController.update('reset');
    const gridOverlay = createGridOverlayController({
        canvas,
        canvasContainer,
        gridCanvas,
        gridCtx,
        gridBtn,
        gridAlignOffsetX: GRID_ALIGN_OFFSET_X,
        gridAlignOffsetY: GRID_ALIGN_OFFSET_Y,
    });
    const navigationPrefetch = createNavigationPrefetchController();
    setupCommandTabs(commandTabs, commandTabPanels);
    
    // Make interpreter instance globally accessible for accessibility module if needed (alternative to event bus)
    window.ravlykInterpreterInstance = interpreter;
    window.addEventListener('beforeunload', () => {
        if (window.ravlykInterpreterInstance && typeof window.ravlykInterpreterInstance.destroy === 'function') {
            window.ravlykInterpreterInstance.destroy();
        }
    }, { once: true });


    const executionController = createExecutionController({
        interpreter,
        codeEditor,
        editorUi,
        uiControls: {
            runBtn,
            stepBtn: document.getElementById('step-btn'),
            stepStatus: document.getElementById('step-status'),
            continueBtn: document.getElementById('continue-btn'),
            stopBtn,
            clearBtn,
            downloadBtn,
            shareBtn,
            gridBtn,
            helpBtn,
            exampleBlocks,
        },
        messages: {
            ERROR_MESSAGES,
            SUCCESS_MESSAGES,
            INFO_MESSAGES,
        },
        limits: {
            MAX_CODE_LENGTH_CHARS,
            EXECUTION_TIMEOUT_MS,
        },
        animationDefaults: {
            DEFAULT_MOVE_PIXELS_PER_SECOND,
            DEFAULT_TURN_DEGREES_PER_SECOND,
        },
        uiHandlers: {
            showError,
            showInfoMessage,
            showSuccessMessage,
            showStopConfirmModal,
            hideStopConfirmModal,
            updateCommandIndicator,
        },
    });

    const fileActions = createFileActionsController({
        canvas,
        backgroundCanvas,
        codeEditor,
        maxCodeLengthChars: MAX_CODE_LENGTH_CHARS,
        maxShareUrlLengthChars: MAX_SHARE_URL_LENGTH_CHARS,
        errorMessages: ERROR_MESSAGES,
        successMessages: SUCCESS_MESSAGES,
        showError,
        showSuccessMessage,
        showInfoMessage,
        getCanvasBackgroundColor: () => interpreter.getCanvasBackgroundColor(),
        interpreter,
        executionController,
        onGifProgress,
        confirmCodeReplacement: () => window.confirm('Замінити поточний код кодом із файлу? Незбережені зміни буде втрачено.'),
        onCodeLoaded: () => {
            editorUi.setEditorErrorLine(null);
            editorUi.updateEditorDecorations();
        },
    });
    const modalController = createModalController({
        interpreter,
        codeEditor,
        editorUi,
        fileActions,
        executionController,
        navigationPrefetch,
        showInfoMessage,
        hideHelpModal,
        hideCanvasStateModal,
        showClearConfirmModal,
        hideClearConfirmModal,
        showExampleConfirmModal,
        hideExampleConfirmModal,
        hideDownloadModal,
    });
    const editorInputController = createEditorInputController({
        codeEditor,
        exampleBlocks,
        editorUi,
        executionController,
        interpreter,
        requestExampleConfirmation: modalController.requestExampleConfirmation,
    });
    const lifecycleController = createLifecycleController({
        canvas,
        backgroundCanvas,
        ctx,
        canvasContainer,
        interpreter,
        gridOverlay,
        executionController,
        editorUi,
        resizeCanvas,
        setFooterYear,
    });

    // --- Event Listeners ---
    if (runBtn) runBtn.addEventListener("click", executionController.runCode);
    document.getElementById('step-btn')?.addEventListener('click', executionController.stepCode);
    document.getElementById('continue-btn')?.addEventListener('click', executionController.runCode);
    if (clearBtn) clearBtn.addEventListener("click", modalController.requestClearConfirmation);
    if (downloadBtn) downloadBtn.addEventListener('click', showDownloadModal);
    if (shareBtn) shareBtn.addEventListener('click', () => {
        void fileActions.shareCodeAsLink();
    });
    const openCodeBtn = document.getElementById('open-code-btn');
    const openCodeInput = document.getElementById('open-code-input');
    openCodeBtn?.addEventListener('click', () => {
        if (executionController.isSessionActive()) {
            showInfoMessage('Зачекай, поки завершиться поточне виконання.');
            return;
        }
        hideDownloadModal();
        openCodeInput?.click();
    });
    openCodeInput?.addEventListener('change', () => {
        const file = openCodeInput.files?.[0];
        openCodeInput.value = '';
        void fileActions.openCodeFromFile(file);
    });
    if (gridBtn) gridBtn.addEventListener('click', () => gridOverlay.toggle());
    if (helpBtn) helpBtn.addEventListener('click', showHelpModal);
    if (canvasStateBtn) {
        canvasStateBtn.addEventListener('click', () => {
            // Render the latest state only while the dialog is actually on screen.
            canvasStateController.refresh();
            showCanvasStateModal();
        });
    }

    if (stopBtn) stopBtn.addEventListener("click", () => {
        executionController.openStopConfirmDialog();
    });

    // Початково кнопка "Зупинити" вимкнена
    if (stopBtn) stopBtn.disabled = true;

    modalController.setupModalInteractions({
        helpModalCloseBtn,
        helpModalToManualBtn,
        clearConfirmBtn,
        clearCancelBtn,
        exampleConfirmBtn,
        exampleCancelBtn,
        stopConfirmBtn,
        stopCancelBtn,
        downloadImageBtn,
        downloadGifBtn,
        downloadCodeBtn,
        closeDownloadModalBtn,
        cancelGifBtn,
        closeCanvasStateModalBtn,
    });


    if (toManualBtnMain) toManualBtnMain.addEventListener('click', () => navigationPrefetch.openInNewTab('manual.html'));
    if (toLessonsBtnMain) toLessonsBtnMain.addEventListener('click', () => navigationPrefetch.openInNewTab('lessons.html'));

    editorInputController.setupExampleBlocks();
    editorInputController.setupEditorInputListeners();

    lifecycleController.initialize();
    fileActions.loadCodeFromUrlHash();
    setupWorkspaceTabs(workspaceTabs, workspacePanels, lifecycleController.scheduleResize);
    navigationPrefetch.scheduleSecondaryPagesPrefetch();

    editorInputController.setupPlaceholderBehavior();
});
