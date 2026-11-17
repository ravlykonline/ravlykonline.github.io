import { canPlaceRect } from './spawn-rules.js';
import { positionNpcs } from './npc-spawner.js';
import { createDistributionCells, positionRectInCell } from './distribution-rules.js';
import { circleIntersectsRect, WORLD_COLLISION_MARGIN } from './collision-system.js';

const OBSTACLE_TYPES = ['rock', 'bush', 'twig'];
const COLLECTIBLE_SIZE = 32;
const WORLD_PADDING = 100;
const COLLECTIBLE_PADDING = 120;
const START_CLEAR_RADIUS = 220;
const MIN_OBSTACLE_GAP = 56;
const MAX_PLACEMENT_ATTEMPTS = 90;

function createObstacle(random, cell, isPond) {
    const type = isPond ? 'pond' : OBSTACLE_TYPES[Math.floor(random() * OBSTACLE_TYPES.length)];
    const isHorizontal = random() > 0.5;
    const w = isPond ? 174 + random() * 62 :
        type === 'twig' ? (isHorizontal ? random() * 100 + 80 : 24) : random() * 60 + 48;
    const h = isPond ? 126 + random() * 44 :
        type === 'twig' ? (isHorizontal ? 24 : random() * 100 + 80) : w;
    const position = positionRectInCell({ w, h }, cell, random);

    return { x: position.x, y: position.y, w, h, type };
}

export function generateObstacles({ config, player, random = Math.random }) {
    const obstacles = [];
    const obstacleGap = Math.max(MIN_OBSTACLE_GAP, 2 * ((config.playerRadius ?? 0) + WORLD_COLLISION_MARGIN) + 8);
    const startArea = { ...player, radius: START_CLEAR_RADIUS };
    const cells = createDistributionCells({
        count: config.obstacleCount,
        width: config.worldWidth,
        height: config.worldHeight,
        padding: WORLD_PADDING,
        random
    });

    for (let index = 0; index < config.obstacleCount; index += 1) {
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < MAX_PLACEMENT_ATTEMPTS) {
            const cell = cells[(index + attempts) % cells.length];
            const isPond = index < (config.pondCount ?? 0);
            const obstacle = createObstacle(random, cell, isPond);

            if ((!isPond || !circleIntersectsRect(startArea, obstacle)) && canPlaceRect(obstacle, {
                blockers: obstacles,
                blockerGap: obstacleGap,
                avoidPoint: player,
                minDistanceFromPoint: START_CLEAR_RADIUS
            })) {
                obstacles.push(obstacle);
                placed = true;
            }

            attempts += 1;
        }
    }

    return obstacles;
}

/**
 * Розкидати збірні предмети одного виду по світу.
 * Кожен вид розподіляється власною сіткою комірок, тому яблука й груші
 * рівномірно вкривають карту й не збиваються в одну купу.
 *
 * @param {{
 *   config: object,
 *   blockers: Array<object>,
 *   kind: 'apple'|'pear',
 *   count: number,
 *   idOffset?: number,
 *   random?: Function
 * }} params
 * @returns {Array<{id:number, kind:string, x:number, y:number, w:number, h:number}>}
 */
export function generateCollectibles({ config, blockers, kind, count, idOffset = 0, random = Math.random }) {
    const items = [];

    if (count <= 0) {
        return items;
    }

    const cells = createDistributionCells({
        count,
        width: config.worldWidth,
        height: config.worldHeight,
        padding: COLLECTIBLE_PADDING,
        random
    });

    for (let index = 0; index < count; index += 1) {
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < MAX_PLACEMENT_ATTEMPTS) {
            const cell = cells[(index + attempts) % cells.length];
            const position = positionRectInCell({ w: COLLECTIBLE_SIZE, h: COLLECTIBLE_SIZE }, cell, random);
            const item = {
                id: idOffset + index,
                kind,
                x: position.x,
                y: position.y,
                w: COLLECTIBLE_SIZE,
                h: COLLECTIBLE_SIZE
            };

            if (canPlaceRect(item, { blockers, blockerGap: config.playerRadius ?? 0 }) &&
                canPlaceRect(item, { blockers: items })) {
                items.push(item);
                placed = true;
            }

            attempts += 1;
        }
    }

    return items;
}

export function generateWorld({ config, player, npcs = [], random = Math.random }) {
    const obstacles = generateObstacles({ config, player, random });
    const positionedNpcs = positionNpcs({
        npcs,
        config,
        player,
        blockers: obstacles,
        random
    });

    const staticBlockers = [...obstacles, ...positionedNpcs];
    const apples = generateCollectibles({
        config,
        blockers: staticBlockers,
        kind: 'apple',
        count: config.appleCount,
        random
    });
    const pears = generateCollectibles({
        config,
        blockers: [...staticBlockers, ...apples],
        kind: 'pear',
        count: config.pearCount ?? 0,
        idOffset: config.appleCount,
        random
    });

    return { obstacles, collectibles: [...apples, ...pears], npcs: positionedNpcs };
}
