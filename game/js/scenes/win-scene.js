import { ModalScene } from './modal-scene.js';
import { t } from '../i18n/index.js';
import { RewardEffects } from '../ui/reward-effects.js';

export class WinScene extends ModalScene {
    constructor(deps) {
        super({
            ...deps,
            title: t('win.title'),
            text: t('win.summary'),
            buttonLabel: t('win.button'),
            announceText: t('win.announce', deps.stats ?? {})
        });

        this.bootGame = deps.bootGame;
        this.stats = deps.stats ?? {};
        this._celebrationTimers = [];
    }

    init() {
        super.init();
        this._renderStats();
        this._startCelebration();
    }

    _renderStats() {
        const container = this.dom.dialogContent;

        const grid = document.createElement('div');
        grid.className = 'win-stats-grid';

        const appleCard = this._makeStatCard('🍎', this.stats.apples, t('win.applesLabel'));
        const starCard  = this._makeStatCard('⭐', this.stats.stars,  t('win.starsLabel'));

        grid.append(appleCard, starCard);
        container.appendChild(grid);
    }

    _makeStatCard(icon, value, label) {
        const card = document.createElement('div');
        card.className = 'win-stat-card';

        const iconEl = document.createElement('span');
        iconEl.className = 'win-stat-card__icon';
        iconEl.setAttribute('aria-hidden', 'true');
        iconEl.textContent = icon;

        const valueEl = document.createElement('strong');
        valueEl.className = 'win-stat-card__value';
        valueEl.textContent = value ?? 0;

        const labelEl = document.createElement('span');
        labelEl.className = 'win-stat-card__label';
        labelEl.textContent = label;

        card.append(iconEl, valueEl, labelEl);
        return card;
    }

    _startCelebration() {
        // Three bursts staggered so the child sees continuous celebration
        const delays = [0, 700, 1400];
        delays.forEach((delay) => {
            const timer = setTimeout(() => {
                RewardEffects.showStarCelebration(this.dom.dialogLayer);
            }, delay);
            this._celebrationTimers.push(timer);
        });
    }

    destroy() {
        this._celebrationTimers.forEach((timer) => clearTimeout(timer));
        this._celebrationTimers = [];
        super.destroy();
    }

    handleAction() {
        this.bootGame();
    }
}
