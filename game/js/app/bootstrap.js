import { EventBus } from '../core/event-bus.js';
import { Announcer } from '../core/announcer.js';
import { Input } from '../core/input.js';
import { DOM } from '../core/dom.js';
import { applyDocumentTranslations, t } from '../i18n/index.js';
import { SceneManager } from '../scenes/scene-manager.js';
import { IntroScene } from '../scenes/intro-scene.js';
import { GameScene } from '../scenes/game-scene.js';
import { ScoreSystem } from '../systems/score-system.js';
import { FontModeController } from '../ui/font-mode.js';
import { HUDController } from '../ui/hud-controller.js';
import { ThemeModeController } from '../ui/theme-mode.js';

function resetSceneManager() {
    while (SceneManager.stack.length > 0) {
        SceneManager.pop();
    }
}

export function createGameScene() {
    return new GameScene({
        dom: DOM,
        input: Input,
        announcer: Announcer,
        eventBus: EventBus,
        sceneManager: SceneManager
    });
}

export function bootGame() {
    applyDocumentTranslations();
    Announcer.init();
    Announcer.t = t;
    Input.init(Announcer);
    HUDController.init({ dom: DOM });
    FontModeController.init({ dom: DOM });
    ThemeModeController.init({ dom: DOM });
    resetSceneManager();
    ScoreSystem.init({ eventBus: EventBus, dom: DOM });

    SceneManager.push(new IntroScene({
        dom: DOM,
        input: Input,
        announcer: Announcer,
        sceneManager: SceneManager,
        createGameScene
    }));

    return {
        dom: DOM,
        input: Input,
        announcer: Announcer,
        eventBus: EventBus,
        sceneManager: SceneManager,
        scoreSystem: ScoreSystem,
        hudController: HUDController,
        fontModeController: FontModeController,
        themeModeController: ThemeModeController
    };
}
