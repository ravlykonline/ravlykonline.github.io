import { t } from '../i18n/index.js';

export const ScoreSystem = {
    apples: 0,
    stars: 0,

    init({ eventBus, dom }) {
        this.apples = 0;
        this.stars = 0;
        this.dom = dom;
        this.updateUI();

        eventBus.on('item:collected', (data) => {
            if (data.type === 'apple') {
                this.apples += data.value;
            }

            this.updateUI();
        });

        eventBus.on('puzzle:completed', (data) => {
            this.stars += data.stars;
            this.updateUI();
        });
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
    }
};
