import { t } from '../../i18n/index.js';
import { sequenceNextVariants } from '../task-data/sequence-next-variants.js';
import { createChoiceGrid, createTaskIntro } from '../task-ui-helpers.js';

function pickVariant(random) {
    const index = Math.floor(random() * sequenceNextVariants.length);
    return sequenceNextVariants[index];
}

export const SequenceNextTask = {
    type: 'sequence-next',

    createTask({ random, entry = {} }) {
        const variant = entry.variant ?? pickVariant(random);
        return {
            id: entry.id ?? `${this.type}-${variant.id}`,
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
        const intro = createTaskIntro(task.instructions);
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

        const choices = createChoiceGrid(task, onSolved, setStatus);
        container.append(intro, series, choices);
    }
};
