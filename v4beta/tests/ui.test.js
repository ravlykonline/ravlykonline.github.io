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

console.log('UI tests completed.');
