const MAX_CHOICES = 8;
const MAX_REWARD_STARS = 5;

function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isChoiceValue(value) {
    return typeof value === 'string' || typeof value === 'number';
}

function fail(message) {
    throw new Error(`Некоректне завдання: ${message}`);
}

function validateReward(reward) {
    if (!isObject(reward)) {
        fail('немає винагороди.');
    }

    if (!Number.isInteger(reward.stars) || reward.stars < 1 || reward.stars > MAX_REWARD_STARS) {
        fail('кількість зірочок має бути цілим числом від 1 до 5.');
    }
}

function validateChoices(task) {
    if (task.choices === undefined) {
        return;
    }

    if (!Array.isArray(task.choices) || task.choices.length < 2 || task.choices.length > MAX_CHOICES) {
        fail('варіантів відповіді має бути від 2 до 8.');
    }

    if (!isChoiceValue(task.correctChoiceId)) {
        fail('немає правильної відповіді для варіантів.');
    }

    const ids = new Set();

    task.choices.forEach((choice) => {
        if (!isObject(choice)) {
            fail('кожен варіант відповіді має бути обʼєктом.');
        }

        if (!isChoiceValue(choice.id)) {
            fail('кожен варіант відповіді має мати id.');
        }

        if (!isChoiceValue(choice.label)) {
            fail('кожен варіант відповіді має мати підпис.');
        }

        ids.add(`${choice.id}`);
    });

    if (ids.size !== task.choices.length) {
        fail('id варіантів відповіді не мають повторюватися.');
    }

    if (!ids.has(`${task.correctChoiceId}`)) {
        fail('правильна відповідь має бути серед варіантів.');
    }
}

function validateOrderingTask(task) {
    if (task.correctOrder === undefined && task.numbers === undefined) {
        return;
    }

    if (!Array.isArray(task.numbers) || !Array.isArray(task.correctOrder)) {
        fail('задача на впорядкування має містити числа і правильний порядок.');
    }

    if (task.numbers.length === 0 || task.numbers.length !== task.correctOrder.length) {
        fail('кількість чисел має збігатися з кількістю відповідей.');
    }
}

export function validateTask(task, options = {}) {
    const knownTypes = options.knownTypes ?? [];

    if (!isObject(task)) {
        fail('очікувався обʼєкт.');
    }

    if (!isNonEmptyString(task.id)) {
        fail('немає id.');
    }

    if (!isNonEmptyString(task.type)) {
        fail('немає типу.');
    }

    if (knownTypes.length > 0 && !knownTypes.includes(task.type)) {
        fail(`невідомий тип "${task.type}".`);
    }

    if (!isNonEmptyString(task.prompt)) {
        fail('немає короткого запитання.');
    }

    if (!isNonEmptyString(task.instructions)) {
        fail('немає короткої інструкції.');
    }

    validateReward(task.reward);
    validateChoices(task);
    validateOrderingTask(task);

    return task;
}
