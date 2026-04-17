import { registerServiceWorker } from './pwa/register-sw.js';
import { bootGame } from './app/bootstrap.js';
import { SceneManager } from './scenes/scene-manager.js';

function gameLoop() {
    SceneManager.update();
    SceneManager.render();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', () => {
    bootGame();
    requestAnimationFrame(gameLoop);
});

registerServiceWorker();
