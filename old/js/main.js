// js/main.js
import { RavlykInterpreter } from './modules/ravlykInterpreter.js';
import {
    showError, showSuccessMessage, showInfoMessage,
    showHelpModal, hideHelpModal,
    showClearConfirmModal, hideClearConfirmModal,
    createRavlykSprite, updateRavlykVisualsOnScreen,
    updateCommandIndicator, resizeCanvas, setFooterYear
} from './modules/ui.js';
import {
    ERROR_MESSAGES, SUCCESS_MESSAGES, INFO_MESSAGES,
    MAX_CODE_LENGTH_CHARS, EXECUTION_TIMEOUT_MS,
    HELP_MODAL_CONTENT_ID, CLEAR_CONFIRM_MODAL_ID,
    DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND
} from './modules/constants.js';

document.addEventListener('DOMContentLoaded', () => {
    const codeEditor = document.getElementById("code-editor");
    const canvas = document.getElementById("ravlyk-canvas");
    const canvasContainer = document.querySelector(".canvas-box"); // Ravlyk sprite will be appended here

    const runBtn = document.getElementById("run-btn");
    const stopBtn = document.getElementById("stop-btn");
    const clearBtn = document.getElementById("clear-btn");
    const saveBtn = document.getElementById("save-btn");
    const helpBtn = document.getElementById("help-btn");

    const exampleBlocks = document.querySelectorAll(".example-block");
    const toManualBtnMain = document.getElementById("to-manual-btn");
    const toLessonsBtnMain = document.getElementById("to-lessons-btn");

    // Modal buttons
    const helpModalCloseBtn = document.getElementById("close-help-modal-btn");
    const helpModalToManualBtn = document.getElementById("to-manual-btn-modal");
    const clearConfirmBtn = document.getElementById("confirm-clear-btn");
    const clearCancelBtn = document.getElementById("cancel-clear-btn");

    if (!canvas || typeof canvas.getContext !== 'function') {
        showError(ERROR_MESSAGES.CANVAS_NOT_SUPPORTED, 0);
        return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); // willReadFrequently for getImageData
    if (!ctx) {
        showError(ERROR_MESSAGES.CANVAS_CONTEXT_ERROR, 0);
        return;
    }

    createRavlykSprite(canvasContainer);
    const interpreter = new RavlykInterpreter(ctx, canvas, updateRavlykVisualsOnScreen, updateCommandIndicator, showInfoMessage);
    
    // Make interpreter instance globally accessible for accessibility module if needed (alternative to event bus)
    window.ravlykInterpreterInstance = interpreter;


    function updateExecutionControls(isExecuting) {
        runBtn.disabled = isExecuting;
        stopBtn.disabled = !isExecuting;
        clearBtn.disabled = isExecuting;
        saveBtn.disabled = isExecuting;
        helpBtn.disabled = isExecuting;
        codeEditor.disabled = isExecuting;
        exampleBlocks.forEach(b => b.classList.toggle('disabled', isExecuting));
    }

    async function runCode() {
        const code = codeEditor.value;
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
        const executionPromise = interpreter.executeCommands(code);
        const timeoutPromise = new Promise((_, reject) => {
            executionTimeoutId = setTimeout(() => {
                interpreter.stopExecution(); // Request interpreter to stop
                // The error from stopExecution will be caught by the race
            }, EXECUTION_TIMEOUT_MS);
        });

        try {
            await Promise.race([executionPromise, timeoutPromise]);
            if (!interpreter.wasBoundaryWarningShown()) {
                showSuccessMessage(SUCCESS_MESSAGES.CODE_EXECUTED);
            }
        } catch (error) {
            if (error.name === "RavlykError") {
                 if (error.message === ERROR_MESSAGES.EXECUTION_STOPPED_BY_USER) {
                    showInfoMessage(INFO_MESSAGES.EXECUTION_STOPPED);
                } else {
                    showError(error.message, 0); // Show Ravlyk-specific errors persistently
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

    // --- Event Listeners ---
    if (runBtn) runBtn.addEventListener("click", runCode);
    if (stopBtn) stopBtn.addEventListener("click", () => {
        if (interpreter.isExecuting) {
            interpreter.stopExecution();
        }
    });
    if (clearBtn) clearBtn.addEventListener("click", () => {
        if (interpreter.isExecuting) return;
        showClearConfirmModal();
    });
    if (saveBtn) saveBtn.addEventListener('click', saveDrawing);
    if (helpBtn) helpBtn.addEventListener('click', showHelpModal);

    // Початково кнопка "Зупинити" вимкнена
    if (stopBtn) stopBtn.disabled = true;

    // Modal interactions
    if (helpModalCloseBtn) helpModalCloseBtn.addEventListener('click', hideHelpModal);
    if (helpModalToManualBtn) {
        helpModalToManualBtn.addEventListener('click', () => {
            window.open('manual.html', '_blank');
            hideHelpModal();
        });
    }
    if (clearConfirmBtn) clearConfirmBtn.addEventListener('click', () => {
        codeEditor.value = "";
        interpreter.reset();
        hideClearConfirmModal();
        showInfoMessage("Полотно та код очищено.");
    });
    if (clearCancelBtn) clearCancelBtn.addEventListener('click', hideClearConfirmModal);

    // Close modals on Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            // Якщо виконується код - зупиняємо його
            if (interpreter.isExecuting) {
                interpreter.stopExecution();
                return;
            }
            
            // Якщо відкрите модальне вікно - закриваємо його
            if (!document.getElementById('help-modal-overlay').classList.contains('hidden')) {
                hideHelpModal();
            }
            if (!document.getElementById('clear-confirm-modal-overlay').classList.contains('hidden')) {
                hideClearConfirmModal();
            }
        }
    });
    // Close modals on overlay click
    document.getElementById('help-modal-overlay')?.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) hideHelpModal();
    });
    document.getElementById('clear-confirm-modal-overlay')?.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) hideClearConfirmModal();
    });


    if (toManualBtnMain) toManualBtnMain.addEventListener('click', () => window.open('manual.html', '_blank'));
    if (toLessonsBtnMain) toLessonsBtnMain.addEventListener('click', () => window.open('lessons.html', '_blank'));

    exampleBlocks.forEach((block) => {
        block.addEventListener("click", () => {
            if (interpreter.isExecuting) return;
            const code = block.getAttribute("data-code");
            if (code) {
                codeEditor.value = code;
                runCode(); // Run example code immediately
            }
        });
        // Make examples keyboard accessible
        block.setAttribute('role', 'button');
        block.setAttribute('tabindex', '0');
        block.addEventListener('keydown', (e) => {
            if (interpreter.isExecuting) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                block.click();
            }
        });
    });

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
        }
    });

    // --- Initial Setup ---
    const initialResizeAndSetup = () => {
        resizeCanvas(canvas, ctx, () => {
            interpreter.applyContextSettings(); // Re-apply settings as resize might clear them
            interpreter.handleCanvasResize(); // Let interpreter know, e.g., to update ravlyk visual
        });
        interpreter.reset();
        updateExecutionControls(false);
        setFooterYear();
    };
    
    // Debounce resize a bit
    let resizeTimeout;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(initialResizeAndSetup, 150);
    });
    
    initialResizeAndSetup(); // Initial call

    // Placeholder logic for textarea
    const defaultPlaceholder = codeEditor.getAttribute('placeholder') || '';
    codeEditor.addEventListener('focus', () => codeEditor.setAttribute('placeholder', ''));
    codeEditor.addEventListener('blur', () => {
        if (!codeEditor.value) codeEditor.setAttribute('placeholder', defaultPlaceholder);
    });
});