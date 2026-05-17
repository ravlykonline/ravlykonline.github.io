import { ModalScene } from './modal-scene.js';
import { t } from '../i18n/index.js';

export class PauseScene extends ModalScene {
    constructor(deps) {
        super({
            ...deps,
            title: t('pause.title'),
            text: t('pause.text'),
            buttonLabel: t('pause.button'),
            announceText: t('pause.title')
        });

        this.sceneManager = deps.sceneManager;
    }

    handleAction() {
        // Pop pause overlay — GameScene resumes automatically via SceneManager
        this.sceneManager.pop();
    }
}
