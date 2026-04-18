import { SequenceNextTask } from './task-types/sequence-next.js';
import { OddOneOutTask } from './task-types/odd-one-out.js';
import { OrderNumbersTask } from './task-types/order-numbers.js';
import { CompareSetsTask } from './task-types/compare-sets.js';
import { CountAndMatchTask } from './task-types/count-and-match.js';
import { SimpleAdditionTask } from './task-types/simple-addition.js';
import { ShapePatternTask } from './task-types/shape-pattern.js';
import { SimpleSubtractionTask } from './task-types/simple-subtraction.js';
import { LogicPairsTask } from './task-types/logic-pairs.js';
import { taskPools } from './task-data/task-pools.js';

const TASK_TYPES = {
    [SequenceNextTask.type]: SequenceNextTask,
    [OddOneOutTask.type]: OddOneOutTask,
    [OrderNumbersTask.type]: OrderNumbersTask,
    [CompareSetsTask.type]: CompareSetsTask,
    [CountAndMatchTask.type]: CountAndMatchTask,
    [SimpleAdditionTask.type]: SimpleAdditionTask,
    [ShapePatternTask.type]: ShapePatternTask,
    [SimpleSubtractionTask.type]: SimpleSubtractionTask,
    [LogicPairsTask.type]: LogicPairsTask
};

function pickRandom(items, random) {
    const index = Math.floor(random() * items.length);
    return items[index];
}

export const TaskRegistry = {
    createTask(poolId, random = Math.random) {
        const pool = taskPools[poolId];

        if (!pool || pool.length === 0) {
            throw new Error(`Unknown task pool: ${poolId}`);
        }

        const entry = pickRandom(pool, random);
        const taskType = TASK_TYPES[entry.type];

        if (!taskType) {
            throw new Error(`Unknown task type: ${entry.type}`);
        }

        return taskType.createTask({
            random,
            options: entry.options,
            poolId
        });
    },

    renderTask({ task, container, setStatus, onSolved }) {
        const taskType = TASK_TYPES[task.type];

        if (!taskType) {
            throw new Error(`Unknown task type: ${task.type}`);
        }

        container.innerHTML = '';
        taskType.render({
            task,
            container,
            setStatus,
            onSolved
        });
    }
};
