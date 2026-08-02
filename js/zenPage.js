import { copyTextToClipboard } from './modules/share.js';

const COPY_FEEDBACK_MS = 1400;

export function buildZenRulePayload(principle) {
    if (!principle) {
        return '';
    }

    const ruleNumber = principle.dataset?.ruleNumber ?? '';
    const title = principle.querySelector('.zen-principle-text')?.textContent?.trim() ?? '';
    const comment = principle.querySelector('.zen-principle-comment')?.textContent?.trim() ?? '';
    return `Правило ${ruleNumber}\n${title}\n${comment}\nДзен Равлика 🐌`;
}

function setCopyButtonState(button, iconClass, copied) {
    const icon = button.querySelector('.ui-icon');
    if (icon) {
        icon.className = `ui-icon ${iconClass}`;
    }
    button.classList.toggle('copied', copied);
}

export function setupZenCopyButtons({
    documentRef = globalThis.document,
    copyText = copyTextToClipboard,
    scheduleReset = globalThis.setTimeout,
} = {}) {
    if (!documentRef?.querySelectorAll || typeof copyText !== 'function' || typeof scheduleReset !== 'function') {
        return 0;
    }

    const buttons = [...documentRef.querySelectorAll('.zen-copy-btn')];
    buttons.forEach((button) => {
        button.addEventListener('click', async () => {
            const principle = button.closest('.zen-principle');
            if (!principle) {
                return;
            }

            try {
                await copyText(buildZenRulePayload(principle));
                setCopyButtonState(button, 'icon-check', true);
            } catch {
                setCopyButtonState(button, 'icon-times', false);
            }

            scheduleReset(() => {
                setCopyButtonState(button, 'icon-copy', false);
            }, COPY_FEEDBACK_MS);
        });
    });

    return buttons.length;
}

if (typeof document !== 'undefined') {
    setupZenCopyButtons();
}
