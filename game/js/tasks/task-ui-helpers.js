import { t } from '../i18n/index.js';
import { evaluateSingleChoice } from './task-evaluators/single-choice.js';
import { RewardEffects } from '../ui/reward-effects.js';

export function createTaskIntro(text) {
    const intro = document.createElement('p');
    intro.className = 'task-intro';
    intro.textContent = text;
    return intro;
}

export function createHelperLabel(text) {
    const label = document.createElement('p');
    label.className = 'task-helper-label';
    label.textContent = text;
    return label;
}

export function createChoiceGrid(task, onSolved, setStatus, extraClassName = '', optionClassName = '') {
    const choices = document.createElement('div');
    choices.className = `task-options-grid ${extraClassName}`.trim();

    task.choices.forEach((choice) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `task-option-btn ${optionClassName}`.trim();
        button.dataset.choiceId = choice.id;
        button.textContent = choice.label;

        button.addEventListener('click', () => {
            if (evaluateSingleChoice(task, choice.id)) {
                RewardEffects.playSuccess();
                setStatus(t('taskUi.correct'));
                disableChoiceButtons(choices);
                onSolved();
                return;
            }

            RewardEffects.playTryAgain();
            setStatus(t('taskUi.tryAgain'));
            button.classList.add('is-wrong');
            setTimeout(() => button.classList.remove('is-wrong'), 450);
        });

        choices.appendChild(button);
    });

    return choices;
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

export function createCompareColumns(leftCount, rightCount) {
    const layout = document.createElement('div');
    layout.className = 'task-compare-layout';

    const leftCard = document.createElement('div');
    leftCard.className = 'task-card task-compare-card task-compare-card--left';
    leftCard.append(createHelperLabel(t('taskUi.leftGroupLabel')), createCountDots(leftCount));

    const rightCard = document.createElement('div');
    rightCard.className = 'task-card task-compare-card task-compare-card--right';
    rightCard.append(createHelperLabel(t('taskUi.rightGroupLabel')), createCountDots(rightCount));

    layout.append(leftCard, rightCard);
    return layout;
}
