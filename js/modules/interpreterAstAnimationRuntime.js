// Lazy rAF-driven animation loop for the non-game execution path.
//
// Instead of pre-building a flat command queue, this
// module pulls one primitive statement at a time from a createAstRuntime instance
// and animates it across requestAnimationFrame ticks.
//
// Benefits over the flat-queue approach:
//   - No upfront allocation — programs start animating immediately.
//   - Correct variable semantics: if-condition branches share the live env, so
//     variable mutations inside one branch propagate to subsequent statements.
//   - Loops are not unrolled in advance; each iteration is generated lazily.

import { createAstRuntime } from './interpreterAstRuntime.js';

export function runAstAnimationRuntime({
    programAst,
    // createAstRuntime options
    EnvironmentCtor,
    RavlykErrorCtor,
    maxRecursionDepth,
    maxRepeatsInLoop,
    maxCommandQueueLength,
    evalAstNumberExpression,
    evaluateCondition,
    attachAstErrorLocation,
    // Per-primitive-statement callbacks
    convertStmtToCommand,   // (stmt, env) => legacyCmd | null
    executeAnimatedCommand, // (cmd, deltaTime) => boolean (true = done)
    // Loop-control callbacks
    config,
    commandIndicatorUpdater,
    createStopError,
    getShouldStop,
    getIsPaused,
    setAnimationFrameId,
    getAnimationFrameId,
    setStopHandler = () => {},
    cancelAnimationFrameFn,
    requestAnimationFrameFn,
    nowFn,
    onExecutionCompleted,
    onExecutionError,
    updateRavlykVisualState,
    onPrimitiveCompleted = () => {},
    onFrameCapture = null,
    stepControl = null,
}) {
    const astRuntime = createAstRuntime({
        programAst,
        EnvironmentCtor,
        RavlykErrorCtor,
        maxRecursionDepth,
        maxRepeatsInLoop,
        // maxCommandQueueLength caps the number of primitives returned by step().
        maxCommandQueueLength,
        // maxAstSteps caps the TOTAL number of AST statements processed (including
        // assignments, function calls, repeat iterations, and if-branches).
        // Without this, a program with only control-flow and no drawing commands
        // (e.g. повторити 500 ( повторити 500 ( x = x + 1 ) )) would do all
        // 250 000 iterations inside a single step() call, freezing the browser.
        maxAstSteps: maxCommandQueueLength,
        maxAstStepsErrorKey: 'COMMAND_QUEUE_OVERFLOW',
        evalAstNumberExpression,
        evaluateCondition,
        attachAstErrorLocation,
    });

    return new Promise((resolve, reject) => {
        let lastTimestamp = nowFn();
        let pendingCmd = null; // command currently being animated (multi-frame)
        let primitiveIndex = 0;
        let settled = false;

        const cancelPendingFrame = () => {
            const id = getAnimationFrameId();
            if (id) cancelAnimationFrameFn(id);
        };
        const finish = () => {
            if (settled) return;
            settled = true;
            setStopHandler(null);
            onExecutionCompleted();
            resolve();
        };
        const fail = (error) => {
            if (settled) return;
            settled = true;
            cancelPendingFrame();
            setStopHandler(null);
            onExecutionError();
            reject(error);
        };

        setStopHandler(() => fail(createStopError()));

        const tick = (timestamp) => {
            if (settled) return;
            if (getShouldStop()) {
                fail(createStopError());
                return;
            }

            if (getIsPaused() || (pendingCmd === null && stepControl?.enabled && !stepControl.requested)) {
                lastTimestamp = timestamp;
                setAnimationFrameId(requestAnimationFrameFn(tick));
                return;
            }

            const frameMs = Math.max(0, timestamp - lastTimestamp);
            const realDeltaTime = frameMs / 1000;
            // animDeltaTime: Infinity collapses movement/turn to instant when animation is off.
            // realDeltaTime: always the true elapsed time — used for semantic waits.
            const animDeltaTime = config.animationEnabled ? realDeltaTime : Infinity;
            lastTimestamp = timestamp;

            try {
                // Continue multi-frame animation for the current command.
                if (pendingCmd !== null) {
                    const done = executeAnimatedCommand(pendingCmd, animDeltaTime, realDeltaTime);
                    updateRavlykVisualState();
                    if (onFrameCapture) onFrameCapture(frameMs, pendingCmd);
                    if (!done) {
                        setAnimationFrameId(requestAnimationFrameFn(tick));
                        return;
                    }
                    onPrimitiveCompleted(pendingCmd);
                    pendingCmd = null;
                    if (stepControl?.enabled) {
                        if (astRuntime.isDone()) { finish(); return; }
                        stepControl.waiting = true;
                        stepControl.onWaiting?.();
                        setAnimationFrameId(requestAnimationFrameFn(tick));
                        return;
                    }
                }

                // Pull the next primitive from the AST runtime.
                // createAstRuntime handles all control flow internally
                // (assign, funcdef, funccall, repeat, if) and only surfaces
                // primitive drawing / game statements to the caller.
                const next = astRuntime.step();
                if (next === null) {
                    finish();
                    return;
                }

                const cmd = convertStmtToCommand(next.stmt, next.env);
                if (!cmd) {
                    // Unrecognised stmt type — skip and continue in same tick
                    setAnimationFrameId(requestAnimationFrameFn(tick));
                    return;
                }

                if (stepControl) {
                    stepControl.requested = false;
                    stepControl.waiting = false;
                    stepControl.onCommand?.(next.stmt);
                }

                commandIndicatorUpdater(cmd.original ?? '', primitiveIndex);
                primitiveIndex++;

                const done = executeAnimatedCommand(cmd, animDeltaTime, realDeltaTime);
                updateRavlykVisualState();
                if (onFrameCapture) onFrameCapture(frameMs, cmd);
                if (!done) {
                    pendingCmd = cmd; // needs more frames
                } else {
                    onPrimitiveCompleted(cmd);
                    if (stepControl?.enabled) {
                        if (astRuntime.isDone()) { finish(); return; }
                        stepControl.waiting = true;
                        stepControl.onWaiting?.();
                    }
                }
                setAnimationFrameId(requestAnimationFrameFn(tick));

            } catch (error) {
                fail(error);
            }
        };

        setAnimationFrameId(requestAnimationFrameFn(tick));
    });
}
