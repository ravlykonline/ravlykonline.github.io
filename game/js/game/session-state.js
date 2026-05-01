import { TaskPicker } from './task-picker.js';

export function createInitialPlayerState({ x = 2000, y = 2000 } = {}) {
    return {
        x,
        y,
        velocityX: 0,
        velocityY: 0,
        angle: 0,
        targetAngle: 0,
        camera: { x: 0, y: 0 },
        targetCamera: { x: 0, y: 0 },
        lastA11yUpdate: 0
    };
}

export function createInitialSessionState(levelData, { random = Math.random } = {}) {
    return {
        player: createInitialPlayerState(levelData?.playerStart),
        obstacles: [],
        apples: [],
        npcs: (levelData?.npcs ?? []).map((npc) => TaskPicker.buildNpcSessionState(npc, random)),
        nearbyNpcId: null,
        flags: {
            completedNpcIds: new Set()
        },
        debug: {
            seed: null
        }
    };
}
