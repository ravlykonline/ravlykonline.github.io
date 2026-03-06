export function getAccessibilityNotificationIconClass(message) {
    if (message.includes('\u043a\u043e\u043d\u0442\u0440\u0430\u0441\u0442')) return 'fa-adjust';
    if (message.includes('\u0442\u0435\u043a\u0441\u0442')) return 'fa-font';
    if (message.includes('\u0430\u043d\u0456\u043c\u0430\u0446\u0456\u0457')) return 'fa-film';
    if (message.includes('\u0448\u0440\u0438\u0444\u0442')) return 'fa-text-width';
    if (message.includes('\u0456\u043d\u0442\u0435\u0440\u0432\u0430\u043b\u0438')) return 'fa-expand';
    if (message.includes('\u0441\u043a\u0438\u043d\u0443\u0442\u043e')) return 'fa-undo';
    return 'fa-universal-access';
}

export function showAccessibilityNotification(message, options = {}) {
    const {
        documentRef = typeof document !== 'undefined' ? document : null,
        removeAfterMs = 6000,
    } = options;
    if (!documentRef?.body || typeof documentRef.createElement !== 'function') return;

    const existing = documentRef.getElementById('global-message-display');
    if (existing) existing.remove();

    const messageDiv = documentRef.createElement('div');
    messageDiv.id = 'global-message-display';
    messageDiv.className = 'message-global message-a11y-global';
    messageDiv.setAttribute('role', 'status');
    messageDiv.setAttribute('aria-live', 'polite');
    messageDiv.setAttribute('aria-atomic', 'true');

    const iconClass = getAccessibilityNotificationIconClass(message);
    messageDiv.innerHTML = `
        <span class="message-text-global"><i class="fas ${iconClass}"></i> ${message}</span>
        <button class="message-close-btn-global" aria-label="\u0417\u0430\u043a\u0440\u0438\u0442\u0438 \u043f\u043e\u0432\u0456\u0434\u043e\u043c\u043b\u0435\u043d\u043d\u044f"><i class="fas fa-times"></i></button>
    `;

    documentRef.body.appendChild(messageDiv);

    const closeTimeout = setTimeout(() => messageDiv.remove(), removeAfterMs);
    const closeBtn = messageDiv.querySelector('.message-close-btn-global');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            clearTimeout(closeTimeout);
            messageDiv.remove();
        }, { once: true });
    }
}
