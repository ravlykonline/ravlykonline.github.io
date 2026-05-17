import { t } from '../../i18n/index.js';
import { logicPairsVariants } from '../task-data/logic-pairs-variants.js';
import { createChoiceGrid, createTaskIntro } from '../task-ui-helpers.js';

function pickVariant(random) {
    const index = Math.floor(random() * logicPairsVariants.length);
    return logicPairsVariants[index];
}

function shuffleArray(array, random) {
    const result = array.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

export const LogicPairsTask = {
    type: 'logic-pairs',

    createTask({ random, entry = {} }) {
        const variant = entry.variant ?? pickVariant(random);
        const shuffledChoices = shuffleArray(variant.choices, random);
        return {
            id: entry.id ?? `${this.type}-${variant.id}`,
            type: this.type,
            prompt: t('taskUi.logicPairsPrompt'),
            instructions: t('taskUi.logicPairsInstructions'),
            reward: { stars: 1 },
            promptItem: variant.promptItem,
            choices: shuffledChoices,
            correctChoiceId: variant.correctChoiceId
        };
    },

    render({ task, container, setStatus, onSolved }) {
        const intro = createTaskIntro(task.instructions);

        const promptCard = document.createElement('div');
        promptCard.className = 'task-card task-card--centered task-card--prompt-item';
        promptCard.setAttribute('aria-label', task.instructions);
        promptCard.textContent = task.promptItem;

        const choices = createChoiceGrid(
            task,
            onSolved,
            setStatus,
            'task-options-grid--logic-pairs',
            'task-option-btn--symbol',
            t('taskUi.logicPairsHint')
        );

        container.append(intro, promptCard, choices);
    }
};
