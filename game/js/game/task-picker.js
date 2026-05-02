import { t } from '../i18n/index.js';
import { TaskRegistry } from '../tasks/task-registry.js';

export const TaskPicker = {
    pickRandomTask(taskPoolIds, random = Math.random, session = null) {
        const usedTaskIds = session?.usedTaskIds ?? null;
        const task = TaskRegistry.createTask(taskPoolIds, random, {
            excludedTaskIds: usedTaskIds ?? new Set()
        });

        usedTaskIds?.add(task.id);
        return task;
    },

    buildNpcSessionState(npc, random = Math.random, session = null) {
        const taskPoolIds = npc.taskPoolIds ?? [npc.taskPoolId];

        return {
            ...npc,
            taskPoolIds,
            name: t(npc.nameKey),
            activeTask: this.pickRandomTask(taskPoolIds, random, session),
            hasPrompted: false,
            isNearby: false
        };
    }
};
