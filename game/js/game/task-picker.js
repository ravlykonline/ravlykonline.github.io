import { t } from '../i18n/index.js';
import { TaskRegistry } from '../tasks/task-registry.js';

// Pool IDs classified by difficulty tier
// Easy: always available; Medium: unlocked at 5 stars; Hard: unlocked at 10 stars
const MEDIUM_POOLS = new Set(['patterns.beginner', 'logic.beginner']);
const HARD_POOLS   = new Set(['arithmetic.beginner']);

function filterPoolsByDifficulty(taskPoolIds, earnedStars) {
    const filtered = taskPoolIds.filter((poolId) => {
        if (HARD_POOLS.has(poolId))   return earnedStars >= 10;
        if (MEDIUM_POOLS.has(poolId)) return earnedStars >= 5;
        return true; // easy pools always available
    });
    // Fallback: if all pools were filtered out (shouldn't happen), use all pools
    return filtered.length > 0 ? filtered : taskPoolIds;
}

export const TaskPicker = {
    pickRandomTask(taskPoolIds, random = Math.random, session = null) {
        const usedTaskIds = session?.usedTaskIds ?? null;
        const task = TaskRegistry.createTask(taskPoolIds, random, {
            excludedTaskIds: usedTaskIds ?? new Set()
        });

        usedTaskIds?.add(task.id);
        return task;
    },

    /**
     * Pick a task appropriate for the player's current skill level.
     * @param {string[]} taskPoolIds - pools this NPC can draw from
     * @param {number} earnedStars   - stars collected so far this session
     * @param {Function} random
     * @param {object|null} session
     */
    pickAdaptiveTask(taskPoolIds, earnedStars = 0, random = Math.random, session = null) {
        const allowedPools = filterPoolsByDifficulty(taskPoolIds, earnedStars);
        return this.pickRandomTask(allowedPools, random, session);
    },

    buildNpcSessionState(npc, random = Math.random, session = null) {
        const taskPoolIds = npc.taskPoolIds ?? [npc.taskPoolId];

        return {
            ...npc,
            taskPoolIds,
            name: t(npc.nameKey),
            // Initial task uses only easy pools (earnedStars = 0 at session start)
            activeTask: this.pickAdaptiveTask(taskPoolIds, 0, random, session),
            hasPrompted: false,
            isNearby: false
        };
    }
};
