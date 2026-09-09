import { ModalScene } from './modal-scene.js';
import { t } from '../i18n/index.js';
import { RewardEffects } from '../ui/reward-effects.js';
import { createStatsGrid } from '../ui/stats-grid.js';

/**
 * Екран між рівнями: показує результат щойно пройденого рівня
 * і веде дитину на наступний.
 */
export class LevelCompleteScene extends ModalScene {
    constructor(deps) {
        const level = deps.level;
        const nextLevel = deps.nextLevel;
        const levelName = t(level.nameKey);
        const nextLevelName = t(nextLevel.nameKey);

        super({
            ...deps,
            title: t('levelComplete.title', { name: levelName }),
            text: t('levelComplete.summary', { next: nextLevelName }),
            buttonLabel: t('levelComplete.button', { next: nextLevelName }),
            announceText: t('levelComplete.announce', {
                name: levelName,
                next: nextLevelName,
                ...(deps.stats ?? {})
            })
        });

        this.level = level;
        this.nextLevel = nextLevel;
        this.onContinue = deps.onContinue;
        this.stats = deps.stats ?? {};
        this._celebrationTimer = null;
    }

    init() {
        super.init();
        this.dom.dialogContent.appendChild(createStatsGrid(this.stats));
        this._celebrationTimer = setTimeout(() => {
            RewardEffects.showStarCelebration(this.dom.dialogLayer);
        }, 0);
    }

    destroy() {
        clearTimeout(this._celebrationTimer);
        this._celebrationTimer = null;
        super.destroy();
    }

    handleAction() {
        this.onContinue(this.nextLevel);
    }
}
