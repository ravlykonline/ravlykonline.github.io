// Lazy rAF-driven animation loop for the non-game execution path.
//
// Instead of pre-building a flat command queue (astProgramToLegacyQueue), this
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
    // Loop-control callbacks (same contract as runCommandQueueRuntime)
    config,
    commandIndicatorUpdater,
    createStopError,
    getShouldStop,
    getIsPaused,
    setAnimationFrameId,
    getAnimationFrameId,
    cancelAnimationFrameFn,
    requestAnimationFrameFn,
    nowFn,
    onExecutionCompleted,
    onExecutionError,
    updateRavlykVisualState,
    onFrameCapture = null,
}) {
    const astRuntime = createAstRuntime({
        programAst,
        EnvironmentCtor,
        RavlykErrorCtor,
        maxRecursionDepth,
        maxRepeatsInLoop,
        maxCommandQueueLength,
        evalAstNumberExpression,
        evaluateCondition,
        attachAstErrorLocation,
    });

    return new Promise((resolve, reject) => {
        let lastTimestamp = nowFn();
        let pendingCmd = null; // command currently being animated (multi-frame)

        const tick = (timestamp) => {
            if (getShouldStop()) {
                const id = getAnimationFrameId();
                if (id) cancelAnimationFrameFn(id);
                onExecutionError();
                reject(createStopError());
                return;
            }

            if (getIsPaused()) {
                lastTimestamp = timestamp;
                setAnimationFrameId(requestAnimationFrameFn(tick));
                return;
            }

            const frameMs = Math.max(0, timestamp - lastTimestamp);
            const deltaTime = config.animationEnabled ? frameMs / 1000 : Infinity;
            lastTimestamp = timestamp;

            try {
                // Continue multi-frame animation for the current command.
                if (pendingCmd !== null) {
                    const done = executeAnimatedCommand(pendingCmd, deltaTime);
                    updateRavlykVisualState();
                    if (onFrameCapture) onFrameCapture(frameMs);
                    if (!done) {
                        setAnimationFrameId(requestAnimationFrameFn(tick));
                        return;
                    }
                    pendingCmd = null;
                }

                // Pull the next primitive from the AST runtime.
                // createAstRuntime handles all control flow internally
                // (assign, funcdef, funccall, repeat, if) and only surfaces
                // primitive drawing / game statements to the caller.
                const next = astRuntime.step();
                if (next === null) {
                    onExecutionCompleted();
                    resolve();
                    return;
                }

                const cmd = convertStmtToCommand(next.stmt, next.env);
                if (!cmd) {
                    // Unrecognised stmt type — skip and continue in same tick
                    setAnimationFrameId(requestAnimationFrameFn(tick));
                    return;
                }

                commandIndicatorUpdater(cmd.original ?? '', 0);

                const done = executeAnimatedCommand(cmd, deltaTime);
                updateRavlykVisualState();
                if (onFrameCapture) onFrameCapture(frameMs);
                if (!done) {
                    pendingCmd = cmd; // needs more frames
                }
                setAnimationFrameId(requestAnimationFrameFn(tick));

            } catch (error) {
                const id = getAnimationFrameId();
                if (id) cancelAnimationFrameFn(id);
                onExecutionError();
                reject(error);
            }
        };

        setAnimationFrameId(requestAnimationFrameFn(tick));
    });
}
