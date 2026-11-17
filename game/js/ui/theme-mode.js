import { t } from '../i18n/index.js';
import { createIcon } from './illustrations.js';

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

        if (dom.themeToggleBtn) {
            dom.themeToggleBtn.onclick = () => {
                this.mode = this.mode === 'dark' ? 'light' : 'dark';
                this.applyMode();
            };
        }
    },

    applyMode() {
        document.body.dataset.theme = this.mode;
        if (this.dom.themeToggleBtn) {
            const isNight = this.mode === 'dark';
            const labelKey = isNight ? 'hud.themeToggleLight' : 'hud.themeToggleDark';
            this.dom.themeToggleBtn.setAttribute('aria-label', t(`${labelKey}Label`));
            this.dom.themeToggleBtn.replaceChildren(createIcon(isNight ? 'sun' : 'moon'), t(labelKey));
        }

        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
            themeColor.setAttribute('content', resolveMetaThemeColor(this.mode));
        }
    }
};
