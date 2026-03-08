let messageTimeout;
let errorAudioContext = null;

function appendMessageContent(messageDiv, iconClass, message) {
    const textSpan = document.createElement('span');
    textSpan.className = 'message-text-global';

    const icon = document.createElement('i');
    icon.className = `fas ${iconClass}`;
    textSpan.appendChild(icon);
    textSpan.appendChild(document.createTextNode(` ${message}`));

    const closeBtn = document.createElement('button');
    closeBtn.className = 'message-close-btn-global';
    closeBtn.setAttribute('aria-label', 'Закрити повідомлення');

    const closeIcon = document.createElement('i');
    closeIcon.className = 'fas fa-times';
    closeBtn.appendChild(closeIcon);

    messageDiv.appendChild(textSpan);
    messageDiv.appendChild(closeBtn);

    return closeBtn;
}

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
    messageDiv.className = `message-global message-${type}-global`;
    messageDiv.setAttribute('role', type === 'error' ? 'alert' : 'status');

    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-triangle';
    if (message.includes('Виконання зупинено')) {
        iconClass = 'fa-hand-paper';
    }

    appendMessageContent(messageDiv, iconClass, message);
    document.body.appendChild(messageDiv);

    const closeBtn = messageDiv.querySelector('.message-close-btn-global');
    const removeMessage = () => {
        messageDiv.remove();
        clearTimeout(messageTimeout);
    };
    closeBtn?.addEventListener('click', removeMessage, { once: true });

    if (duration > 0) {
        messageTimeout = setTimeout(removeMessage, duration);
    }

    if (type === 'error') {
        try {
            playErrorBeep();
        } catch (_) {
            // Ignore audio failures in unsupported environments.
        }
    }
}

export function showError(message, duration = 0) {
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
