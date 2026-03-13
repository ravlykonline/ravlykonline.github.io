export function getAccessibilityNotificationIconClass(message) {
    if (message.includes('\u0441\u043a\u0438\u043d\u0443\u0442\u043e')) return 'check-circle';
    return 'universal-access';
}

function createUiIcon(documentRef, iconName) {
    const icon = documentRef.createElement('span');
    icon.className = 'ui-icon icon-' + iconName;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
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

    const textSpan = documentRef.createElement('span');
    textSpan.className = 'message-text-global';
    textSpan.appendChild(createUiIcon(documentRef, iconClass));
    textSpan.appendChild(documentRef.createTextNode(` ${message}`));

    const closeBtn = documentRef.createElement('button');
    closeBtn.className = 'message-close-btn-global';
    closeBtn.setAttribute('aria-label', 'Закрити повідомлення');
    closeBtn.appendChild(createUiIcon(documentRef, 'times'));

    messageDiv.appendChild(textSpan);
    messageDiv.appendChild(closeBtn);
    documentRef.body.appendChild(messageDiv);

    const closeTimeout = setTimeout(() => messageDiv.remove(), removeAfterMs);
    closeBtn.addEventListener('click', () => {
        clearTimeout(closeTimeout);
        messageDiv.remove();
    }, { once: true });
}