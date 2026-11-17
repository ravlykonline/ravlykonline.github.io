import { setPictureOrText } from '../ui/illustrations.js';
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
        setPictureOrText(button, choice.label);

        button.addEventListener('click', () => {
            if (evaluateSingleChoice(task, choice.id)) {
                setStatus(t('taskUi.correct'));
                button.classList.add('is-correct-reveal');
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
        if (btn.dataset.choiceId === String(correctChoiceId)) {
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
        setPictureOrText(token, item);
        collection.appendChild(token);
    });

    return collection;
}

export function createCountDots(count) {
    const group = document.createElement('div');
    group.className = 'task-dots';
    group.setAttribute('role', 'list');

    for (let index = 0; index < count; index += 1) {
        const dot = document.createElement('span');
        dot.className = 'task-dot';
        dot.setAttribute('role', 'listitem');
        dot.setAttribute('aria-label', t('taskUi.dotLabel'));
        group.appendChild(dot);
    }

    return group;
}

export function createCompareColumns(task, onSolved, setStatus) {
    const layout = document.createElement('div');
    layout.className = 'task-compare-layout';

    for (const [choice, count] of [[task.choices[0], task.leftCount], [task.choices[1], task.rightCount]]) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `task-card task-compare-card task-compare-card--${choice.id} task-compare-group--clickable`;
        card.dataset.choiceId = choice.id;
        card.setAttribute('aria-label', t('taskUi.compareGroupLabel', { side: choice.label, count }));
        const label = document.createElement('span');
        label.className = 'task-helper-label';
        label.textContent = choice.label;
        const dots = createCountDots(count);
        dots.setAttribute('aria-hidden', 'true');
        card.append(label, dots);
        card.addEventListener('click', () => {
            if (evaluateSingleChoice(task, choice.id)) {
                card.classList.add('task-compare-group--correct');
                setStatus(t('taskUi.correct'));
                disableChoiceButtons(layout);
                onSolved();
            } else {
                RewardEffects.playTryAgain();
                setStatus(t('taskUi.compareSetsHint'));
                card.classList.add('task-compare-group--wrong');
                setTimeout(() => card.classList.remove('task-compare-group--wrong'), 400);
            }
        });
        layout.append(card);
    }

    return layout;
}
