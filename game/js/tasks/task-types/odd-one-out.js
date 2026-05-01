import { t } from '../../i18n/index.js';
import { oddOneOutVariants } from '../task-data/odd-one-out-variants.js';
import { createChoiceGrid, createTaskIntro } from '../task-ui-helpers.js';

function pickVariant(random) {
    const index = Math.floor(random() * oddOneOutVariants.length);
    return oddOneOutVariants[index];
}

export const OddOneOutTask = {
    type: 'odd-one-out',

    createTask({ random }) {
        const variant = pickVariant(random);
        return {
            id: `${this.type}-${variant.id}`,
            type: this.type,
            prompt: t('taskUi.oddOneOutPrompt'),
            instructions: t('taskUi.oddOneOutInstructions'),
            reward: { stars: 1 },
            choices: variant.items.map((item) => ({ id: item, label: item })),
            correctChoiceId: variant.correctChoiceId
        };
    },

    render({ task, container, setStatus, onSolved }) {
        const intro = createTaskIntro(task.instructions);
        const choices = createChoiceGrid(task, onSolved, setStatus, '', 'task-option-btn--word');

        container.append(intro, choices);
    }
};
