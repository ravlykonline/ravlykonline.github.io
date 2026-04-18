import { t } from '../i18n/index.js';

function resolveInitialTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveMetaThemeColor(mode) {
    return mode === 'dark' ? t('meta.themeColorDark') : t('meta.themeColorLight');
}

export const ThemeModeController = {
    mode: 'light',

    init({ dom }) {
        this.dom = dom;
        this.mode = resolveInitialTheme();
        this.applyMode();

        this.dom.themeToggleBtn?.addEventListener('click', () => {
            this.mode = this.mode === 'dark' ? 'light' : 'dark';
            this.applyMode();
        });
    },

    applyMode() {
        document.body.dataset.theme = this.mode;
        if (this.dom.themeToggleBtn) {
            const labelKey = this.mode === 'dark' ? 'hud.themeToggleLight' : 'hud.themeToggleDark';
            this.dom.themeToggleBtn.setAttribute('aria-pressed', String(this.mode === 'dark'));
            this.dom.themeToggleBtn.setAttribute('aria-label', t(labelKey));
            this.dom.themeToggleBtn.textContent = t(labelKey);
        }

        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
            themeColor.setAttribute('content', resolveMetaThemeColor(this.mode));
        }
    }
};
