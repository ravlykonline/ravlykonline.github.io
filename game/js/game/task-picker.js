import { t } from '../i18n/index.js';
import { TaskRegistry } from '../tasks/task-registry.js';

export const TaskPicker = {
    pickRandomTask(taskPoolId, random = Math.random) {
        return TaskRegistry.createTask(taskPoolId, random);
    },

    buildNpcSessionState(npc, random = Math.random) {
        return {
            ...npc,
            name: t(npc.nameKey),
            activeTask: this.pickRandomTask(npc.taskPoolId, random),
            hasPrompted: false,
            isNearby: false
        };
    }
};
