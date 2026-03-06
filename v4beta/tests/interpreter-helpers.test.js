import assert from 'node:assert/strict';
import {
    getBoundaryMarginForState,
    clampToCanvasBoundsByMargin,
    isAtCanvasEdgeByMargin,
} from '../js/modules/interpreterBoundary.js';
import {
    normalizeConditionKey,
    evaluateAstCondition,
    evaluateRuntimeIfCondition,
} from '../js/modules/interpreterConditions.js';
import { stopGameLoopRuntime } from '../js/modules/interpreterGameLoop.js';
import { createGameAstRunner } from '../js/modules/interpreterGameAstRunner.js';
import { runCommandQueueRuntime } from '../js/modules/interpreterQueueRuntime.js';
import { executeInterpreterCommand } from '../js/modules/interpreterCommandExecutor.js';
import { astProgramToLegacyQueue } from '../js/modules/interpreterAstQueueAdapter.js';
import {
    hasGameStatement,
    validateGameProgramContract,
} from '../js/modules/interpreterGameContract.js';
import {
    evalAstNumberExpression,
    attachAstErrorLocation,
} from '../js/modules/interpreterAstEval.js';
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

runTest('interpreter boundary helpers compute margin, clamp and edge detection', () => {
    const margin = getBoundaryMarginForState({ penSize: 6 }, 0);
    assert.equal(margin >= 3, true);

    const clamped = clampToCanvasBoundsByMargin(2, 99, 100, 100, 5);
    assert.equal(clamped.boundedX, 5);
    assert.equal(clamped.boundedY, 95);

    assert.equal(isAtCanvasEdgeByMargin(5, 50, 100, 100, 5), true);
    assert.equal(isAtCanvasEdgeByMargin(50, 50, 100, 100, 5), false);
});

runTest('interpreter condition helpers normalize keys and evaluate conditions', () => {
    assert.equal(normalizeConditionKey('Вгору'), 'arrowup');
    assert.equal(normalizeConditionKey('RIGHT'), 'arrowright');

    const pressed = new Set(['arrowleft']);
    const evalExpr = (expr, env) => {
        if (expr.type === 'NumberLiteral') return Number(expr.value);
        if (expr.type === 'Identifier') return env[expr.name];
        return NaN;
    };

    const astKey = evaluateAstCondition(
        { type: 'KeyCondition', key: 'ліво' },
        {
            evalAstNumberExpression: evalExpr,
            env: {},
            isAtCanvasEdge: () => false,
            pressedKeys: pressed,
        }
    );
    assert.equal(astKey, true);

    const runtimeCompare = evaluateRuntimeIfCondition(
        {
            type: 'COMPARE_AST',
            op: '>',
            left: { type: 'Identifier', name: 'x' },
            right: { type: 'NumberLiteral', value: 3 },
        },
        {
            evalAstNumberExpression: evalExpr,
            executionEnv: { x: 5 },
            isAtCanvasEdge: () => false,
            pressedKeys: new Set(),
        }
    );
    assert.equal(runtimeCompare, true);
});

runTest('interpreter game loop helper clears timer and rejects optional error', () => {
    const runtime = {
        gameLoopTimerId: 123,
        gameLoopReject: null,
    };

    const previousClearInterval = global.clearInterval;
    let clearedId = null;
    global.clearInterval = (id) => {
        clearedId = id;
    };

    let rejectedError = null;
    runtime.gameLoopReject = (error) => {
        rejectedError = error;
    };
    const error = new Error('stop');

    stopGameLoopRuntime(runtime, error);

    assert.equal(clearedId, 123);
    assert.equal(runtime.gameLoopTimerId, null);
    assert.equal(runtime.gameLoopReject, null);
    assert.equal(rejectedError, error);

    global.clearInterval = previousClearInterval;
});

runTest('interpreter game AST runner throws when no game block is present', () => {
    class FakeEnv {
        constructor(parent = null) { this.parent = parent; this.map = new Map(); }
        set(name, value) { this.map.set(name, value); }
        define(name, value) { this.map.set(name, value); }
    }
    class FakeRavlykError extends Error {
        constructor(code) {
            super(code);
            this.name = 'RavlykError';
            this.code = code;
        }
    }

    assert.throws(() => {
        createGameAstRunner({
            programAst: { type: 'Program', body: [] },
            EnvironmentCtor: FakeEnv,
            RavlykErrorCtor: FakeRavlykError,
            maxRecursionDepth: 2,
            maxRepeatsInLoop: 10,
            evalAstNumberExpression() { return 0; },
            handlePrimitiveAstStatement() { return false; },
            evaluateCondition() { return false; },
            attachAstErrorLocation() {},
        });
    }, /GAME_NOT_SUPPORTED_HERE/);
});

runTest('interpreter queue runtime triggers stop path synchronously', () => {
    const runtime = { frameId: null, shouldStop: true, isPaused: false, currentIndex: -1 };
    let completedCalls = 0;
    let errorCalls = 0;
    let cancelCalls = 0;

    runCommandQueueRuntime({
        commandQueue: [],
        config: { animationEnabled: true },
        commandIndicatorUpdater() {},
        ensureExecutionEnv() {},
        createStopError() { return new Error('stop'); },
        getShouldStop: () => runtime.shouldStop,
        getIsPaused: () => runtime.isPaused,
        setCurrentCommandIndex: (idx) => { runtime.currentIndex = idx; },
        setAnimationFrameId: (id) => { runtime.frameId = id; },
        getAnimationFrameId: () => runtime.frameId,
        cancelAnimationFrameFn() { cancelCalls += 1; },
        requestAnimationFrameFn: (cb) => { cb(0); return 1; },
        nowFn: () => 0,
        onExecutionCompleted: () => { completedCalls += 1; },
        onExecutionError: () => { errorCalls += 1; },
        executeCurrentCommand: () => true,
        updateRavlykVisualState() {},
    }).catch(() => {});

    assert.equal(completedCalls, 0);
    assert.equal(errorCalls, 1);
    assert.equal(cancelCalls, 0);
});

runTest('interpreter command executor assigns numeric value for ASSIGN_AST', () => {
    const env = {
        assigned: null,
        set(name, value) {
            this.assigned = { name, value };
        },
    };

    const done = executeInterpreterCommand({
        currentCommandObject: {
            type: 'ASSIGN_AST',
            name: 'x',
            expr: { type: 'NumberLiteral', value: 7 },
        },
        currentFrame: { index: 0 },
        executionStack: [],
        deltaTime: 0,
        executionEnv: env,
        evalAstNumberExpression: () => 7,
        createVariableValueInvalidError: () => new Error('invalid'),
        animatePen: () => true,
        animateMove: () => true,
        animateTurn: () => true,
        setColor() {},
        performGoto() {},
        clearScreen() {},
        cloneCommand: (cmd) => cmd,
        evaluateIfCondition: () => false,
        resetStuckState() {},
        state: { isPenDown: true },
    });

    assert.equal(done, true);
    assert.deepEqual(env.assigned, { name: 'x', value: 7 });
});

runTest('interpreter AST queue adapter emits assignment command when enabled', () => {
    class FakeEnv {
        constructor(parent = null) { this.parent = parent; this.map = new Map(); }
        set(name, value) { this.map.set(name, value); }
        define(name, value) { this.map.set(name, value); }
        get(name) {
            if (this.map.has(name)) return this.map.get(name);
            if (this.parent) return this.parent.get(name);
            return undefined;
        }
        clone() {
            const copy = new FakeEnv(this.parent);
            for (const [key, value] of this.map.entries()) copy.map.set(key, value);
            return copy;
        }
    }

    const queue = astProgramToLegacyQueue({
        programAst: {
            type: 'Program',
            body: [
                {
                    type: 'AssignmentStmt',
                    name: 'score',
                    expr: { type: 'NumberLiteral', value: 12 },
                },
            ],
        },
        emitAssignments: true,
        EnvironmentCtor: FakeEnv,
        maxRecursionDepth: 2,
        maxRepeatsInLoop: 10,
        evalAstNumberExpression: (expr) => Number(expr.value),
        handlePrimitiveAstStatement: () => false,
        attachAstErrorLocation() {},
        createError: (code, ...params) => new Error(`${code}:${params.join(',')}`),
    });

    assert.equal(queue.length, 1);
    assert.equal(queue[0].type, 'ASSIGN_AST');
    assert.equal(queue[0].name, 'score');
});

runTest('interpreter game-contract helper detects nested game and rejects invalid top-level', () => {
    assert.equal(
        hasGameStatement({
            type: 'Program',
            body: [{ type: 'IfStmt', thenBody: [{ type: 'GameStmt' }], elseBody: [] }],
        }),
        true
    );

    assert.throws(() => {
        validateGameProgramContract(
            {
                type: 'Program',
                body: [
                    { type: 'MoveStmt' },
                    { type: 'GameStmt', body: [] },
                ],
            },
            { createError: (code) => new Error(code) }
        );
    }, /GAME_MODE_TOP_LEVEL_ONLY/);
});

runTest('interpreter AST eval helper evaluates expression and attaches location on error', () => {
    const env = {
        get(name) {
            if (name === 'x') return 4;
            const error = new Error('undefined');
            error.name = 'RavlykError';
            throw error;
        },
    };

    const value = evalAstNumberExpression(
        {
            type: 'BinaryExpr',
            op: '*',
            left: { type: 'UnaryExpr', op: '-', expr: { type: 'Identifier', name: 'x' } },
            right: { type: 'NumberLiteral', value: 3 },
        },
        env
    );
    assert.equal(value, -12);

    const astNode = {
        type: 'Identifier',
        name: 'missing',
        span: { start: { line: 8, column: 5, token: 'missing' } },
    };
    assert.throws(() => {
        evalAstNumberExpression(astNode, env, { attachAstErrorLocation });
    }, (error) => error && error.line === 8 && error.column === 5 && error.token === 'missing');
});

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

console.log('Interpreter helper tests completed.');
