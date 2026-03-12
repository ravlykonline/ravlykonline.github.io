// js/modules/ui.js
import { RAVLYK_SVG_DATA_URL, HELP_MODAL_CONTENT_ID, CLEAR_CONFIRM_MODAL_ID, CURRENT_YEAR } from './constants.js';

let messageTimeout;

function showMessage(message, type = 'info', duration = 3000) {
    clearTimeout(messageTimeout);
    const existingMessage = document.getElementById('global-message-display');
    if (existingMessage) existingMessage.remove();

    const messageDiv = document.createElement('div');
    messageDiv.id = 'global-message-display';
    messageDiv.className = `message-global message-${type}-global`; // e.g., message-error-global
    messageDiv.setAttribute('role', type === 'error' ? 'alert' : 'status');

    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-triangle';
    
    // Форматування повідомлення про зупинку для кращого відображення
    if (message.includes('Виконання зупинено')) {
        iconClass = 'fa-hand-paper'; // Іконка "зупинки"
    }

    messageDiv.innerHTML = `
        <span class="message-text-global"><i class="fas ${iconClass}"></i> ${message}</span>
        <button class="message-close-btn-global" aria-label="Закрити повідомлення"><i class="fas fa-times"></i></button>
    `;

    // Вставляємо повідомлення у body замість вставки в потік документа
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
     // Play sound for errors
    if (type === 'error') {
        try {
            // Short beep, replace with a less intrusive sound if needed
            const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
            audio.play().catch(() => {}); // Ignore play errors
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
function toggleModal(modalId, show) {
    const modalOverlay = document.getElementById(modalId);
    // Fix: get direct modalContent id which already contains -content suffix
    const modalContentId = modalId === 'help-modal-overlay' ? 'help-modal-content' : 
                         (modalId === 'clear-confirm-modal-overlay' ? 'clear-confirm-modal-content' : `${modalId}-content`);
    const modalContent = document.getElementById(modalContentId);
    
    console.log(`Toggle modal: ${modalId}, show: ${show}, content: ${modalContentId}`);
    
    if (modalOverlay) {
        if (show) {
            modalOverlay.classList.remove('hidden');
            modalOverlay.setAttribute('aria-hidden', 'false');
            // Focus first focusable element in modal or close button if content exists
            if (modalContent) {
                const focusable = modalContent.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusable) focusable.focus();
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
export function updateCommandIndicator(commandText, index) {
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
        commandIndicatorElement.textContent = `[${index + 1}] ${commandText}`;
        commandIndicatorElement.style.opacity = '1';
    } else {
        commandIndicatorElement.style.opacity = '0';
    }
}

// --- Canvas Resizing ---
export function resizeCanvas(canvas, ctx, onResizeCallback) {
    if (!canvas || !canvas.parentElement) return;

    const canvasBox = canvas.closest('.canvas-box') || canvas.parentElement; // Find closest canvas-box
    let prevImage = null;

    if (canvas.width > 0 && canvas.height > 0) {
        try {
            prevImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            console.warn("Could not save canvas state before resize:", e);
            prevImage = null;
        }
    }
    
    // Set canvas dimensions based on its container's client size
    // Ensure canvas-box has explicit or computed dimensions for this to work reliably
    canvas.width = canvasBox.clientWidth;
    const computedStyle = getComputedStyle(canvasBox);
    // canvas.height should not include padding of canvasBox, so use clientHeight or explicit value
    let boxHeight = parseFloat(computedStyle.height);
    if (computedStyle.boxSizing === 'border-box') {
        boxHeight -= (parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom) + parseFloat(computedStyle.borderTopWidth) + parseFloat(computedStyle.borderBottomWidth));
    }
    canvas.height = boxHeight > 0 ? boxHeight : 400; // Fallback height


    if (prevImage) {
        try {
            ctx.putImageData(prevImage, 0, 0);
        } catch (e) {
            console.warn("Could not restore canvas state after resize:", e);
        }
    }
    // Interpreter should re-apply its context settings after resize if they are reset
    if (onResizeCallback && typeof onResizeCallback === 'function') {
        onResizeCallback();
    }
}

export function setFooterYear() {
    const yearElements = document.querySelectorAll('.current-year');
    yearElements.forEach(el => el.textContent = CURRENT_YEAR);
}