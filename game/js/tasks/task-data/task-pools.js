import { TaskCatalog } from '../task-catalog.js';

export const taskPools = Object.fromEntries(
    TaskCatalog.categories.map((category) => [category.id, category.tasks])
);
