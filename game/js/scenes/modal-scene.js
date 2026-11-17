export class ModalScene {
    constructor({ dom, input, announcer, title, text, buttonLabel, announceText }) {
        this.dom = dom;
        this.input = input;
        this.announcer = announcer;
        this.title = title;
        this.text = text;
        this.buttonLabel = buttonLabel;
        this.announceText = announceText ?? `${title}. ${text}`;
        this.previousFocus = null;
        this.handleActionBind = this.handleAction.bind(this);
        this.handleKeydownBind = this.handleKeydown.bind(this);
    }

    init() {
        this.input.mouse.isDown = false;
        this.input.clearTarget();
        this.input.deactivateKeyboardMode();

        this.previousFocus = document.activeElement;

        this.dom.dialogTitle.textContent = this.title;
        this.dom.dialogText.textContent = this.text;
        if (this.dom.dialogContent) {
            this.dom.dialogContent.innerHTML = '';
        }
        if (this.dom.dialogStatus) {
            this.dom.dialogStatus.textContent = '';
            this.dom.dialogStatus.className = 'dialog-status';
        }
        this.dom.dialogBtn.textContent = this.buttonLabel;
        this.dom.dialogLayer.style.display = 'flex';
        this.dom.dialogLayer.setAttribute('aria-hidden', 'false');
        if (this.dom.viewport) this.dom.viewport.inert = true;
        if (this.dom.uiLayer) this.dom.uiLayer.inert = true;

        this.dom.dialogBtn.addEventListener('click', this.handleActionBind);
        document.addEventListener('keydown', this.handleKeydownBind);

        this.isOpen = true;
        queueMicrotask(() => {
            if (!this.isOpen) return;
            const initialFocus = this.dom.dialogLayer.querySelector('.dialog-listen') ?? this.dom.dialogBtn;
            initialFocus.focus({ preventScroll: true });
            if (this.announceText) this.announcer.announce(this.announceText, 'assertive');
        });
    }

    handleKeydown(event) {
        if (event.key === 'Escape') {
            this.handleAction();
            return;
        }

        if (event.key !== 'Tab') return;

        const candidates = this.dom.dialogLayer.querySelectorAll('button, a[href], input, select, textarea, [tabindex]');
        const focusable = Array.from(candidates).filter(element =>
            !element.disabled && element.tabIndex >= 0 && element.getClientRects().length > 0
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable.at(-1);

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    handleAction() { }

    destroy() {
        this.isOpen = false;
        if (this.dom.viewport) this.dom.viewport.inert = false;
        if (this.dom.uiLayer) this.dom.uiLayer.inert = false;
        this.dom.dialogLayer.style.display = 'none';
        this.dom.dialogLayer.setAttribute('aria-hidden', 'true');
        if (this.dom.dialogContent) {
            this.dom.dialogContent.innerHTML = '';
        }
        if (this.dom.dialogStatus) {
            this.dom.dialogStatus.textContent = '';
            this.dom.dialogStatus.className = 'dialog-status';
        }
        this.dom.dialogBtn.removeEventListener('click', this.handleActionBind);
        document.removeEventListener('keydown', this.handleKeydownBind);

        if (this.previousFocus && document.contains(this.previousFocus)) {
            this.previousFocus.focus();
        }
    }

    pause() { }
    resume() { }
    update() { }
    render() { }
}
