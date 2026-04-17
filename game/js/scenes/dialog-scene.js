import { ModalScene } from './modal-scene.js';
import { t } from '../i18n/index.js';

export class DialogScene extends ModalScene {
    constructor(deps) {
        const { npc } = deps;

        super({
            ...deps,
            title: npc.name,
            text: t(npc.activeTask.dialogKey),
            buttonLabel: t('dialog.complete'),
            announceText: t('dialog.announce', { name: npc.name, task: t(npc.activeTask.dialogKey) })
        });

        this.npc = npc;
        this.eventBus = deps.eventBus;
        this.sceneManager = deps.sceneManager;
    }

    handleAction() {
        this.npc.completed = true;
        this.npc.isNearby = false;

        const npcEl = document.querySelector(`.npc[data-id="${this.npc.id}"]`);

        if (npcEl) {
            npcEl.classList.remove('npc--near');
            npcEl.classList.add('completed');
            npcEl.setAttribute('aria-label', t('entities.npcCompleted', { name: this.npc.name }));
        }

        this.eventBus.emit('puzzle:completed', { npcId: this.npc.id, stars: 1 });
        this.announcer.announce(t('announcer.puzzleCompleted', { name: this.npc.name }), 'assertive');
        this.sceneManager.pop();
    }
}
