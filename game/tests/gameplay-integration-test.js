import { bootGame } from '../js/app/bootstrap.js';
import { SceneManager } from '../js/scenes/scene-manager.js';
import { hasWorldCollision, WORLD_COLLISION_MARGIN } from '../js/game/collision-system.js';

const summary = document.getElementById('gameplay-summary');

function wait(ms = 0) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function runFrames(count = 1) {
    for (let index = 0; index < count; index += 1) {
        SceneManager.update();
        SceneManager.render();
        await wait(0);
    }
}

async function run() {
    const app = bootGame();

    document.getElementById('dialog-btn').click();
    await wait(80);

    const gameScene = SceneManager.active;
    assert(gameScene.constructor.name === 'GameScene', 'Після onboarding має бути ігрова сцена.');

    const { worldWidth, worldHeight, playerRadius } = gameScene.config;
    const rects = [...gameScene.obstacles, ...gameScene.npcs];
    const targetApple = gameScene.collectibles.find(item => item.kind === 'apple' &&
        Array.from({ length: 31 }, (_, index) => item.x - 120 + index * 4).every(x =>
            !hasWorldCollision({ x, y: item.y, radius: playerRadius + 2, worldWidth, worldHeight, rects })
        )
    );
    assert(Boolean(targetApple), 'У сцені має бути яблуко з вільним прямим підходом.');

    gameScene.state.x = targetApple.x - 120;
    gameScene.state.y = targetApple.y;
    gameScene.state.velocityX = 0;
    gameScene.state.velocityY = 0;
    gameScene.state.targetAngle = 0;
    gameScene.state.angle = 0;

    app.input.keys.d = true;

    await runFrames(90);

    app.input.keys.d = false;
    await runFrames(10);

    assert(app.scoreSystem.apples >= 1, 'Після руху до яблука рахунок яблук має зрости.');
    assert(document.getElementById(`collectible-${targetApple.id}`) === null, 'Зібране яблуко має зникнути з DOM.');
    assert(
        document.getElementById('apples-count').textContent
            === `${app.scoreSystem.apples}/${app.scoreSystem.totalApples}`,
        'UI має показувати фактичний рахунок яблук.'
    );
    assert(gameScene.state.x > targetApple.x - 120, 'Равлик має реально посунутись вправо.');

    const pond = gameScene.obstacles.find(obstacle => obstacle.type === 'pond');
    assert(Boolean(pond), 'У сцені має бути озерце.');
    const shore = pond.x - playerRadius - WORLD_COLLISION_MARGIN;
    gameScene.state.x = shore - 5;
    gameScene.state.y = pond.y + pond.h / 2;
    gameScene.state.velocityX = 0;
    gameScene.state.velocityY = 0;
    app.input.keys.d = true;
    await runFrames(25);
    app.input.keys.d = false;
    assert(gameScene.state.x > shore - 5 && gameScene.state.x < shore,
        'Равлик має підійти до берега й зупинитися перед водою.');

    summary.textContent = 'PASS: рух клавіатурою, збір яблука та зіткнення з озерцем працюють';
    summary.className = 'pass';
}

run().catch((error) => {
    summary.textContent = `FAIL: ${error.message}`;
    summary.className = 'fail';
});
