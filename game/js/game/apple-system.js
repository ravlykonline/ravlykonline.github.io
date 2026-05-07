/**
 * Apple system — pure functions, no `this`, no class.
 */

import { shouldCollectApple, pickNearestByDistance } from './rules.js';
import { RewardEffects } from '../ui/reward-effects.js';
import { HUDController } from '../ui/hud-controller.js';
import { t } from '../i18n/index.js';

/**
 * Render all apples into the items container.
 * @param {Array<{id:string|number, x:number, y:number}>} apples
 * @param {Element} container
 */
export function renderApples(apples, container) {
    apples.forEach((apple) => {
        const element = document.createElement('div');
        element.className = 'apple';
        element.id = `apple-${apple.id}`;
        element.style.left = `${apple.x}px`;
        element.style.top = `${apple.y}px`;
        element.setAttribute('role', 'img');
        element.setAttribute('aria-label', t('entities.apple'));
        container.appendChild(element);
    });
}

/**
 * Collect apples near the player.
 * Mutates the `apples` array in place (splices collected items).
 * @param {{
 *   apples: Array<{id:string|number, x:number, y:number, w?:number}>,
 *   playerX: number,
 *   playerY: number,
 *   playerRadius: number,
 *   eventBus: { emit: Function },
 *   announcer: { announce: Function }
 * }} params
 */
export function collectNearbyApples({ apples, playerX, playerY, playerRadius, eventBus, announcer }) {
    for (let index = apples.length - 1; index >= 0; index -= 1) {
        const apple = apples[index];
        const appleRadius = (apple.w ?? 28) / 2;
        const distance = Math.hypot(
            playerX - (apple.x + appleRadius),
            playerY - (apple.y + appleRadius)
        );

        if (!shouldCollectApple(distance, playerRadius)) {
            continue;
        }

        RewardEffects.playApple();
        eventBus.emit('item:collected', { type: 'apple', value: 1 });

        const appleEl = document.getElementById(`apple-${apple.id}`);
        if (appleEl) {
            appleEl.style.transform = 'scale(1.3)';
            appleEl.style.opacity = '0';
            setTimeout(() => appleEl.remove(), 180);
        }

        apples.splice(index, 1);

        if (apples.length % 4 === 0) {
            HUDController.setObjective(t('hud.objectiveApplesRemaining', { count: apples.length }));
            HUDController.setContext(t('announcer.applesRemaining', { count: apples.length }));
            announcer.announce(t('announcer.applesRemaining', { count: apples.length }));
        }
    }
}

/**
 * Find the apple nearest to the given world position.
 * @param {Array<{x:number, y:number, w?:number}>} apples
 * @param {number} playerX
 * @param {number} playerY
 * @returns {object|null}
 */
export function findNearestApple(apples, playerX, playerY) {
    return pickNearestByDistance(apples, (apple) => {
        const appleRadius = (apple.w ?? 28) / 2;
        return Math.hypot(playerX - (apple.x + appleRadius), playerY - (apple.y + appleRadius));
    });
}
