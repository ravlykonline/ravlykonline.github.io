import assert from 'node:assert/strict';
import {
    resizeCanvas,
    isModalOpen,
    bindModalOverlayClose,
    showHelpModal,
    hideHelpModal,
    showDownloadModal,
    hideDownloadModal,
} from '../js/modules/ui.js';
import { createEditorUiController } from '../js/modules/editorUi.js';
import { createGridOverlayController } from '../js/modules/gridOverlay.js';
import { createExecutionController } from '../js/modules/executionController.js';
import { createFileActionsController } from '../js/modules/fileActionsController.js';
import { createNavigationPrefetchController } from '../js/modules/navigationPrefetch.js';
import { createModalController } from '../js/modules/modalController.js';
import { createEditorInputController } from '../js/modules/editorInputController.js';
import { createLifecycleController } from '../js/modules/lifecycleController.js';
import {
    getBoundaryMarginForState,
    clampToCanvasBoundsByMargin,
    isAtCanvasEdgeByMargin,
} from '../js/modules/interpreterBoundary.js';
import {
    normalizeConditionKey,
    evaluateAstCondition,
    evaluateRuntimeIfCondition,
} from '../js/modules/interpreterConditions.js';
import { stopGameLoopRuntime } from '../js/modules/interpreterGameLoop.js';
import { createGameAstRunner } from '../js/modules/interpreterGameAstRunner.js';
import { runCommandQueueRuntime } from '../js/modules/interpreterQueueRuntime.js';
import { executeInterpreterCommand } from '../js/modules/interpreterCommandExecutor.js';
import { astProgramToLegacyQueue } from '../js/modules/interpreterAstQueueAdapter.js';
import {
    hasGameStatement,
    validateGameProgramContract,
} from '../js/modules/interpreterGameContract.js';
import {
    evalAstNumberExpression,
    attachAstErrorLocation,
} from '../js/modules/interpreterAstEval.js';
import { handlePrimitiveAstStatement } from '../js/modules/interpreterPrimitiveStatements.js';
import {
    animatePen,
    animateMove,
    animateTurn,
} from '../js/modules/interpreterAnimation.js';
import {
    performMove,
    performTurn,
    setColor,
    clearScreen,
    performGoto,
} from '../js/modules/interpreterDrawingOps.js';
import { cloneInterpreterCommand } from '../js/modules/interpreterCommandClone.js';
import { destroyInterpreterLifecycle } from '../js/modules/interpreterLifecycleCleanup.js';
import {
    stopExecutionRuntime,
    pauseExecutionRuntime,
    resumeExecutionRuntime,
    wasBoundaryWarningShownRuntime,
} from '../js/modules/interpreterRuntimeState.js';
import {
    findClosingParenIndex,
    parseAstBlockOrThrow,
    parseAstConditionOrThrow,
} from '../js/modules/parserBlocksConditions.js';
import { parseCreateStatementToAst } from '../js/modules/parserCreateStatement.js';

function runTest(name, fn) {
    try {
        fn();
        console.log(`PASS: ${name}`);
    } catch (error) {
        console.error(`FAIL: ${name}`);
        throw error;
    }
}

runTest('resizeCanvas uses visible canvas height to keep runtime boundaries aligned', () => {
    const canvasBox = {
        clientWidth: 900,
        clientHeight: 640,
        querySelector(selector) {
            if (selector !== '.area-header') return null;
            return {
                getBoundingClientRect() {
                    return { height: 60 };
                },
            };
        },
    };
    const canvas = {
        width: 0,
        height: 0,
        clientWidth: 860,
        clientHeight: 580,
        parentElement: canvasBox,
        closest(selector) {
            return selector === '.canvas-box' ? canvasBox : null;
        },
    };
    const ctx = { drawImage() {} };

    resizeCanvas(canvas, ctx);

    assert.equal(canvas.width, 860);
    assert.equal(canvas.height, 580);
});

runTest('resizeCanvas falls back to canvas-box minus header when canvas clientHeight is unavailable', () => {
    const canvasBox = {
        clientWidth: 920,
        clientHeight: 650,
        querySelector(selector) {
            if (selector !== '.area-header') return null;
            return {
                getBoundingClientRect() {
                    return { height: 58 };
                },
            };
        },
    };
    const canvas = {
        width: 0,
        height: 0,
        clientWidth: 900,
        clientHeight: 0,
        parentElement: canvasBox,
        closest(selector) {
            return selector === '.canvas-box' ? canvasBox : null;
        },
    };
    const ctx = { drawImage() {} };

    resizeCanvas(canvas, ctx);

    assert.equal(canvas.width, 900);
    assert.equal(canvas.height, 592);
});

runTest('isModalOpen returns false when modal is missing', () => {
    const previousDocument = global.document;
    global.document = {
        getElementById() {
            return null;
        },
    };

    assert.equal(isModalOpen('missing-modal'), false);

    global.document = previousDocument;
});

runTest('isModalOpen returns true only when hidden class is absent', () => {
    const previousDocument = global.document;
    const overlays = {
        open: {
            classList: {
                contains(className) {
                    return className === 'other';
                },
            },
        },
        closed: {
            classList: {
                contains(className) {
                    return className === 'hidden';
                },
            },
        },
    };

    global.document = {
        getElementById(id) {
            return overlays[id] || null;
        },
    };

    assert.equal(isModalOpen('open'), true);
    assert.equal(isModalOpen('closed'), false);

    global.document = previousDocument;
});

runTest('bindModalOverlayClose triggers callback only on overlay click', () => {
    const previousDocument = global.document;
    const listeners = {};
    const overlay = {
        addEventListener(eventName, handler) {
            listeners[eventName] = handler;
        },
    };
    let closeCalls = 0;

    global.document = {
        getElementById(id) {
            return id === 'test-modal-overlay' ? overlay : null;
        },
    };

    bindModalOverlayClose('test-modal-overlay', () => {
        closeCalls += 1;
    });

    assert.equal(typeof listeners.click, 'function');

    listeners.click({ target: {}, currentTarget: {} });
    assert.equal(closeCalls, 0);

    const sameTarget = {};
    listeners.click({ target: sameTarget, currentTarget: sameTarget });
    assert.equal(closeCalls, 1);

    global.document = previousDocument;
});

runTest('bindModalOverlayClose ignores invalid inputs', () => {
    const previousDocument = global.document;
    global.document = {
        getElementById() {
            return null;
        },
    };

    assert.doesNotThrow(() => bindModalOverlayClose('missing-overlay', () => {}));
    assert.doesNotThrow(() => bindModalOverlayClose('missing-overlay', null));

    global.document = previousDocument;
});

runTest('showHelpModal and hideHelpModal update visibility and return focus', () => {
    const previousDocument = global.document;
    let focusedElementId = null;
    const hiddenClasses = new Set(['hidden']);

    const helpOverlay = {
        classList: {
            add(className) { hiddenClasses.add(className); },
            remove(className) { hiddenClasses.delete(className); },
            contains(className) { return hiddenClasses.has(className); },
        },
        setAttribute(name, value) {
            this[name] = value;
        },
    };

    const focusTarget = {
        focus() {
            focusedElementId = 'help-modal-focus-target';
        },
    };

    const helpContent = {
        querySelector() {
            return focusTarget;
        },
    };

    const helpBtn = {
        focus() {
            focusedElementId = 'help-btn';
        },
    };

    global.document = {
        getElementById(id) {
            if (id === 'help-modal-overlay') return helpOverlay;
            if (id === 'help-modal-content') return helpContent;
            if (id === 'help-btn') return helpBtn;
            return null;
        },
    };

    showHelpModal();
    assert.equal(helpOverlay.classList.contains('hidden'), false);
    assert.equal(helpOverlay['aria-hidden'], 'false');
    assert.equal(focusedElementId, 'help-modal-focus-target');

    hideHelpModal();
    assert.equal(helpOverlay.classList.contains('hidden'), true);
    assert.equal(helpOverlay['aria-hidden'], 'true');
    assert.equal(focusedElementId, 'help-btn');

    global.document = previousDocument;
});

runTest('showDownloadModal and hideDownloadModal use mapped content id and return focus', () => {
    const previousDocument = global.document;
    let focusedElementId = null;
    const hiddenClasses = new Set(['hidden']);

    const downloadOverlay = {
        classList: {
            add(className) { hiddenClasses.add(className); },
            remove(className) { hiddenClasses.delete(className); },
            contains(className) { return hiddenClasses.has(className); },
        },
        setAttribute(name, value) {
            this[name] = value;
        },
    };

    const firstFocusable = {
        focus() {
            focusedElementId = 'download-modal-focus-target';
        },
    };

    const downloadContent = {
        querySelector() {
            return firstFocusable;
        },
    };

    const downloadBtn = {
        focus() {
            focusedElementId = 'download-btn';
        },
    };

    global.document = {
        getElementById(id) {
            if (id === 'download-modal-overlay') return downloadOverlay;
            if (id === 'download-modal-content') return downloadContent;
            if (id === 'download-btn') return downloadBtn;
            return null;
        },
    };

    showDownloadModal();
    assert.equal(downloadOverlay.classList.contains('hidden'), false);
    assert.equal(downloadOverlay['aria-hidden'], 'false');
    assert.equal(focusedElementId, 'download-modal-focus-target');

    hideDownloadModal();
    assert.equal(downloadOverlay.classList.contains('hidden'), true);
    assert.equal(downloadOverlay['aria-hidden'], 'true');
    assert.equal(focusedElementId, 'download-btn');

    global.document = previousDocument;
});

runTest('editor UI controller updates line numbers and tracks error line highlight', () => {
    const previousGetComputedStyle = global.getComputedStyle;
    global.getComputedStyle = () => ({
        lineHeight: '20',
        paddingTop: '4',
    });

    const hiddenClasses = new Set(['hidden']);
    const codeEditor = {
        value: 'вперед 10\nправоруч 90\nвперед 5',
        selectionStart: 10,
        scrollTop: 0,
        focus() {},
        setSelectionRange() {},
    };
    const codeLineNumbers = { textContent: '', scrollTop: 0 };
    const codeActiveLine = { style: {} };
    const codeErrorLine = {
        style: {},
        classList: {
            add(className) { hiddenClasses.add(className); },
            remove(className) { hiddenClasses.delete(className); },
            contains(className) { return hiddenClasses.has(className); },
        },
    };

    const editorUi = createEditorUiController({
        codeEditor,
        codeLineNumbers,
        codeActiveLine,
        codeErrorLine,
    });

    editorUi.updateEditorDecorations();
    assert.equal(codeLineNumbers.textContent, '1\n2\n3');
    assert.equal(codeActiveLine.style.height, '20px');
    assert.equal(codeErrorLine.classList.contains('hidden'), true);

    editorUi.setEditorErrorLine(2);
    assert.equal(codeErrorLine.classList.contains('hidden'), false);
    assert.equal(codeErrorLine.style.height, '20px');

    global.getComputedStyle = previousGetComputedStyle;
});

runTest('editor UI controller formats friendly execution errors with line and column', () => {
    const previousGetComputedStyle = global.getComputedStyle;
    global.getComputedStyle = () => ({
        lineHeight: '20',
        paddingTop: '0',
    });

    const codeEditor = {
        value: 'вперед 10\nневідома',
        selectionStart: 0,
        scrollTop: 0,
        focus() {},
        setSelectionRange() {},
    };

    const editorUi = createEditorUiController({
        codeEditor,
        codeLineNumbers: { textContent: '', scrollTop: 0 },
        codeActiveLine: { style: {} },
        codeErrorLine: null,
    });

    const friendly = editorUi.getFriendlyExecutionError(codeEditor.value, {
        message: 'Невідома команда: "невідома"',
        line: 2,
        column: 3,
    });

    assert.equal(friendly.line, 2);
    assert.equal(friendly.message.includes('(рядок 2, позиція 3)'), true);
    assert.equal(friendly.message.includes('Перевір особливо уважно рядок 2.'), true);

    global.getComputedStyle = previousGetComputedStyle;
});

runTest('grid overlay controller initializes from storage and toggles button state', () => {
    const previousLocalStorage = global.localStorage;
    global.localStorage = {
        getItem(key) {
            return key === 'ravlyk_grid_visible_v1' ? '1' : null;
        },
        setItem() {},
    };

    const gridBtn = {
        attrs: {},
        classList: {
            active: false,
            toggle(className, value) {
                if (className === 'active') this.active = !!value;
            },
        },
        setAttribute(name, value) {
            this.attrs[name] = value;
        },
    };

    const gridOverlay = createGridOverlayController({
        canvas: null,
        canvasContainer: null,
        gridCanvas: null,
        gridCtx: null,
        gridBtn,
        gridAlignOffsetX: 0,
        gridAlignOffsetY: 0,
    });

    gridOverlay.initialize();
    assert.equal(gridOverlay.getGridVisibility(), true);
    assert.equal(gridBtn.attrs['aria-pressed'], 'true');
    assert.equal(gridBtn.classList.active, true);

    global.localStorage = previousLocalStorage;
});

runTest('grid overlay controller draws when enabled and hides when disabled', () => {
    const previousLocalStorage = global.localStorage;
    global.localStorage = {
        getItem() { return null; },
        setItem() {},
    };

    const gridCanvas = {
        style: {},
        width: 0,
        height: 0,
    };
    const canvas = {
        width: 200,
        height: 120,
        clientWidth: 200,
        clientHeight: 120,
        getBoundingClientRect() {
            return { left: 20, top: 10 };
        },
    };
    const canvasContainer = {
        getBoundingClientRect() {
            return { left: 0, top: 0 };
        },
    };
    const gridCtx = {
        clearRectCalls: 0,
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        fillText() {},
        clearRect() { this.clearRectCalls += 1; },
    };

    const gridOverlay = createGridOverlayController({
        canvas,
        canvasContainer,
        gridCanvas,
        gridCtx,
        gridBtn: null,
        gridAlignOffsetX: 0,
        gridAlignOffsetY: 0,
    });

    gridOverlay.setGridVisibility(false);
    assert.equal(gridCanvas.style.display, 'none');

    gridOverlay.setGridVisibility(true);
    assert.equal(gridCanvas.style.display, 'block');
    assert.equal(gridCanvas.width, 200);
    assert.equal(gridCanvas.height, 120);
    assert.equal(gridCtx.clearRectCalls > 0, true);

    global.localStorage = previousLocalStorage;
});

runTest('execution controller updates toolbar controls for execution state', () => {
    const runBtn = { disabled: false };
    const stopBtn = { disabled: true };
    const clearBtn = { disabled: false };
    const downloadBtn = { disabled: false };
    const shareBtn = { disabled: false };
    const gridBtn = { disabled: false };
    const helpBtn = { disabled: false };
    const codeEditor = { disabled: false, value: '' };
    const exampleClasses = new Set();
    const exampleBlocks = [{
        classList: {
            toggle(className, enabled) {
                if (enabled) exampleClasses.add(className);
                else exampleClasses.delete(className);
            },
        },
    }];

    const controller = createExecutionController({
        interpreter: {
            isExecuting: false,
            shouldStop: false,
            pauseExecution() {},
            resumeExecution() {},
            stopExecution() {},
            reset() {},
            setAnimationEnabled() {},
            setSpeed() {},
            wasBoundaryWarningShown() { return false; },
            async executeCommands() {},
        },
        codeEditor,
        editorUi: {
            setEditorErrorLine() {},
            getFriendlyExecutionError() { return { line: null, message: '' }; },
            focusEditorLine() {},
        },
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
            ERROR_MESSAGES: { CODE_TOO_LONG: '', EXECUTION_TIMEOUT: '', EXECUTION_STOPPED_BY_USER: '' },
            SUCCESS_MESSAGES: { CODE_EXECUTED: '' },
            INFO_MESSAGES: { EXECUTION_STOPPED: '' },
        },
        limits: {
            MAX_CODE_LENGTH_CHARS: 1000,
            EXECUTION_TIMEOUT_MS: 1000,
        },
        animationDefaults: {
            DEFAULT_MOVE_PIXELS_PER_SECOND: 100,
            DEFAULT_TURN_DEGREES_PER_SECOND: 90,
        },
        uiHandlers: {
            showError() {},
            showInfoMessage() {},
            showSuccessMessage() {},
            showStopConfirmModal() {},
            hideStopConfirmModal() {},
            updateCommandIndicator() {},
        },
    });

    controller.updateExecutionControls(true);
    assert.equal(runBtn.disabled, true);
    assert.equal(stopBtn.disabled, false);
    assert.equal(clearBtn.disabled, true);
    assert.equal(downloadBtn.disabled, true);
    assert.equal(shareBtn.disabled, true);
    assert.equal(gridBtn.disabled, true);
    assert.equal(helpBtn.disabled, true);
    assert.equal(codeEditor.disabled, true);
    assert.equal(exampleClasses.has('disabled'), true);

    controller.updateExecutionControls(false);
    assert.equal(runBtn.disabled, false);
    assert.equal(stopBtn.disabled, true);
    assert.equal(clearBtn.disabled, false);
    assert.equal(downloadBtn.disabled, false);
    assert.equal(shareBtn.disabled, false);
    assert.equal(gridBtn.disabled, false);
    assert.equal(helpBtn.disabled, false);
    assert.equal(codeEditor.disabled, false);
    assert.equal(exampleClasses.has('disabled'), false);
});

runTest('execution controller manages stop-confirm pause/resume flow', () => {
    let showCalls = 0;
    let hideCalls = 0;
    let pauseCalls = 0;
    let resumeCalls = 0;
    const interpreter = {
        isExecuting: true,
        shouldStop: false,
        pauseExecution() { pauseCalls += 1; },
        resumeExecution() { resumeCalls += 1; },
        stopExecution() {},
        reset() {},
        setAnimationEnabled() {},
        setSpeed() {},
        wasBoundaryWarningShown() { return false; },
        async executeCommands() {},
    };

    const controller = createExecutionController({
        interpreter,
        codeEditor: { disabled: false, value: '' },
        editorUi: {
            setEditorErrorLine() {},
            getFriendlyExecutionError() { return { line: null, message: '' }; },
            focusEditorLine() {},
        },
        uiControls: {
            runBtn: { disabled: false },
            stopBtn: { disabled: true },
            clearBtn: { disabled: false },
            downloadBtn: { disabled: false },
            shareBtn: { disabled: false },
            gridBtn: { disabled: false },
            helpBtn: { disabled: false },
            exampleBlocks: [],
        },
        messages: {
            ERROR_MESSAGES: { CODE_TOO_LONG: '', EXECUTION_TIMEOUT: '', EXECUTION_STOPPED_BY_USER: '' },
            SUCCESS_MESSAGES: { CODE_EXECUTED: '' },
            INFO_MESSAGES: { EXECUTION_STOPPED: '' },
        },
        limits: {
            MAX_CODE_LENGTH_CHARS: 1000,
            EXECUTION_TIMEOUT_MS: 1000,
        },
        animationDefaults: {
            DEFAULT_MOVE_PIXELS_PER_SECOND: 100,
            DEFAULT_TURN_DEGREES_PER_SECOND: 90,
        },
        uiHandlers: {
            showError() {},
            showInfoMessage() {},
            showSuccessMessage() {},
            showStopConfirmModal() { showCalls += 1; },
            hideStopConfirmModal() { hideCalls += 1; },
            updateCommandIndicator() {},
        },
    });

    controller.openStopConfirmDialog();
    assert.equal(pauseCalls, 1);
    assert.equal(showCalls, 1);

    controller.closeStopConfirmDialog(true);
    assert.equal(hideCalls, 1);
    assert.equal(resumeCalls, 1);
});

runTest('file actions controller blocks share for empty code', async () => {
    let infoCalls = 0;
    let errorCalls = 0;
    let successCalls = 0;

    const controller = createFileActionsController({
        canvas: { width: 100, height: 100, parentElement: {} },
        codeEditor: { value: '   ' },
        maxCodeLengthChars: 1000,
        maxShareUrlLengthChars: 7000,
        errorMessages: {
            CODE_TOO_LONG: 'too long',
            SAVE_IMAGE_SECURITY_ERROR: 'sec',
            SAVE_IMAGE_ERROR: () => 'err',
        },
        successMessages: { IMAGE_SAVED: 'ok' },
        showError() { errorCalls += 1; },
        showSuccessMessage() { successCalls += 1; },
        showInfoMessage() { infoCalls += 1; },
        onCodeLoaded() {},
    });

    await controller.shareCodeAsLink();

    assert.equal(infoCalls, 1);
    assert.equal(errorCalls, 0);
    assert.equal(successCalls, 0);
});

runTest('file actions controller loads code from hash and invokes callback', () => {
    const previousWindow = global.window;
    global.window = { location: { hash: '#code=YWJj' } };

    let loadedCalls = 0;
    let infoCalls = 0;
    let errorCalls = 0;
    const codeEditor = { value: '' };

    const controller = createFileActionsController({
        canvas: { width: 100, height: 100, parentElement: {} },
        codeEditor,
        maxCodeLengthChars: 1000,
        maxShareUrlLengthChars: 7000,
        errorMessages: {
            CODE_TOO_LONG: 'too long',
            SAVE_IMAGE_SECURITY_ERROR: 'sec',
            SAVE_IMAGE_ERROR: () => 'err',
        },
        successMessages: { IMAGE_SAVED: 'ok' },
        showError() { errorCalls += 1; },
        showSuccessMessage() {},
        showInfoMessage() { infoCalls += 1; },
        onCodeLoaded() { loadedCalls += 1; },
    });

    controller.loadCodeFromUrlHash();

    assert.equal(codeEditor.value.length > 0, true);
    assert.equal(loadedCalls, 1);
    assert.equal(infoCalls, 1);
    assert.equal(errorCalls, 0);

    global.window = previousWindow;
});

runTest('navigation prefetch controller opens new tab with noopener,noreferrer', () => {
    const previousWindow = global.window;
    let openArgs = null;
    global.window = {
        open(...args) {
            openArgs = args;
        },
    };

    const navigation = createNavigationPrefetchController();
    navigation.openInNewTab('manual.html');

    assert.deepEqual(openArgs, ['manual.html', '_blank', 'noopener,noreferrer']);
    global.window = previousWindow;
});

runTest('navigation prefetch controller schedules document prefetch links', () => {
    const previousWindow = global.window;
    const previousDocument = global.document;
    const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const appended = [];

    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
            connection: { saveData: false, effectiveType: '4g' },
        },
    });

    global.document = {
        visibilityState: 'visible',
        createElement() {
            return { rel: '', href: '', as: '' };
        },
        head: {
            querySelector() { return null; },
            appendChild(node) { appended.push(node); },
        },
    };

    global.window = {
        requestIdleCallback(callback) { callback(); },
        setTimeout(callback) { callback(); },
        open() {},
    };

    const navigation = createNavigationPrefetchController();
    navigation.scheduleSecondaryPagesPrefetch();

    assert.equal(appended.length, 4);
    assert.equal(appended.every((link) => link.rel === 'prefetch' && link.as === 'document'), true);

    global.window = previousWindow;
    global.document = previousDocument;
    if (navigatorDescriptor) {
        Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    }
});

runTest('modal controller requests clear confirmation only when not executing', () => {
    let clearCalls = 0;
    const controller = createModalController({
        interpreter: {
            isExecuting: false,
            reset() {},
            stopExecution() {},
        },
        codeEditor: { value: '' },
        editorUi: { updateEditorDecorations() {} },
        fileActions: { saveDrawing() {}, saveCodeToFile() {} },
        executionController: {
            openStopConfirmDialog() {},
            closeStopConfirmDialog() {},
        },
        navigationPrefetch: { openInNewTab() {} },
        showInfoMessage() {},
        hideHelpModal() {},
        showClearConfirmModal() { clearCalls += 1; },
        hideClearConfirmModal() {},
        hideDownloadModal() {},
    });

    controller.requestClearConfirmation();
    assert.equal(clearCalls, 1);
});

runTest('editor input controller handles Tab indent and run hotkey', () => {
    const listeners = {};
    const codeEditor = {
        value: 'abc',
        selectionStart: 1,
        selectionEnd: 2,
        addEventListener(eventName, handler) {
            listeners[eventName] = handler;
        },
        getAttribute() { return ''; },
        setAttribute() {},
    };
    let runCalls = 0;
    let decorationCalls = 0;
    const controller = createEditorInputController({
        codeEditor,
        exampleBlocks: [],
        editorUi: {
            updateEditorDecorations() { decorationCalls += 1; },
            getEditorErrorLine() { return null; },
            setEditorErrorLine() {},
        },
        executionController: {
            runCode() { runCalls += 1; },
        },
        interpreter: {
            isExecuting: false,
        },
    });

    controller.setupEditorInputListeners();

    const tabEvent = {
        key: 'Tab',
        preventDefaultCalled: false,
        preventDefault() { this.preventDefaultCalled = true; },
    };
    listeners.keydown(tabEvent);
    assert.equal(tabEvent.preventDefaultCalled, true);
    assert.equal(codeEditor.value, 'a  c');
    assert.equal(codeEditor.selectionStart, 3);
    assert.equal(codeEditor.selectionEnd, 3);
    assert.equal(decorationCalls > 0, true);

    const runEvent = {
        key: 'Enter',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        preventDefaultCalled: false,
        preventDefault() { this.preventDefaultCalled = true; },
    };
    listeners.keydown(runEvent);
    assert.equal(runEvent.preventDefaultCalled, true);
    assert.equal(runCalls, 1);
});

runTest('lifecycle controller initializes runtime and registers resize fallback', () => {
    const previousResizeObserver = global.ResizeObserver;
    const previousWindow = global.window;

    global.ResizeObserver = undefined;
    let resizeListenerEvent = null;
    global.window = {
        addEventListener(eventName) {
            resizeListenerEvent = eventName;
        },
    };

    let resetCalls = 0;
    let controlsCalls = 0;
    let decorationsCalls = 0;
    let footerCalls = 0;
    let gridInitCalls = 0;
    let gridDrawCalls = 0;
    let resizeCalls = 0;
    let applyContextCalls = 0;
    let canvasResizeMetaCalls = 0;

    const lifecycle = createLifecycleController({
        canvas: {},
        ctx: {},
        canvasContainer: null,
        interpreter: {
            reset() { resetCalls += 1; },
            applyContextSettings() { applyContextCalls += 1; },
            handleCanvasResize() { canvasResizeMetaCalls += 1; },
        },
        gridOverlay: {
            initialize() { gridInitCalls += 1; },
            drawGridOverlay() { gridDrawCalls += 1; },
        },
        executionController: {
            updateExecutionControls() { controlsCalls += 1; },
        },
        editorUi: {
            updateEditorDecorations() { decorationsCalls += 1; },
        },
        resizeCanvas(_canvas, _ctx, onResize) {
            resizeCalls += 1;
            onResize?.({});
        },
        setFooterYear() { footerCalls += 1; },
    });

    lifecycle.initialize();

    assert.equal(resizeListenerEvent, 'resize');
    assert.equal(gridInitCalls, 1);
    assert.equal(resizeCalls, 1);
    assert.equal(applyContextCalls, 1);
    assert.equal(canvasResizeMetaCalls, 1);
    assert.equal(gridDrawCalls, 1);
    assert.equal(resetCalls, 1);
    assert.equal(controlsCalls, 1);
    assert.equal(decorationsCalls, 1);
    assert.equal(footerCalls, 1);

    global.ResizeObserver = previousResizeObserver;
    global.window = previousWindow;
});

runTest('interpreter boundary helpers compute margin, clamp and edge detection', () => {
    const margin = getBoundaryMarginForState({ penSize: 6 }, 0);
    assert.equal(margin >= 3, true);

    const clamped = clampToCanvasBoundsByMargin(2, 99, 100, 100, 5);
    assert.equal(clamped.boundedX, 5);
    assert.equal(clamped.boundedY, 95);

    assert.equal(isAtCanvasEdgeByMargin(5, 50, 100, 100, 5), true);
    assert.equal(isAtCanvasEdgeByMargin(50, 50, 100, 100, 5), false);
});

runTest('interpreter condition helpers normalize keys and evaluate conditions', () => {
    assert.equal(normalizeConditionKey('вгору'), 'arrowup');
    assert.equal(normalizeConditionKey('RIGHT'), 'arrowright');

    const pressed = new Set(['arrowleft']);
    const evalExpr = (expr, env) => {
        if (expr.type === 'NumberLiteral') return Number(expr.value);
        if (expr.type === 'Identifier') return env[expr.name];
        return NaN;
    };

    const astKey = evaluateAstCondition(
        { type: 'KeyCondition', key: 'ліво' },
        {
            evalAstNumberExpression: evalExpr,
            env: {},
            isAtCanvasEdge: () => false,
            pressedKeys: pressed,
        }
    );
    assert.equal(astKey, true);

    const runtimeCompare = evaluateRuntimeIfCondition(
        {
            type: 'COMPARE_AST',
            op: '>',
            left: { type: 'Identifier', name: 'x' },
            right: { type: 'NumberLiteral', value: 3 },
        },
        {
            evalAstNumberExpression: evalExpr,
            executionEnv: { x: 5 },
            isAtCanvasEdge: () => false,
            pressedKeys: new Set(),
        }
    );
    assert.equal(runtimeCompare, true);
});

runTest('interpreter game loop helper clears timer and rejects optional error', () => {
    const runtime = {
        gameLoopTimerId: 123,
        gameLoopReject: null,
    };

    const previousClearInterval = global.clearInterval;
    let clearedId = null;
    global.clearInterval = (id) => {
        clearedId = id;
    };

    let rejectedError = null;
    runtime.gameLoopReject = (error) => {
        rejectedError = error;
    };
    const error = new Error('stop');

    stopGameLoopRuntime(runtime, error);

    assert.equal(clearedId, 123);
    assert.equal(runtime.gameLoopTimerId, null);
    assert.equal(runtime.gameLoopReject, null);
    assert.equal(rejectedError, error);

    global.clearInterval = previousClearInterval;
});

runTest('interpreter game AST runner throws when no game block is present', () => {
    class FakeEnv {
        constructor(parent = null) { this.parent = parent; this.map = new Map(); }
        set(name, value) { this.map.set(name, value); }
        define(name, value) { this.map.set(name, value); }
    }
    class FakeRavlykError extends Error {
        constructor(code) {
            super(code);
            this.name = 'RavlykError';
            this.code = code;
        }
    }

    assert.throws(() => {
        createGameAstRunner({
            programAst: { type: 'Program', body: [] },
            EnvironmentCtor: FakeEnv,
            RavlykErrorCtor: FakeRavlykError,
            maxRecursionDepth: 2,
            maxRepeatsInLoop: 10,
            evalAstNumberExpression() { return 0; },
            handlePrimitiveAstStatement() { return false; },
            evaluateCondition() { return false; },
            attachAstErrorLocation() {},
        });
    }, /GAME_NOT_SUPPORTED_HERE/);
});

runTest('interpreter queue runtime triggers stop path synchronously', () => {
    const runtime = { frameId: null, shouldStop: true, isPaused: false, currentIndex: -1 };
    let completedCalls = 0;
    let errorCalls = 0;
    let cancelCalls = 0;

    runCommandQueueRuntime({
        commandQueue: [],
        config: { animationEnabled: true },
        commandIndicatorUpdater() {},
        ensureExecutionEnv() {},
        createStopError() { return new Error('stop'); },
        getShouldStop: () => runtime.shouldStop,
        getIsPaused: () => runtime.isPaused,
        setCurrentCommandIndex: (idx) => { runtime.currentIndex = idx; },
        setAnimationFrameId: (id) => { runtime.frameId = id; },
        getAnimationFrameId: () => runtime.frameId,
        cancelAnimationFrameFn() { cancelCalls += 1; },
        requestAnimationFrameFn: (cb) => { cb(0); return 1; },
        nowFn: () => 0,
        onExecutionCompleted: () => { completedCalls += 1; },
        onExecutionError: () => { errorCalls += 1; },
        executeCurrentCommand: () => true,
        updateRavlykVisualState() {},
    }).catch(() => {});

    assert.equal(completedCalls, 0);
    assert.equal(errorCalls, 1);
    assert.equal(cancelCalls, 0);
});

runTest('interpreter command executor assigns numeric value for ASSIGN_AST', () => {
    const env = {
        assigned: null,
        set(name, value) {
            this.assigned = { name, value };
        },
    };

    const done = executeInterpreterCommand({
        currentCommandObject: {
            type: 'ASSIGN_AST',
            name: 'x',
            expr: { type: 'NumberLiteral', value: 7 },
        },
        currentFrame: { index: 0 },
        executionStack: [],
        deltaTime: 0,
        executionEnv: env,
        evalAstNumberExpression: () => 7,
        createVariableValueInvalidError: () => new Error('invalid'),
        animatePen: () => true,
        animateMove: () => true,
        animateTurn: () => true,
        setColor() {},
        performGoto() {},
        clearScreen() {},
        cloneCommand: (cmd) => cmd,
        evaluateIfCondition: () => false,
        resetStuckState() {},
        state: { isPenDown: true },
    });

    assert.equal(done, true);
    assert.deepEqual(env.assigned, { name: 'x', value: 7 });
});

runTest('interpreter AST queue adapter emits assignment command when enabled', () => {
    class FakeEnv {
        constructor(parent = null) { this.parent = parent; this.map = new Map(); }
        set(name, value) { this.map.set(name, value); }
        define(name, value) { this.map.set(name, value); }
        get(name) {
            if (this.map.has(name)) return this.map.get(name);
            if (this.parent) return this.parent.get(name);
            return undefined;
        }
        clone() {
            const copy = new FakeEnv(this.parent);
            for (const [key, value] of this.map.entries()) copy.map.set(key, value);
            return copy;
        }
    }

    const queue = astProgramToLegacyQueue({
        programAst: {
            type: 'Program',
            body: [
                {
                    type: 'AssignmentStmt',
                    name: 'score',
                    expr: { type: 'NumberLiteral', value: 12 },
                },
            ],
        },
        emitAssignments: true,
        EnvironmentCtor: FakeEnv,
        maxRecursionDepth: 2,
        maxRepeatsInLoop: 10,
        evalAstNumberExpression: (expr) => Number(expr.value),
        handlePrimitiveAstStatement: () => false,
        attachAstErrorLocation() {},
        createError: (code, ...params) => new Error(`${code}:${params.join(',')}`),
    });

    assert.equal(queue.length, 1);
    assert.equal(queue[0].type, 'ASSIGN_AST');
    assert.equal(queue[0].name, 'score');
});

runTest('interpreter game-contract helper detects nested game and rejects invalid top-level', () => {
    assert.equal(
        hasGameStatement({
            type: 'Program',
            body: [{ type: 'IfStmt', thenBody: [{ type: 'GameStmt' }], elseBody: [] }],
        }),
        true
    );

    assert.throws(() => {
        validateGameProgramContract(
            {
                type: 'Program',
                body: [
                    { type: 'MoveStmt' },
                    { type: 'GameStmt', body: [] },
                ],
            },
            { createError: (code) => new Error(code) }
        );
    }, /GAME_MODE_TOP_LEVEL_ONLY/);
});

runTest('interpreter AST eval helper evaluates expression and attaches location on error', () => {
    const env = {
        get(name) {
            if (name === 'x') return 4;
            const error = new Error('undefined');
            error.name = 'RavlykError';
            throw error;
        },
    };

    const value = evalAstNumberExpression(
        {
            type: 'BinaryExpr',
            op: '*',
            left: { type: 'UnaryExpr', op: '-', expr: { type: 'Identifier', name: 'x' } },
            right: { type: 'NumberLiteral', value: 3 },
        },
        env
    );
    assert.equal(value, -12);

    const astNode = {
        type: 'Identifier',
        name: 'missing',
        span: { start: { line: 8, column: 5, token: 'missing' } },
    };
    assert.throws(() => {
        evalAstNumberExpression(astNode, env, { attachAstErrorLocation });
    }, (error) => error && error.line === 8 && error.column === 5 && error.token === 'missing');
});

runTest('interpreter primitive-statement helper handles queue and runtime branches', () => {
    const queue = [];
    const state = { isPenDown: true };
    let movedDistance = null;
    let cleared = 0;

    const handledMove = handlePrimitiveAstStatement({
        stmt: { type: 'MoveStmt', direction: 'forward', distance: { type: 'NumberLiteral', value: 15 } },
        env: {},
        mode: 'queue',
        outputQueue: queue,
        state,
        evalAstNumberExpression: (expr) => Number(expr.value),
        createError: (code) => new Error(code),
        performMove: () => {},
        performTurn: () => {},
        setColor: () => {},
        performGoto: () => {},
        clearScreen: () => {},
    });
    assert.equal(handledMove, true);
    assert.equal(queue[0].type, 'MOVE');
    assert.equal(queue[0].value, 15);

    const handledPen = handlePrimitiveAstStatement({
        stmt: { type: 'PenStmt', mode: 'up' },
        env: {},
        mode: 'runtime',
        outputQueue: queue,
        state,
        evalAstNumberExpression: () => 0,
        createError: (code) => new Error(code),
        performMove: (distance) => { movedDistance = distance; },
        performTurn: () => {},
        setColor: () => {},
        performGoto: () => {},
        clearScreen: () => { cleared += 1; },
    });
    assert.equal(handledPen, true);
    assert.equal(state.isPenDown, false);
    assert.equal(movedDistance, null);
    assert.equal(cleared, 0);
});

runTest('interpreter animation helper handles pen/move/turn completion paths', () => {
    const state = { scale: 1, isStuck: false, isPenDown: true };
    const penCmd = {};
    const penDone = animatePen({
        commandObject: penCmd,
        targetScale: 0.8,
        deltaTime: 1,
        animationEnabled: false,
        state,
    });
    assert.equal(penDone, true);
    assert.equal(state.scale, 0.8);

    const moveCmd = {};
    let notifyCalls = 0;
    let warningShown = false;
    const moveDone = animateMove({
        commandObject: moveCmd,
        totalDistance: 30,
        deltaTime: Infinity,
        animationEnabled: false,
        moveSpeed: 120,
        state,
        performMove: () => true,
        infoNotifier: () => { notifyCalls += 1; },
        boundaryWarningShown: warningShown,
        setBoundaryWarningShown: (value) => { warningShown = value; },
        outOfBoundsMessage: 'out',
    });
    assert.equal(moveDone, true);
    assert.equal(state.isStuck, true);
    assert.equal(notifyCalls, 0);

    const turnCmd = {};
    let turnedBy = 0;
    const turnDone = animateTurn({
        commandObject: turnCmd,
        totalAngle: 45,
        deltaTime: Infinity,
        animationEnabled: false,
        turnSpeed: 180,
        performTurn: (angle) => { turnedBy += angle; },
    });
    assert.equal(turnDone, true);
    assert.equal(turnedBy, 45);
});

runTest('interpreter drawing-ops helper handles move/turn/color/goto/clear contracts', () => {
    const state = {
        x: 10,
        y: 10,
        angle: 0,
        isPenDown: true,
        isRainbow: false,
        rainbowHue: 0,
        color: '#000000',
    };
    const canvas = { width: 100, height: 100 };
    const calls = [];
    const ctx = {
        beginPath() { calls.push('begin'); },
        moveTo() { calls.push('moveTo'); },
        lineTo() { calls.push('lineTo'); },
        stroke() { calls.push('stroke'); },
        clearRect() { calls.push('clearRect'); },
    };

    const boundaryHit = performMove({
        distance: 5,
        state,
        ctx,
        clampToCanvasBounds: (x, y) => ({ boundedX: x, boundedY: y }),
        applyContextSettings() {},
    });
    assert.equal(boundaryHit, false);
    assert.equal(state.x, 15);
    assert.equal(calls.includes('stroke'), true);

    performTurn({ angle: -90, state });
    assert.equal(state.angle, 270);

    let appliedColor = 0;
    setColor({
        colorName: 'green',
        state,
        colorMap: { green: '#00ff00', rainbow: 'RAINBOW' },
        applyContextSettings: () => { appliedColor += 1; },
        createUnknownColorError: (raw) => new Error(`bad:${raw}`),
    });
    assert.equal(state.color, '#00ff00');
    assert.equal(appliedColor, 1);

    let notifyCount = 0;
    let warningShown = false;
    performGoto({
        logicalX: 1000,
        logicalY: 1000,
        state,
        ctx,
        canvas,
        clampToCanvasBounds: () => ({ boundedX: 99, boundedY: 1 }),
        infoNotifier: () => { notifyCount += 1; },
        boundaryWarningShown: warningShown,
        setBoundaryWarningShown: (value) => { warningShown = value; },
        outOfBoundsMessage: 'out',
    });
    assert.equal(state.x, 99);
    assert.equal(state.y, 1);
    assert.equal(notifyCount, 1);
    assert.equal(warningShown, true);

    clearScreen({ ctx, canvas });
    assert.equal(calls.includes('clearRect'), true);
});

runTest('interpreter command clone helper deep-clones nested commands and strips runtime fields', () => {
    const source = {
        type: 'REPEAT',
        remainingIterations: 2,
        commands: [
            {
                type: 'MOVE',
                remainingDistance: 10,
            },
        ],
        thenCommands: [
            {
                type: 'TURN',
                remainingAngle: 15,
            },
        ],
        elseCommands: [
            {
                type: 'PEN_UP',
                animationProgress: 0.3,
                startScale: 1,
            },
        ],
    };

    const cloned = cloneInterpreterCommand(source);
    assert.equal(cloned === source, false);
    assert.equal(cloned.commands[0] === source.commands[0], false);
    assert.equal(cloned.thenCommands[0] === source.thenCommands[0], false);
    assert.equal(cloned.elseCommands[0] === source.elseCommands[0], false);
    assert.equal('remainingIterations' in cloned, false);
    assert.equal('remainingDistance' in cloned.commands[0], false);
    assert.equal('remainingAngle' in cloned.thenCommands[0], false);
    assert.equal('animationProgress' in cloned.elseCommands[0], false);
    assert.equal('startScale' in cloned.elseCommands[0], false);
});

runTest('interpreter lifecycle cleanup helper is idempotent and clears runtime state', () => {
    const removedEvents = [];
    const cancelledFrames = [];
    const clearedTimers = [];
    const runtime = {
        isDestroyed: false,
        animationFrameId: 42,
        gameLoopTimerId: 99,
        onKeyDown() {},
        onKeyUp() {},
        gameLoopReject: () => {},
        shouldStop: false,
        isPaused: true,
        isExecuting: true,
        executionEnv: { foo: 1 },
        commandQueue: [{ type: 'MOVE' }],
        currentCommandIndex: 7,
        pressedKeys: new Set(['arrowup']),
    };

    const cleaned = destroyInterpreterLifecycle({
        runtime,
        cancelAnimationFrameFn: (id) => { cancelledFrames.push(id); },
        clearIntervalFn: (id) => { clearedTimers.push(id); },
        windowRef: {
            removeEventListener: (type) => { removedEvents.push(type); },
        },
    });
    assert.equal(cleaned, true);
    assert.equal(runtime.isDestroyed, true);
    assert.equal(runtime.animationFrameId, null);
    assert.equal(runtime.gameLoopTimerId, null);
    assert.deepEqual(cancelledFrames, [42]);
    assert.deepEqual(clearedTimers, [99]);
    assert.deepEqual(removedEvents, ['keydown', 'keyup']);
    assert.equal(runtime.shouldStop, true);
    assert.equal(runtime.isPaused, false);
    assert.equal(runtime.isExecuting, false);
    assert.equal(runtime.executionEnv, null);
    assert.deepEqual(runtime.commandQueue, []);
    assert.equal(runtime.currentCommandIndex, 0);
    assert.equal(runtime.pressedKeys.size, 0);

    const secondRun = destroyInterpreterLifecycle({
        runtime,
        cancelAnimationFrameFn: (id) => { cancelledFrames.push(id); },
        clearIntervalFn: (id) => { clearedTimers.push(id); },
        windowRef: {
            removeEventListener: (type) => { removedEvents.push(type); },
        },
    });
    assert.equal(secondRun, false);
    assert.deepEqual(cancelledFrames, [42]);
    assert.deepEqual(clearedTimers, [99]);
    assert.deepEqual(removedEvents, ['keydown', 'keyup']);
});

runTest('interpreter runtime-state helper handles stop/pause/resume/status contracts', () => {
    const runtime = {
        shouldStop: false,
        isPaused: true,
        isExecuting: false,
        boundaryWarningShown: true,
    };
    let stoppedWith = null;

    stopExecutionRuntime({
        runtime,
        createStopError: () => new Error('stop'),
        stopGameLoop: (error) => { stoppedWith = error; },
    });
    assert.equal(runtime.shouldStop, true);
    assert.equal(runtime.isPaused, false);
    assert.equal(stoppedWith && stoppedWith.message, 'stop');

    runtime.isPaused = false;
    runtime.isExecuting = false;
    pauseExecutionRuntime({ runtime });
    assert.equal(runtime.isPaused, false);

    runtime.isExecuting = true;
    pauseExecutionRuntime({ runtime });
    assert.equal(runtime.isPaused, true);

    resumeExecutionRuntime({ runtime });
    assert.equal(runtime.isPaused, false);
    assert.equal(wasBoundaryWarningShownRuntime({ runtime }), true);
});

runTest('parser block/condition helpers parse nested parens and if-comparison condition', () => {
    assert.equal(findClosingParenIndex(['(', 'a', '(', 'b', ')', ')'], 0), 5);

    const block = parseAstBlockOrThrow({
        tokens: ['(', 'cmd', ')'],
        tokenMeta: null,
        openParenIndex: 0,
        findClosingParenIndexFn: findClosingParenIndex,
        parseTokensToAst: (innerTokens) => ({ body: innerTokens.map((token) => ({ token })) }),
        spanFromMeta: () => null,
        createError: (code) => new Error(code),
    });
    assert.equal(block.nextIndex, 3);
    assert.deepEqual(block.body, [{ token: 'cmd' }]);

    const condition = parseAstConditionOrThrow({
        tokens: ['left', '>=', 'right'],
        tokenMeta: null,
        startIndex: 0,
        keywordIf: 'if',
        keywordEdge: 'edge',
        keywordKey: 'key',
        comparisonOperators: new Set(['>=']),
        parseQuotedStringOrThrow: (raw) => raw.replaceAll('"', ''),
        parseAstExpressionOrThrow: (tokensInput, _meta, start) => ({
            expr: { type: 'Identifier', name: tokensInput[start] },
            nextIndex: start + 1,
        }),
        spanFromMeta: () => null,
        createUnknownCommandError: (token) => new Error(`unknown:${token}`),
    });
    assert.equal(condition.nextIndex, 3);
    assert.equal(condition.condition.type, 'CompareCondition');
    assert.equal(condition.condition.op, '>=');
});

runTest('parser create-statement helper parses create assignment path', () => {
    const parsed = parseCreateStatementToAst({
        tokens: ['create', 'score', '=', '10'],
        tokenMeta: null,
        startIndex: 0,
        isValidIdentifier: (identifier) => /^[a-z]+$/i.test(identifier),
        normalizeIdentifier: (identifier) => String(identifier).toLowerCase(),
        parseAstExpressionOrThrow: (_tokens, _meta, _startIndex) => ({
            expr: { type: 'NumberLiteral', value: 10 },
            nextIndex: 4,
        }),
        parseAstBlockOrThrow: () => ({ body: [], nextIndex: 0 }),
        spanFromMeta: () => null,
        createError: (code) => new Error(code),
    });

    assert.equal(parsed.nextIndex, 4);
    assert.equal(parsed.stmt.type, 'AssignmentStmt');
    assert.equal(parsed.stmt.name, 'score');
    assert.equal(parsed.stmt.declaredWithCreate, true);
});

console.log('UI tests completed.');
