export function runCommandQueueRuntime({
    commandQueue,
    config,
    commandIndicatorUpdater,
    ensureExecutionEnv,
    createStopError,
    getShouldStop,
    getIsPaused,
    setCurrentCommandIndex,
    setAnimationFrameId,
    getAnimationFrameId,
    cancelAnimationFrameFn,
    requestAnimationFrameFn,
    nowFn,
    onExecutionCompleted,
    onExecutionError,
    executeCurrentCommand,
    updateRavlykVisualState,
}) {
    return new Promise((resolve, reject) => {
        let lastTimestamp = nowFn();
        const executionStack = [{ commands: commandQueue, index: 0 }];
        ensureExecutionEnv();

        const processNextCommand = (timestamp) => {
            if (getShouldStop()) {
                const currentFrameId = getAnimationFrameId();
                if (currentFrameId) cancelAnimationFrameFn(currentFrameId);
                onExecutionError();
                reject(createStopError());
                return;
            }

            if (getIsPaused()) {
                lastTimestamp = timestamp;
                setAnimationFrameId(requestAnimationFrameFn(processNextCommand));
                return;
            }

            while (executionStack.length > 0) {
                const topFrame = executionStack[executionStack.length - 1];
                if (topFrame.index < topFrame.commands.length) break;
                executionStack.pop();
            }

            if (executionStack.length === 0) {
                onExecutionCompleted();
                resolve();
                return;
            }

            const currentFrame = executionStack[executionStack.length - 1];
            const currentCommandObject = currentFrame.commands[currentFrame.index];
            setCurrentCommandIndex(currentFrame.rootIndex ?? currentFrame.index);
            commandIndicatorUpdater(currentCommandObject.original, currentFrame.rootIndex ?? currentFrame.index);

            try {
                const deltaTime = config.animationEnabled ? (timestamp - lastTimestamp) / 1000 : Infinity;
                lastTimestamp = timestamp;

                const commandDone = executeCurrentCommand({
                    currentCommandObject,
                    currentFrame,
                    executionStack,
                    deltaTime,
                });

                updateRavlykVisualState();
                if (commandDone) currentFrame.index++;
                setAnimationFrameId(requestAnimationFrameFn(processNextCommand));
            } catch (error) {
                const currentFrameId = getAnimationFrameId();
                if (currentFrameId) cancelAnimationFrameFn(currentFrameId);
                onExecutionError();
                reject(error);
            }
        };

        setAnimationFrameId(requestAnimationFrameFn(processNextCommand));
    });
}
