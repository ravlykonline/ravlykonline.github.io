import { ModalScene } from './modal-scene.js';
import { HUDController } from '../ui/hud-controller.js';
import { t } from '../i18n/index.js';
import { TaskRegistry } from '../tasks/task-registry.js';
import { RewardEffects } from '../ui/reward-effects.js';

export class DialogScene extends ModalScene {
    constructor(deps) {
        const { npc } = deps;

        super({
            ...deps,
            title: npc.name,
            text: npc.activeTask.prompt,
            buttonLabel: t('dialog.back'),
            announceText: t('dialog.announce', { name: npc.name, task: npc.activeTask.prompt })
        });

        this.npc = npc;
        this.eventBus = deps.eventBus;
        this.sceneManager = deps.sceneManager;
        this.isSolved = false;
    }

    init() {
        super.init();

        this.setStatus('');
        TaskRegistry.renderTask({
            task: this.npc.activeTask,
            container: this.dom.dialogContent,
            setStatus: this.setStatus.bind(this),
            onSolved: this.handleSolved.bind(this)
        });
    }

    setStatus(message, kind = 'info') {
        if (!this.dom.dialogStatus) {
            return;
        }

        this.dom.dialogStatus.textContent = message;
        this.dom.dialogStatus.className = `dialog-status dialog-status--${kind}`;
    }

    handleSolved() {
        if (this.isSolved) {
            return;
        }

        this.isSolved = true;
        this.npc.completed = true;
        this.npc.isNearby = false;

        const npcEl = document.querySelector(`.npc[data-id="${this.npc.id}"]`);

        if (npcEl) {
            npcEl.classList.remove('npc--near');
            npcEl.classList.add('completed');
            npcEl.setAttribute('aria-label', t('entities.npcCompleted', { name: this.npc.name }));
        }

        this.dom.dialogBtn.textContent = t('dialog.complete');
        this.setStatus(t('taskUi.successWithStar'), 'success');
        RewardEffects.showStarCelebration(this.dom.dialogLayer);
        HUDController.setContext(t('announcer.puzzleCompleted', { name: this.npc.name }));
        HUDController.setNearbyNpc(null);
        HUDController.setObjective(t('hud.objectiveText'));

        this.eventBus.emit('puzzle:completed', { npcId: this.npc.id, stars: this.npc.activeTask.reward?.stars ?? 1 });
        this.announcer.announce(t('announcer.puzzleCompleted', { name: this.npc.name }), 'assertive');
    }

    handleAction() {
        this.sceneManager.pop();
    }
}
