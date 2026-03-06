export function createExecutionController({
    interpreter,
    codeEditor,
    editorUi,
    uiControls,
    messages,
    limits,
    animationDefaults,
    uiHandlers,
}) {
    const {
        runBtn,
        stopBtn,
        clearBtn,
        downloadBtn,
        shareBtn,
        gridBtn,
        helpBtn,
        exampleBlocks,
    } = uiControls;

    const {
        ERROR_MESSAGES,
        SUCCESS_MESSAGES,
        INFO_MESSAGES,
    } = messages;

    const {
        MAX_CODE_LENGTH_CHARS,
        EXECUTION_TIMEOUT_MS,
    } = limits;

    const {
        DEFAULT_MOVE_PIXELS_PER_SECOND,
        DEFAULT_TURN_DEGREES_PER_SECOND,
    } = animationDefaults;

    const {
        showError,
        showInfoMessage,
        showSuccessMessage,
        showStopConfirmModal,
        hideStopConfirmModal,
        updateCommandIndicator,
    } = uiHandlers;

    function updateExecutionControls(isExecuting) {
        runBtn.disabled = isExecuting;
        stopBtn.disabled = !isExecuting;
        clearBtn.disabled = isExecuting;
        if (downloadBtn) downloadBtn.disabled = isExecuting;
        if (shareBtn) shareBtn.disabled = isExecuting;
        if (gridBtn) gridBtn.disabled = isExecuting;
        helpBtn.disabled = isExecuting;
        codeEditor.disabled = isExecuting;
        exampleBlocks.forEach((block) => block.classList.toggle('disabled', isExecuting));
    }

    async function runCode() {
        const code = codeEditor.value;
        editorUi.setEditorErrorLine(null);
        if (code.length > MAX_CODE_LENGTH_CHARS) {
            showError(ERROR_MESSAGES.CODE_TOO_LONG);
            return;
        }

        if (interpreter.isExecuting) {
            interpreter.stopExecution();
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        updateExecutionControls(true);
        interpreter.reset();

        const accessibilitySettings = window.ravlykAccessibility ? window.ravlykAccessibility.load() : {};
        interpreter.setAnimationEnabled(!accessibilitySettings['reduce-animations']);
        interpreter.setSpeed(DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND);

        let executionTimedOut = false;
        const executionTimeoutId = setTimeout(() => {
            executionTimedOut = true;
            interpreter.stopExecution();
        }, EXECUTION_TIMEOUT_MS);

        try {
            await interpreter.executeCommands(code);
            if (!executionTimedOut && !interpreter.wasBoundaryWarningShown()) {
                showSuccessMessage(SUCCESS_MESSAGES.CODE_EXECUTED);
            }
        } catch (error) {
            if (error.name === 'RavlykError') {
                if (executionTimedOut) {
                    showError(ERROR_MESSAGES.EXECUTION_TIMEOUT, 0);
                } else if (error.message === ERROR_MESSAGES.EXECUTION_STOPPED_BY_USER) {
                    showInfoMessage(INFO_MESSAGES.EXECUTION_STOPPED);
                } else {
                    const friendlyError = editorUi.getFriendlyExecutionError(code, error);
                    showError(friendlyError.message, 0);
                    if (friendlyError.line) {
                        editorUi.setEditorErrorLine(friendlyError.line);
                        editorUi.focusEditorLine(friendlyError.line);
                    }
                }
            } else {
                showError(`Неочікувана помилка: ${error.message}`, 0);
                console.error('Unexpected error during execution:', error);
            }
            interpreter.reset();
        } finally {
            clearTimeout(executionTimeoutId);
            updateExecutionControls(false);
            updateCommandIndicator(null, -1);
        }
    }

    function openStopConfirmDialog() {
        if (!interpreter.isExecuting) return;
        interpreter.pauseExecution();
        showStopConfirmModal();
    }

    function closeStopConfirmDialog(shouldResumeExecution = true) {
        hideStopConfirmModal();
        if (shouldResumeExecution && interpreter.isExecuting && !interpreter.shouldStop) {
            interpreter.resumeExecution();
        }
    }

    return {
        runCode,
        updateExecutionControls,
        openStopConfirmDialog,
        closeStopConfirmDialog,
    };
}
