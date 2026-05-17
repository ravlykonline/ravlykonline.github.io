import { t } from '../i18n/index.js';
import { HUDController } from '../ui/hud-controller.js';

export const ScoreSystem = {
    apples: 0,
    stars: 0,
    totalApples: 42,
    totalStars: 28,
    unsubscribe: [],
    _eventBus: null,
    _wonEmitted: false,

    init({ eventBus, dom, totalApples = 42, totalStars = 28 }) {
        this.resetSubscriptions();
        this.apples = 0;
        this.stars = 0;
        this.totalApples = totalApples;
        this.totalStars = totalStars;
        this.dom = dom;
        this._eventBus = eventBus;
        this._wonEmitted = false;
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
        const params = {
            apples: this.apples,
            stars: this.stars,
            totalApples: this.totalApples,
            totalStars: this.totalStars
        };
        this.dom.scoreDisplay.textContent = t('score.display', params);
        this.dom.scoreDisplay.setAttribute('aria-label', t('score.aria', params));
        if (this.dom.applesCount) {
            this.dom.applesCount.textContent = `${this.apples}/${this.totalApples}`;
        }
        if (this.dom.starsCount) {
            this.dom.starsCount.textContent = `${this.stars}/${this.totalStars}`;
        }
        HUDController.setSessionSummary({ apples: this.apples, stars: this.stars });
        this._checkWinCondition();
    },

    _checkWinCondition() {
        if (this._wonEmitted || !this._eventBus) return;
        if (this.apples < this.totalApples || this.stars < this.totalStars) return;

        this._wonEmitted = true;
        // Delay so the final star celebration plays before the win screen appears
        setTimeout(() => {
            this._eventBus.emit('game:won', {
                apples: this.apples,
                stars: this.stars,
                totalApples: this.totalApples,
                totalStars: this.totalStars
            });
        }, 1400);
    }
};
