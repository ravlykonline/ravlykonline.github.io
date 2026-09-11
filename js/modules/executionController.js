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
        runBtn, stopBtn, clearBtn, downloadBtn, shareBtn, gridBtn, helpBtn, exampleBlocks, stepBtn, stepStatus, continueBtn,
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

    function restoreStepFocus(session) {
        const doc = globalThis.document;
        if (doc && doc.activeElement === doc.body) session?.focusTarget?.focus?.({ preventScroll: true });
    }

    function updateStepControls(isExecuting = !!activeSession) {
        const control = activeSession?.stepControl;
        const waiting = !!control?.enabled && control.waiting && !interpreter.isPaused;
        if (stepBtn) stepBtn.disabled = isExecuting && !waiting;
        runBtn.disabled = isExecuting;
        runBtn.hidden = isExecuting;
        stopBtn.hidden = !isExecuting;
        if (continueBtn) {
            continueBtn.hidden = !control?.enabled;
            continueBtn.disabled = !waiting;
        }
    }

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
        updateStepControls(isExecuting);
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
            if (options.kind === 'step' && hasGameBlock(programAst)) {
                showInfoMessage('Для програми з «грати» скористайся кнопкою «Запустити». Режим «Крок» працює зі звичайними програмами.', 0);
                return 'failed';
            }
            options.validatePreparedProgram?.(programAst);
        } catch (error) {
            reportExecutionError(code, error);
            return 'failed';
        }

        const session = {
            focusTarget: options.kind === 'step' && stepBtn?.matches?.(':focus') ? stepBtn : null,
            stopReason: null,
            cancel: options.cancel || null,
            abortController: new globalThis.AbortController(),
        };
        activeSession = session;
        updateExecutionControls(true);
        if (globalThis.document?.activeElement === globalThis.document?.body && options.kind !== 'step') stopBtn.focus?.({ preventScroll: true });
        interpreter.reset();
        if (options.kind === 'step') {
            session.stepControl = {
                enabled: true, requested: true, waiting: false,
                onCommand(stmt) {
                    const line = stmt.span?.start?.line;
                    session.stepLine = line;
                    editorUi.setExecutionLine?.(line);
                    if (stepStatus) {
                        stepStatus.hidden = false;
                        stepStatus.textContent = `${line ? `Рядок ${line} · ` : ''}Виконується`;
                    }
                    updateStepControls();
                },
                onWaiting() {
                    if (stepStatus) stepStatus.textContent = `${session.stepLine ? `Рядок ${session.stepLine} · ` : ''}Команду виконано`;
                    updateStepControls();
                    restoreStepFocus(session);
                },
            };
            interpreter.stepControl = session.stepControl;
        }

        const accessibilitySettings = globalThis.window?.ravlykAccessibility
            ? globalThis.window.ravlykAccessibility.load()
            : {};
        interpreter.setAnimationEnabled(!accessibilitySettings['reduce-animations']);
        interpreter.setSpeed(DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND);

        let executionTimedOut = false;
        let executionTimeoutId = null;
        let captureTimeoutId = null;
        let stepTimeoutId = null;
        let result = 'failed';

        try {
            await options.beforeExecute?.(programAst);
            const timeoutExecution = () => {
                executionTimedOut = true;
                session.stopReason = 'failed';
                interpreter.stopExecution();
            };
            if (session.stepControl) {
                let elapsed = 0;
                let previous = Date.now();
                stepTimeoutId = setInterval(() => {
                    const current = Date.now();
                    if (!interpreter.isPaused && !session.stepControl.waiting) elapsed += current - previous;
                    previous = current;
                    if (elapsed >= EXECUTION_TIMEOUT_MS) timeoutExecution();
                }, 100);
            } else {
                executionTimeoutId = setTimeout(timeoutExecution, EXECUTION_TIMEOUT_MS);
            }
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
                if (stepTimeoutId !== null) clearInterval(stepTimeoutId);
                if (executionTimeoutId !== null) clearTimeout(executionTimeoutId);
                if (captureTimeoutId !== null) clearTimeout(captureTimeoutId);
            }

            if (result === 'completed' || result === 'capture-limit') {
                try {
                    await options.afterExecute?.({ programAst, result, signal: session.abortController.signal });
                    session.abortController.signal.throwIfAborted();
                    if (result === 'capture-limit') {
                        showInfoMessage(ERROR_MESSAGES.GIF_CAPTURE_LIMIT_SAVED, 0);
                    } else if (!options.suppressSuccess && !interpreter.wasBoundaryWarningShown()) {
                        showSuccessMessage(SUCCESS_MESSAGES.CODE_EXECUTED);
                    }
                } catch (error) {
                    // A capture limit ends recording, but does not make an encoder failure successful.
                    result = session.abortController.signal.aborted ? 'cancelled' : 'failed';
                    if (result === 'failed' && !options.onSessionError?.(error)) {
                        reportExecutionError(code, error);
                    }
                }
            }
        } catch (error) {
            result = session.abortController.signal.aborted ? 'cancelled' : 'failed';
            if (result === 'failed' && !options.onSessionError?.(error)) {
                reportExecutionError(code, error, executionTimedOut);
            }
        } finally {
            if (stepTimeoutId !== null) clearInterval(stepTimeoutId);
            if (executionTimeoutId !== null) clearTimeout(executionTimeoutId);
            if (captureTimeoutId !== null) clearTimeout(captureTimeoutId);
            try {
                await options.cleanup?.(result);
            } catch (error) {
                console.error('Unexpected execution-session cleanup error:', error);
            }
            activeSession = null;
            interpreter.stepControl = null;
            editorUi.setExecutionLine?.(null);
            if (stepStatus) stepStatus.hidden = true;
            updateExecutionControls(false);
            if (globalThis.document?.activeElement === globalThis.document?.body && !session.focusTarget) runBtn.focus?.({ preventScroll: true });
            restoreStepFocus(session);
            updateCommandIndicator(null, -1);
        }

        return result;
    }

    function cancelActiveSession(reason = 'cancelled') {
        if (!activeSession) return false;
        activeSession.stopReason = reason;
        if (reason === 'cancelled') activeSession.abortController.abort();
        activeSession.cancel?.();
        interpreter.stopExecution();
        return true;
    }

    function runCode() {
        const control = activeSession?.stepControl;
        if (control?.enabled && control.waiting && !interpreter.isPaused) {
            activeSession.focusTarget = continueBtn?.matches?.(':focus') ? runBtn : null;
            control.enabled = false;
            control.waiting = false;
            updateStepControls();
            return;
        }
        return executeSession(codeEditor.value);
    }

    function stepCode() {
        if (!activeSession) return executeSession(codeEditor.value, { kind: 'step' });
        const control = activeSession.stepControl;
        if (!control?.enabled || !control.waiting || interpreter.isPaused) return;
        activeSession.focusTarget = stepBtn?.matches?.(':focus') ? stepBtn : null;
        control.waiting = false;
        control.requested = true;
        updateStepControls();
    }

    function openStopConfirmDialog() {
        if (!interpreter.isExecuting) return;
        interpreter.pauseExecution();
        updateStepControls();
        showStopConfirmModal();
    }

    function closeStopConfirmDialog(shouldResumeExecution = true) {
        hideStopConfirmModal();
        if (shouldResumeExecution && interpreter.isExecuting && !interpreter.shouldStop) {
            interpreter.resumeExecution();
        }
        updateStepControls();
    }

    return {
        stepCode,
        runCode,
        executeSession,
        cancelActiveSession,
        isSessionActive: () => activeSession !== null,
        updateExecutionControls,
        openStopConfirmDialog,
        closeStopConfirmDialog,
    };
}
