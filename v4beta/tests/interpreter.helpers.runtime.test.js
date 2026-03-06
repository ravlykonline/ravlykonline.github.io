import assert from 'node:assert/strict';
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
import { runTest } from './testUtils.js';

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

console.log('Interpreter runtime helper tests completed.');
