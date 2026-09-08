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
        runBtn, stopBtn, clearBtn, downloadBtn, shareBtn, gridBtn, helpBtn, exampleBlocks,
    } = uiControls;
    const { ERROR_MESSAGES, SUCCESS_MESSAGES, INFO_MESSAGES } = messages;
    const { MAX_CODE_LENGTH_CHARS, EXECUTION_TIMEOUT_MS } = limits;
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

    let activeSession = null;

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

    function reportExecutionError(code, error, executionTimedOut = false) {
        if (error?.name === 'RavlykError') {
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
            return;
        }

        showError(
            ERROR_MESSAGES.UNEXPECTED_EXECUTION_ERROR
                || 'Не вдалося виконати програму. Спробуй запустити її ще раз.',
            0
        );
        console.error('Unexpected error during execution:', error);
    }

    function hasGameBlock(programAst) {
        return (programAst?.body || []).some((stmt) => stmt?.type === 'GameStmt');
    }

    async function executeSession(codeInput, options = {}) {
        const code = String(codeInput ?? '');
        editorUi.setEditorErrorLine(null);

        if (activeSession) {
            showInfoMessage(ERROR_MESSAGES.EXECUTION_IN_PROGRESS);
            return 'failed';
        }
        if (code.length > MAX_CODE_LENGTH_CHARS) {
            showError(ERROR_MESSAGES.CODE_TOO_LONG);
            return 'failed';
        }

        if (interpreter.isExecuting) {
            interpreter.stopExecution();
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        let programAst;
        try {
            programAst = interpreter.prepareProgram(code);
            if (options.kind === 'gif' && hasGameBlock(programAst)) {
                showError(ERROR_MESSAGES.GIF_GAME_UNSUPPORTED, 0);
                return 'failed';
            }
            options.validatePreparedProgram?.(programAst);
        } catch (error) {
            reportExecutionError(code, error);
            return 'failed';
        }

        const session = { stopReason: null, cancel: options.cancel || null };
        activeSession = session;
        updateExecutionControls(true);
        interpreter.reset();

        const accessibilitySettings = globalThis.window?.ravlykAccessibility
            ? globalThis.window.ravlykAccessibility.load()
            : {};
        interpreter.setAnimationEnabled(!accessibilitySettings['reduce-animations']);
        interpreter.setSpeed(DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND);

        let executionTimedOut = false;
        let executionTimeoutId = null;
        let captureTimeoutId = null;
        let result = 'failed';

        try {
            await options.beforeExecute?.(programAst);
            executionTimeoutId = setTimeout(() => {
                executionTimedOut = true;
                session.stopReason = 'failed';
                interpreter.stopExecution();
            }, EXECUTION_TIMEOUT_MS);
            if (Number.isFinite(options.captureTimeoutMs) && options.captureTimeoutMs > 0) {
                captureTimeoutId = setTimeout(() => {
                    session.stopReason = 'capture-limit';
                    interpreter.stopExecution();
                }, options.captureTimeoutMs);
            }

            try {
                await interpreter.executeProgram(programAst);
                result = session.stopReason || 'completed';
            } catch (error) {
                result = session.stopReason || 'failed';
                if (result === 'failed') reportExecutionError(code, error, executionTimedOut);
            } finally {
                if (executionTimeoutId !== null) clearTimeout(executionTimeoutId);
                if (captureTimeoutId !== null) clearTimeout(captureTimeoutId);
            }

            if (result === 'completed' || result === 'capture-limit') {
                try {
                    await options.afterExecute?.({ programAst, result });
                    if (result === 'capture-limit') {
                        showInfoMessage(ERROR_MESSAGES.GIF_CAPTURE_LIMIT_SAVED, 0);
                    } else if (!options.suppressSuccess && !interpreter.wasBoundaryWarningShown()) {
                        showSuccessMessage(SUCCESS_MESSAGES.CODE_EXECUTED);
                    }
                } catch (error) {
                    result = session.stopReason || 'failed';
                    if (result === 'failed' && !options.onSessionError?.(error)) {
                        reportExecutionError(code, error);
                    }
                }
            }
        } catch (error) {
            result = session.stopReason || 'failed';
            if (result === 'failed' && !options.onSessionError?.(error)) {
                reportExecutionError(code, error, executionTimedOut);
            }
        } finally {
            if (executionTimeoutId !== null) clearTimeout(executionTimeoutId);
            if (captureTimeoutId !== null) clearTimeout(captureTimeoutId);
            try {
                await options.cleanup?.(result);
            } catch (error) {
                console.error('Unexpected execution-session cleanup error:', error);
            }
            activeSession = null;
            updateExecutionControls(false);
            updateCommandIndicator(null, -1);
        }

        return result;
    }

    function cancelActiveSession(reason = 'cancelled') {
        if (!activeSession) return false;
        activeSession.stopReason = reason;
        activeSession.cancel?.();
        interpreter.stopExecution();
        return true;
    }

    function runCode() {
        return executeSession(codeEditor.value);
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
        executeSession,
        cancelActiveSession,
        isSessionActive: () => activeSession !== null,
        updateExecutionControls,
        openStopConfirmDialog,
        closeStopConfirmDialog,
    };
}
