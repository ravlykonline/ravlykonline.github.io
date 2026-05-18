import { EventBus } from '../core/event-bus.js';
import { Announcer } from '../core/announcer.js';
import { Input } from '../core/input.js';
import { DOM } from '../core/dom.js';
import { applyDocumentTranslations, t } from '../i18n/index.js';
import { CONFIG } from '../core/config.js';
import { LevelData } from '../game/level-data.js';
import { SceneManager } from '../scenes/scene-manager.js';
import { IntroScene } from '../scenes/intro-scene.js';
import { GameScene } from '../scenes/game-scene.js';
import { ScoreSystem } from '../systems/score-system.js';
import { FontModeController } from '../ui/font-mode.js';
import { HUDController } from '../ui/hud-controller.js';
import { ThemeModeController } from '../ui/theme-mode.js';
import { MusicController } from '../ui/music-controller.js';
import { WinScene } from '../scenes/win-scene.js';
import { Joystick } from '../ui/joystick.js';

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
    HUDController.init({
        dom: DOM,
        onPause: () => {
            const active = SceneManager.active;
            if (active?.openPause) active.openPause();
        }
    });
    FontModeController.init({ dom: DOM });
    ThemeModeController.init({ dom: DOM });
    MusicController.init({ dom: DOM });
    Joystick.init();
    resetSceneManager();
    EventBus.reset();
    ScoreSystem.init({
        eventBus: EventBus,
        dom: DOM,
        totalApples: CONFIG.appleCount,
        totalStars: LevelData.level1.npcs.length
    });

    EventBus.on('game:won', (stats) => {
        SceneManager.push(new WinScene({
            dom: DOM,
            input: Input,
            announcer: Announcer,
            sceneManager: SceneManager,
            bootGame,
            stats
        }));
    });

    SceneManager.push(new IntroScene({
        dom: DOM,
        input: Input,
        announcer: Announcer,
        sceneManager: SceneManager,
        createGameScene,
        onStart: () => {
            MusicController.start();
            // Show the objective hint for 2 s, then collapse the HUD out of the way
            HUDController.expandTemporarily(2000);
        }
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
