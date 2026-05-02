import { t } from '../../i18n/index.js';
import { createChoiceGrid, createTaskIntro } from '../task-ui-helpers.js';
import { simpleAdditionVariants } from '../task-data/simple-addition-variants.js';

function pickVariant(random) {
    const index = Math.floor(random() * simpleAdditionVariants.length);
    return simpleAdditionVariants[index];
}

export const SimpleAdditionTask = {
    type: 'simple-addition',

    createTask({ random, entry = {} }) {
        const variant = entry.variant ?? pickVariant(random);
        return {
            id: entry.id ?? `${this.type}-${variant.id}`,
            type: this.type,
            prompt: t('taskUi.simpleAdditionPrompt'),
            instructions: t('taskUi.simpleAdditionInstructions'),
            reward: { stars: 1 },
            equation: `${variant.left} + ${variant.right} = ?`,
            choices: variant.choices.map((choice) => ({ id: choice, label: choice })),
            correctChoiceId: variant.correctChoiceId
        };
    },

    render({ task, container, setStatus, onSolved }) {
        const intro = createTaskIntro(task.instructions);
        const equation = document.createElement('div');
        equation.className = 'task-equation';
        equation.textContent = task.equation;

        const choices = createChoiceGrid(task, onSolved, setStatus);
        container.append(intro, equation, choices);
    }
};
