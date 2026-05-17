import { ModalScene } from './modal-scene.js';
import { t } from '../i18n/index.js';

export class IntroScene extends ModalScene {
    constructor(deps) {
        super({
            ...deps,
            title: t('intro.title'),
            text: '',
            buttonLabel: t('intro.button')
        });

        this.sceneManager = deps.sceneManager;
        this.createGameScene = deps.createGameScene;
        this.onStart = deps.onStart ?? null;
        this.introList = null;
    }

    init() {
        super.init();
        this.dom.dialogTitle.classList.add('dialog-title--intro');
        this.dom.dialogText.classList.add('sr-only');

        const rawText = t('intro.text');
        const list = document.createElement('ul');
        list.className = 'intro-list';
        this.introList = list;

        rawText.split('\n').forEach((line) => {
            const item = document.createElement('li');
            item.textContent = line;
            list.appendChild(item);
        });

        this.dom.dialogContent.appendChild(list);
    }

    destroy() {
        if (this.introList) {
            this.introList.remove();
            this.introList = null;
        }
        this.dom.dialogTitle.classList.remove('dialog-title--intro');
        this.dom.dialogText.classList.remove('sr-only');
        this.dom.dialogText.textContent = '';
        super.destroy();
    }

    handleAction() {
        // Start music here — we're inside a user-gesture, so AudioContext can unlock
        this.onStart?.();
        this.sceneManager.pop();
        this.sceneManager.push(this.createGameScene());
    }
}
