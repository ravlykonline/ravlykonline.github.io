import assert from 'node:assert/strict';
import { resizeCanvas } from '../js/modules/ui.js';

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

console.log('UI tests completed.');
