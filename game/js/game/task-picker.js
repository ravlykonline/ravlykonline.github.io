import { t } from '../i18n/index.js';

export const TaskPicker = {
    pickRandomTask(taskPool, random = Math.random) {
        const index = Math.floor(random() * taskPool.length);
        return taskPool[index];
    },

    buildNpcSessionState(npc, random = Math.random) {
        return {
            ...npc,
            name: t(npc.nameKey),
            activeTask: this.pickRandomTask(npc.taskPool, random),
            hasPrompted: false,
            isNearby: false
        };
    }
};
