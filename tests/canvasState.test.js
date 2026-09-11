import assert from 'node:assert/strict';
import {
    createCanvasStateController,
    formatCanvasState,
    getCanvasStateSnapshot,
    MAX_CANVAS_STATE_LOG_ENTRIES,
    describeColor,
    normalizeLearningAngle,
} from '../js/modules/canvasStateController.js';
import { DEFAULT_PEN_COLOR, GRID_ALIGN_OFFSET_X, GRID_ALIGN_OFFSET_Y, RAVLYK_INITIAL_ANGLE, UKRAINIAN_COLOR_NAMES } from '../js/modules/constants.js';
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

runTest('canvas state refresh prepares a concise announcement for the dialog', () => {
    const { documentRef, elements } = createDocumentFixture();
    const state = { x: 100, y: 100, angle: RAVLYK_INITIAL_ANGLE, isPenDown: true, color: '#1A56DB' };
    const controller = createCanvasStateController({ documentRef, canvas: { width: 200, height: 200 }, getState: () => state });
    controller.update();
    assert.equal(elements['canvas-state-status'].textContent, '');
    controller.refresh();
    assert.match(elements['canvas-state-status'].textContent, /X .*Y .*напрямок .*перо .*колір/);
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

// Found on production: the starting pen colour rendered as a raw "#000000",
// because DEFAULT_PEN_COLOR is not the registry's «чорний» (#1A1A1A). The
// initial state is the first thing a child sees, so it must be a real name.
runTest('canvas state names the default pen colour instead of showing a hex code', () => {
    assert.equal(describeColor(DEFAULT_PEN_COLOR), 'чорний');
    assert.equal(describeColor('#1A1A1A'), 'чорний');
    assert.equal(describeColor('#8A8F9E'), UKRAINIAN_COLOR_NAMES['#8A8F9E']);

    const snapshot = getCanvasStateSnapshot(
        { x: 0, y: 0, angle: RAVLYK_INITIAL_ANGLE, isPenDown: true, color: DEFAULT_PEN_COLOR },
        { width: 600, height: 400 },
    );
    assert.equal(snapshot.color, 'чорний');
    assert.doesNotMatch(formatCanvasState(snapshot), /#[0-9a-f]{3,6}/i);
});

runTest('canvas state never surfaces a raw hex for an unregistered colour', () => {
    assert.equal(describeColor('#123456'), 'власний колір');
    assert.equal(describeColor(''), 'власний колір');
});

// Found on production: after a closed shape the angle read «360°» instead of
// «0°». Animation accumulates float error, so the heading lands just under a
// full turn and rounding pushed it past the normalized range.
runTest('canvas state reports a completed turn as 0 degrees, never 360', () => {
    assert.equal(normalizeLearningAngle(RAVLYK_INITIAL_ANGLE), 0);
    assert.equal(normalizeLearningAngle(270), 0);
    assert.equal(normalizeLearningAngle(269.9999999), 0);
    assert.equal(normalizeLearningAngle(-90.0000001), 0);
    assert.equal(normalizeLearningAngle(270.0000001), 0);

    // Genuine intermediate angles keep their two-decimal precision.
    assert.equal(normalizeLearningAngle(269.99), 359.99);
    assert.equal(normalizeLearningAngle(0), 90);
    assert.equal(normalizeLearningAngle(Number.NaN), 0);
});
