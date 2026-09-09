import { EventBus } from '../core/event-bus.js';
import { Announcer } from '../core/announcer.js';
import { Input } from '../core/input.js';
import { DOM } from '../core/dom.js';
import { applyDocumentTranslations, t } from '../i18n/index.js';
import { createLevelConfig } from '../core/config.js';
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
import { LevelCompleteScene } from '../scenes/level-complete-scene.js';
import { Joystick } from '../ui/joystick.js';

function resetSceneManager() {
    while (SceneManager.stack.length > 0) {
        SceneManager.pop();
    }
}

/**
 * Сумарний результат за всі пройдені рівні поточної сесії.
 * Живе лише в пам'яті вкладки: перезавантаження сторінки починає гру з нуля
 * (сесійна політика — див. README, розділ «Важлива політика»).
 */
function createCampaignTotals() {
    return { apples: 0, pears: 0, stars: 0 };
}

export function createGameScene(level = LevelData.level1) {
    return new GameScene({
        dom: DOM,
        input: Input,
        announcer: Announcer,
        eventBus: EventBus,
        sceneManager: SceneManager,
        level
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

    const campaignTotals = createCampaignTotals();

    /**
     * Запустити рівень: перезаписати лічильники під його цілі
     * і поставити свіжу GameScene замість поточної сцени.
     * @param {object} level
     */
    function startLevel(level) {
        const levelConfig = createLevelConfig(level);

        resetSceneManager();
        ScoreSystem.init({
            eventBus: EventBus,
            dom: DOM,
            totalApples: levelConfig.appleCount,
            totalPears: levelConfig.pearCount,
            totalStars: level.npcs.length,
            level
        });
        SceneManager.push(createGameScene(level));
        HUDController.expandTemporarily(2000);
    }

    EventBus.on('level:completed', (result) => {
        campaignTotals.apples += result.apples;
        campaignTotals.pears += result.pears;
        campaignTotals.stars += result.stars;

        const level = result.level ?? LevelData.level1;
        const nextLevel = LevelData.getByIndex(level.index + 1);

        if (nextLevel) {
            SceneManager.push(new LevelCompleteScene({
                dom: DOM,
                input: Input,
                announcer: Announcer,
                sceneManager: SceneManager,
                level,
                nextLevel,
                stats: { apples: result.apples, pears: result.pears, stars: result.stars },
                onContinue: startLevel
            }));
            return;
        }

        // Останній рівень пройдено — фінальний екран із сумою за всю гру.
        EventBus.emit('game:won', { ...campaignTotals });
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

    // Лічильники першого рівня мають бути правильними ще до старту гри,
    // бо HUD видно вже під час інтро.
    const firstLevel = LevelData.getByIndex(1);
    const firstLevelConfig = createLevelConfig(firstLevel);
    HUDController.setLevel({
        index: firstLevel.index,
        total: LevelData.count,
        name: t(firstLevel.nameKey)
    });
    ScoreSystem.init({
        eventBus: EventBus,
        dom: DOM,
        totalApples: firstLevelConfig.appleCount,
        totalPears: firstLevelConfig.pearCount,
        totalStars: firstLevel.npcs.length,
        level: firstLevel
    });

    SceneManager.push(new IntroScene({
        dom: DOM,
        input: Input,
        announcer: Announcer,
        sceneManager: SceneManager,
        createGameScene: () => createGameScene(firstLevel),
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
        themeModeController: ThemeModeController,
        startLevel
    };
}
