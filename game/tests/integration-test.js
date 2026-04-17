import { bootGame } from '../js/app/bootstrap.js';
import { t } from '../js/i18n/index.js';
import { SceneManager } from '../js/scenes/scene-manager.js';

const summary = document.getElementById('integration-summary');

function wait(ms = 0) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function run() {
    const app = bootGame();

    assert(SceneManager.active.constructor.name === 'IntroScene', 'Гра має стартувати з onboarding-модалки.');

    document.getElementById('dialog-btn').click();
    await wait(80);

    const gameScene = SceneManager.active;
    assert(gameScene.constructor.name === 'GameScene', 'Після onboarding має відкритись ігрова сцена.');

    const targetNpc = gameScene.npcs.find((npc) => npc.id === 'mouse_1');
    assert(Boolean(targetNpc), 'Має існувати NPC mouse_1.');

    gameScene.state.x = targetNpc.x + targetNpc.w / 2 - 4;
    gameScene.state.y = targetNpc.y + targetNpc.h / 2 - 4;
    gameScene.state.velocityX = 0;
    gameScene.state.velocityY = 0;

    gameScene.update();
    gameScene.render();
    await wait(20);

    const npcEl = document.querySelector(`.npc[data-id="${targetNpc.id}"]`);
    assert(npcEl?.classList.contains('npc--near'), 'NPC має підсвічуватись, коли равлик поруч.');

    npcEl.click();
    await wait(80);

    assert(SceneManager.active.constructor.name === 'DialogScene', 'Клік по NPC має відкрити діалог.');
    assert(document.getElementById('dialog-text').textContent.includes(t(targetNpc.activeTask.dialogKey)), 'У діалозі має бути активне випадкове завдання.');

    document.getElementById('dialog-btn').click();
    await wait(80);

    assert(SceneManager.active.constructor.name === 'GameScene', 'Після завершення діалогу гра має повернутись назад.');
    assert(targetNpc.completed === true, 'NPC має відмічатись як виконаний.');
    assert(app.scoreSystem.stars === 1, 'За виконане завдання має нараховуватись одна зірочка.');
    assert(document.getElementById('score-display').textContent.includes('Зірочки: 1'), 'UI має показувати оновлений рахунок зірочок.');

    summary.textContent = 'PASS: onboarding, NPC-взаємодія та зірочка працюють';
    summary.className = 'pass';
}

run().catch((error) => {
    summary.textContent = `FAIL: ${error.message}`;
    summary.className = 'fail';
});
