import { t } from '../../i18n/index.js';
import { simpleSubtractionVariants } from '../task-data/simple-subtraction-variants.js';
import { createChoiceGrid, createTaskIntro } from '../task-ui-helpers.js';

function pickVariant(random) {
    const index = Math.floor(random() * simpleSubtractionVariants.length);
    return simpleSubtractionVariants[index];
}

export const SimpleSubtractionTask = {
    type: 'simple-subtraction',

    createTask({ random }) {
        const variant = pickVariant(random);
        return {
            id: `${this.type}-${variant.id}`,
            type: this.type,
            prompt: t('taskUi.simpleSubtractionPrompt'),
            instructions: t('taskUi.simpleSubtractionInstructions'),
            reward: { stars: 1 },
            equation: `${variant.left} - ${variant.right} = ?`,
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
