import { SequenceNextTask } from './task-types/sequence-next.js';
import { OddOneOutTask } from './task-types/odd-one-out.js';
import { OrderNumbersTask } from './task-types/order-numbers.js';
import { CompareSetsTask } from './task-types/compare-sets.js';
import { CountAndMatchTask } from './task-types/count-and-match.js';
import { SimpleAdditionTask } from './task-types/simple-addition.js';
import { ShapePatternTask } from './task-types/shape-pattern.js';
import { SimpleSubtractionTask } from './task-types/simple-subtraction.js';
import { LogicPairsTask } from './task-types/logic-pairs.js';
import { TaskCatalog } from './task-catalog.js';
import { validateTask } from './task-validator.js';

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

const TASK_TYPE_NAMES = Object.keys(TASK_TYPES);

function pickRandom(items, random) {
    const index = Math.floor(random() * items.length);
    return items[index];
}

export const TaskRegistry = {
    createTask(poolId, random = Math.random, options = {}) {
        const excludedTaskIds = options.excludedTaskIds ?? new Set();
        const allEntries = TaskCatalog.getTasks(poolId);
        const availableEntries = allEntries.filter((entry) => !excludedTaskIds.has(entry.id));
        const pool = availableEntries.length > 0 ? availableEntries : allEntries;
        const entry = pickRandom(pool, random);

        return this.createTaskFromEntry(entry, random);
    },

    createTaskFromEntry(entry, random = Math.random) {
        const taskType = TASK_TYPES[entry.type];

        if (!taskType) {
            throw new Error(`Unknown task type: ${entry.type}`);
        }

        const task = taskType.createTask({
            random,
            options: entry.options,
            poolId: entry.poolId,
            entry
        });

        return validateTask(task, { knownTypes: TASK_TYPE_NAMES });
    },

    renderTask({ task, container, setStatus, onSolved }) {
        const taskType = TASK_TYPES[task.type];

        if (!taskType) {
            throw new Error(`Unknown task type: ${task.type}`);
        }

        validateTask(task, { knownTypes: TASK_TYPE_NAMES });
        container.innerHTML = '';
        taskType.render({
            task,
            container,
            setStatus,
            onSolved
        });
    }
};
