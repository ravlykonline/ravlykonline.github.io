import { canPlaceRect } from './spawn-rules.js';
import { positionNpcs } from './npc-spawner.js';
import { createDistributionCells, positionRectInCell } from './distribution-rules.js';

const OBSTACLE_TYPES = ['rock', 'bush', 'twig'];
const APPLE_SIZE = 28;
const WORLD_PADDING = 100;
const APPLE_PADDING = 120;
const START_CLEAR_RADIUS = 220;
const OBSTACLE_GAP = 40;
const MAX_PLACEMENT_ATTEMPTS = 50;

function createObstacle(random, config, cell = null) {
    const type = OBSTACLE_TYPES[Math.floor(random() * OBSTACLE_TYPES.length)];
    const isHorizontal = random() > 0.5;
    const w = type === 'twig'
        ? (isHorizontal ? random() * 100 + 80 : 24)
        : random() * 60 + 48;
    const h = type === 'twig'
        ? (isHorizontal ? 24 : random() * 100 + 80)
        : w;
    const position = cell
        ? positionRectInCell({ w, h }, cell, random)
        : {
            x: random() * (config.worldWidth - w - WORLD_PADDING * 2) + WORLD_PADDING,
            y: random() * (config.worldHeight - h - WORLD_PADDING * 2) + WORLD_PADDING
        };

    return { x: position.x, y: position.y, w, h, type };
}

export function generateObstacles({ config, player, random = Math.random }) {
    const obstacles = [];
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
            const obstacle = createObstacle(random, config, cell);

            if (canPlaceRect(obstacle, {
                blockers: obstacles,
                blockerGap: OBSTACLE_GAP,
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

export function generateApples({ config, blockers, random = Math.random }) {
    const apples = [];
    const cells = createDistributionCells({
        count: config.appleCount,
        width: config.worldWidth,
        height: config.worldHeight,
        padding: APPLE_PADDING,
        random
    });

    for (let index = 0; index < config.appleCount; index += 1) {
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < MAX_PLACEMENT_ATTEMPTS) {
            const cell = cells[(index + attempts) % cells.length];
            const position = positionRectInCell({ w: APPLE_SIZE, h: APPLE_SIZE }, cell, random);
            const apple = {
                id: index,
                x: position.x,
                y: position.y,
                w: APPLE_SIZE,
                h: APPLE_SIZE
            };

            if (canPlaceRect(apple, { blockers })) {
                apples.push(apple);
                placed = true;
            }

            attempts += 1;
        }
    }

    return apples;
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
    const apples = generateApples({
        config,
        blockers: [...obstacles, ...positionedNpcs],
        random
    });

    return { obstacles, apples, npcs: positionedNpcs };
}
