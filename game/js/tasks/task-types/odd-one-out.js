import { t } from '../../i18n/index.js';
import { oddOneOutVariants } from '../task-data/odd-one-out-variants.js';

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
        const intro = document.createElement('p');
        intro.className = 'task-intro';
        intro.textContent = task.instructions;

        const choices = document.createElement('div');
        choices.className = 'task-options-grid';

        task.choices.forEach((choice) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'task-option-btn task-option-btn--word';
            button.dataset.choiceId = choice.id;
            button.textContent = choice.label;

            button.addEventListener('click', () => {
                if (choice.id === task.correctChoiceId) {
                    setStatus(t('taskUi.correct'));
                    disableChoiceButtons(choices);
                    onSolved();
                    return;
                }

                setStatus(t('taskUi.tryAgain'));
                button.classList.add('is-wrong');
                setTimeout(() => button.classList.remove('is-wrong'), 450);
            });

            choices.appendChild(button);
        });

        container.append(intro, choices);
    }
};

function disableChoiceButtons(container) {
    container.querySelectorAll('button').forEach((button) => {
        button.disabled = true;
    });
}
