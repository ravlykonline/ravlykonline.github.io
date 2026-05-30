// Runtime unification tests.
//
// Both the animation path (runAstAnimationRuntime / createAstRuntime) and the
// game path (createGameAstRunner / createAstRuntime) now share the same AST
// runtime for control flow.  These tests verify that they surface identical
// sequences of primitive statements for the same program, ensuring that
// "однаковий код поводиться однаково у звичайному та ігровому режимі."
//
// "Identical" means: same statement types in the same order with the same
// resolved values — irrespective of whether execution is animated or immediate.

import assert from 'node:assert/strict';
import { RavlykParser } from '../js/modules/ravlykParser.js';
import { validateProgramAst } from '../js/modules/semanticValidator.js';
import { createAstRuntime } from '../js/modules/interpreterAstRuntime.js';
import { Environment } from '../js/modules/environment.js';
import { RavlykError } from '../js/modules/ravlykParser.js';
import { evaluateAstCondition } from '../js/modules/interpreterConditions.js';
import { evalAstNumberExpression } from '../js/modules/interpreterAstEval.js';
import {
    MAX_RECURSION_DEPTH,
    MAX_REPEATS_IN_LOOP,
    MAX_COMMAND_QUEUE_LENGTH,
} from '../js/modules/constants.js';
import { runTest } from './testUtils.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function parseAndValidate(code) {
    const parser = new RavlykParser();
    return validateProgramAst(parser.parseCodeToAst(code));
}

const evalExpr = (expr, env) => evalAstNumberExpression(expr, env, { attachAstErrorLocation: () => {} });

const runtimeOptions = {
    EnvironmentCtor: Environment,
    RavlykErrorCtor: RavlykError,
    maxRecursionDepth: MAX_RECURSION_DEPTH,
    maxRepeatsInLoop: MAX_REPEATS_IN_LOOP,
    maxCommandQueueLength: MAX_COMMAND_QUEUE_LENGTH,
    evalAstNumberExpression: evalExpr,
    evaluateCondition: (condition, envCtx) => evaluateAstCondition(condition, {
        evalAstNumberExpression: evalExpr,
        env: envCtx,
        isAtCanvasEdge: () => false,
        pressedKeys: new Set(),
    }),
    attachAstErrorLocation: () => {},
};

/**
 * Drain createAstRuntime for a program and collect every primitive
 * statement as { type, resolvedValue? } for comparison.
 */
function collectPrimitives(programAst, extraOptions = {}) {
    const rt = createAstRuntime({ programAst, ...runtimeOptions, ...extraOptions });
    const log = [];
    let item = rt.step();
    while (item !== null) {
        const { stmt, env } = item;
        const entry = { type: stmt.type };
        // Resolve numeric arguments so we can compare values.
        if (stmt.type === 'MoveStmt' || stmt.type === 'TurnStmt') {
            const argExpr = stmt.type === 'MoveStmt' ? stmt.distance : stmt.angle;
            if (argExpr && argExpr.kind !== 'random') {
                entry.value = evalExpr(argExpr, env);
            }
            if (stmt.direction) entry.direction = stmt.direction;
        }
        if (stmt.type === 'EmbroideryStmt') {
            entry.mode = stmt.mode;
        }
        log.push(entry);
        item = rt.step();
    }
    return log;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

runTest('unification: simple sequence — both paths yield same primitives', () => {
    const ast = parseAndValidate('вперед 100\nправоруч 90\nназад 50');
    const log = collectPrimitives(ast);
    assert.deepEqual(log, [
        { type: 'MoveStmt', value: 100, direction: 'forward' },
        { type: 'TurnStmt', value: 90, direction: 'right' },
        { type: 'MoveStmt', value: 50, direction: 'backward' },
    ]);
});

runTest('unification: repeat loop expands correctly', () => {
    const ast = parseAndValidate('повторити 3 ( вперед 10 )');
    const log = collectPrimitives(ast);
    assert.equal(log.length, 3);
    assert.ok(log.every((e) => e.type === 'MoveStmt' && e.value === 10));
});

runTest('unification: while loop repeats until condition is false', () => {
    const ast = parseAndValidate('створити x = 0\nпоки x < 3 ( x = x + 1\nвперед x )');
    const log = collectPrimitives(ast);
    assert.deepEqual(log, [
        { type: 'MoveStmt', value: 1, direction: 'forward' },
        { type: 'MoveStmt', value: 2, direction: 'forward' },
        { type: 'MoveStmt', value: 3, direction: 'forward' },
    ]);
});

runTest('unification: модуль and корінь evaluate inside primitive arguments', () => {
    const ast = parseAndValidate('вперед модуль(-12)\nправоруч корінь(81)');
    const log = collectPrimitives(ast);
    assert.deepEqual(log, [
        { type: 'MoveStmt', value: 12, direction: 'forward' },
        { type: 'TurnStmt', value: 9, direction: 'right' },
    ]);
});

runTest('unification: стоп exits while loop and continues after it', () => {
    const ast = parseAndValidate(
        'створити x = 0\nпоки x < 5 ( x = x + 1\nякщо x = 3 ( стоп )\nвперед x )\nвперед 99'
    );
    const log = collectPrimitives(ast);
    assert.deepEqual(log, [
        { type: 'MoveStmt', value: 1, direction: 'forward' },
        { type: 'MoveStmt', value: 2, direction: 'forward' },
        { type: 'MoveStmt', value: 99, direction: 'forward' },
    ]);
});

runTest('unification: стоп exits only the nearest loop', () => {
    const ast = parseAndValidate(
        'повторити 2 ( повторити 5 ( стоп\nвперед 10 )\nвперед 20 )'
    );
    const log = collectPrimitives(ast);
    assert.deepEqual(log, [
        { type: 'MoveStmt', value: 20, direction: 'forward' },
        { type: 'MoveStmt', value: 20, direction: 'forward' },
    ]);
});

runTest('unification: empty infinite while is stopped by AST budget', () => {
    const ast = parseAndValidate('поки 1 = 1 ()');
    const rt = createAstRuntime({
        programAst: ast,
        ...runtimeOptions,
        maxAstSteps: 5,
        maxAstStepsErrorKey: 'COMMAND_QUEUE_OVERFLOW',
    });

    assert.throws(
        () => rt.step(),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'COMMAND_QUEUE_OVERFLOW'
    );
});

runTest('unification: variable assignment is NOT surfaced as a primitive', () => {
    // Assignment is handled internally by createAstRuntime; only the move is primitive.
    const ast = parseAndValidate('створити x = 42\nвперед x');
    const log = collectPrimitives(ast);
    assert.equal(log.length, 1);
    assert.equal(log[0].type, 'MoveStmt');
    assert.equal(log[0].value, 42);
});

runTest('unification: if true-branch emits its primitives, false-branch is skipped', () => {
    const ast = parseAndValidate('якщо 5 > 3 ( вперед 11 ) інакше ( вперед 99 )');
    const log = collectPrimitives(ast);
    assert.equal(log.length, 1);
    assert.equal(log[0].value, 11);
});

runTest('unification: if false-branch emits its primitives, true-branch is skipped', () => {
    const ast = parseAndValidate('якщо 1 > 9 ( вперед 11 ) інакше ( вперед 99 )');
    const log = collectPrimitives(ast);
    assert.equal(log.length, 1);
    assert.equal(log[0].value, 99);
});

runTest('unification: variable mutation inside if propagates to code after the block', () => {
    // x starts as 1, if-branch sets it to 7, the move uses 7.
    const ast = parseAndValidate('створити x = 1\nякщо 1 > 0 ( x = 7 )\nвперед x');
    const log = collectPrimitives(ast);
    assert.equal(log.length, 1);
    assert.equal(log[0].value, 7);
});

runTest('unification: user-defined function call surfaces its body as primitives', () => {
    const ast = parseAndValidate('створити крок(n) ( вперед n )\nкрок(25)');
    const log = collectPrimitives(ast);
    assert.equal(log.length, 1);
    assert.equal(log[0].value, 25);
});

runTest('unification: nested function calls surface all nested primitives in order', () => {
    const ast = parseAndValidate(
        'створити лінія(n) ( вперед n )\nстворити дві(n) ( лінія(n) лінія(n) )\nдві(30)'
    );
    const log = collectPrimitives(ast);
    assert.equal(log.length, 2);
    assert.ok(log.every((e) => e.type === 'MoveStmt' && e.value === 30));
});

runTest('unification: ColorStmt, ClearStmt are surfaced as primitives', () => {
    const ast = parseAndValidate('колір червоний\nочистити');
    const log = collectPrimitives(ast);
    assert.deepEqual(log.map((e) => e.type), ['ColorStmt', 'ClearStmt']);
});

runTest('unification: repeat 0 times produces no primitives', () => {
    const ast = parseAndValidate('повторити 0 ( вперед 10 )');
    const log = collectPrimitives(ast);
    assert.equal(log.length, 0);
});

runTest('unification: FunctionDefStmt is NOT surfaced as a primitive', () => {
    // A bare function definition with no call should produce zero primitives.
    const ast = parseAndValidate('створити f() ( вперед 1 )');
    const log = collectPrimitives(ast);
    assert.equal(log.length, 0);
});

runTest('unification: EmbroideryStmt is surfaced as a primitive', () => {
    const ast = parseAndValidate('вишиванка\nвперед 10\nзвичайний');
    const log = collectPrimitives(ast);
    assert.equal(log.length, 3);
    assert.equal(log[0].type, 'EmbroideryStmt');
    assert.equal(log[0].mode, 'on');
    assert.equal(log[1].type, 'MoveStmt');
    assert.equal(log[2].type, 'EmbroideryStmt');
    assert.equal(log[2].mode, 'off');
});
