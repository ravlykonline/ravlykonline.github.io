import { registerServiceWorker } from './pwa/register-sw.js';
import { bootGame } from './app/bootstrap.js';
import { SceneManager } from './scenes/scene-manager.js';

let lastTimestamp = 0;

function gameLoop(timestamp) {
    // Cap deltaMs at 50ms (3 frames) to avoid physics explosion after tab switch
    const deltaMs = lastTimestamp === 0 ? 16.667 : Math.min(timestamp - lastTimestamp, 50);
    lastTimestamp = timestamp;

    SceneManager.update(deltaMs);
    SceneManager.render();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', () => {
    bootGame();
    requestAnimationFrame(gameLoop);
});

registerServiceWorker();
