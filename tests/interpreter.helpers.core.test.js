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
    assert.equal(normalizeConditionKey('ArrowUp'), 'arrowup');
    assert.equal(normalizeConditionKey('RIGHT'), 'arrowright');

    const pressed = new Set(['arrowleft']);
    const evalExpr = (expr, env) => {
        if (expr.type === 'NumberLiteral') return Number(expr.value);
        if (expr.type === 'Identifier') return env[expr.name];
        return NaN;
    };

    const astKey = evaluateAstCondition(
        { type: 'KeyCondition', key: 'left' },
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
        clearToDefaultSheet() {},
        cloneCommand: (cmd) => cmd,
        evaluateIfCondition: () => false,
        resetStuckState() {},
        state: { isPenDown: true },
    });

    assert.equal(done, true);
    assert.deepEqual(env.assigned, { name: 'x', value: 7 });
});

runTest('interpreter command executor defines local value for create ASSIGN_AST', () => {
    const env = {
        assigned: null,
        defined: null,
        set(name, value) {
            this.assigned = { name, value };
        },
        define(name, value) {
            this.defined = { name, value };
        },
    };

    const done = executeInterpreterCommand({
        currentCommandObject: {
            type: 'ASSIGN_AST',
            name: 'x',
            expr: { type: 'NumberLiteral', value: 7 },
            declaredWithCreate: true,
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
        clearToDefaultSheet() {},
        cloneCommand: (cmd) => cmd,
        evaluateIfCondition: () => false,
        resetStuckState() {},
        state: { isPenDown: true },
    });

    assert.equal(done, true);
    assert.equal(env.assigned, null);
    assert.deepEqual(env.defined, { name: 'x', value: 7 });
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
                    declaredWithCreate: true,
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
    assert.equal(queue[0].declaredWithCreate, true);
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

console.log('Interpreter core helper tests completed.');

runTest('interpreter game AST runner throws GAME_TICK_OVERFLOW when tick exceeds budget', () => {
    class FakeEnv {
        constructor() { this._vars = {}; }
        define(k, v) { this._vars[k] = v; }
        set(k, v) { this._vars[k] = v; }
        get(k) { return this._vars[k] ?? 0; }
        clone() { const e = new FakeEnv(); e._vars = { ...this._vars }; return e; }
    }
    class FakeRavlykError extends Error {
        constructor(code) { super(code); this.name = 'RavlykError'; this.code = code; }
    }

    // Use assignments only (no primitives) — verifies that ALL AST steps are counted, not just primitives.
    // повторити 600 ( x = 1 ) inside грати: 1 RepeatStmt + 600 AssignmentStmt = 601 total AST steps > 500.
    const assignStmt = { type: 'AssignmentStmt', name: 'x', expr: { type: 'NumberLiteral', value: 1 } };
    const repeatStmt = { type: 'RepeatStmt', count: { type: 'NumberLiteral', value: 600 }, body: [assignStmt] };
    const gameStmt = { type: 'GameStmt', body: [repeatStmt] };
    const programAst = { type: 'Program', body: [gameStmt] };

    const runner = createGameAstRunner({
        programAst,
        EnvironmentCtor: FakeEnv,
        RavlykErrorCtor: FakeRavlykError,
        maxRecursionDepth: 10,
        maxRepeatsInLoop: 1000,
        maxGameTickOperations: 500,
        evalAstNumberExpression(expr) { return expr.value ?? 0; },
        handlePrimitiveAstStatement() { return false; },
        evaluateCondition() { return false; },
        attachAstErrorLocation() {},
    });

    assert.throws(
        () => runner.runGameTick(),
        (err) => err && err.name === 'RavlykError' && err.message === 'GAME_TICK_OVERFLOW'
    );
});

runTest('interpreter queue adapter throws COMMAND_QUEUE_OVERFLOW on nested loops before exhausting memory', () => {
    class FakeEnv {
        constructor() { this._vars = {}; }
        define(k, v) { this._vars[k] = v; }
        set(k, v) { this._vars[k] = v; }
        get(k) { return this._vars[k] ?? 0; }
        clone() { const e = new FakeEnv(); e._vars = { ...this._vars }; return e; }
    }

    const fwd = { type: 'MoveStmt', command: 'вперед', distanceExpr: { type: 'NumberLiteral', value: 1 } };
    const inner = { type: 'RepeatStmt', count: { type: 'NumberLiteral', value: 500 }, body: [fwd] };
    const outer = { type: 'RepeatStmt', count: { type: 'NumberLiteral', value: 500 }, body: [inner] };
    const programAst = { type: 'Program', body: [outer] };

    const createError = (key) => { const e = new Error(key); e.name = 'RavlykError'; return e; };

    assert.throws(() => {
        astProgramToLegacyQueue({
            programAst,
            EnvironmentCtor: FakeEnv,
            maxRecursionDepth: 10,
            maxRepeatsInLoop: 500,
            maxCommandQueueLength: 100,
            evalAstNumberExpression: (expr) => expr.value ?? 0,
            handlePrimitiveAstStatement: (stmt, env, mode, out) => {
                if (stmt.type === 'RepeatStmt' || stmt.type === 'IfStmt') return false;
                if (out) out.push({ type: 'MOVE' });
                return true;
            },
            attachAstErrorLocation: () => {},
            createError,
        });
    }, (err) => err && err.message === 'COMMAND_QUEUE_OVERFLOW');
});
