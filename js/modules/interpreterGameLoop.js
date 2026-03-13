export function stopGameLoopRuntime(runtime, optionalError = undefined) {
    if (runtime.gameLoopTimerId) {
        clearInterval(runtime.gameLoopTimerId);
        runtime.gameLoopTimerId = null;
    }
    if (runtime.gameLoopReject) {
        const reject = runtime.gameLoopReject;
        runtime.gameLoopReject = null;
        if (optionalError) {
            reject(optionalError);
        }
    }
}

export function startGameLoopRuntime(runtime, {
    gameTickMs,
    shouldStop,
    isPaused,
    onStopRequested,
    onTick,
    onError,
}) {
    return new Promise((resolve, reject) => {
        runtime.gameLoopReject = reject;
        runtime.gameLoopTimerId = setInterval(() => {
            try {
                if (shouldStop()) {
                    onStopRequested();
                    return;
                }
                if (isPaused()) {
                    return;
                }
                onTick();
            } catch (error) {
                onError(error);
            }
        }, gameTickMs);
    });
}
