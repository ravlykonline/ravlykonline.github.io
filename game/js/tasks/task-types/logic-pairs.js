import { t } from '../../i18n/index.js';
import { logicPairsVariants } from '../task-data/logic-pairs-variants.js';
import { createChoiceGrid, createTaskIntro } from '../task-ui-helpers.js';

function pickVariant(random) {
    const index = Math.floor(random() * logicPairsVariants.length);
    return logicPairsVariants[index];
}

export const LogicPairsTask = {
    type: 'logic-pairs',

    createTask({ random, entry = {} }) {
        const variant = entry.variant ?? pickVariant(random);
        return {
            id: entry.id ?? `${this.type}-${variant.id}`,
            type: this.type,
            prompt: t('taskUi.logicPairsPrompt'),
            instructions: t('taskUi.logicPairsInstructions'),
            reward: { stars: 1 },
            pairLabel: variant.promptPair,
            choices: variant.choices.map((choice) => ({ id: choice, label: choice })),
            correctChoiceId: variant.correctChoiceId
        };
    },

    render({ task, container, setStatus, onSolved }) {
        const intro = createTaskIntro(task.instructions);
        const pairCard = document.createElement('div');
        pairCard.className = 'task-card task-card--centered';
        pairCard.textContent = task.pairLabel;

        const choices = createChoiceGrid(task, onSolved, setStatus, 'task-options-grid--wide', 'task-option-btn--word');

        container.append(intro, pairCard, choices);
    }
};
