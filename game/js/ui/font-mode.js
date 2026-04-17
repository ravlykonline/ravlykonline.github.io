export const FontModeController = {
    mode: 'default',

    init({ dom }) {
        this.dom = dom;
        this.applyMode();

        this.dom.fontToggleBtn?.addEventListener('click', () => {
            this.mode = this.mode === 'default' ? 'readable' : 'default';
            this.applyMode();
        });
    },

    applyMode() {
        document.body.dataset.fontMode = this.mode;
        this.dom.fontToggleBtn?.setAttribute('aria-pressed', String(this.mode === 'readable'));
    }
};
