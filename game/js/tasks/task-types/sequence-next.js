import { setPictureOrText } from '../../ui/illustrations.js';
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
        const isNumeric = variant.series.every(item => /^\d+$/.test(String(item)));
        return {
            id: entry.id ?? `${this.type}-${variant.id}`,
            type: this.type,
            prompt: t('taskUi.sequencePrompt'),
            instructions: t(isNumeric ? 'taskUi.sequenceInstructions' : 'taskUi.shapePatternInstructions'),
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
            setPictureOrText(chip, item);
            series.appendChild(chip);
        });

        const questionChip = document.createElement('span');
        questionChip.className = 'task-token task-token--question';
        questionChip.textContent = '?';
        series.appendChild(questionChip);

        const hint = task.series.every(item => /^\d+$/.test(String(item)))
            ? 'taskUi.sequenceHint'
            : 'taskUi.shapePatternHint';
        const choices = createChoiceGrid(task, onSolved, setStatus, '', 'task-option-btn--symbol', t(hint));
        container.append(intro, series, choices);
    }
};
