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
        this.focusableElements = [];
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
        this.dom.dialogBtn.textContent = this.buttonLabel;
        this.dom.dialogLayer.style.display = 'flex';
        this.dom.dialogLayer.setAttribute('aria-hidden', 'false');

        this.dom.dialogBtn.addEventListener('click', this.handleActionBind);
        document.addEventListener('keydown', this.handleKeydownBind);

        setTimeout(() => {
            this.dom.dialogBtn.focus();
            this.focusableElements = Array.from(
                this.dom.dialogLayer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
            );
            this.announcer.announce(this.announceText, 'assertive');
        }, 50);
    }

    handleKeydown(event) {
        if (event.key === 'Escape') {
            this.handleAction();
            return;
        }

        if (event.key !== 'Tab' || this.focusableElements.length === 0) {
            return;
        }

        const first = this.focusableElements[0];
        const last = this.focusableElements[this.focusableElements.length - 1];

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
        this.dom.dialogLayer.style.display = 'none';
        this.dom.dialogLayer.setAttribute('aria-hidden', 'true');
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
