// Legacy boundary tests.
//
// These tests enforce the rule that the production execution path
// (executeCommands / executeCommandsRuntime) must NOT call astToLegacyQueue
// or runCommandQueueRuntime.  They exist to catch accidental regressions
// where someone wires a new code path through the legacy flat-queue adapter.
//
// If you need to migrate more legacy tests away from astToLegacyQueue, see the
// cleanup milestone tracked in interpreterAstQueueAdapter.js.

import assert from 'node:assert/strict';
import { runAsyncTest } from './testUtils.js';

// ---------------------------------------------------------------------------
// Spy factory: wraps an object method and records call count.
// ---------------------------------------------------------------------------
function spyOn(obj, methodName) {
    const original = obj[methodName];
    let callCount = 0;
    obj[methodName] = function (...args) {
        callCount++;
        return original.apply(this, args);
    };
    return {
        restore: () => { obj[methodName] = original; },
        get callCount() { return callCount; },
    };
}

// ---------------------------------------------------------------------------
// We need a real RavlykInterpreter instance.  In Node.js (no DOM), canvas and
// ctx are unavailable, so we build a minimal stub that satisfies the
// interpreter constructor without actually rendering anything.
// ---------------------------------------------------------------------------
function makeStubInterpreter() {
    const canvas = { width: 600, height: 600, style: {}, getContext: () => null };
    const ctx = {
        beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {},
        clearRect: () => {}, fillRect: () => {}, arc: () => {}, save: () => {}, restore: () => {},
        strokeStyle: '', lineWidth: 1, lineCap: '', lineJoin: '',
    };
    const backgroundCanvas = { ...canvas };
    const backgroundCtx = { ...ctx };
    const noop = () => {};
    return { canvas, ctx, backgroundCanvas, backgroundCtx, noop };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

runAsyncTest('legacyBoundary: executeCommands does not call astToLegacyQueue', async () => {
    // We test this at the module level: import executeCommandsRuntime and check
    // that the astToLegacyQueueRuntime export is never invoked during a normal run.
    const { executeCommandsRuntime, astToLegacyQueueRuntime } = await import('../js/modules/ravlykInterpreterRuntime.js');

    // Build a minimal fake runtime object that satisfies executeCommandsRuntime.
    const { RavlykParser } = await import('../js/modules/ravlykParser.js');
    const { validateProgramAst } = await import('../js/modules/semanticValidator.js');
    const parser = new RavlykParser();

    let legacyQueueCalled = false;

    const fakeRuntime = {
        isExecuting: false,
        shouldStop: false,
        isPaused: false,
        currentCommandIndex: 0,
        boundaryWarningShown: false,
        animationFrameId: null,
        pressedKeys: new Set(),
        state: { isStuck: false, penSize: 2, isPenDown: true, color: '#000', backgroundColor: '#fff', angle: 0, x: 300, y: 300, isRainbow: false, rainbowHue: 0, scale: 1 },
        config: { animationEnabled: false, moveSpeed: 200, turnSpeed: 360, gameTickMs: 50 },
        canvas: { width: 600, height: 600 },
        gifCapture: null,
        parser,
        commandIndicatorUpdater: () => {},
        // Stub methods used by executeCommandsRuntime
        validateGameProgramContract: (ast) => { void validateProgramAst(ast); },
        executeGameProgram: async () => {},
        // The spy: if astToLegacyQueue is called, flag it.
        astToLegacyQueue: (...args) => {
            legacyQueueCalled = true;
            return astToLegacyQueueRuntime(fakeRuntime, ...args);
        },
        runAstAnimation: async () => {
            // Simulate a successful (no-op) animation run.
        },
        // Extra stubs required by the runtime helpers — all no-ops.
        evalAstNumberExpression: () => 0,
        handlePrimitiveAstStatement: () => false,
        attachAstErrorLocation: () => {},
        isAtCanvasEdge: () => false,
        setColor: () => {}, setBackgroundColor: () => {},
        applyContextSettings: () => {},
        updateRavlykVisualState: () => {},
        performGoto: () => {},
        clearToDefaultSheet: () => {},
        animatePen: () => true, animateMove: () => true, animateTurn: () => true,
        clampToCanvasBounds: (x, y) => ({ x, y }),
    };

    await executeCommandsRuntime(fakeRuntime, 'вперед 100\nправоруч 90');

    assert.equal(
        legacyQueueCalled,
        false,
        'executeCommandsRuntime must not call astToLegacyQueue in the production path'
    );
});

runAsyncTest('legacyBoundary: executeCommands uses runAstAnimation (not runCommandQueue)', async () => {
    const { executeCommandsRuntime } = await import('../js/modules/ravlykInterpreterRuntime.js');
    const { RavlykParser } = await import('../js/modules/ravlykParser.js');
    const { validateProgramAst } = await import('../js/modules/semanticValidator.js');
    const parser = new RavlykParser();

    let runAstAnimationCalled = false;
    let runCommandQueueCalled = false;

    const fakeRuntime = {
        isExecuting: false,
        shouldStop: false,
        isPaused: false,
        currentCommandIndex: 0,
        boundaryWarningShown: false,
        animationFrameId: null,
        pressedKeys: new Set(),
        state: { isStuck: false, penSize: 2, isPenDown: true, color: '#000', backgroundColor: '#fff', angle: 0, x: 300, y: 300, isRainbow: false, rainbowHue: 0, scale: 1 },
        config: { animationEnabled: false, moveSpeed: 200, turnSpeed: 360, gameTickMs: 50 },
        canvas: { width: 600, height: 600 },
        gifCapture: null,
        parser,
        commandIndicatorUpdater: () => {},
        validateGameProgramContract: (ast) => { void validateProgramAst(ast); },
        executeGameProgram: async () => {},
        astToLegacyQueue: () => { return []; },
        runCommandQueue: async () => { runCommandQueueCalled = true; },
        runAstAnimation: async () => { runAstAnimationCalled = true; },
        evalAstNumberExpression: () => 0,
        handlePrimitiveAstStatement: () => false,
        attachAstErrorLocation: () => {},
        isAtCanvasEdge: () => false,
        setColor: () => {}, setBackgroundColor: () => {},
        applyContextSettings: () => {}, updateRavlykVisualState: () => {},
        performGoto: () => {}, clearToDefaultSheet: () => {},
        animatePen: () => true, animateMove: () => true, animateTurn: () => true,
        clampToCanvasBounds: (x, y) => ({ x, y }),
    };

    await executeCommandsRuntime(fakeRuntime, 'вперед 100');

    assert.equal(runAstAnimationCalled, true, 'executeCommandsRuntime must call runAstAnimation');
    assert.equal(runCommandQueueCalled, false, 'executeCommandsRuntime must not call runCommandQueue');
});
