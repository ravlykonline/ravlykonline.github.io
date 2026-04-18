import { t } from '../../i18n/index.js';
import { sequenceNextVariants } from '../task-data/sequence-next-variants.js';

function pickVariant(random) {
    const index = Math.floor(random() * sequenceNextVariants.length);
    return sequenceNextVariants[index];
}

export const SequenceNextTask = {
    type: 'sequence-next',

    createTask({ random }) {
        const variant = pickVariant(random);
        return {
            id: `${this.type}-${variant.id}`,
            type: this.type,
            prompt: t('taskUi.sequencePrompt'),
            instructions: t('taskUi.sequenceInstructions'),
            reward: { stars: 1 },
            series: variant.series,
            choices: variant.choices.map((choice) => ({ id: choice, label: choice })),
            correctChoiceId: variant.correctChoiceId
        };
    },

    render({ task, container, setStatus, onSolved }) {
        const intro = document.createElement('p');
        intro.className = 'task-intro';
        intro.textContent = task.instructions;

        const series = document.createElement('div');
        series.className = 'task-sequence';

        task.series.forEach((item) => {
            const chip = document.createElement('span');
            chip.className = 'task-token task-token--display';
            chip.textContent = item;
            series.appendChild(chip);
        });

        const questionChip = document.createElement('span');
        questionChip.className = 'task-token task-token--question';
        questionChip.textContent = '?';
        series.appendChild(questionChip);

        const choices = document.createElement('div');
        choices.className = 'task-options-grid';

        task.choices.forEach((choice) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'task-option-btn';
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

        container.append(intro, series, choices);
    }
};

function disableChoiceButtons(container) {
    container.querySelectorAll('button').forEach((button) => {
        button.disabled = true;
    });
}
