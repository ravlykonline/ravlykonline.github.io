import assert from 'node:assert/strict';
import {
    createCanvasStateController,
    formatCanvasState,
    getCanvasStateSnapshot,
    MAX_CANVAS_STATE_LOG_ENTRIES,
} from '../js/modules/canvasStateController.js';
import { GRID_ALIGN_OFFSET_X, GRID_ALIGN_OFFSET_Y, RAVLYK_INITIAL_ANGLE } from '../js/modules/constants.js';
import { runTest } from './testUtils.js';

function createElement() {
    return {
        textContent: '',
        children: [],
        listeners: {},
        appendChild(child) { this.children.push(child); },
        removeChild(child) { this.children.splice(this.children.indexOf(child), 1); },
        get firstElementChild() { return this.children[0] || null; },
        addEventListener(type, listener) { this.listeners[type] = listener; },
    };
}

function createDocumentFixture() {
    const ids = [
        'canvas-state-x', 'canvas-state-y', 'canvas-state-angle', 'canvas-state-pen',
        'canvas-state-color', 'canvas-state-size', 'read-canvas-state-btn',
        'canvas-state-status', 'canvas-state-log',
    ];
    const elements = Object.fromEntries(ids.map((id) => [id, createElement()]));
    return {
        elements,
        documentRef: {
            getElementById: (id) => elements[id] || null,
            createElement: () => createElement(),
        },
    };
}

runTest('canvas state uses learning coordinates and normalized angle', () => {
    const canvas = { width: 400, height: 300 };
    const home = getCanvasStateSnapshot({
        x: 200 + GRID_ALIGN_OFFSET_X,
        y: 150 + GRID_ALIGN_OFFSET_Y,
        angle: RAVLYK_INITIAL_ANGLE,
        isPenDown: true,
        color: '#1A56DB',
    }, canvas);
    assert.deepEqual(home, {
        x: 0,
        y: 0,
        angle: 0,
        pen: 'опущене',
        color: 'синій',
        width: 400,
        height: 300,
    });

    const afterGoto = getCanvasStateSnapshot({
        x: 250 + GRID_ALIGN_OFFSET_X,
        y: 120 + GRID_ALIGN_OFFSET_Y,
        angle: RAVLYK_INITIAL_ANGLE + 450,
        isPenDown: false,
        color: '#1A56DB',
    }, canvas);
    assert.equal(afterGoto.x, 50);
    assert.equal(afterGoto.y, 30);
    assert.equal(afterGoto.angle, 90);
    assert.equal(afterGoto.pen, 'підняте');
});

runTest('canvas state read button announces only on request', () => {
    const { documentRef, elements } = createDocumentFixture();
    const state = { x: 100, y: 100, angle: RAVLYK_INITIAL_ANGLE, isPenDown: true, color: '#1A56DB' };
    const controller = createCanvasStateController({ documentRef, canvas: { width: 200, height: 200 }, getState: () => state });
    controller.update();
    assert.equal(elements['canvas-state-status'].textContent, '');
    elements['read-canvas-state-btn'].listeners.click();
    assert.equal(elements['canvas-state-status'].textContent, formatCanvasState(controller.getSnapshot()));
});

runTest('canvas state log is bounded and reset clears the current session', () => {
    const { documentRef, elements } = createDocumentFixture();
    const controller = createCanvasStateController({
        documentRef,
        canvas: { width: 200, height: 200 },
        getState: () => ({ x: 100, y: 100, angle: RAVLYK_INITIAL_ANGLE, isPenDown: true, color: '#1A56DB' }),
    });
    for (let index = 0; index < MAX_CANVAS_STATE_LOG_ENTRIES + 7; index++) {
        controller.recordPrimitive({ type: 'MoveStmt' });
    }
    assert.equal(elements['canvas-state-log'].children.length, MAX_CANVAS_STATE_LOG_ENTRIES);
    assert.match(elements['canvas-state-log'].children[0].textContent, /^Завершено рух\./);
    controller.update('reset');
    assert.equal(elements['canvas-state-log'].children.length, 0);
});
