import { bootGame } from '../js/app/bootstrap.js';
import { SceneManager } from '../js/scenes/scene-manager.js';

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

    const targetApple = gameScene.apples[0];
    assert(Boolean(targetApple), 'У сцені має бути хоча б одне яблуко.');

    gameScene.obstacles = [];
    document.getElementById('obstacles-container').innerHTML = '';

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
    assert(document.getElementById(`apple-${targetApple.id}`) === null, 'Зібране яблуко має зникнути з DOM.');
    assert(
        document.getElementById('score-display').textContent.includes(`Яблука: ${app.scoreSystem.apples}`),
        'UI має показувати фактичний рахунок яблук.'
    );
    assert(gameScene.state.x > targetApple.x - 120, 'Равлик має реально посунутись вправо.');

    summary.textContent = 'PASS: рух клавіатурою та збір яблука працюють';
    summary.className = 'pass';
}

run().catch((error) => {
    summary.textContent = `FAIL: ${error.message}`;
    summary.className = 'fail';
});
