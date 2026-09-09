/**
 * Collectible system — pure functions, no `this`, no class.
 *
 * Збірні предмети описуються одним типом даних:
 * `{ id, kind: 'apple' | 'pear', x, y, w, h }`.
 * Різні `kind` рахуються окремо в HUD, але збираються однаково.
 */

import { shouldCollectItem, pickNearestByDistance } from './rules.js';
import { RewardEffects } from '../ui/reward-effects.js';
import { HUDController } from '../ui/hud-controller.js';
import { t } from '../i18n/index.js';

/** Види збірних предметів. Порядок визначає порядок лічильників у HUD. */
export const COLLECTIBLE_KINDS = ['apple', 'pear'];

const DEFAULT_SIZE = 28;

/**
 * DOM-id елемента предмета. Один предмет — один унікальний id у межах сцени.
 * @param {{id: string|number}} item
 * @returns {string}
 */
export function collectibleElementId(item) {
    return `collectible-${item.id}`;
}

/**
 * Порахувати предмети кожного виду.
 * @param {Array<{kind?: string}>} items
 * @returns {Record<string, number>}
 */
export function countByKind(items) {
    const counts = Object.fromEntries(COLLECTIBLE_KINDS.map((kind) => [kind, 0]));

    items.forEach((item) => {
        const kind = item.kind ?? 'apple';
        counts[kind] = (counts[kind] ?? 0) + 1;
    });

    return counts;
}

/**
 * Відрендерити всі предмети в контейнер.
 * @param {Array<{id:string|number, kind?:string, x:number, y:number}>} items
 * @param {Element} container
 */
export function renderCollectibles(items, container) {
    items.forEach((item) => {
        const kind = item.kind ?? 'apple';
        const element = document.createElement('div');
        element.className = `collectible ${kind}`;
        element.id = collectibleElementId(item);
        element.dataset.kind = kind;
        element.style.left = `${item.x}px`;
        element.style.top = `${item.y}px`;
        element.setAttribute('role', 'img');
        element.setAttribute('aria-label', t(`entities.${kind}`));
        container.appendChild(element);
    });
}

/**
 * Зібрати предмети поруч з гравцем.
 * Мутує масив `items` (splice зібраних).
 * @param {{
 *   items: Array<{id:string|number, kind?:string, x:number, y:number, w?:number}>,
 *   playerX: number,
 *   playerY: number,
 *   playerRadius: number,
 *   eventBus: { emit: Function },
 *   announcer: { announce: Function }
 * }} params
 */
export function collectNearbyCollectibles({ items, playerX, playerY, playerRadius, eventBus, announcer }) {
    let collectedAny = false;

    for (let index = items.length - 1; index >= 0; index -= 1) {
        const item = items[index];
        const itemRadius = (item.w ?? DEFAULT_SIZE) / 2;
        const distance = Math.hypot(
            playerX - (item.x + itemRadius),
            playerY - (item.y + itemRadius)
        );

        if (!shouldCollectItem(distance, playerRadius)) {
            continue;
        }

        const kind = item.kind ?? 'apple';
        RewardEffects.playCollect(kind);
        eventBus.emit('item:collected', { type: kind, value: 1 });

        const element = document.getElementById(collectibleElementId(item));
        if (element) {
            element.style.transform = 'scale(1.3)';
            element.style.opacity = '0';
            setTimeout(() => element.remove(), 180);
        }

        items.splice(index, 1);
        collectedAny = true;
    }

    if (collectedAny) {
        announceRemaining(items, announcer);
    }
}

/**
 * Раз на кілька зібраних предметів нагадати, скільки лишилось.
 * Повідомлення не сиплються на кожен предмет, щоб не перевантажувати скрінрідер.
 * @param {Array<{kind?: string}>} items
 * @param {{ announce: Function }} announcer
 */
function announceRemaining(items, announcer) {
    if (items.length % 4 !== 0) {
        return;
    }

    const counts = countByKind(items);
    const message = counts.pear > 0
        ? t('announcer.itemsRemaining', { apples: counts.apple, pears: counts.pear })
        : t('announcer.applesRemaining', { count: counts.apple });
    const objective = counts.pear > 0
        ? t('hud.objectiveItemsRemaining', { apples: counts.apple, pears: counts.pear })
        : t('hud.objectiveApplesRemaining', { count: counts.apple });

    HUDController.setObjective(objective);
    HUDController.setContext(message);
    announcer.announce(message);
}

/**
 * Найближчий до позиції предмет (будь-якого виду).
 * @param {Array<{x:number, y:number, w?:number}>} items
 * @param {number} playerX
 * @param {number} playerY
 * @returns {object|null}
 */
export function findNearestCollectible(items, playerX, playerY) {
    return pickNearestByDistance(items, (item) => {
        const itemRadius = (item.w ?? DEFAULT_SIZE) / 2;
        return Math.hypot(playerX - (item.x + itemRadius), playerY - (item.y + itemRadius));
    });
}
