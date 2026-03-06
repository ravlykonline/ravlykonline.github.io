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

console.log('UI tests completed.');
