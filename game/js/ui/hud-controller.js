import { t } from '../i18n/index.js';

function setTextContent(element, value) {
    if (element) {
        element.textContent = value;
    }
}

export const HUDController = {
    init({ dom }) {
        this.dom = dom;
        this.setSessionSummary({ apples: 0, stars: 0 });
        this.setObjective(t('hud.objectiveText'));
        this.setContext(t('hud.contextIdle'));
        this.setNearbyNpc(null);
    },

    setSessionSummary({ apples, stars }) {
        setTextContent(this.dom.hudSession, t('hud.sessionStatus', { apples, stars }));
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
