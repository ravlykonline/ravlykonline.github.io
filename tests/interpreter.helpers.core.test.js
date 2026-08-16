import assert from 'node:assert/strict';
import {
    getBoundaryMarginForState,
    clampToCanvasBoundsByMargin,
    isAtCanvasEdgeByMargin,
} from '../js/modules/interpreterBoundary.js';
import {
    normalizeConditionKey,
    evaluateAstCondition,
} from '../js/modules/interpreterConditions.js';
import { stopGameLoopRuntime } from '../js/modules/interpreterGameLoop.js';
import { createGameAstRunner } from '../js/modules/interpreterGameAstRunner.js';
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
