import { ModalScene } from './modal-scene.js';
import { t } from '../i18n/index.js';

export class IntroScene extends ModalScene {
    constructor(deps) {
        super({
            ...deps,
            title: t('intro.title'),
            text: t('intro.text'),
            buttonLabel: t('intro.button')
        });

        this.sceneManager = deps.sceneManager;
        this.createGameScene = deps.createGameScene;
    }

    handleAction() {
        this.sceneManager.pop();
        this.sceneManager.push(this.createGameScene());
    }
}
