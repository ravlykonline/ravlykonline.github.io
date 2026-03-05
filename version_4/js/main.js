// js/main.js
import { RavlykInterpreter } from './modules/ravlykInterpreter.js';
import {
    showError, showSuccessMessage, showInfoMessage,
    showHelpModal, hideHelpModal,
    showClearConfirmModal, hideClearConfirmModal,
    showStopConfirmModal, hideStopConfirmModal,
    createRavlykSprite, updateRavlykVisualsOnScreen,
    updateCommandIndicator, resizeCanvas, setFooterYear
} from './modules/ui.js';
import {
    ERROR_MESSAGES, SUCCESS_MESSAGES, INFO_MESSAGES,
    MAX_CODE_LENGTH_CHARS, EXECUTION_TIMEOUT_MS,
    DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND
} from './modules/constants.js';

document.addEventListener('DOMContentLoaded', () => {
    const codeEditor = document.getElementById("code-editor");
    const codeLineNumbers = document.getElementById("code-line-numbers");
    const codeActiveLine = document.getElementById("code-active-line");
    const codeErrorLine = document.getElementById("code-error-line");
    const canvas = document.getElementById("ravlyk-canvas");
    const canvasContainer = document.querySelector(".canvas-box"); // Ravlyk sprite will be appended here

    const runBtn = document.getElementById("run-btn");
    const stopBtn = document.getElementById("stop-btn");
    const clearBtn = document.getElementById("clear-btn");
    const saveBtn = document.getElementById("save-btn");
    const helpBtn = document.getElementById("help-btn");

    const exampleBlocks = document.querySelectorAll(".example-block");
    const exampleBlocksContainer = document.querySelector(".example-blocks");
    const examplesPrevBtn = document.getElementById("examples-prev-btn");
    const examplesNextBtn = document.getElementById("examples-next-btn");
    const toManualBtnMain = document.getElementById("to-manual-btn");
    const toLessonsBtnMain = document.getElementById("to-lessons-btn");

    // Modal buttons
    const helpModalCloseBtn = document.getElementById("close-help-modal-btn");
    const helpModalToManualBtn = document.getElementById("to-manual-btn-modal");
    const clearConfirmBtn = document.getElementById("confirm-clear-btn");
    const clearCancelBtn = document.getElementById("cancel-clear-btn");
    const stopConfirmBtn = document.getElementById("confirm-stop-btn");
    const stopCancelBtn = document.getElementById("cancel-stop-btn");
    const helpModalOverlay = document.getElementById('help-modal-overlay');
    const clearConfirmModalOverlay = document.getElementById('clear-confirm-modal-overlay');
    const stopConfirmModalOverlay = document.getElementById('stop-confirm-modal-overlay');

    if (!canvas || typeof canvas.getContext !== 'function') {
        showError(ERROR_MESSAGES.CANVAS_NOT_SUPPORTED, 0);
        return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); // willReadFrequently for getImageData
    if (!ctx) {
        showError(ERROR_MESSAGES.CANVAS_CONTEXT_ERROR, 0);
        return;
    }
    let editorErrorLine = null;
    let scheduleResize = () => {};
    let activeExampleIndex = 0;

    function updateExampleNavState() {
        if (!exampleBlocks.length) return;
        if (activeExampleIndex < 0) activeExampleIndex = 0;
        if (activeExampleIndex > exampleBlocks.length - 1) activeExampleIndex = exampleBlocks.length - 1;

        if (examplesPrevBtn) examplesPrevBtn.disabled = activeExampleIndex === 0;
        if (examplesNextBtn) examplesNextBtn.disabled = activeExampleIndex >= exampleBlocks.length - 1;
    }

    function focusExampleByIndex(index) {
        if (!exampleBlocks.length) return;
        const boundedIndex = Math.max(0, Math.min(index, exampleBlocks.length - 1));
        activeExampleIndex = boundedIndex;
        const block = exampleBlocks[boundedIndex];
        block.focus();
        if (exampleBlocksContainer) {
            block.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
        }
        updateExampleNavState();
    }

    function moveExampleFocus(step) {
        if (!exampleBlocks.length) return;
        focusExampleByIndex(activeExampleIndex + step);
    }

    if (window.ravlykInterpreterInstance && typeof window.ravlykInterpreterInstance.destroy === 'function') {
        window.ravlykInterpreterInstance.destroy();
    }

    createRavlykSprite(canvasContainer);
    const interpreter = new RavlykInterpreter(ctx, canvas, updateRavlykVisualsOnScreen, updateCommandIndicator, showInfoMessage);
    
    // Make interpreter instance globally accessible for accessibility module if needed (alternative to event bus)
    window.ravlykInterpreterInstance = interpreter;
    window.addEventListener('beforeunload', () => {
        if (window.ravlykInterpreterInstance && typeof window.ravlykInterpreterInstance.destroy === 'function') {
            window.ravlykInterpreterInstance.destroy();
        }
    }, { once: true });


    function updateExecutionControls(isExecuting) {
        runBtn.disabled = isExecuting;
        stopBtn.disabled = !isExecuting;
        clearBtn.disabled = isExecuting;
        saveBtn.disabled = isExecuting;
        helpBtn.disabled = isExecuting;
        codeEditor.disabled = isExecuting;
        exampleBlocks.forEach(b => b.classList.toggle('disabled', isExecuting));
    }

    function detectErrorLine(code, message) {
        if (!code || !message) return null;
        const lines = code.split(/\r?\n/);
        if (!lines.length) return null;

        const candidates = [];
        const quotedMatches = [...message.matchAll(/"([^"]+)"/g)];
        quotedMatches.forEach((m) => {
            if (m[1] && m[1].trim()) candidates.push(m[1].trim());
        });

        const colonMatch = message.match(/:\s*([^\s"].+)$/);
        if (colonMatch && colonMatch[1]) candidates.push(colonMatch[1].trim());

        if (message.toLowerCase().includes("повторити")) candidates.push("повторити");
        if (message.toLowerCase().includes("створити")) candidates.push("створити");
        if (message.toLowerCase().includes("колір")) candidates.push("колір");
        if (message.toLowerCase().includes("перейти")) candidates.push("перейти");

        const uniqueCandidates = [...new Set(candidates.map((c) => c.toLowerCase()))];

        for (const candidate of uniqueCandidates) {
            const lineIndex = lines.findIndex((line) => line.toLowerCase().includes(candidate));
            if (lineIndex >= 0) return lineIndex + 1;
        }

        return null;
    }

    function getErrorLocation(code, error) {
        if (!error) return { line: null, column: null };
        if (typeof error.line === "number" && error.line > 0) {
            return {
                line: error.line,
                column: (typeof error.column === "number" && error.column > 0) ? error.column : null,
            };
        }
        return { line: detectErrorLine(code, error.message), column: null };
    }

    function formatErrorWithLine(message, line, column) {
        if (!message || !line) return message;
        if (/\(рядок\s+\d+(?:,\s*позиція\s+\d+)?\)\s*$/i.test(message)) return message;
        if (column) return `${message} (рядок ${line}, позиція ${column})`;
        return `${message} (рядок ${line})`;
    }

    function toFriendlyErrorMessage(message) {
        if (!message) return "\u041e\u0439, \u0449\u043e\u0441\u044c \u043f\u0456\u0448\u043b\u043e \u043d\u0435 \u0442\u0430\u043a. \u0421\u043f\u0440\u043e\u0431\u0443\u0439 \u0449\u0435 \u0440\u0430\u0437.";
        const lineMatch = message.match(/рядок\s+(\d+)/i);
        if (lineMatch) {
            return `\u041e\u0439, \u0442\u0443\u0442 \u0454 \u043f\u043e\u043c\u0438\u043b\u043a\u0430: ${message} \u041f\u0435\u0440\u0435\u0432\u0456\u0440 \u043e\u0441\u043e\u0431\u043b\u0438\u0432\u043e \u0443\u0432\u0430\u0436\u043d\u043e \u0440\u044f\u0434\u043e\u043a ${lineMatch[1]}.`;
        }
        return `\u041e\u0439, \u0442\u0443\u0442 \u0454 \u043f\u043e\u043c\u0438\u043b\u043a\u0430: ${message}`;
    }

    function getCurrentEditorLine() {
        const cursor = codeEditor.selectionStart || 0;
        const beforeCursor = codeEditor.value.slice(0, cursor);
        return beforeCursor.split(/\n/).length;
    }

    function buildLineNumbersText(totalLines) {
        let lines = "";
        for (let i = 1; i <= totalLines; i++) {
            lines += `${i}\n`;
        }
        return lines.trimEnd();
    }

    function setEditorErrorLine(line) {
        editorErrorLine = Number.isInteger(line) && line > 0 ? line : null;
        updateEditorDecorations();
    }

    function focusEditorLine(line) {
        if (!Number.isInteger(line) || line < 1) return;
        const lines = (codeEditor.value || "").split(/\n/);
        const safeLine = Math.min(line, Math.max(1, lines.length));
        let start = 0;
        for (let i = 1; i < safeLine; i++) {
            start += lines[i - 1].length + 1;
        }
        codeEditor.focus();
        codeEditor.setSelectionRange(start, start);
    }

    function updateEditorDecorations() {
        if (!codeEditor || !codeLineNumbers || !codeActiveLine) return;

        const value = codeEditor.value || "";
        const totalLines = value ? value.split(/\n/).length : 1;
        codeLineNumbers.textContent = buildLineNumbersText(totalLines);
        codeLineNumbers.scrollTop = codeEditor.scrollTop;

        const styles = getComputedStyle(codeEditor);
        const lineHeight = parseFloat(styles.lineHeight) || 24;
        const paddingTop = parseFloat(styles.paddingTop) || 0;
        const currentLine = Math.max(1, getCurrentEditorLine());
        const top = paddingTop + (currentLine - 1) * lineHeight - codeEditor.scrollTop;

        codeActiveLine.style.height = `${lineHeight}px`;
        codeActiveLine.style.top = `${Math.max(0, top)}px`;

        if (codeErrorLine) {
            if (editorErrorLine && editorErrorLine <= totalLines) {
                const errorTop = paddingTop + (editorErrorLine - 1) * lineHeight - codeEditor.scrollTop;
                codeErrorLine.classList.remove('hidden');
                codeErrorLine.style.height = `${lineHeight}px`;
                codeErrorLine.style.top = `${Math.max(0, errorTop)}px`;
            } else {
                codeErrorLine.classList.add('hidden');
            }
        }
    }

    async function runCode() {
        const code = codeEditor.value;
        setEditorErrorLine(null);
        if (code.length > MAX_CODE_LENGTH_CHARS) {
            showError(ERROR_MESSAGES.CODE_TOO_LONG);
            return;
        }

        // Перевіряємо, чи вже виконується код
        if (interpreter.isExecuting) {
            interpreter.stopExecution();
            // Чекаємо трохи, щоб інтерпретатор завершив поточну операцію
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        updateExecutionControls(true);
        interpreter.reset(); // Resets Ravlyk state and clears canvas

        // Animation speed can be configured here based on accessibility settings
        const accessibilitySettings = window.ravlykAccessibility ? window.ravlykAccessibility.load() : {};
        interpreter.setAnimationEnabled(!accessibilitySettings['reduce-animations']);
        interpreter.setSpeed(DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND);


        let executionTimeoutId;
        let executionTimedOut = false;
        executionTimeoutId = setTimeout(() => {
            executionTimedOut = true;
            interpreter.stopExecution(); // Request interpreter to stop on timeout
        }, EXECUTION_TIMEOUT_MS);

        try {
            await interpreter.executeCommands(code);
            if (!executionTimedOut && !interpreter.wasBoundaryWarningShown()) {
                showSuccessMessage(SUCCESS_MESSAGES.CODE_EXECUTED);
            }
        } catch (error) {
            if (error.name === "RavlykError") {
                if (executionTimedOut) {
                    showError(ERROR_MESSAGES.EXECUTION_TIMEOUT, 0);
                } else if (error.message === ERROR_MESSAGES.EXECUTION_STOPPED_BY_USER) {
                    showInfoMessage(INFO_MESSAGES.EXECUTION_STOPPED);
                } else {
                    const { line, column } = getErrorLocation(code, error);
                    const lineAwareMessage = formatErrorWithLine(error.message, line, column);
                    showError(toFriendlyErrorMessage(lineAwareMessage), 0); // Show parser/runtime errors persistently
                    if (line) {
                        setEditorErrorLine(line);
                        focusEditorLine(line);
                    }
                }
            } else { // Other unexpected errors
                showError(`Неочікувана помилка: ${error.message}`, 0);
                console.error("Unexpected error during execution:", error);
            }
            interpreter.reset(); // Ensure canvas is clean on error
        } finally {
            clearTimeout(executionTimeoutId);
            updateExecutionControls(false);
            updateCommandIndicator(null, -1); // Hide command indicator
        }
    }

    function saveDrawing() {
        try {
            // Create a temporary canvas to draw background + current canvas content
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');

            // Get canvas background color (assuming it's from .canvas-box or body)
            const canvasBgColor = getComputedStyle(canvas).backgroundColor || 
                                  getComputedStyle(canvas.parentElement).backgroundColor || 
                                  'white';
            tempCtx.fillStyle = canvasBgColor;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0); // Draw current canvas content on top

            const link = document.createElement('a');
            link.download = `ravlyk-малюнок-${Date.now()}.png`;
            link.href = tempCanvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showSuccessMessage(SUCCESS_MESSAGES.IMAGE_SAVED);
        } catch (error) {
            if (error.name === 'SecurityError' && error.message.includes('tainted')) {
                showError(ERROR_MESSAGES.SAVE_IMAGE_SECURITY_ERROR, 0);
            } else {
                showError(ERROR_MESSAGES.SAVE_IMAGE_ERROR(error.message), 0);
            }
        }
    }

    function decodeCodeFromUrlHash(encodedValue) {
        const normalized = String(encodedValue || '')
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
    }

    function loadCodeFromUrlHash() {
        const hashRaw = String(window.location.hash || '');
        if (!hashRaw.startsWith('#')) return;
        const hashValue = hashRaw.slice(1);
        if (!hashValue) return;

        const hashParams = new URLSearchParams(hashValue);
        const encodedCode = hashParams.get('code');
        if (!encodedCode) return;

        try {
            const decodedCode = decodeCodeFromUrlHash(encodedCode);
            if (decodedCode.length > MAX_CODE_LENGTH_CHARS) {
                showError(ERROR_MESSAGES.CODE_TOO_LONG, 0);
                return;
            }
            codeEditor.value = decodedCode;
            setEditorErrorLine(null);
            updateEditorDecorations();
            showInfoMessage('Код завантажено з посилання.');
        } catch (error) {
            showError('Посилання з кодом пошкоджене або неповне.', 0);
        }
    }

    function shouldPrefetchSecondaryPages() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection) return true;
        if (connection.saveData) return false;
        const effectiveType = String(connection.effectiveType || '').toLowerCase();
        if (effectiveType === 'slow-2g' || effectiveType === '2g') return false;
        return true;
    }

    function prefetchDocument(url) {
        if (!url) return;
        if (document.head.querySelector(`link[rel="prefetch"][href="${url}"]`)) return;
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = 'document';
        document.head.appendChild(link);
    }

    function scheduleSecondaryPagesPrefetch() {
        if (!shouldPrefetchSecondaryPages()) return;
        if (document.visibilityState === 'hidden') return;

        const prefetchTargets = ['manual.html', 'lessons.html', 'quiz.html', 'resources.html'];
        const startPrefetch = () => prefetchTargets.forEach(prefetchDocument);

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(startPrefetch, { timeout: 2500 });
            return;
        }
        window.setTimeout(startPrefetch, 1200);
    }

    function navigateToInternalPage(url) {
        if (!url) return;
        window.location.assign(url);
    }

    // --- Event Listeners ---
    if (runBtn) runBtn.addEventListener("click", runCode);
    if (clearBtn) clearBtn.addEventListener("click", () => {
        if (interpreter.isExecuting) return;
        showClearConfirmModal();
    });
    if (saveBtn) saveBtn.addEventListener('click', saveDrawing);
    if (helpBtn) helpBtn.addEventListener('click', showHelpModal);

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

    function isOverlayOpen(overlayElement) {
        return Boolean(overlayElement && !overlayElement.classList.contains('hidden'));
    }

    function bindOverlayDismiss(overlayElement, onDismiss) {
        overlayElement?.addEventListener('click', (event) => {
            if (event.target === event.currentTarget) onDismiss();
        });
    }

    if (stopBtn) stopBtn.addEventListener("click", () => {
        openStopConfirmDialog();
    });

    // Початково кнопка "Зупинити" вимкнена
    if (stopBtn) stopBtn.disabled = true;

    // Modal interactions
    if (helpModalCloseBtn) helpModalCloseBtn.addEventListener('click', hideHelpModal);
    if (helpModalToManualBtn) {
        helpModalToManualBtn.addEventListener('click', () => {
            navigateToInternalPage('manual.html');
            hideHelpModal();
        });
    }
    if (clearConfirmBtn) clearConfirmBtn.addEventListener('click', () => {
        codeEditor.value = "";
        updateEditorDecorations();
        interpreter.reset();
        hideClearConfirmModal();
        showInfoMessage("Полотно та код очищено.");
    });
    if (clearCancelBtn) clearCancelBtn.addEventListener('click', hideClearConfirmModal);
    if (stopConfirmBtn) stopConfirmBtn.addEventListener('click', () => {
        if (interpreter.isExecuting) {
            interpreter.stopExecution();
        }
        closeStopConfirmDialog(false);
    });
    if (stopCancelBtn) stopCancelBtn.addEventListener('click', () => closeStopConfirmDialog(true));

    // Close modals on Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const stopModalOpen = isOverlayOpen(stopConfirmModalOverlay);
            if (stopModalOpen) {
                closeStopConfirmDialog(true);
                return;
            }

            // Якщо виконується код - просимо підтвердження зупинки
            if (interpreter.isExecuting) {
                openStopConfirmDialog();
                return;
            }
            
            // Якщо відкрите модальне вікно - закриваємо його
            if (isOverlayOpen(helpModalOverlay)) {
                hideHelpModal();
            }
            if (isOverlayOpen(clearConfirmModalOverlay)) {
                hideClearConfirmModal();
            }
        }
    });
    // Close modals on overlay click
    bindOverlayDismiss(helpModalOverlay, hideHelpModal);
    bindOverlayDismiss(clearConfirmModalOverlay, hideClearConfirmModal);
    bindOverlayDismiss(stopConfirmModalOverlay, () => closeStopConfirmDialog(true));


    if (toManualBtnMain) toManualBtnMain.addEventListener('click', () => navigateToInternalPage('manual.html'));
    if (toLessonsBtnMain) toLessonsBtnMain.addEventListener('click', () => navigateToInternalPage('lessons.html'));

    exampleBlocks.forEach((block) => {
        block.addEventListener("click", () => {
            if (interpreter.isExecuting) return;
            const code = block.getAttribute("data-code");
            if (code) {
                codeEditor.value = code;
                updateEditorDecorations();
                runCode(); // Run example code immediately
            }
        });
        block.addEventListener('focus', () => {
            activeExampleIndex = Array.from(exampleBlocks).indexOf(block);
            updateExampleNavState();
        });
        // Make examples keyboard accessible
        block.setAttribute('role', 'button');
        block.setAttribute('tabindex', '0');
        block.addEventListener('keydown', (e) => {
            if (interpreter.isExecuting) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                block.click();
                return;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                moveExampleFocus(-1);
                return;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                moveExampleFocus(1);
            }
        });
    });

    if (examplesPrevBtn) {
        examplesPrevBtn.addEventListener('click', () => moveExampleFocus(-1));
    }
    if (examplesNextBtn) {
        examplesNextBtn.addEventListener('click', () => moveExampleFocus(1));
    }
    updateExampleNavState();

    codeEditor.addEventListener("keydown", function(e) {
        if (interpreter.isExecuting && e.key !== "Escape") { // Allow Escape to try to stop
            e.preventDefault();
            return;
        }
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey || e.shiftKey)) { // Ctrl+Enter, Cmd+Enter, Shift+Enter
            e.preventDefault();
            runCode();
        }
        // Basic Tab indentation (2 spaces)
        if (e.key === "Tab") {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 2;
            updateEditorDecorations();
        }
    });

    codeEditor.addEventListener("input", () => {
        if (editorErrorLine !== null) setEditorErrorLine(null);
        updateEditorDecorations();
    });
    codeEditor.addEventListener("scroll", updateEditorDecorations);
    codeEditor.addEventListener("click", updateEditorDecorations);
    codeEditor.addEventListener("keyup", updateEditorDecorations);
    codeEditor.addEventListener("focus", updateEditorDecorations);

    // --- Initial Setup & Resize ---
    const handleCanvasResize = () => {
        resizeCanvas(canvas, ctx, (resizeMeta) => {
            interpreter.applyContextSettings(); // Re-apply settings as resize might clear them
            interpreter.handleCanvasResize(resizeMeta); // Keep state aligned with moved canvas center
        });
    };

    const initialSetup = () => {
        handleCanvasResize();
        interpreter.reset();
        updateExecutionControls(false);
        updateEditorDecorations();
        setFooterYear();
    };
    
    // Observe container size changes (flex/layout changes + viewport resize).
    let resizeTimeout;
    scheduleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleCanvasResize, 100);
    };

    if (typeof ResizeObserver === 'function' && canvasContainer) {
        const resizeObserver = new ResizeObserver(() => scheduleResize());
        resizeObserver.observe(canvasContainer);
    } else {
        window.addEventListener("resize", scheduleResize);
    }
    
    initialSetup(); // Initial call
    loadCodeFromUrlHash();
    scheduleSecondaryPagesPrefetch();

    // Placeholder logic for textarea
    const defaultPlaceholder = codeEditor.getAttribute('placeholder') || '';
    codeEditor.addEventListener('focus', () => codeEditor.setAttribute('placeholder', ''));
    codeEditor.addEventListener('blur', () => {
        if (!codeEditor.value) codeEditor.setAttribute('placeholder', defaultPlaceholder);
    });
});

