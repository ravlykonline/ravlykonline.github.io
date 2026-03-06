import assert from 'node:assert/strict';
import { createExecutionController } from '../js/modules/executionController.js';
import { createFileActionsController } from '../js/modules/fileActionsController.js';
import { createNavigationPrefetchController } from '../js/modules/navigationPrefetch.js';
import { createModalController } from '../js/modules/modalController.js';
import { createEditorInputController } from '../js/modules/editorInputController.js';
import { createLifecycleController } from '../js/modules/lifecycleController.js';
import { runAsyncTest, runTest } from './testUtils.js';

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

runAsyncTest('file actions controller blocks share for empty code', async () => {
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

console.log('Controller tests completed.');
