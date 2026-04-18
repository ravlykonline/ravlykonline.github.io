import { t } from '../../i18n/index.js';
import { createChoiceGrid, createCountDots, createTaskIntro } from '../task-ui-helpers.js';
import { countAndMatchVariants } from '../task-data/count-and-match-variants.js';

function pickVariant(random) {
    const index = Math.floor(random() * countAndMatchVariants.length);
    return countAndMatchVariants[index];
}

export const CountAndMatchTask = {
    type: 'count-and-match',

    createTask({ random }) {
        const variant = pickVariant(random);
        return {
            id: `${this.type}-${variant.id}`,
            type: this.type,
            prompt: t('taskUi.countAndMatchPrompt'),
            instructions: t('taskUi.countAndMatchInstructions'),
            reward: { stars: 1 },
            count: variant.count,
            choices: variant.choices.map((choice) => ({ id: choice, label: choice })),
            correctChoiceId: variant.correctChoiceId
        };
    },

    render({ task, container, setStatus, onSolved }) {
        const intro = createTaskIntro(task.instructions);
        const group = document.createElement('div');
        group.className = 'task-card task-card--centered';
        group.append(createCountDots(task.count));

        const choices = createChoiceGrid(task, onSolved, setStatus);
        container.append(intro, group, choices);
    }
};
