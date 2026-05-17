import { t } from '../i18n/index.js';
import { evaluateSingleChoice } from './task-evaluators/single-choice.js';
import { RewardEffects } from '../ui/reward-effects.js';

export function createTaskIntro(text) {
    const intro = document.createElement('p');
    intro.className = 'task-intro task-intro--compact';
    intro.textContent = text;
    return intro;
}

export function createHelperLabel(text) {
    const label = document.createElement('p');
    label.className = 'task-helper-label';
    label.textContent = text;
    return label;
}

export function createChoiceGrid(task, onSolved, setStatus, extraClassName = '', optionClassName = '', wrongMessage = null) {
    const choices = document.createElement('div');
    choices.className = `task-options-grid ${extraClassName}`.trim();
    let wrongAttempts = 0;

    task.choices.forEach((choice) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `task-option-btn ${optionClassName}`.trim();
        button.dataset.choiceId = choice.id;
        button.textContent = choice.label;

        button.addEventListener('click', () => {
            if (evaluateSingleChoice(task, choice.id)) {
                setStatus(t('taskUi.correct'));
                disableChoiceButtons(choices);
                onSolved();
                return;
            }

            wrongAttempts += 1;
            RewardEffects.playTryAgain();
            button.classList.add('is-wrong');
            setTimeout(() => button.classList.remove('is-wrong'), 450);

            // After 2+ wrong attempts show a task-specific hint, after 4+ reveal the answer
            if (wrongAttempts >= 4) {
                revealCorrectAnswer(choices, task.correctChoiceId);
                setStatus(t('taskUi.answerRevealed'));
            } else if (wrongAttempts >= 2) {
                setStatus(wrongMessage !== null ? wrongMessage : t('taskUi.tryAgain'));
            } else {
                setStatus(t('taskUi.tryAgain'));
            }
        });

        choices.appendChild(button);
    });

    return choices;
}

function revealCorrectAnswer(container, correctChoiceId) {
    container.querySelectorAll('button').forEach((btn) => {
        if (btn.dataset.choiceId === correctChoiceId) {
            btn.classList.add('is-correct-reveal');
        } else {
            btn.disabled = true;
            btn.classList.add('is-dimmed');
        }
    });
}

export function disableChoiceButtons(container) {
    container.querySelectorAll('button').forEach((button) => {
        button.disabled = true;
    });
}

export function createVisualCollection(items) {
    const collection = document.createElement('div');
    collection.className = 'task-collection';

    items.forEach((item) => {
        const token = document.createElement('span');
        token.className = 'task-token task-token--display';
        token.textContent = item;
        collection.appendChild(token);
    });

    return collection;
}

export function createCountDots(count) {
    const group = document.createElement('div');
    group.className = 'task-dots';

    for (let index = 0; index < count; index += 1) {
        const dot = document.createElement('span');
        dot.className = 'task-dot';
        dot.setAttribute('aria-hidden', 'true');
        group.appendChild(dot);
    }

    return group;
}

export function createCompareColumns(leftCount, rightCount, task = null, onSolved = null, setStatus = null) {
    const layout = document.createElement('div');
    layout.className = 'task-compare-layout';

    const leftCard = document.createElement('div');
    leftCard.className = 'task-card task-compare-card task-compare-card--left task-compare-group--clickable';
    leftCard.append(createHelperLabel(t('taskUi.leftGroupLabel')), createCountDots(leftCount));

    const rightCard = document.createElement('div');
    rightCard.className = 'task-card task-compare-card task-compare-card--right task-compare-group--clickable';
    rightCard.append(createHelperLabel(t('taskUi.rightGroupLabel')), createCountDots(rightCount));

    if (task && onSolved && setStatus) {
        function handleGroupChoice(choiceId, card) {
            if (evaluateSingleChoice(task, choiceId)) {
                card.classList.add('task-compare-group--correct');
                setStatus(t('taskUi.correct'));
                onSolved();
            } else {
                RewardEffects.playTryAgain();
                setStatus(t('taskUi.compareSetsHint'));
                card.classList.add('task-compare-group--wrong');
                setTimeout(() => card.classList.remove('task-compare-group--wrong'), 400);
            }
        }

        [leftCard, rightCard].forEach((card) => {
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            const choiceId = card.classList.contains('task-compare-card--left') ? 'left' : 'right';
            card.addEventListener('click', () => handleGroupChoice(choiceId, card));
            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleGroupChoice(choiceId, card);
                }
            });
        });
    }

    layout.append(leftCard, rightCard);
    return layout;
}
