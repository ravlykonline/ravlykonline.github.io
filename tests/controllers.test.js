import assert from 'node:assert/strict';
import { createExecutionController } from '../js/modules/executionController.js';
import { createFileActionsController } from '../js/modules/fileActionsController.js';
import { createNavigationPrefetchController } from '../js/modules/navigationPrefetch.js';
import { createModalController } from '../js/modules/modalController.js';
import {
    createEditorInputController,
    shouldConfirmExampleReplacement,
} from '../js/modules/editorInputController.js';
import { createLifecycleController } from '../js/modules/lifecycleController.js';
import { encodeCodeForUrlHash } from '../js/modules/share.js';
import { runAsyncTest, runTest } from './testUtils.js';

function createExecutionHarness({
    code = 'вперед 10',
    maxCodeLength = 1000,
    prepareProgram = () => ({ type: 'Program', body: [] }),
    executeProgram = async () => {},
} = {}) {
    const state = { resetCalls: 0, errors: [], infos: [], successes: [], stopCalls: 0 };
    const interpreter = {
        isExecuting: false,
        shouldStop: false,
        pauseExecution() {},
        resumeExecution() {},
        stopExecution() { state.stopCalls += 1; },
        reset() { state.resetCalls += 1; },
        setAnimationEnabled() {},
        setSpeed() {},
        wasBoundaryWarningShown() { return false; },
        prepareProgram,
        executeProgram,
    };
    const controller = createExecutionController({
        interpreter,
        codeEditor: { disabled: false, value: code },
        editorUi: {
            setEditorErrorLine() {},
            getFriendlyExecutionError(_source, error) { return { line: error.line || null, message: error.message }; },
            focusEditorLine() {},
        },
        uiControls: {
            runBtn: { disabled: false }, stopBtn: { disabled: true }, clearBtn: { disabled: false },
            downloadBtn: { disabled: false }, shareBtn: { disabled: false }, gridBtn: { disabled: false },
            helpBtn: { disabled: false }, exampleBlocks: [],
        },
        messages: {
            ERROR_MESSAGES: {
                EXECUTION_IN_PROGRESS: 'busy', CODE_TOO_LONG: 'too long', EXECUTION_TIMEOUT: 'timeout',
                EXECUTION_STOPPED_BY_USER: 'stopped', GIF_GAME_UNSUPPORTED: 'game gif blocked',
                GIF_CAPTURE_LIMIT_SAVED: 'capture saved', UNEXPECTED_EXECUTION_ERROR: 'unexpected',
            },
            SUCCESS_MESSAGES: { CODE_EXECUTED: 'done' },
            INFO_MESSAGES: { EXECUTION_STOPPED: 'stopped' },
        },
        limits: { MAX_CODE_LENGTH_CHARS: maxCodeLength, EXECUTION_TIMEOUT_MS: 180000 },
        animationDefaults: { DEFAULT_MOVE_PIXELS_PER_SECOND: 100, DEFAULT_TURN_DEGREES_PER_SECOND: 90 },
        uiHandlers: {
            showError(message) { state.errors.push(message); },
            showInfoMessage(message) { state.infos.push(message); },
            showSuccessMessage(message) { state.successes.push(message); },
            showStopConfirmModal() {}, hideStopConfirmModal() {}, updateCommandIndicator() {},
        },
    });
    return { controller, interpreter, state };
}

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
            prepareProgram() { return { type: 'Program', body: [] }; },
            async executeProgram() {},
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
        prepareProgram() { return { type: 'Program', body: [] }; },
        async executeProgram() {},
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

runAsyncTest('execution controller preserves drawing after user stop in game mode', async () => {
    const previousWindow = global.window;
    global.window = {};
    let resetCalls = 0;
    let infoMessage = null;
    let successCalls = 0;
    let errorCalls = 0;

    const controller = createExecutionController({
        interpreter: {
            isExecuting: false,
            shouldStop: false,
            pauseExecution() {},
            resumeExecution() {},
            stopExecution() {},
            reset() { resetCalls += 1; },
            setAnimationEnabled() {},
            setSpeed() {},
            wasBoundaryWarningShown() { return false; },
            prepareProgram() { return { type: 'Program', body: [] }; },
            async executeProgram() {
                const error = new Error('stopped');
                error.name = 'RavlykError';
                error.message = 'EXECUTION_STOPPED_BY_USER';
                throw error;
            },
        },
        codeEditor: { disabled: false, value: 'грати (\n  якщо клавіша "вгору" ( вперед 3 )\n)' },
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
            ERROR_MESSAGES: {
                CODE_TOO_LONG: '',
                EXECUTION_TIMEOUT: '',
                EXECUTION_STOPPED_BY_USER: 'EXECUTION_STOPPED_BY_USER',
            },
            SUCCESS_MESSAGES: { CODE_EXECUTED: '' },
            INFO_MESSAGES: { EXECUTION_STOPPED: 'execution stopped' },
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
            showError() { errorCalls += 1; },
            showInfoMessage(message) { infoMessage = message; },
            showSuccessMessage() { successCalls += 1; },
            showStopConfirmModal() {},
            hideStopConfirmModal() {},
            updateCommandIndicator() {},
        },
    });

    await controller.runCode();

    assert.equal(resetCalls, 1, 'controller should reset only before starting a fresh run');
    assert.equal(infoMessage, 'execution stopped');
    assert.equal(errorCalls, 0);
    assert.equal(successCalls, 0);

    global.window = previousWindow;
});

runAsyncTest('execution controller validates before clearing the existing drawing', async () => {
    const previousWindow = global.window;
    global.window = {};
    let resetCalls = 0;
    let executeCalls = 0;
    let shownError = null;

    const controller = createExecutionController({
        interpreter: {
            isExecuting: false,
            stopExecution() {},
            prepareProgram() {
                const error = new Error('syntax error');
                error.name = 'RavlykError';
                error.line = 2;
                throw error;
            },
            reset() { resetCalls += 1; },
            setAnimationEnabled() {},
            setSpeed() {},
            wasBoundaryWarningShown() { return false; },
            async executeProgram() { executeCalls += 1; },
        },
        codeEditor: { disabled: false, value: 'вперед' },
        editorUi: {
            setEditorErrorLine() {},
            getFriendlyExecutionError() { return { line: 2, message: 'Помилка у рядку 2' }; },
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
        limits: { MAX_CODE_LENGTH_CHARS: 1000, EXECUTION_TIMEOUT_MS: 1000 },
        animationDefaults: {
            DEFAULT_MOVE_PIXELS_PER_SECOND: 100,
            DEFAULT_TURN_DEGREES_PER_SECOND: 90,
        },
        uiHandlers: {
            showError(message) { shownError = message; },
            showInfoMessage() {},
            showSuccessMessage() {},
            showStopConfirmModal() {},
            hideStopConfirmModal() {},
            updateCommandIndicator() {},
        },
    });

    await controller.runCode();

    assert.equal(resetCalls, 0, 'invalid code must not clear the current canvas');
    assert.equal(executeCalls, 0);
    assert.equal(shownError, 'Помилка у рядку 2');
    global.window = previousWindow;
});

runAsyncTest('execution controller preserves partial drawing after runtime error', async () => {
    const previousWindow = global.window;
    global.window = {};
    let resetCalls = 0;
    let shownError = null;
    const preparedAst = { type: 'Program', body: [{ type: 'MoveStmt' }] };

    const controller = createExecutionController({
        interpreter: {
            isExecuting: false,
            stopExecution() {},
            prepareProgram() { return preparedAst; },
            reset() { resetCalls += 1; },
            setAnimationEnabled() {},
            setSpeed() {},
            wasBoundaryWarningShown() { return false; },
            async executeProgram(programAst) {
                assert.equal(programAst, preparedAst);
                const error = new Error('runtime error');
                error.name = 'RavlykError';
                error.line = 2;
                throw error;
            },
        },
        codeEditor: { disabled: false, value: 'вперед 40\nвперед невідоме' },
        editorUi: {
            setEditorErrorLine() {},
            getFriendlyExecutionError() { return { line: 2, message: 'Помилка виконання у рядку 2' }; },
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
        limits: { MAX_CODE_LENGTH_CHARS: 1000, EXECUTION_TIMEOUT_MS: 1000 },
        animationDefaults: {
            DEFAULT_MOVE_PIXELS_PER_SECOND: 100,
            DEFAULT_TURN_DEGREES_PER_SECOND: 90,
        },
        uiHandlers: {
            showError(message) { shownError = message; },
            showInfoMessage() {},
            showSuccessMessage() {},
            showStopConfirmModal() {},
            hideStopConfirmModal() {},
            updateCommandIndicator() {},
        },
    });

    await controller.runCode();

    assert.equal(resetCalls, 1, 'canvas should clear only once before valid execution starts');
    assert.equal(shownError, 'Помилка виконання у рядку 2');
    global.window = previousWindow;
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

runTest('file actions controller uses runtime background color for image export', () => {
    const previousDocument = global.document;
    const previousGetComputedStyle = global.getComputedStyle;

    let fillStyleUsed = null;
    let fillRectCalls = 0;
    let drawImageCalls = 0;
    const drawnSources = [];
    let clicked = 0;
    let appended = 0;
    let removed = 0;
    let successCalls = 0;

    const tempCtx = {
        fillStyle: '',
        fillRect() {
            fillStyleUsed = this.fillStyle;
            fillRectCalls += 1;
        },
        drawImage() {
            drawImageCalls += 1;
            drawnSources.push(arguments[0]);
        },
    };

    const backgroundCanvas = { id: 'background-layer' };
    const drawingCanvas = { width: 120, height: 80, parentElement: {} };

    global.getComputedStyle = () => ({ backgroundColor: 'rgb(255, 255, 255)' });
    global.document = {
        createElement(tag) {
            if (tag === 'canvas') {
                return {
                    width: 0,
                    height: 0,
                    getContext() {
                        return tempCtx;
                    },
                    toDataURL() {
                        return 'data:image/png;base64,abc';
                    },
                };
            }
            if (tag === 'a') {
                return {
                    download: '',
                    href: '',
                    click() {
                        clicked += 1;
                    },
                };
            }
            return null;
        },
        body: {
            appendChild() { appended += 1; },
            removeChild() { removed += 1; },
        },
    };

    const controller = createFileActionsController({
        canvas: drawingCanvas,
        backgroundCanvas,
        codeEditor: { value: '' },
        maxCodeLengthChars: 1000,
        maxShareUrlLengthChars: 7000,
        errorMessages: {
            CODE_TOO_LONG: 'too long',
            SAVE_IMAGE_SECURITY_ERROR: 'sec',
            SAVE_IMAGE_ERROR: (msg) => msg,
        },
        successMessages: { IMAGE_SAVED: 'ok' },
        showError() {},
        showSuccessMessage() { successCalls += 1; },
        showInfoMessage() {},
        onCodeLoaded() {},
        getCanvasBackgroundColor: () => '#D4AF37',
    });

    controller.saveDrawing();

    assert.equal(fillStyleUsed, '#D4AF37');
    assert.equal(fillRectCalls, 1);
    assert.equal(drawImageCalls, 2);
    assert.deepEqual(drawnSources, [backgroundCanvas, drawingCanvas]);
    assert.equal(clicked, 1);
    assert.equal(appended, 1);
    assert.equal(removed, 1);
    assert.equal(successCalls, 1);

    global.document = previousDocument;
    global.getComputedStyle = previousGetComputedStyle;
});

runTest('file actions controller exports white background after clear-sheet state', () => {
    const previousDocument = global.document;
    const previousGetComputedStyle = global.getComputedStyle;

    let fillStyleUsed = null;
    let drawImageCalls = 0;
    const drawnSources = [];

    const tempCtx = {
        fillStyle: '',
        fillRect() {
            fillStyleUsed = this.fillStyle;
        },
        drawImage() {
            drawImageCalls += 1;
            drawnSources.push(arguments[0]);
        },
    };

    const backgroundCanvas = { id: 'background-layer-after-clear' };
    const drawingCanvas = { width: 120, height: 80, parentElement: {} };

    global.getComputedStyle = () => ({ backgroundColor: 'rgb(255, 255, 255)' });
    global.document = {
        createElement(tag) {
            if (tag === 'canvas') {
                return {
                    width: 0,
                    height: 0,
                    getContext() {
                        return tempCtx;
                    },
                    toDataURL() {
                        return 'data:image/png;base64,abc';
                    },
                };
            }
            if (tag === 'a') {
                return {
                    download: '',
                    href: '',
                    click() {},
                };
            }
            return null;
        },
        body: {
            appendChild() {},
            removeChild() {},
        },
    };

    const controller = createFileActionsController({
        canvas: drawingCanvas,
        backgroundCanvas,
        codeEditor: { value: '' },
        maxCodeLengthChars: 1000,
        maxShareUrlLengthChars: 7000,
        errorMessages: {
            CODE_TOO_LONG: 'too long',
            SAVE_IMAGE_SECURITY_ERROR: 'sec',
            SAVE_IMAGE_ERROR: (msg) => msg,
        },
        successMessages: { IMAGE_SAVED: 'ok' },
        showError() {},
        showSuccessMessage() {},
        showInfoMessage() {},
        onCodeLoaded() {},
        getCanvasBackgroundColor: () => '#FFFFFF',
    });

    controller.saveDrawing();

    assert.equal(fillStyleUsed, '#FFFFFF');
    assert.equal(drawImageCalls, 2);
    assert.deepEqual(drawnSources, [backgroundCanvas, drawingCanvas]);

    global.document = previousDocument;
    global.getComputedStyle = previousGetComputedStyle;
});

runTest('file actions controller loads code from hash and invokes callback', () => {
    const previousWindow = global.window;
    global.window = { location: { hash: '#code=YWJj' } };

    let loadedCalls = 0;
    let infoCalls = 0;
    let infoMessage = null;
    let infoDuration = null;
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
        showInfoMessage(message, duration) {
            infoCalls += 1;
            infoMessage = message;
            infoDuration = duration;
        },
        onCodeLoaded() { loadedCalls += 1; },
    });

    controller.loadCodeFromUrlHash();

    assert.equal(codeEditor.value.length > 0, true);
    assert.equal(loadedCalls, 1);
    assert.equal(infoCalls, 1);
    assert.equal(infoMessage, 'Код завантажено з посилання. Переглянь його перед запуском.');
    assert.equal(infoDuration, 0);
    assert.equal(errorCalls, 0);

    global.window = previousWindow;
});

runTest('file actions controller rejects malformed and oversized share payloads without changing code', () => {
    const previousWindow = global.window;
    const codeEditor = { value: 'залишити цей код' };
    const errors = [];
    const makeController = () => createFileActionsController({
        canvas: { width: 1, height: 1, parentElement: {} },
        codeEditor,
        maxCodeLengthChars: 12,
        maxShareUrlLengthChars: 30,
        errorMessages: {
            CODE_TOO_LONG: 'code too long', SHARE_LINK_INVALID: 'invalid',
            SHARE_LINK_TOO_LONG: 'share too long',
        },
        successMessages: {},
        showError(message) { errors.push(message); },
        showSuccessMessage() {}, showInfoMessage() {}, onCodeLoaded() {},
    });

    global.window = { location: { hash: '#code=%%%invalid%%%' } };
    makeController().loadCodeFromUrlHash();
    assert.equal(codeEditor.value, 'залишити цей код');

    global.window.location.hash = `#code=${'a'.repeat(40)}`;
    makeController().loadCodeFromUrlHash();
    assert.equal(codeEditor.value, 'залишити цей код');

    const decodedTooLong = encodeCodeForUrlHash('1234567890123');
    global.window.location.hash = `#code=${decodedTooLong}`;
    makeController().loadCodeFromUrlHash();
    assert.equal(codeEditor.value, 'залишити цей код');
    assert.deepEqual(errors, ['invalid', 'share too long', 'code too long']);
    global.window = previousWindow;
});

runTest('file actions controller preserves Unicode share code and never auto-runs it', () => {
    const previousWindow = global.window;
    const source = 'вперед 10\n// 🐌';
    global.window = { location: { hash: `#code=${encodeCodeForUrlHash(source)}` } };
    const codeEditor = { value: '' };
    let loaded = 0;
    let executed = 0;
    const controller = createFileActionsController({
        canvas: { width: 1, height: 1, parentElement: {} }, codeEditor,
        maxCodeLengthChars: 100, maxShareUrlLengthChars: 7000,
        errorMessages: { CODE_TOO_LONG: '', SHARE_LINK_INVALID: '', SHARE_LINK_TOO_LONG: '' },
        successMessages: {}, showError() {}, showSuccessMessage() {}, showInfoMessage() {},
        onCodeLoaded() { loaded += 1; },
        interpreter: { executeProgram() { executed += 1; } },
    });
    controller.loadCodeFromUrlHash();
    assert.equal(codeEditor.value, source);
    assert.equal(loaded, 1);
    assert.equal(executed, 0);
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

    assert.equal(appended.length, 3);
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

runTest('modal controller confirms or cancels one pending example replacement', () => {
    const previousDocument = global.document;
    const documentListeners = {};
    const confirmListeners = {};
    const cancelListeners = {};
    let showCalls = 0;
    let hideCalls = 0;
    let confirmedCalls = 0;
    let focusedCalls = 0;

    global.document = {
        addEventListener(eventName, handler) {
            documentListeners[eventName] = handler;
        },
        getElementById() {
            return null;
        },
    };

    const createButton = (listeners) => ({
        addEventListener(eventName, handler) {
            listeners[eventName] = handler;
        },
    });
    const exampleConfirmBtn = createButton(confirmListeners);
    const exampleCancelBtn = createButton(cancelListeners);
    const triggerElement = {
        focus() { focusedCalls += 1; },
    };
    const controller = createModalController({
        interpreter: {
            isExecuting: false,
            reset() {},
            stopExecution() {},
        },
        codeEditor: { value: '' },
        editorUi: { updateEditorDecorations() {} },
        fileActions: { saveDrawing() {}, saveGif() {}, saveCodeToFile() {} },
        executionController: {
            openStopConfirmDialog() {},
            closeStopConfirmDialog() {},
        },
        navigationPrefetch: { openInNewTab() {} },
        showInfoMessage() {},
        hideHelpModal() {},
        showClearConfirmModal() {},
        hideClearConfirmModal() {},
        showExampleConfirmModal() { showCalls += 1; },
        hideExampleConfirmModal(focusTarget) {
            hideCalls += 1;
            focusTarget?.focus?.();
        },
        hideDownloadModal() {},
    });

    controller.setupModalInteractions({ exampleConfirmBtn, exampleCancelBtn });
    assert.equal(typeof documentListeners.keydown, 'function');

    controller.requestExampleConfirmation({
        triggerElement,
        onConfirm() { confirmedCalls += 1; },
    });
    assert.equal(showCalls, 1);
    cancelListeners.click();
    assert.equal(confirmedCalls, 0);
    assert.equal(hideCalls, 1);
    assert.equal(focusedCalls, 1);

    controller.requestExampleConfirmation({
        triggerElement,
        onConfirm() { confirmedCalls += 1; },
    });
    confirmListeners.click();
    confirmListeners.click();
    assert.equal(showCalls, 2);
    assert.equal(confirmedCalls, 1);
    assert.equal(hideCalls, 2);
    assert.equal(focusedCalls, 2);

    global.document = previousDocument;
});

runTest('example replacement confirmation rule protects only different non-empty code', () => {
    assert.equal(shouldConfirmExampleReplacement('', 'вперед 10'), false);
    assert.equal(shouldConfirmExampleReplacement('   ', 'вперед 10'), false);
    assert.equal(shouldConfirmExampleReplacement('вперед 10', 'вперед 10'), false);
    assert.equal(shouldConfirmExampleReplacement('мій код', 'вперед 10'), true);
});

runTest('editor input controller waits for confirmation before replacing existing code', () => {
    const listeners = {};
    const exampleCode = 'повторити 4 ( вперед 20 праворуч 90 )';
    const exampleBlock = {
        addEventListener(eventName, handler) {
            listeners[eventName] = handler;
        },
        getAttribute(name) {
            return name === 'data-code' ? exampleCode : null;
        },
        setAttribute() {},
        click() {
            listeners.click();
        },
    };
    const codeEditor = { value: 'мій важливий код' };
    let pendingConfirmation = null;
    let confirmationCalls = 0;
    let runCalls = 0;
    let decorationCalls = 0;
    let errorLine = 2;
    const controller = createEditorInputController({
        codeEditor,
        exampleBlocks: [exampleBlock],
        editorUi: {
            updateEditorDecorations() { decorationCalls += 1; },
            getEditorErrorLine() { return errorLine; },
            setEditorErrorLine(value) { errorLine = value; },
        },
        executionController: {
            runCode() { runCalls += 1; },
        },
        interpreter: { isExecuting: false },
        requestExampleConfirmation(options) {
            confirmationCalls += 1;
            pendingConfirmation = options;
        },
    });

    controller.setupExampleBlocks();
    listeners.click();
    assert.equal(confirmationCalls, 1);
    assert.equal(codeEditor.value, 'мій важливий код');
    assert.equal(runCalls, 0);

    pendingConfirmation.onConfirm();
    assert.equal(codeEditor.value, exampleCode);
    assert.equal(runCalls, 1);
    assert.equal(decorationCalls, 1);
    assert.equal(errorLine, null);

    listeners.click();
    assert.equal(confirmationCalls, 1);
    assert.equal(runCalls, 2);

    codeEditor.value = 'ще один мій код';
    const keyEvent = {
        key: 'Enter',
        preventDefaultCalled: false,
        preventDefault() { this.preventDefaultCalled = true; },
    };
    listeners.keydown(keyEvent);
    assert.equal(keyEvent.preventDefaultCalled, true);
    assert.equal(confirmationCalls, 2);
    assert.equal(codeEditor.value, 'ще один мій код');
    assert.equal(runCalls, 2);
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

runTest('editor input controller allows keyboard focus to leave the textarea', () => {
    const listeners = {};
    const codeEditor = {
        value: 'вперед 50',
        selectionStart: 0,
        selectionEnd: 0,
        addEventListener(eventName, handler) {
            listeners[eventName] = handler;
        },
    };
    const controller = createEditorInputController({
        codeEditor,
        exampleBlocks: [],
        editorUi: {
            updateEditorDecorations() {},
            getEditorErrorLine() { return null; },
            setEditorErrorLine() {},
        },
        executionController: { runCode() {} },
        interpreter: { isExecuting: false },
    });
    controller.setupEditorInputListeners();

    const escapeEvent = {
        key: 'Escape',
        preventDefaultCalled: false,
        preventDefault() { this.preventDefaultCalled = true; },
    };
    listeners.keydown(escapeEvent);
    assert.equal(escapeEvent.preventDefaultCalled, false);

    const exitForwardEvent = {
        key: 'Tab',
        shiftKey: false,
        preventDefaultCalled: false,
        preventDefault() { this.preventDefaultCalled = true; },
    };
    listeners.keydown(exitForwardEvent);
    assert.equal(exitForwardEvent.preventDefaultCalled, false);
    assert.equal(codeEditor.value, 'вперед 50');

    const indentEvent = {
        key: 'Tab',
        shiftKey: false,
        preventDefaultCalled: false,
        preventDefault() { this.preventDefaultCalled = true; },
    };
    listeners.keydown(indentEvent);
    assert.equal(indentEvent.preventDefaultCalled, true);

    const exitBackwardEvent = {
        key: 'Tab',
        shiftKey: true,
        preventDefaultCalled: false,
        preventDefault() { this.preventDefaultCalled = true; },
    };
    listeners.keydown(exitBackwardEvent);
    assert.equal(exitBackwardEvent.preventDefaultCalled, false);
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
    let linkedCanvasCount = 0;
    const backgroundCanvas = {};

    const lifecycle = createLifecycleController({
        canvas: {},
        backgroundCanvas,
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
        resizeCanvas(_canvas, _ctx, onResize, options) {
            resizeCalls += 1;
            linkedCanvasCount = Array.isArray(options?.linkedCanvases) ? options.linkedCanvases.length : 0;
            onResize?.({});
        },
        setFooterYear() { footerCalls += 1; },
    });

    lifecycle.initialize();

    assert.equal(resizeListenerEvent, 'resize');
    assert.equal(gridInitCalls, 1);
    assert.equal(resizeCalls, 1);
    assert.equal(linkedCanvasCount, 1);
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

await runAsyncTest('execution session rejects invalid and oversized GIF code before reset', async () => {
    const invalid = createExecutionHarness({
        prepareProgram() {
            const error = new Error('bad code');
            error.name = 'RavlykError';
            throw error;
        },
    });
    assert.equal(await invalid.controller.executeSession('bad', { kind: 'gif' }), 'failed');
    assert.equal(invalid.state.resetCalls, 0);

    const oversized = createExecutionHarness({ maxCodeLength: 3 });
    assert.equal(await oversized.controller.executeSession('1234', { kind: 'gif' }), 'failed');
    assert.equal(oversized.state.resetCalls, 0);
});

await runAsyncTest('execution session rejects game GIF before reset', async () => {
    const harness = createExecutionHarness({
        prepareProgram: () => ({ type: 'Program', body: [{ type: 'GameStmt', body: [] }] }),
    });
    const result = await harness.controller.executeSession('грати ()', { kind: 'gif' });
    assert.equal(result, 'failed');
    assert.equal(harness.state.resetCalls, 0);
    assert.deepEqual(harness.state.errors, ['game gif blocked']);
});

await runAsyncTest('execution session cancellation settles and releases the session', async () => {
    let rejectExecution;
    const harness = createExecutionHarness({
        executeProgram: () => new Promise((_resolve, reject) => { rejectExecution = reject; }),
    });
    harness.interpreter.stopExecution = () => {
        harness.state.stopCalls += 1;
        const error = new Error('stopped');
        error.name = 'RavlykError';
        rejectExecution(error);
    };
    let cleanupCalls = 0;
    const running = harness.controller.executeSession('вперед 10', {
        kind: 'gif', cleanup() { cleanupCalls += 1; },
    });
    await Promise.resolve();
    assert.equal(harness.controller.cancelActiveSession('cancelled'), true);
    assert.equal(await running, 'cancelled');
    assert.equal(cleanupCalls, 1);
    assert.equal(harness.controller.isSessionActive(), false);

    harness.interpreter.executeProgram = async () => {};
    assert.equal(await harness.controller.executeSession('вперед 1'), 'completed');
});

await runAsyncTest('execution session capture timer returns capture-limit without real waiting', async () => {
    const previousSetTimeout = global.setTimeout;
    const previousClearTimeout = global.clearTimeout;
    const timers = new Map();
    global.setTimeout = (callback, delay) => {
        timers.set(delay, callback);
        return delay;
    };
    global.clearTimeout = () => {};

    let rejectExecution;
    const harness = createExecutionHarness({
        executeProgram: () => new Promise((_resolve, reject) => { rejectExecution = reject; }),
    });
    harness.interpreter.stopExecution = () => {
        const error = new Error('stopped');
        error.name = 'RavlykError';
        rejectExecution(error);
    };
    let encoded = false;
    const running = harness.controller.executeSession('вперед 10', {
        kind: 'gif',
        captureTimeoutMs: 20000,
        afterExecute() { encoded = true; },
    });
    await Promise.resolve();
    timers.get(20000)();
    assert.equal(await running, 'capture-limit');
    assert.equal(encoded, true);
    assert.deepEqual(harness.state.infos, ['capture saved']);

    global.setTimeout = previousSetTimeout;
    global.clearTimeout = previousClearTimeout;
});

await runAsyncTest('execution session never exposes an unexpected system error message', async () => {
    const previousConsoleError = console.error;
    console.error = () => {};
    const harness = createExecutionHarness({
        executeProgram: async () => { throw new Error('TypeError: internal detail'); },
    });
    assert.equal(await harness.controller.executeSession('вперед 1'), 'failed');
    assert.deepEqual(harness.state.errors, ['unexpected']);
    assert.equal(harness.state.errors.join(' ').includes('internal detail'), false);
    console.error = previousConsoleError;
});

for (const cancelPhase of ['encode', 'done']) {
    await runAsyncTest(`GIF cancellation at ${cancelPhase} prevents download and releases session`, async () => {
        const harness = createExecutionHarness();
        let files;
        let encodeCalls = 0;
        let downloadCalls = 0;
        let released = false;
        const previousDocument = global.document;
        global.document = {
            body: { appendChild() {}, removeChild() {} },
            createElement() { return { click() { downloadCalls += 1; } }; },
        };
        try {
            files = createFileActionsController({
                canvas: {}, codeEditor: { value: 'вперед 1' },
                interpreter: harness.interpreter, executionController: harness.controller,
                errorMessages: { GIF_CREATE_ERROR: 'gif failed' },
                showInfoMessage() {},
                showError(message) { harness.state.errors.push(message); },
                showSuccessMessage(message) { harness.state.successes.push(message); },
                onGifProgress(phase) {
                    if (phase === cancelPhase) assert.equal(files.cancelGif(), true);
                },
                createGifCaptureFn: () => ({
                    start() {}, stop() {}, hasFrames: () => true,
                    getFrames: () => [], getDimensions: () => ({ w: 1, h: 1 }),
                    releaseFrames() { released = true; },
                }),
                createGifEncodingControllerFn: () => ({
                    cancel() {},
                    async encode() { encodeCalls += 1; return new Uint8Array([71, 73, 70]); },
                }),
            });
            assert.equal(await files.saveGif(), 'cancelled');
            assert.equal(encodeCalls, cancelPhase === 'encode' ? 0 : 1);
            assert.equal(downloadCalls, 0);
            assert.deepEqual(harness.state.errors, []);
            assert.deepEqual(harness.state.successes, []);
            assert.equal(released, true);
            assert.equal(files.isGifActive(), false);
            assert.equal(harness.controller.isSessionActive(), false);
            assert.equal(await harness.controller.runCode(), 'completed');
        } finally {
            global.document = previousDocument;
        }
    });
}

await runAsyncTest('encoding failure after capture limit reports failure and cleans up', async () => {
    const harness = createExecutionHarness();
    harness.interpreter.executeProgram = async () => {
        harness.controller.cancelActiveSession('capture-limit');
    };
    let cleanedResult;
    let reportedError;
    const encoderError = new Error('worker failed');
    const result = await harness.controller.executeSession('вперед 1', {
        kind: 'gif',
        afterExecute() { throw encoderError; },
        onSessionError(error) { reportedError = error; return true; },
        cleanup(value) { cleanedResult = value; },
    });
    assert.equal(result, 'failed');
    assert.equal(cleanedResult, 'failed');
    assert.equal(reportedError, encoderError);
    assert.deepEqual(harness.state.infos, []);
    assert.deepEqual(harness.state.successes, []);
    assert.equal(harness.controller.isSessionActive(), false);
});

console.log('Controller tests completed.');
