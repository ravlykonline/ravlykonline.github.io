import assert from 'node:assert/strict';
import { runAstAnimationRuntime } from '../js/modules/interpreterAstAnimationRuntime.js';
import { RavlykParser, RavlykError } from '../js/modules/ravlykParser.js';
import { Environment } from '../js/modules/environment.js';
import { evalAstNumberExpression } from '../js/modules/interpreterAstEval.js';
import { evaluateAstCondition } from '../js/modules/interpreterConditions.js';
import { runAsyncTest } from './testUtils.js';
import { createExecutionController } from '../js/modules/executionController.js';

function harness(source, { stepping = true, frames = 1, budget = 50000 } = {}) {
    const ticks = [];
    const log = [];
    const lines = [];
    let clock = 0;
    let paused = false;
    let stop;
    let done = false;
    const control = { enabled: stepping, requested: true, waiting: false, onCommand: (stmt) => lines.push(stmt.span.start.line) };
    const evaluate = (expr, env) => evalAstNumberExpression(expr, env, {});
    const promise = runAstAnimationRuntime({
        programAst: new RavlykParser().parseCodeToAst(source),
        EnvironmentCtor: Environment, RavlykErrorCtor: RavlykError,
        maxRecursionDepth: 20, maxRepeatsInLoop: 500, maxCommandQueueLength: budget,
        evalAstNumberExpression: evaluate,
        evaluateCondition: (condition, env) => evaluateAstCondition(condition, { env, evalAstNumberExpression: evaluate }),
        attachAstErrorLocation() {},
        convertStmtToCommand: (stmt, env) => ({ stmt, env, remaining: frames }),
        executeAnimatedCommand: (command) => {
            if (--command.remaining > 0) return false;
            const stmt = command.stmt;
            log.push([stmt.type, stmt.distance ? evaluate(stmt.distance, command.env) : null]);
            return true;
        },
        config: { animationEnabled: true }, commandIndicatorUpdater() {},
        createStopError: () => new RavlykError('EXECUTION_STOPPED_BY_USER'),
        getShouldStop: () => false, getIsPaused: () => paused,
        setAnimationFrameId() {}, getAnimationFrameId: () => 1,
        setStopHandler: (handler) => { stop = handler; },
        cancelAnimationFrameFn: () => { ticks.length = 0; },
        requestAnimationFrameFn: (tick) => { ticks.push(tick); return 1; },
        nowFn: () => clock,
        onExecutionCompleted: () => { done = true; }, onExecutionError: () => { done = true; },
        updateRavlykVisualState() {}, stepControl: control,
    });
    function tick() { ticks.shift()?.(clock += 16); }
    function advance() {
        control.waiting = false;
        control.requested = true;
        let count = 0;
        while (!done && !control.waiting && count++ < 10000) tick();
        assert.ok(count < 10000, 'execution must settle or wait');
    }
    return { promise, log, lines, control, tick, advance, stop: () => stop(), pause: (value) => { paused = value; }, done: () => done };
}

await runAsyncTest('step waits after an entire multi-frame command without starting the next', async () => {
    const h = harness('вперед 10\nвперед 20', { frames: 3 });
    h.tick();
    assert.equal(h.control.waiting, false);
    assert.deepEqual(h.log, []);
    h.tick(); h.tick();
    assert.deepEqual(h.log, [['MoveStmt', 10]]);
    assert.deepEqual(h.lines, [1]);
    for (let i = 0; i < 10; i++) h.tick();
    assert.equal(h.log.length, 1);
    h.advance();
    await h.promise;
    assert.deepEqual(h.lines, [1, 2]);
    assert.equal(h.log.length, 2);
});

await runAsyncTest('stepping and continuous execution have the same nested-loop and function results', async () => {
    const source = 'створити x = 1\nстворити рух(n) ( вперед n )\nповторити 3 (\nрух(x)\nx = x + 1\n)\nякщо x = 4 ( вперед 40 )';
    const stepped = harness(source);
    while (!stepped.done()) stepped.advance();
    await stepped.promise;
    const continuous = harness(source, { stepping: false });
    continuous.advance();
    await continuous.promise;
    assert.deepEqual(stepped.log, continuous.log);
    assert.deepEqual(stepped.log.map((entry) => entry[1]), [1, 2, 3, 40]);
});

await runAsyncTest('continue uses the same runtime and stop settles an idle step session', async () => {
    const h = harness('вперед 10\nвперед 20\nвперед 30');
    h.advance();
    h.control.enabled = false;
    h.advance();
    await h.promise;
    assert.deepEqual(h.log.map((entry) => entry[1]), [10, 20, 30]);
    const idle = harness('вперед 10\nвперед 20');
    idle.advance();
    idle.stop();
    await assert.rejects(idle.promise, { name: 'RavlykError' });
    assert.equal(idle.log.length, 1);
});

await runAsyncTest('cancelled stop-dialog pause does not advance the next step', async () => {
    const h = harness('вперед 10\nвперед 20');
    h.advance();
    h.pause(true); h.tick(); h.pause(false); h.tick();
    assert.equal(h.log.length, 1);
    h.advance();
    await h.promise;
});

await runAsyncTest('step still enforces budgets in control-only infinite loops', async () => {
    const h = harness('поки 1 = 1 ( )', { budget: 20 });
    h.advance();
    await assert.rejects(h.promise, { name: 'RavlykError' });
});

await runAsyncTest('empty and trailing-control programs finish without inventing graphical steps', async () => {
    for (const source of ['', 'створити x = 1', 'створити x = 1\nпоки x < 2 ( вперед 10 x = x + 1 )']) {
        const h = harness(source);
        while (!h.done()) h.advance();
        await h.promise;
        assert.ok(h.log.length <= 1);
    }
});

await runAsyncTest('step controller ignores idle time, debounces requests, and clears timeout on stop', async () => {
    const previousInterval = globalThis.setInterval;
    const previousClear = globalThis.clearInterval;
    const previousNow = Date.now;
    let now = 0;
    let timer;
    let cleared = false;
    let rejectExecution;
    let resets = 0;
    const runBtn = { disabled: false };
    const stepBtn = { disabled: false };
    const interpreter = {
        isExecuting: false, isPaused: false,
        prepareProgram: () => ({ body: [] }),
        reset() { resets++; }, setAnimationEnabled() {}, setSpeed() {},
        executeProgram() {
            this.isExecuting = true;
            return new Promise((_, reject) => { rejectExecution = reject; });
        },
        stopExecution() { this.isExecuting = false; rejectExecution(new RavlykError('EXECUTION_STOPPED_BY_USER')); },
        pauseExecution() { this.isPaused = true; }, resumeExecution() { this.isPaused = false; },
    };
    globalThis.setInterval = (callback) => { timer = callback; return 1; };
    globalThis.clearInterval = () => { cleared = true; };
    Date.now = () => now;
    try {
        const controller = createExecutionController({
            interpreter, codeEditor: { value: 'вперед 10', disabled: false },
            editorUi: { setEditorErrorLine() {}, getFriendlyExecutionError: () => ({ message: 'timeout' }) },
            uiControls: { runBtn, stepBtn, stopBtn: {}, clearBtn: {}, helpBtn: {}, exampleBlocks: [] },
            messages: { ERROR_MESSAGES: {}, SUCCESS_MESSAGES: {}, INFO_MESSAGES: {} },
            limits: { MAX_CODE_LENGTH_CHARS: 10000, EXECUTION_TIMEOUT_MS: 1000 },
            animationDefaults: {},
            uiHandlers: { showError() {}, showInfoMessage() {}, updateCommandIndicator() {}, showStopConfirmModal() {}, hideStopConfirmModal() {} },
        });
        const promise = controller.stepCode();
        await Promise.resolve();
        const control = interpreter.stepControl;
        control.waiting = true;
        control.onWaiting();
        now = 100000;
        timer();
        assert.equal(interpreter.isExecuting, true, 'idle time must not trigger timeout');
        controller.openStopConfirmDialog();
        assert.equal(stepBtn.disabled, true);
        controller.closeStopConfirmDialog();
        assert.equal(control.waiting, true);
        controller.stepCode();
        controller.stepCode();
        assert.equal(control.requested, true);
        assert.equal(control.waiting, false);
        assert.equal(stepBtn.disabled, true);
        assert.equal(resets, 1);
        now += 1001;
        timer();
        await promise;
        assert.equal(cleared, true);
        assert.equal(interpreter.stepControl, null);
        assert.equal(stepBtn.disabled, false);
        assert.equal(runBtn.disabled, false);
    } finally {
        globalThis.setInterval = previousInterval;
        globalThis.clearInterval = previousClear;
        Date.now = previousNow;
    }
});
