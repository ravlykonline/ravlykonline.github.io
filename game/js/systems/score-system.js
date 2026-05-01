import { t } from '../i18n/index.js';
import { HUDController } from '../ui/hud-controller.js';

export const ScoreSystem = {
    apples: 0,
    stars: 0,
    unsubscribe: [],

    init({ eventBus, dom }) {
        this.resetSubscriptions();
        this.apples = 0;
        this.stars = 0;
        this.dom = dom;
        this.updateUI();

        this.unsubscribe.push(eventBus.on('item:collected', (data) => {
            if (data.type === 'apple') {
                this.apples += data.value;
            }

            this.updateUI();
        }));

        this.unsubscribe.push(eventBus.on('puzzle:completed', (data) => {
            this.stars += data.stars;
            this.updateUI();
        }));
    },

    resetSubscriptions() {
        this.unsubscribe.forEach((unsubscribe) => unsubscribe());
        this.unsubscribe = [];
    },

    updateUI() {
        this.dom.scoreDisplay.textContent = t('score.display', { apples: this.apples, stars: this.stars });
        this.dom.scoreDisplay.setAttribute('aria-label', t('score.aria', { apples: this.apples, stars: this.stars }));
        if (this.dom.applesCount) {
            this.dom.applesCount.textContent = `${this.apples}`;
        }
        if (this.dom.starsCount) {
            this.dom.starsCount.textContent = `${this.stars}`;
        }
        HUDController.setSessionSummary({ apples: this.apples, stars: this.stars });
    }
};
