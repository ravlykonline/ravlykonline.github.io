import observationBeginner from './task-data/categories/observation.beginner.json' with { type: 'json' };
import logicBeginner from './task-data/categories/logic.beginner.json' with { type: 'json' };
import patternsBeginner from './task-data/categories/patterns.beginner.json' with { type: 'json' };
import countingBeginner from './task-data/categories/counting.beginner.json' with { type: 'json' };
import arithmeticBeginner from './task-data/categories/arithmetic.beginner.json' with { type: 'json' };
import visualLogicBeginner from './task-data/categories/visual-logic.beginner.json' with { type: 'json' };

const CATEGORIES = [
    observationBeginner,
    logicBeginner,
    patternsBeginner,
    countingBeginner,
    arithmeticBeginner,
    visualLogicBeginner
];

function normalizePoolIds(poolIds) {
    if (Array.isArray(poolIds)) {
        return poolIds;
    }

    if (typeof poolIds === 'string') {
        return [poolIds];
    }

    return [];
}

function validateCategory(category) {
    if (!category || typeof category !== 'object') {
        throw new Error('Task category must be an object.');
    }

    if (typeof category.id !== 'string' || category.id.trim().length === 0) {
        throw new Error('Task category must have an id.');
    }

    if (!Array.isArray(category.tasks) || category.tasks.length === 0) {
        throw new Error(`Task category "${category.id}" must contain tasks.`);
    }

    const ids = new Set();

    category.tasks.forEach((task) => {
        if (!task || typeof task !== 'object') {
            throw new Error(`Task category "${category.id}" contains a non-object task.`);
        }

        if (typeof task.id !== 'string' || task.id.trim().length === 0) {
            throw new Error(`Task category "${category.id}" contains a task without id.`);
        }

        if (typeof task.type !== 'string' || task.type.trim().length === 0) {
            throw new Error(`Task "${task.id}" has no type.`);
        }

        if (ids.has(task.id)) {
            throw new Error(`Task category "${category.id}" has duplicate task id "${task.id}".`);
        }

        ids.add(task.id);
    });
}

const categoryMap = new Map();

CATEGORIES.forEach((category) => {
    validateCategory(category);
    categoryMap.set(category.id, category);
});

export const TaskCatalog = {
    categories: CATEGORIES,

    getCategory(categoryId) {
        return categoryMap.get(categoryId) ?? null;
    },

    getTasks(poolIds) {
        return normalizePoolIds(poolIds).flatMap((poolId) => {
            const category = this.getCategory(poolId);

            if (!category) {
                throw new Error(`Unknown task category: ${poolId}`);
            }

            return category.tasks.map((entry) => ({
                ...entry,
                poolId
            }));
        });
    },

    getTaskIds(poolIds) {
        return this.getTasks(poolIds).map((task) => task.id);
    }
};
