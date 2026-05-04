import { canPlaceRect } from './spawn-rules.js';
import { createDistributionCells, positionRectInCell, shuffleWithRandom } from './distribution-rules.js';

const NPC_PADDING = 180;
const NPC_GAP = 110;
const NPC_START_CLEAR_RADIUS = 300;
const MAX_PLACEMENT_ATTEMPTS = 120;

function createNpcPlacement(npc, random, config, cell = null) {
    const position = cell
        ? positionRectInCell(npc, cell, random)
        : {
            x: random() * (config.worldWidth - NPC_PADDING * 2 - npc.w) + NPC_PADDING,
            y: random() * (config.worldHeight - NPC_PADDING * 2 - npc.h) + NPC_PADDING
        };

    return {
        ...npc,
        x: position.x,
        y: position.y
    };
}

function getNpcDistributionKey(npc) {
    if (npc.distributionGroup) {
        return npc.distributionGroup;
    }

    if (Array.isArray(npc.taskPoolIds) && npc.taskPoolIds.length > 0) {
        return npc.taskPoolIds.join('|');
    }

    return npc.taskPoolId ?? 'default';
}

function interleaveByPool(npcs) {
    const groups = new Map();
    npcs.forEach((npc) => {
        const key = getNpcDistributionKey(npc);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(npc);
    });

    const queues = [...groups.values()];
    const result = [];
    let safety = npcs.length * 2;

    while (result.length < npcs.length && safety-- > 0) {
        for (const queue of queues) {
            if (queue.length > 0) result.push(queue.shift());
        }
    }

    return result;
}

export function positionNpcs({ npcs, config, player, blockers = [], random = Math.random }) {
    const positionedNpcs = [];
    const orderedNpcs = interleaveByPool(shuffleWithRandom(npcs, random));
    const cells = createDistributionCells({
        count: orderedNpcs.length,
        width: config.worldWidth,
        height: config.worldHeight,
        padding: NPC_PADDING,
        random
    });

    orderedNpcs.forEach((npc, index) => {
        let placedNpc = null;
        let attempts = 0;

        while (!placedNpc && attempts < MAX_PLACEMENT_ATTEMPTS) {
            const cell = cells[(index + attempts) % cells.length];
            const candidate = createNpcPlacement(npc, random, config, cell);

            if (canPlaceRect(candidate, {
                blockers: [...blockers, ...positionedNpcs],
                blockerGap: NPC_GAP,
                avoidPoint: player,
                minDistanceFromPoint: NPC_START_CLEAR_RADIUS
            })) {
                placedNpc = candidate;
            }

            attempts += 1;
        }

        positionedNpcs.push(placedNpc ?? npc);
    });

    return positionedNpcs;
}
