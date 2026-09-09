import { t } from '../i18n/index.js';

function setTextContent(element, value) {
    if (element) {
        element.textContent = value;
    }
}

export const HUDController = {
    init({ dom, onPause }) {
        this.dom = dom;
        this.isExpanded = false;
        this._autoCollapseTimer = null;
        this.dom.hudToggleBtn?.addEventListener('click', () => {
            // Manual toggle cancels any pending auto-collapse
            clearTimeout(this._autoCollapseTimer);
            this.setExpanded(!this.isExpanded);
        });
        this.dom.pauseBtn?.addEventListener('click', () => {
            onPause?.();
        });
        this.setExpanded(false);
        this.setPearsVisible(false);
        this.setSessionSummary({ apples: 0, pears: 0, stars: 0 });
        this.setObjective(t('hud.objectiveText'));
        this.setContext(t('hud.contextIdle'));
        this.setNearbyNpc(null);
    },

    setExpanded(isExpanded) {
        this.isExpanded = isExpanded;
        this.dom.hudPanel?.classList.toggle('hud-panel--expanded', isExpanded);
        this.dom.hudToggleBtn?.setAttribute('aria-expanded', String(isExpanded));
    },

    /**
     * Expand the HUD panel, then collapse it automatically after `ms` milliseconds.
     * Lets the player see the objective hint at game start without cluttering the screen.
     */
    expandTemporarily(ms = 2000) {
        clearTimeout(this._autoCollapseTimer);
        this.setExpanded(true);
        this._autoCollapseTimer = setTimeout(() => {
            this.setExpanded(false);
            this._autoCollapseTimer = null;
        }, ms);
    },

    /**
     * Лічильник груш ховається на рівнях, де груш немає (рівень 1),
     * щоб дитина не шукала предмет, якого на карті не існує.
     * @param {boolean} isVisible
     */
    setPearsVisible(isVisible) {
        this._hasPears = isVisible;
        this.dom?.hudPearsStat?.classList.toggle('hidden', !isVisible);
        this.dom?.hudStats?.classList.toggle('hud-stats--three', isVisible);
        // Три лічильники не влазять у стандартну ширину панелі — розширюємо її.
        this.dom?.uiLayer?.classList.toggle('ui-layer--wide', isVisible);
    },

    /**
     * Показати, на якому рівні дитина зараз.
     * @param {{index: number, total: number, name: string}} level
     */
    setLevel({ index, total, name }) {
        if (!this.dom?.hudLevel) {
            return;
        }

        this.dom.hudLevel.textContent = t('hud.levelBadge', { index, total });
        this.dom.hudLevel.setAttribute('aria-label', t('hud.levelBadgeLabel', { index, total, name }));
    },

    setSessionSummary({ apples, pears = 0, stars }) {
        const message = this._hasPears
            ? t('hud.sessionStatusPears', { apples, pears, stars })
            : t('hud.sessionStatus', { apples, stars });
        setTextContent(this.dom.hudSession, message);
    },

    setObjective(message) {
        setTextContent(this.dom.hudObjective, message);
    },

    setContext(message) {
        setTextContent(this.dom.hudContext, message);
    },

    setNearbyNpc(name) {
        if (!this.dom.hudNpcBadge) {
            return;
        }

        const hasNpc = Boolean(name);
        this.dom.hudNpcBadge.classList.toggle('hidden', !hasNpc);
        this.dom.hudNpcBadge.textContent = hasNpc ? t('hud.nearbyNpcBadge', { name }) : '';
    }
};
