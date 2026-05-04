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
    }

    init() {
        super.init();
        this.dom.dialogTitle.classList.add('dialog-title--intro');

        const rawText = t('intro.text');
        const lines = rawText.split('\n');
        const list = document.createElement('ul');
        list.className = 'intro-list';

        lines.forEach((line) => {
            const item = document.createElement('li');
            item.textContent = line;
            list.appendChild(item);
        });

        this.dom.dialogText.replaceWith(list);
    }

    handleAction() {
        this.sceneManager.pop();
        this.sceneManager.push(this.createGameScene());
    }
}
