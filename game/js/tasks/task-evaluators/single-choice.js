export function evaluateSingleChoice(task, choiceId) {
    return `${choiceId}` === `${task.correctChoiceId}`;
}
