import { canPlaceRect } from './spawn-rules.js';

const NPC_PADDING = 160;
const NPC_GAP = 96;
const NPC_START_CLEAR_RADIUS = 280;
const MAX_PLACEMENT_ATTEMPTS = 80;

function createNpcPlacement(npc, random, config) {
    return {
        ...npc,
        x: random() * (config.worldWidth - NPC_PADDING * 2 - npc.w) + NPC_PADDING,
        y: random() * (config.worldHeight - NPC_PADDING * 2 - npc.h) + NPC_PADDING
    };
}

export function positionNpcs({ npcs, config, player, blockers = [], random = Math.random }) {
    const positionedNpcs = [];

    npcs.forEach((npc) => {
        let placedNpc = null;
        let attempts = 0;

        while (!placedNpc && attempts < MAX_PLACEMENT_ATTEMPTS) {
            const candidate = createNpcPlacement(npc, random, config);

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
