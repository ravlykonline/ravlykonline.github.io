// js/modules/ui.js
import { RAVLYK_SVG_DATA_URL, CURRENT_YEAR } from './constants.js';

let messageTimeout;
let errorAudioContext = null;

function playErrorBeep() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!errorAudioContext) {
        errorAudioContext = new AudioCtx();
    }
    if (errorAudioContext.state === 'suspended') {
        errorAudioContext.resume().catch(() => {});
    }

    const now = errorAudioContext.currentTime;
    const oscillator = errorAudioContext.createOscillator();
    const gain = errorAudioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(720, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    oscillator.connect(gain);
    gain.connect(errorAudioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.16);
}

function showMessage(message, type = 'info', duration = 3000) {
    clearTimeout(messageTimeout);
    const existingMessage = document.getElementById('global-message-display');
    if (existingMessage) existingMessage.remove();

    const messageDiv = document.createElement('div');
    messageDiv.id = 'global-message-display';
    messageDiv.className = `message-global message-${type}-global`; // e.g., message-error-global
    messageDiv.setAttribute('role', type === 'error' ? 'alert' : 'status');
    messageDiv.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    messageDiv.setAttribute('aria-atomic', 'true');

    let iconClass = 'fa-info-circle';
    let titleText = 'Інфо';
    if (type === 'success') {
        iconClass = 'fa-check-circle';
        titleText = 'Успіх';
    }
    if (type === 'error') {
        iconClass = 'fa-exclamation-triangle';
        titleText = 'Помилка';
    }

    // Keep stop-state message visually grouped with info messages.
    if (message.includes('Виконання зупинено')) {
        iconClass = 'fa-hand-paper';
        titleText = 'Інфо';
    }

    messageDiv.innerHTML = `
        <span class="message-text-global">
            <i class="fas ${iconClass} message-icon-global" aria-hidden="true"></i>
            <span class="message-content-global">
                <strong class="message-title-global">${titleText}</strong>
                <span class="message-main-global">${message}</span>
            </span>
        </span>
        <button class="message-close-btn-global" aria-label="Закрити повідомлення"><i class="fas fa-times"></i></button>
    `;

    document.body.appendChild(messageDiv);

    const closeBtn = messageDiv.querySelector('.message-close-btn-global');
    const removeMessage = () => {
        messageDiv.remove();
        clearTimeout(messageTimeout);
    };
    closeBtn.addEventListener('click', removeMessage, { once: true });

    if (duration > 0) {
        messageTimeout = setTimeout(removeMessage, duration);
    }
    if (type === 'error') {
        try {
            playErrorBeep();
        } catch (e) { /* ignore */ }
    }
}

export function showError(message, duration = 0) { // Errors persist by default
    showMessage(message, 'error', duration);
}
export function showSuccessMessage(message, duration = 3000) {
    showMessage(message, 'success', duration);
}
export function showInfoMessage(message, duration = 3000) {
    showMessage(message, 'info', duration);
}
export function hideMessage() {
    const existingMessage = document.getElementById('global-message-display');
    if (existingMessage) existingMessage.remove();
    clearTimeout(messageTimeout);
}


// --- Modal Management ---
function modalOverlayIdToContentId(modalId) {
    return modalId.endsWith('-overlay')
        ? `${modalId.slice(0, -'-overlay'.length)}-content`
        : `${modalId}-content`;
}

function toggleModal(modalId, show) {
    const modalOverlay = document.getElementById(modalId);
    const modalContentId = modalOverlayIdToContentId(modalId);
    const modalContent = document.getElementById(modalContentId);
    
    if (modalOverlay) {
        if (show) {
            modalOverlay.classList.remove('hidden');
            modalOverlay.setAttribute('aria-hidden', 'false');
            // Focus first focusable element in modal or close button if content exists
            if (modalContent) {
                const focusable = modalContent.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusable) focusable.focus();
            } else {
                console.warn(`Modal content with id ${modalContentId} not found for overlay ${modalId}`);
            }
        } else {
            modalOverlay.classList.add('hidden');
            modalOverlay.setAttribute('aria-hidden', 'true');
        }
    } else {
        console.error(`Modal overlay with id ${modalId} not found!`);
    }
}

export function showHelpModal() {
    toggleModal('help-modal-overlay', true);
}
export function hideHelpModal() {
    toggleModal('help-modal-overlay', false);
    document.getElementById('help-btn')?.focus(); // Return focus
}

export function showClearConfirmModal() {
    toggleModal('clear-confirm-modal-overlay', true);
}
export function hideClearConfirmModal() {
    toggleModal('clear-confirm-modal-overlay', false);
    document.getElementById('clear-btn')?.focus(); // Return focus
}

export function showStopConfirmModal() {
    toggleModal('stop-confirm-modal-overlay', true);
}
export function hideStopConfirmModal() {
    toggleModal('stop-confirm-modal-overlay', false);
    document.getElementById('stop-btn')?.focus(); // Return focus
}


// --- Ravlyk Sprite Management ---
let ravlykSpriteElement = null;

export function createRavlykSprite(canvasContainer) {
    if (ravlykSpriteElement) ravlykSpriteElement.remove();

    ravlykSpriteElement = document.createElement("div");
    ravlykSpriteElement.id = "ravlyk-sprite";
    ravlykSpriteElement.className = "ravlyk-sprite-global"; // Defined in main-editor.css
    ravlykSpriteElement.setAttribute('aria-hidden', 'true');
    ravlykSpriteElement.style.backgroundImage = `url('${RAVLYK_SVG_DATA_URL}')`;
    
    // Append to canvas container for easier relative positioning
    const container = canvasContainer || document.querySelector('.canvas-box');
    if (container) {
        container.appendChild(ravlykSpriteElement);
    } else {
        document.body.appendChild(ravlykSpriteElement); // Fallback
    }
    return ravlykSpriteElement;
}

export function updateRavlykVisualsOnScreen(ravlykState, canvasElement) {
    if (!ravlykSpriteElement || !ravlykState || !canvasElement) return;

    const ravlykSize = 30;

    const angleRad = (ravlykState.angle - 90) * Math.PI / 180;
    const offsetX = 0;
    const offsetY = -ravlykSize * 50 / 100;
    const dx = offsetX * Math.cos(angleRad) - offsetY * Math.sin(angleRad);
    const dy = offsetX * Math.sin(angleRad) + offsetY * Math.cos(angleRad);
    const canvasRect = canvasElement.getBoundingClientRect();
    const containerRect = ravlykSpriteElement.parentElement.getBoundingClientRect();
    const offsetDomX = canvasRect.left - containerRect.left;
    const offsetDomY = canvasRect.top - containerRect.top;

    const newLeft = ravlykState.x + dx - ravlykSize / 2 + offsetDomX;
    const newTop = ravlykState.y + dy - ravlykSize / 2 + offsetDomY;
    
    ravlykSpriteElement.style.left = `${newLeft}px`;
    ravlykSpriteElement.style.top = `${newTop}px`;

    // Завжди будуємо повний рядок transform в одному місці
    const rotation = `rotate(${ravlykState.angle + 90}deg)`;
    const scale = `scale(${ravlykState.scale})`; // Використовуємо scale зі стану
    ravlykSpriteElement.style.transform = `${rotation} ${scale}`;
    
    // Керуємо тінню через клас
    ravlykSpriteElement.classList.toggle('lifted', !ravlykState.isPenDown);
}

// --- Command Indicator ---
let commandIndicatorElement = null;
export function updateCommandIndicator(commandText, index, totalCommands = null) {
    if (!commandIndicatorElement) {
        commandIndicatorElement = document.createElement('div');
        commandIndicatorElement.id = 'ravlyk-command-indicator';
        // Basic styling (better in CSS)
        commandIndicatorElement.style.position = 'absolute';
        commandIndicatorElement.style.bottom = '5px';
        commandIndicatorElement.style.left = '5px';
        commandIndicatorElement.style.backgroundColor = 'rgba(74, 111, 165, 0.8)'; // --main-purple with alpha
        commandIndicatorElement.style.color = 'white';
        commandIndicatorElement.style.padding = '3px 8px';
        commandIndicatorElement.style.borderRadius = '4px';
        commandIndicatorElement.style.fontSize = '0.8em';
        commandIndicatorElement.style.zIndex = '1050'; // Above canvas, below modals
        commandIndicatorElement.style.fontFamily = "'Fira Mono', monospace";
        commandIndicatorElement.style.transition = 'opacity 0.3s';
        commandIndicatorElement.style.opacity = '0';

        const canvasBox = document.querySelector('.canvas-box');
        if (canvasBox) canvasBox.appendChild(commandIndicatorElement);
    }

    if (commandText && index >= 0) {
        const hasTotal = Number.isInteger(totalCommands) && totalCommands > 0;
        const prefix = hasTotal ? `[${index + 1}/${totalCommands}]` : `[${index + 1}]`;
        commandIndicatorElement.textContent = `${prefix} ${commandText}`;
        commandIndicatorElement.style.opacity = '1';
    } else {
        commandIndicatorElement.style.opacity = '0';
    }
}

// --- Canvas Resizing ---
export function resizeCanvas(canvas, ctx, onResizeCallback) {
    if (!canvas || !canvas.parentElement) return;
    if (typeof canvas.getClientRects === 'function' && canvas.getClientRects().length === 0) {
        // Do not resize hidden canvas (e.g. inactive mobile tab), otherwise it may collapse to 1x1.
        return;
    }

    const canvasBox = canvas.closest('.canvas-box') || canvas.parentElement; // Find closest canvas-box
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    let prevCanvas = null;

    if (oldWidth > 0 && oldHeight > 0) {
        try {
            prevCanvas = document.createElement('canvas');
            prevCanvas.width = oldWidth;
            prevCanvas.height = oldHeight;
            const prevCtx = prevCanvas.getContext('2d');
            if (prevCtx) {
                prevCtx.drawImage(canvas, 0, 0);
            } else {
                prevCanvas = null;
            }
        } catch (e) {
            console.warn("Could not save canvas state before resize:", e);
            prevCanvas = null;
        }
    }
    
    // Use the rendered canvas viewport dimensions (not the whole canvas-box with header),
    // otherwise bottom boundary math can drift outside the visible area.
    const renderedWidth = Math.round(canvas.clientWidth || canvasBox.clientWidth || 0);
    let renderedHeight = Math.round(canvas.clientHeight || 0);

    if (renderedHeight <= 0) {
        const boxHeight = Math.round(canvasBox.clientHeight || 0);
        const header = canvasBox.querySelector('.area-header');
        const headerHeight = header ? Math.round(header.getBoundingClientRect().height) : 0;
        renderedHeight = Math.max(1, boxHeight - headerHeight);
    }

    canvas.width = Math.max(1, renderedWidth);
    canvas.height = Math.max(1, renderedHeight);

    const deltaX = (canvas.width - oldWidth) / 2;
    const deltaY = (canvas.height - oldHeight) / 2;

    if (prevCanvas) {
        try {
            ctx.drawImage(prevCanvas, deltaX, deltaY);
        } catch (e) {
            console.warn("Could not restore canvas state after resize:", e);
        }
    }
    // Interpreter should re-apply its context settings after resize if they are reset
    if (onResizeCallback && typeof onResizeCallback === 'function') {
        onResizeCallback({ deltaX, deltaY, oldWidth, oldHeight, newWidth: canvas.width, newHeight: canvas.height });
    }
}

export function setFooterYear() {
    const yearElements = document.querySelectorAll('.current-year');
    yearElements.forEach(el => el.textContent = CURRENT_YEAR);
}
