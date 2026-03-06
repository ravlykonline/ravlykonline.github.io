export function stopExecutionRuntime({ runtime, createStopError, stopGameLoop }) {
    runtime.shouldStop = true;
    runtime.isPaused = false;
    stopGameLoop(createStopError());
}

export function pauseExecutionRuntime({ runtime }) {
    if (runtime.isExecuting) {
        runtime.isPaused = true;
    }
}

export function resumeExecutionRuntime({ runtime }) {
    runtime.isPaused = false;
}

export function wasBoundaryWarningShownRuntime({ runtime }) {
    return runtime.boundaryWarningShown;
}
