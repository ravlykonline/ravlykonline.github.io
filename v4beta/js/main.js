// js/main.js
import { RavlykInterpreter } from './modules/ravlykInterpreter.js';
import {
    showError, showSuccessMessage, showInfoMessage,
    showHelpModal, hideHelpModal,
    showClearConfirmModal, hideClearConfirmModal,
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

document.addEventListener('DOMContentLoaded', () => {
    const codeEditor = document.getElementById("code-editor");
    const codeLineNumbers = document.getElementById("code-line-numbers");
    const codeActiveLine = document.getElementById("code-active-line");
    const codeErrorLine = document.getElementById("code-error-line");
    const canvas = document.getElementById("ravlyk-canvas");
    const canvasContainer = document.querySelector(".canvas-box"); // Ravlyk sprite will be appended here

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
    const stopConfirmBtn = document.getElementById("confirm-stop-btn");
    const stopCancelBtn = document.getElementById("cancel-stop-btn");
    const downloadImageBtn = document.getElementById("download-image-btn");
    const downloadCodeBtn = document.getElementById("download-code-btn");
    const closeDownloadModalBtn = document.getElementById("close-download-modal-btn");

    if (!canvas || typeof canvas.getContext !== 'function') {
        showError(ERROR_MESSAGES.CANVAS_NOT_SUPPORTED, 0);
        return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); // willReadFrequently for getImageData
    if (!ctx) {
        showError(ERROR_MESSAGES.CANVAS_CONTEXT_ERROR, 0);
        return;
    }
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
    const interpreter = new RavlykInterpreter(ctx, canvas, updateRavlykVisualsOnScreen, updateCommandIndicator, showInfoMessage);
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
        codeEditor,
        maxCodeLengthChars: MAX_CODE_LENGTH_CHARS,
        maxShareUrlLengthChars: MAX_SHARE_URL_LENGTH_CHARS,
        errorMessages: ERROR_MESSAGES,
        successMessages: SUCCESS_MESSAGES,
        showError,
        showSuccessMessage,
        showInfoMessage,
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
        showClearConfirmModal,
        hideClearConfirmModal,
        hideDownloadModal,
    });
    const editorInputController = createEditorInputController({
        codeEditor,
        exampleBlocks,
        editorUi,
        executionController,
        interpreter,
    });
    const lifecycleController = createLifecycleController({
        canvas,
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
    if (clearBtn) clearBtn.addEventListener("click", modalController.requestClearConfirmation);
    if (downloadBtn) downloadBtn.addEventListener('click', showDownloadModal);
    if (shareBtn) shareBtn.addEventListener('click', fileActions.shareCodeAsLink);
    if (gridBtn) gridBtn.addEventListener('click', () => gridOverlay.toggle());
    if (helpBtn) helpBtn.addEventListener('click', showHelpModal);

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
        stopConfirmBtn,
        stopCancelBtn,
        downloadImageBtn,
        downloadCodeBtn,
        closeDownloadModalBtn,
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
