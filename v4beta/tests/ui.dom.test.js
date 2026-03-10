import assert from 'node:assert/strict';
import {
    resizeCanvas,
    isModalOpen,
    bindModalOverlayClose,
    showHelpModal,
    hideHelpModal,
    showDownloadModal,
    hideDownloadModal,
    createRavlykSprite,
    updateRavlykVisualsOnScreen,
} from '../js/modules/ui.js';
import { createEditorUiController } from '../js/modules/editorUi.js';
import { createGridOverlayController } from '../js/modules/gridOverlay.js';
import { runTest } from './testUtils.js';

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

runTest('resizeCanvas keeps linked canvas layers in sync with the drawing canvas', () => {
    const canvasBox = {
        clientWidth: 900,
        clientHeight: 640,
        querySelector() {
            return null;
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
    const linkedCanvas = {
        width: 0,
        height: 0,
    };
    const ctx = { drawImage() {} };

    resizeCanvas(canvas, ctx, null, { linkedCanvases: [linkedCanvas] });

    assert.equal(canvas.width, 860);
    assert.equal(canvas.height, 580);
    assert.equal(linkedCanvas.width, 860);
    assert.equal(linkedCanvas.height, 580);
});

runTest('ravlyk sprite keeps pen-thickness visual lead aligned with heading', () => {
    const previousDocument = global.document;

    const container = {
        children: [],
        appendChild(node) {
            this.children.push(node);
            node.parentElement = this;
        },
        getBoundingClientRect() {
            return { left: 0, top: 0 };
        },
    };

    global.document = {
        body: container,
        querySelector(selector) {
            return selector === '.canvas-box' ? container : null;
        },
        createElement() {
            return {
                style: {},
                className: '',
                classList: {
                    toggle() {},
                },
                setAttribute() {},
                remove() {},
                parentElement: null,
            };
        },
    };

    createRavlykSprite(container);

    const canvas = {
        getBoundingClientRect() {
            return { left: 0, top: 0 };
        },
    };

    updateRavlykVisualsOnScreen({
        x: 100,
        y: 100,
        angle: -90,
        scale: 1,
        isPenDown: true,
        penSize: 1,
    }, canvas);

    const sprite = container.children[0];
    assert.equal(sprite.style.left, '85px');
    assert.equal(sprite.style.top, '100px');

    updateRavlykVisualsOnScreen({
        x: 100,
        y: 100,
        angle: -90,
        scale: 1,
        isPenDown: true,
        penSize: 11,
    }, canvas);

    assert.equal(sprite.style.left, '85px');
    assert.equal(sprite.style.top, '95px');

    global.document = previousDocument;
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
        fillCalls: 0,
        beginPath() {},
        moveTo() {},
        lineTo() {},
        closePath() {},
        stroke() {},
        fill() { this.fillCalls += 1; },
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
    assert.equal(gridCtx.fillCalls, 2);

    global.localStorage = previousLocalStorage;
});

runTest('grid overlay keeps axis arrows anchored to the resized top and right edges', () => {
    const previousLocalStorage = global.localStorage;
    global.localStorage = {
        getItem() { return null; },
        setItem() {},
    };

    const moveToCalls = [];
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
        beginPath() {},
        moveTo(x, y) { moveToCalls.push([x, y]); },
        lineTo() {},
        closePath() {},
        stroke() {},
        fill() {},
        fillText() {},
        clearRect() {},
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

    gridOverlay.setGridVisibility(true);

    canvas.width = 320;
    canvas.height = 180;
    canvas.clientWidth = 320;
    canvas.clientHeight = 180;
    moveToCalls.length = 0;

    gridOverlay.drawGridOverlay();

    assert.equal(gridCanvas.width, 320);
    assert.equal(gridCanvas.height, 180);
    assert.equal(
        moveToCalls.some(([x, y]) => x === 160 && y === 3.5),
        true
    );
    assert.equal(
        moveToCalls.some(([x, y]) => x === 316.5 && y === 90),
        true
    );

    global.localStorage = previousLocalStorage;
});

console.log('UI DOM tests completed.');
