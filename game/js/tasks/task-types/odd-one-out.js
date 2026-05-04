import { t } from '../../i18n/index.js';
import { oddOneOutVariants } from '../task-data/odd-one-out-variants.js';
import { createChoiceGrid, createTaskIntro } from '../task-ui-helpers.js';

function pickVariant(random) {
    const index = Math.floor(random() * oddOneOutVariants.length);
    return oddOneOutVariants[index];
}

function createChoice(item) {
    if (item && typeof item === 'object') {
        return { id: item.id, label: item.label };
    }
    return { id: item, label: item };
}

function shuffleArray(array, random) {
    const result = array.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

export const OddOneOutTask = {
    type: 'odd-one-out',

    createTask({ random, entry = {} }) {
        const variant = entry.variant ?? pickVariant(random);
        const shuffledItems = shuffleArray(variant.items, random);
        return {
            id: entry.id ?? `${this.type}-${variant.id}`,
            type: this.type,
            prompt: t('taskUi.oddOneOutPrompt'),
            instructions: t('taskUi.oddOneOutInstructions'),
            reward: { stars: 1 },
            choices: shuffledItems.map(createChoice),
            correctChoiceId: variant.correctChoiceId
        };
    },

    render({ task, container, setStatus, onSolved }) {
        const intro = createTaskIntro(task.instructions);
        const choices = createChoiceGrid(task, onSolved, setStatus, 'task-options-grid--odd-one-out', 'task-option-btn--symbol');

        container.append(intro, choices);
    }
};
