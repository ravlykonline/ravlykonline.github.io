import { t } from '../i18n/index.js';
import { HUDController } from '../ui/hud-controller.js';

export const ScoreSystem = {
    apples: 0,
    pears: 0,
    stars: 0,
    totalApples: 42,
    totalPears: 0,
    totalStars: 28,
    unsubscribe: [],
    _eventBus: null,
    _wonEmitted: false,

    init({ eventBus, dom, totalApples = 42, totalPears = 0, totalStars = 28, level = null }) {
        this.resetSubscriptions();
        this.apples = 0;
        this.pears = 0;
        this.stars = 0;
        this.totalApples = totalApples;
        this.totalPears = totalPears;
        this.totalStars = totalStars;
        this.level = level;
        this.dom = dom;
        this._eventBus = eventBus;
        this._wonEmitted = false;
        HUDController.setPearsVisible(totalPears > 0);
        this.updateUI();

        this.unsubscribe.push(eventBus.on('item:collected', (data) => {
            if (data.type === 'apple') {
                this.apples += data.value;
            } else if (data.type === 'pear') {
                this.pears += data.value;
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
            pears: this.pears,
            stars: this.stars,
            totalApples: this.totalApples,
            totalPears: this.totalPears,
            totalStars: this.totalStars
        };
        const hasPears = this.totalPears > 0;

        this.dom.scoreDisplay.textContent = hasPears ? t('score.displayPears', params) : t('score.display', params);
        this.dom.scoreDisplay.setAttribute('aria-label', hasPears ? t('score.ariaPears', params) : t('score.aria', params));

        if (this.dom.applesCount) {
            this.dom.applesCount.textContent = `${this.apples}/${this.totalApples}`;
        }
        if (this.dom.pearsCount) {
            this.dom.pearsCount.textContent = `${this.pears}/${this.totalPears}`;
        }
        if (this.dom.starsCount) {
            this.dom.starsCount.textContent = `${this.stars}/${this.totalStars}`;
        }

        HUDController.setSessionSummary({ apples: this.apples, pears: this.pears, stars: this.stars });
        this._checkWinCondition();
    },

    /** Знімок результату поточного рівня. */
    getSnapshot() {
        return {
            apples: this.apples,
            pears: this.pears,
            stars: this.stars,
            totalApples: this.totalApples,
            totalPears: this.totalPears,
            totalStars: this.totalStars
        };
    },

    _checkWinCondition() {
        if (this._wonEmitted || !this._eventBus) return;
        if (this.apples < this.totalApples) return;
        if (this.pears < this.totalPears) return;
        if (this.stars < this.totalStars) return;

        this._wonEmitted = true;
        const snapshot = this.getSnapshot();
        // Delay so the final star celebration plays before the win screen appears
        setTimeout(() => {
            this._eventBus.emit('level:completed', { ...snapshot, level: this.level });
        }, 1400);
    }
};
