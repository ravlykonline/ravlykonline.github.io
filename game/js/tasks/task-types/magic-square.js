import { t } from '../../i18n/index.js';
import { createTaskIntro } from '../task-ui-helpers.js';
import { RewardEffects } from '../../ui/reward-effects.js';
import { evaluateSingleChoice } from '../task-evaluators/single-choice.js';
import { magicSquareVariants } from '../task-data/magic-square-variants.js';

function pickVariant(random) {
    return magicSquareVariants[Math.floor(random() * magicSquareVariants.length)];
}

function normalizeChoice(choice) {
    if (choice && typeof choice === 'object') {
        return { id: choice.id, label: choice.label };
    }
    return { id: choice, label: choice };
}

export const MagicSquareTask = {
    type: 'magic-square',

    createTask({ random = Math.random, entry = {} }) {
        const variant = entry.variant ?? pickVariant(random);

        return {
            id: entry.id ?? `${this.type}-${variant.id}`,
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

        let missingCell = null;

        task.grid.forEach((item) => {
            const cell = document.createElement('span');
            if (item === null) {
                cell.className = 'task-magic-cell task-magic-cell--missing';
                cell.textContent = '?';
                missingCell = cell;
            } else {
                cell.className = 'task-magic-cell';
                cell.textContent = item;
            }
            square.appendChild(cell);
        });

        const choices = document.createElement('div');
        choices.className = 'task-options-grid';

        task.choices.forEach((choice) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'task-option-btn task-option-btn--symbol';
            button.dataset.choiceId = choice.id;
            button.textContent = choice.label;

            button.addEventListener('click', () => {
                if (evaluateSingleChoice(task, choice.id)) {
                    if (missingCell) {
                        missingCell.textContent = choice.label;
                        missingCell.classList.remove('task-magic-cell--missing');
                        missingCell.classList.add('task-magic-cell--revealed');
                    }
                    choices.querySelectorAll('button').forEach((btn) => { btn.disabled = true; });
                    setStatus(t('taskUi.correct'));
                    onSolved();
                    return;
                }

                RewardEffects.playTryAgain();
                setStatus(t('taskUi.magicSquareHint'));
                button.classList.add('is-wrong');
                setTimeout(() => button.classList.remove('is-wrong'), 450);
            });

            choices.appendChild(button);
        });

        container.append(intro, square, choices);
    }
};
