import { t } from '../../i18n/index.js';
import { createChoiceGrid, createTaskIntro } from '../task-ui-helpers.js';

function normalizeChoice(choice) {
    if (choice && typeof choice === 'object') {
        return {
            id: choice.id,
            label: choice.label
        };
    }

    return {
        id: choice,
        label: choice
    };
}

export const MagicSquareTask = {
    type: 'magic-square',

    createTask({ entry = {} }) {
        const variant = entry.variant;

        return {
            id: entry.id,
            type: this.type,
            prompt: t('taskUi.magicSquarePrompt'),
            instructions: t('taskUi.magicSquareInstructions'),
            reward: { stars: 1 },
            grid: variant.grid,
            choices: variant.choices.map(normalizeChoice),
            correctChoiceId: variant.correctChoiceId
        };
    },

    render({ task, container, setStatus, onSolved }) {
        const intro = createTaskIntro(task.instructions);
        intro.classList.add('task-intro--compact');
        const square = document.createElement('div');
        square.className = 'task-magic-square';
        square.setAttribute('aria-label', task.prompt);

        task.grid.forEach((item) => {
            const cell = document.createElement('span');
            cell.className = item === null ? 'task-magic-cell task-magic-cell--missing' : 'task-magic-cell';
            cell.textContent = item === null ? '?' : item;
            square.appendChild(cell);
        });

        const choices = createChoiceGrid(task, onSolved, setStatus, '', 'task-option-btn--symbol');
        container.append(intro, square, choices);
    }
};
