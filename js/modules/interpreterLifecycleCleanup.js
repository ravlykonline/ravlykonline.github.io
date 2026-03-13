export function destroyInterpreterLifecycle({
    runtime,
    cancelAnimationFrameFn,
    clearIntervalFn,
    windowRef,
}) {
    if (runtime.isDestroyed) return false;
    runtime.isDestroyed = true;

    if (runtime.animationFrameId) {
        cancelAnimationFrameFn(runtime.animationFrameId);
        runtime.animationFrameId = null;
    }

    if (runtime.gameLoopTimerId) {
        clearIntervalFn(runtime.gameLoopTimerId);
        runtime.gameLoopTimerId = null;
    }

    if (windowRef && typeof windowRef.removeEventListener === 'function') {
        windowRef.removeEventListener('keydown', runtime.onKeyDown);
        windowRef.removeEventListener('keyup', runtime.onKeyUp);
    }

    runtime.gameLoopReject = null;
    runtime.shouldStop = true;
    runtime.isPaused = false;
    runtime.isExecuting = false;
    runtime.executionEnv = null;
    runtime.commandQueue = [];
    runtime.currentCommandIndex = 0;
    runtime.pressedKeys.clear();

    return true;
}
