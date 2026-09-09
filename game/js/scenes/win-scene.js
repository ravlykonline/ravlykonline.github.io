import { ModalScene } from './modal-scene.js';
import { t } from '../i18n/index.js';
import { RewardEffects } from '../ui/reward-effects.js';
import { createStatsGrid } from '../ui/stats-grid.js';

/**
 * Фінальний екран: показується після останнього рівня.
 * `stats` — сумарний результат за всі рівні сесії.
 */
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
        this.dom.dialogContent.appendChild(createStatsGrid(this.stats));
        this._startCelebration();
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
