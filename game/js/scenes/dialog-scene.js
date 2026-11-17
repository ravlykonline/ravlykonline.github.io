import { ModalScene } from './modal-scene.js';
import { HUDController } from '../ui/hud-controller.js';
import { t } from '../i18n/index.js';
import { TaskRegistry } from '../tasks/task-registry.js';
import { RewardEffects } from '../ui/reward-effects.js';
import { createAnimal, createIcon } from '../ui/illustrations.js';
import { getTaskVoice } from '../tasks/task-voice.js';

export class DialogScene extends ModalScene {
    constructor(deps) {
        const { npc } = deps;

        super({
            ...deps,
            title: npc.name,
            text: npc.activeTask.instructions,
            buttonLabel: t('dialog.back'),
            announceText: ''
        });

        this.npc = npc;
        this.eventBus = deps.eventBus;
        this.sceneManager = deps.sceneManager;
        this.isSolved = false;
    }

    init() {
        super.init();

        this.dom.dialogLayer.classList.add('task-dialog');
        this.dom.dialogTitle.prepend(createAnimal(this.npc.type));

        this.setStatus('');
        TaskRegistry.renderTask({
            task: this.npc.activeTask,
            container: this.dom.dialogContent,
            setStatus: this.setStatus.bind(this),
            onSolved: this.handleSolved.bind(this)
        });
        this.addVoiceButton();
    }

    addVoiceButton() {
        const source = getTaskVoice(this.npc.activeTask);
        if (!source) return;

        const audio = new Audio(source);
        audio.preload = 'none';
        this.audio = audio;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dialog-listen';
        const label = document.createElement('span');
        const setPlaying = (playing) => {
            label.textContent = t(playing ? 'dialog.stopListeningShort' : 'dialog.listen');
            button.setAttribute('aria-label', t(playing ? 'dialog.stopListening' : 'dialog.listen'));
        };
        const showPlaybackError = () => {
            if (this.audio !== audio || this.isSolved) return;
            setPlaying(false);
            this.setStatus(t('dialog.audioUnavailable'), 'error');
        };
        setPlaying(false);
        button.append(createIcon('sound'), label);
        button.addEventListener('click', () => {
            if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
                return;
            }
            audio.play().catch(error => {
                if (error.name !== 'AbortError') showPlaybackError();
            });
        });
        audio.addEventListener('playing', () => setPlaying(true));
        audio.addEventListener('pause', () => setPlaying(false));
        audio.addEventListener('ended', () => setPlaying(false));
        audio.addEventListener('error', showPlaybackError);
        this.listenButton = button;
        const summary = this.dom.dialogText.closest('.dialog-summary');
        if (summary) summary.append(button);
        else this.dom.dialogContent.prepend(button);
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
        this.audio?.pause();
        this.npc.completed = true;
        this.npc.isNearby = false;

        const npcEl = document.querySelector(`.npc[data-id="${this.npc.id}"]`);

        if (npcEl) {
            npcEl.classList.remove('npc--near');
            npcEl.classList.add('completed');
            npcEl.setAttribute('aria-label', t('entities.npcCompleted', { name: this.npc.name }));
        }

        this.dom.dialogBtn.textContent = t('dialog.complete');
        this.dom.dialogBtn.focus({ preventScroll: true });
        this.setStatus(t('taskUi.successWithStar'), 'success');
        RewardEffects.showStarCelebration();
        HUDController.setContext(t('announcer.puzzleCompleted', { name: this.npc.name }));
        HUDController.setNearbyNpc(null);
        HUDController.setObjective(t('hud.objectiveText'));

        this.eventBus.emit('puzzle:completed', { npcId: this.npc.id, stars: this.npc.activeTask.reward?.stars ?? 1 });
        this.announcer.announce(t('announcer.puzzleCompleted', { name: this.npc.name }), 'assertive');
    }

    destroy() {
        this.audio?.pause();
        this.audio = null;
        this.listenButton?.remove();
        this.dom.dialogLayer.classList.remove('task-dialog');
        super.destroy();
    }

    handleAction() {
        this.sceneManager.pop();
    }
}
