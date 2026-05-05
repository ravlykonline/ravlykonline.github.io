import { t } from '../../i18n/index.js';
import { createChoiceGrid, createCompareColumns, createTaskIntro } from '../task-ui-helpers.js';
import { compareSetsVariants } from '../task-data/compare-sets-variants.js';

function pickVariant(random) {
    const index = Math.floor(random() * compareSetsVariants.length);
    return compareSetsVariants[index];
}

export const CompareSetsTask = {
    type: 'compare-sets',

    createTask({ random, entry = {} }) {
        const variant = entry.variant ?? pickVariant(random);
        return {
            id: entry.id ?? `${this.type}-${variant.id}`,
            type: this.type,
            prompt: variant.mode === 'less' ? t('taskUi.compareLessPrompt') : t('taskUi.compareMorePrompt'),
            instructions: variant.mode === 'less' ? t('taskUi.compareLessInstructions') : t('taskUi.compareMoreInstructions'),
            reward: { stars: 1 },
            leftCount: variant.leftCount,
            rightCount: variant.rightCount,
            choices: [
                { id: 'left', label: t('taskUi.leftChoice') },
                { id: 'right', label: t('taskUi.rightChoice') }
            ],
            correctChoiceId: variant.correctChoiceId
        };
    },

    render({ task, container, setStatus, onSolved }) {
        const intro = createTaskIntro(task.instructions);
        const groups = createCompareColumns(task.leftCount, task.rightCount);
        const choices = createChoiceGrid(task, onSolved, setStatus);
        container.append(intro, groups, choices);
    }
};
