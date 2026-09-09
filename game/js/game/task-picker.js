import { t } from '../i18n/index.js';
import { TaskRegistry } from '../tasks/task-registry.js';
import { TaskCatalog } from '../tasks/task-catalog.js';

/**
 * Відсіяти банки, які ще не відкрились за кількістю зірочок.
 * Поріг задається полем `unlockAtStars` у самій JSON-категорії,
 * тому нові банки додаються без правок цього файлу.
 *
 * @param {string[]} taskPoolIds
 * @param {number} earnedStars
 * @returns {string[]}
 */
function filterPoolsByDifficulty(taskPoolIds, earnedStars) {
    const filtered = taskPoolIds.filter(
        (poolId) => earnedStars >= TaskCatalog.getUnlockAtStars(poolId)
    );

    // Запобіжник: якщо відсіялось усе (наприклад, у NPC лише «важкі» банки),
    // краще дати складніше завдання, ніж не дати жодного.
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
     * @param {number} earnedStars   - stars collected so far this level
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
            // Initial task uses only easy pools (earnedStars = 0 at level start)
            activeTask: this.pickAdaptiveTask(taskPoolIds, 0, random, session),
            hasPrompted: false,
            isNearby: false
        };
    }
};
