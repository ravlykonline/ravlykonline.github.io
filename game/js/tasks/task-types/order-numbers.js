import { t } from '../../i18n/index.js';
import { orderNumbersVariants } from '../task-data/order-numbers-variants.js';

function pickVariant(list, random) {
    const index = Math.floor(random() * list.length);
    return list[index];
}

export const OrderNumbersTask = {
    type: 'order-numbers',

    createTask({ random, options = {} }) {
        const direction = options.direction === 'desc' ? 'desc' : 'asc';
        const numbers = pickVariant(orderNumbersVariants[direction], random);
        const correctOrder = [...numbers].sort((left, right) => direction === 'desc' ? right - left : left - right);

        return {
            id: `${this.type}-${direction}-${numbers.join('-')}`,
            type: this.type,
            prompt: direction === 'desc' ? t('taskUi.orderDescPrompt') : t('taskUi.orderAscPrompt'),
            instructions: direction === 'desc' ? t('taskUi.orderDescInstructions') : t('taskUi.orderAscInstructions'),
            reward: { stars: 1 },
            direction,
            numbers,
            correctOrder: correctOrder.map((value) => `${value}`)
        };
    },

    render({ task, container, setStatus, onSolved }) {
        let answer = [];

        const intro = document.createElement('p');
        intro.className = 'task-intro';
        intro.textContent = task.instructions;

        const answerLabel = document.createElement('p');
        answerLabel.className = 'task-helper-label';
        answerLabel.textContent = t('taskUi.answerLabel');

        const answerRow = document.createElement('div');
        answerRow.className = 'task-answer-row';

        const bankLabel = document.createElement('p');
        bankLabel.className = 'task-helper-label';
        bankLabel.textContent = t('taskUi.bankLabel');

        const bank = document.createElement('div');
        bank.className = 'task-options-grid';

        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'task-secondary-btn';
        clearButton.textContent = t('taskUi.clearAnswer');
        clearButton.addEventListener('click', () => {
            answer = [];
            renderAnswer();
        });

        task.numbers.forEach((value) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'task-option-btn';
            button.dataset.bankValue = `${value}`;
            button.textContent = `${value}`;

            button.addEventListener('click', () => {
                if (answer.includes(`${value}`)) {
                    return;
                }

                answer = [...answer, `${value}`];
                renderAnswer();

                if (answer.length === task.correctOrder.length) {
                    if (answer.join('|') === task.correctOrder.join('|')) {
                        setStatus(t('taskUi.correct'));
                        disableButtons(bank, clearButton, answerRow);
                        onSolved();
                        return;
                    }

                    setStatus(t('taskUi.orderRetry'));
                    answer = [];
                    renderAnswer();
                }
            });

            bank.appendChild(button);
        });

        const renderAnswer = () => {
            answerRow.innerHTML = '';

            task.correctOrder.forEach((_, index) => {
                const value = answer[index];
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = `task-token ${value ? 'task-token--filled' : 'task-token--slot'}`;
                chip.textContent = value ?? '•';
                chip.disabled = !value;

                if (value) {
                    chip.addEventListener('click', () => {
                        answer = answer.filter((_, answerIndex) => answerIndex !== index);
                        renderAnswer();
                    });
                }

                answerRow.appendChild(chip);
            });

            bank.querySelectorAll('button').forEach((button) => {
                button.disabled = answer.includes(button.dataset.bankValue);
            });
        };

        renderAnswer();
        container.append(intro, answerLabel, answerRow, bankLabel, bank, clearButton);
    }
};

function disableButtons(bank, clearButton, answerRow) {
    bank.querySelectorAll('button').forEach((button) => {
        button.disabled = true;
    });
    answerRow.querySelectorAll('button').forEach((button) => {
        button.disabled = true;
    });
    clearButton.disabled = true;
}
