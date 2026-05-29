// Tests for interpreterAstAnimationRuntime — the lazy rAF-driven execution path.
//
// We stub out requestAnimationFrame / cancelAnimationFrame so the tests run
// synchronously (by draining the tick queue without real timers).

import assert from 'node:assert/strict';
import { runAstAnimationRuntime } from '../js/modules/interpreterAstAnimationRuntime.js';
import { RavlykParser } from '../js/modules/ravlykParser.js';
import { Environment } from '../js/modules/environment.js';
import { validateProgramAst } from '../js/modules/semanticValidator.js';
import {
    MAX_RECURSION_DEPTH,
    MAX_REPEATS_IN_LOOP,
    MAX_COMMAND_QUEUE_LENGTH,
} from '../js/modules/constants.js';
import { evaluateAstCondition } from '../js/modules/interpreterConditions.js';
import { evalAstNumberExpression } from '../js/modules/interpreterAstEval.js';
import { handlePrimitiveAstStatement } from '../js/modules/interpreterPrimitiveStatements.js';
import { animateWait } from '../js/modules/interpreterAnimation.js';
import { RavlykError } from '../js/modules/ravlykParser.js';
import { runAsyncTest } from './testUtils.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAndValidate(code) {
    const parser = new RavlykParser();
    const ast = parser.parseCodeToAst(code);
    return validateProgramAst(ast);
}

function makeEnv() {
    return new Environment(null);
}

/**
 * Build a runAstAnimationRuntime config that:
 *  - captures all primitive commands in `log` (in order)
 *  - runs synchronously by draining the rAF tick queue
 *  - returns a promise that resolves when execution is complete
 */
function runSync(programAst) {
    const log = [];          // collected { type, value } entries
    const errors = [];
    let stopped = false;
    let rafId = 0;
    const pendingTicks = []; // queue of scheduled tick callbacks

    const fakeCancelAnimationFrame = (id) => {
        const idx = pendingTicks.findIndex((t) => t.id === id);
        if (idx !== -1) pendingTicks.splice(idx, 1);
    };
    const fakeRequestAnimationFrame = (cb) => {
        rafId++;
        pendingTicks.push({ id: rafId, cb });
        return rafId;
    };

    // Drain all pending ticks synchronously after each rAF schedule.
    // We run the tick, which may schedule another — keep going until empty.
    function drain(promise) {
        // Kick off the first tick that was scheduled during promise creation.
        let iterations = 0;
        const MAX_ITERATIONS = 100_000; // safety cap
        while (pendingTicks.length > 0 && iterations++ < MAX_ITERATIONS) {
            const { cb } = pendingTicks.shift();
            cb(performance.now());
        }
        return promise;
    }

    // Simple command execution: just log the type and resolved value.
    const executeAnimatedCommand = (cmd, _deltaTime) => {
        if (cmd.type === 'MOVE' || cmd.type === 'MOVE_BACK') {
            const val = cmd._resolvedValue !== undefined
                ? cmd._resolvedValue
                : evalAstNumberExpression(cmd.distanceExpr, cmd._capturedEnv, {});
            log.push({ type: cmd.type, value: val });
        } else if (cmd.type === 'TURN' || cmd.type === 'TURN_LEFT') {
            const val = cmd._resolvedValue !== undefined
                ? cmd._resolvedValue
                : evalAstNumberExpression(cmd.angleExpr, cmd._capturedEnv, {});
            log.push({ type: cmd.type, value: val });
        } else if (cmd.type === 'COLOR') {
            log.push({ type: 'COLOR', value: cmd.value });
        } else if (cmd.type === 'CLEAR') {
            log.push({ type: 'CLEAR' });
        } else {
            log.push({ type: cmd.type });
        }
        return true; // always done in one frame for tests
    };

    const evalExpr = (expr, env) => evalAstNumberExpression(expr, env, {
        attachAstErrorLocation: () => {},
    });

    const promise = runAstAnimationRuntime({
        programAst,
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
        attachAstErrorLocation: (_err, _node) => {},
        convertStmtToCommand: (stmt, env) => {
            const buf = [];
            const handled = handlePrimitiveAstStatement({
                stmt,
                env,
                mode: 'queue',
                outputQueue: buf,
                state: { isPenDown: true },
                evalAstNumberExpression: evalExpr,
                createError: (key, ...args) => new RavlykError(key, ...args),
                performMove: () => {},
                performTurn: () => {},
                setColor: () => {},
                setBackgroundColor: () => {},
                setThickness: () => {},
                pickRandomColorName: () => 'red',
                pickRandomBackgroundColorName: () => 'white',
                pickSafeRandomDistance: () => 50,
                pickSafeRandomPoint: () => ({ x: 0, y: 0 }),
                performGoto: () => {},
                clearToDefaultSheet: () => {},
            });
            if (!handled || buf.length === 0) return null;
            const cmd = buf[0];
            cmd._capturedEnv = env;
            return cmd;
        },
        executeAnimatedCommand,
        config: { animationEnabled: false },
        commandIndicatorUpdater: () => {},
        createStopError: () => new RavlykError('EXECUTION_STOPPED_BY_USER'),
        getShouldStop: () => stopped,
        getIsPaused: () => false,
        setAnimationFrameId: () => {},
        getAnimationFrameId: () => null,
        cancelAnimationFrameFn: fakeCancelAnimationFrame,
        requestAnimationFrameFn: fakeRequestAnimationFrame,
        nowFn: () => performance.now(),
        onExecutionCompleted: () => {},
        onExecutionError: () => {},
        updateRavlykVisualState: () => {},
    });

    drain(promise);
    return { promise, log, errors };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

runAsyncTest('astAnimation: empty program resolves without commands', async () => {
    const ast = parseAndValidate('');
    const { promise, log } = runSync(ast);
    await promise;
    assert.equal(log.length, 0);
});

runAsyncTest('astAnimation: single move command is executed', async () => {
    const ast = parseAndValidate('вперед 100');
    const { promise, log } = runSync(ast);
    await promise;
    assert.equal(log.length, 1);
    assert.equal(log[0].type, 'MOVE');
    assert.equal(log[0].value, 100);
});

runAsyncTest('astAnimation: move and turn are executed in order', async () => {
    const ast = parseAndValidate('вперед 50\nправоруч 90');
    const { promise, log } = runSync(ast);
    await promise;
    assert.equal(log.length, 2);
    assert.equal(log[0].type, 'MOVE');
    assert.equal(log[0].value, 50);
    assert.equal(log[1].type, 'TURN');
    assert.equal(log[1].value, 90);
});

runAsyncTest('astAnimation: repeat loop executes correct number of times', async () => {
    const ast = parseAndValidate('повторити 3 ( вперед 10 )');
    const { promise, log } = runSync(ast);
    await promise;
    assert.equal(log.length, 3);
    assert.ok(log.every((e) => e.type === 'MOVE' && e.value === 10));
});

runAsyncTest('astAnimation: variable is evaluated lazily at execution time', async () => {
    // x is created before the move — value should be 77
    const ast = parseAndValidate('створити x = 77\nвперед x');
    const { promise, log } = runSync(ast);
    await promise;
    assert.equal(log.length, 1);
    assert.equal(log[0].value, 77);
});

runAsyncTest('astAnimation: variable reassignment is visible to subsequent move', async () => {
    // Re-assigning x before using it — the move should see the updated value.
    const ast = parseAndValidate('створити x = 10\nx = 42\nвперед x');
    const { promise, log } = runSync(ast);
    await promise;
    assert.equal(log.length, 1);
    assert.equal(log[0].value, 42);
});

runAsyncTest('astAnimation: if-else branch is taken based on condition', async () => {
    // якщо 1 > 0 → take then branch
    const ast = parseAndValidate('якщо 1 > 0 ( вперед 10 ) інакше ( вперед 99 )');
    const { promise, log } = runSync(ast);
    await promise;
    assert.equal(log.length, 1);
    assert.equal(log[0].value, 10);
});

runAsyncTest('astAnimation: else branch is taken when condition is false', async () => {
    const ast = parseAndValidate('якщо 0 > 1 ( вперед 10 ) інакше ( вперед 99 )');
    const { promise, log } = runSync(ast);
    await promise;
    assert.equal(log.length, 1);
    assert.equal(log[0].value, 99);
});

runAsyncTest('astAnimation: variable mutated inside if propagates outward', async () => {
    // After якщо branch sets x = 5, the move should use 5.
    const ast = parseAndValidate('створити x = 1\nякщо 1 > 0 ( x = 5 )\nвперед x');
    const { promise, log } = runSync(ast);
    await promise;
    assert.equal(log.length, 1);
    assert.equal(log[0].value, 5);
});

runAsyncTest('astAnimation: user-defined function call is executed', async () => {
    const ast = parseAndValidate('створити рух(n) ( вперед n )\nрух(33)');
    const { promise, log } = runSync(ast);
    await promise;
    assert.equal(log.length, 1);
    assert.equal(log[0].value, 33);
});

runAsyncTest('astAnimation: color command is collected', async () => {
    const ast = parseAndValidate('колір червоний');
    const { promise, log } = runSync(ast);
    await promise;
    assert.equal(log.length, 1);
    assert.equal(log[0].type, 'COLOR');
});

runAsyncTest('astAnimation: deeply nested control-flow-only loops are rejected by AST budget', async () => {
    // 500 * 500 = 250 000 assignment iterations — far exceeds MAX_COMMAND_QUEUE_LENGTH (50 000).
    // Without maxAstSteps this would run entirely inside a single step() call and freeze.
    const parser = new RavlykParser();
    const ast = parser.parseCodeToAst(
        'створити x = 0\nповторити 500 (\n  повторити 500 (\n    x = x + 1\n  )\n)'
    );
    const { promise } = runSync(ast);
    await assert.rejects(
        () => promise,
        (err) => err?.name === 'RavlykError' && /надто багато команд/i.test(err.message)
    );
});

// ---------------------------------------------------------------------------
// Wait (чекати) integration — fake clock, animationEnabled=false
// ---------------------------------------------------------------------------

/**
 * Like runSync but advances a fake clock by frameMs on each tick,
 * so realDeltaTime = frameMs/1000 per frame (instead of ≈0 from performance.now).
 * This lets us verify that WAIT spans the correct number of frames
 * even when animationEnabled=false.
 */
function runWithFakeClock(programAst, { frameMs = 50, animationEnabled = false } = {}) {
    const log = [];
    let stopped = false;
    let rafId = 0;
    const pendingTicks = [];
    let fakeTime = 0;

    const fakeCancelAnimationFrame = (id) => {
        const idx = pendingTicks.findIndex((t) => t.id === id);
        if (idx !== -1) pendingTicks.splice(idx, 1);
    };
    const fakeRequestAnimationFrame = (cb) => {
        rafId++;
        pendingTicks.push({ id: rafId, cb });
        return rafId;
    };

    const evalExpr = (expr, env) => evalAstNumberExpression(expr, env, { attachAstErrorLocation: () => {} });

    let waitFrameCount = 0;

    const promise = runAstAnimationRuntime({
        programAst,
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
        convertStmtToCommand: (stmt, env) => {
            const buf = [];
            const handled = handlePrimitiveAstStatement({
                stmt, env, mode: 'queue', outputQueue: buf,
                state: { isPenDown: true },
                evalAstNumberExpression: evalExpr,
                createError: (key, ...args) => new RavlykError(key, ...args),
                performMove: () => {}, performTurn: () => {}, setColor: () => {},
                setBackgroundColor: () => {}, setThickness: () => {},
                pickRandomColorName: () => 'red', pickRandomBackgroundColorName: () => 'white',
                pickSafeRandomDistance: () => 50, pickSafeRandomPoint: () => ({ x: 0, y: 0 }),
                performGoto: () => {}, clearToDefaultSheet: () => {},
            });
            if (!handled || buf.length === 0) return null;
            const cmd = buf[0];
            cmd._capturedEnv = env;
            return cmd;
        },
        executeAnimatedCommand: (cmd, _animDt, realDt) => {
            if (cmd.type === 'WAIT') {
                waitFrameCount++;
                return animateWait({ commandObject: cmd, deltaTime: realDt });
            }
            log.push({ type: cmd.type });
            return true;
        },
        config: { animationEnabled },
        commandIndicatorUpdater: () => {},
        createStopError: () => new RavlykError('EXECUTION_STOPPED_BY_USER'),
        getShouldStop: () => stopped,
        getIsPaused: () => false,
        setAnimationFrameId: () => {},
        getAnimationFrameId: () => null,
        cancelAnimationFrameFn: fakeCancelAnimationFrame,
        requestAnimationFrameFn: fakeRequestAnimationFrame,
        nowFn: () => fakeTime,
        onExecutionCompleted: () => {},
        onExecutionError: () => {},
        updateRavlykVisualState: () => {},
    });

    let iterations = 0;
    const MAX_ITERATIONS = 100_000;
    while (pendingTicks.length > 0 && iterations++ < MAX_ITERATIONS) {
        fakeTime += frameMs;
        const { cb } = pendingTicks.shift();
        cb(fakeTime);
    }

    return { promise, log, waitFrameCount: () => waitFrameCount };
}

runAsyncTest('astAnimation: чекати spans multiple frames (semantic wait, animationEnabled=false)', async () => {
    // чекати 0.1 = 100ms; each fake frame = 50ms → needs ≥ 2 WAIT frames to complete.
    const ast = parseAndValidate('чекати 0.1\nвперед 50');
    const { promise, log, waitFrameCount } = runWithFakeClock(ast, { frameMs: 50, animationEnabled: false });

    await promise;

    // WAIT must have been evaluated across multiple frames, not skipped instantly.
    assert.ok(waitFrameCount() >= 2, `чекати should take ≥2 frames, got ${waitFrameCount()}`);
    // Code after чекати must have executed.
    assert.equal(log.length, 1, 'MOVE after чекати should execute');
    assert.equal(log[0].type, 'MOVE');
});

runAsyncTest('astAnimation: чекати 0 completes in one frame and continues', async () => {
    const ast = parseAndValidate('чекати 0\nвперед 30');
    const { promise, log } = runWithFakeClock(ast, { frameMs: 16 });

    await promise;

    assert.equal(log.length, 1);
    assert.equal(log[0].type, 'MOVE');
});
