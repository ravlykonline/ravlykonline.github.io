import { t } from '../../i18n/index.js';
import { oddOneOutVariants } from '../task-data/odd-one-out-variants.js';
import { createChoiceGrid, createTaskIntro } from '../task-ui-helpers.js';

function pickVariant(random) {
    const index = Math.floor(random() * oddOneOutVariants.length);
    return oddOneOutVariants[index];
}

function createChoice(item) {
    if (item && typeof item === 'object') {
        return {
            id: item.id,
            label: item.label
        };
    }

    return { id: item, label: item };
}

export const OddOneOutTask = {
    type: 'odd-one-out',

    createTask({ random, entry = {} }) {
        const variant = entry.variant ?? pickVariant(random);
        return {
            id: entry.id ?? `${this.type}-${variant.id}`,
            type: this.type,
            prompt: t('taskUi.oddOneOutPrompt'),
            instructions: t('taskUi.oddOneOutInstructions'),
            reward: { stars: 1 },
            choices: variant.items.map(createChoice),
            correctChoiceId: variant.correctChoiceId
        };
    },

    render({ task, container, setStatus, onSolved }) {
        const intro = createTaskIntro(task.instructions);
        const choices = createChoiceGrid(task, onSolved, setStatus, '', 'task-option-btn--word');

        container.append(intro, choices);
    }
};
