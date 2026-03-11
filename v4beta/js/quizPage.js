import { QUIZ_BANK, QUIZ_THEME_LABELS } from './quizBank.js';

const QUESTIONS_PER_SET = 10;

const form = document.getElementById('ravlyk-quiz-form');
const questionList = document.getElementById('quiz-question-list');
const themeSelect = document.getElementById('quiz-theme');
const newSetBtn = document.getElementById('quiz-new-set-btn');
const checkBtn = document.getElementById('quiz-check-btn');
const resetBtn = document.getElementById('quiz-reset-btn');
const resultBox = document.getElementById('quiz-result');

let activeSet = [];

function clearFeedback() {
    questionList.querySelectorAll('.quiz-question').forEach((questionNode) => {
        questionNode.classList.remove('is-correct', 'is-incorrect', 'is-unanswered');
    });

    questionList.querySelectorAll('.quiz-option').forEach((optionNode) => {
        optionNode.classList.remove('is-correct', 'is-incorrect', 'is-correct-answer');
    });

    resultBox.classList.remove('is-success', 'is-warning', 'is-info');
    resultBox.dataset.mode = 'idle';
}

function shuffle(arr) {
    const cloned = [...arr];
    for (let i = cloned.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    return cloned;
}

function takeRandomQuestions(themeKey, count) {
    const pool = QUIZ_BANK[themeKey] || [];
    return shuffle(pool).slice(0, Math.min(count, pool.length));
}

function normalizeQuestion(question) {
    const optionEntries = question.options.map((text, originalIndex) => ({ text, originalIndex }));
    const shuffled = shuffle(optionEntries);
    const correctIndex = shuffled.findIndex((item) => item.originalIndex === question.answer);
    return {
        q: question.q,
        options: shuffled.map((item) => item.text),
        answer: correctIndex,
    };
}

function buildQuestionNode(question, index) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'quiz-question';
    fieldset.dataset.questionIndex = String(index);

    const legend = document.createElement('legend');
    legend.textContent = `${index + 1}) ${question.q}`;
    fieldset.appendChild(legend);

    question.options.forEach((optionText, optionIndex) => {
        const label = document.createElement('label');
        label.className = 'quiz-option';
        label.dataset.optionIndex = String(optionIndex);

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `q${index}`;
        input.value = String(optionIndex);

        const text = document.createElement('span');
        text.className = 'quiz-option-text';
        text.textContent = optionText;

        label.appendChild(input);
        label.appendChild(text);
        fieldset.appendChild(label);
    });

    return fieldset;
}

function renderSet(themeKey) {
    const themeQuestions = takeRandomQuestions(themeKey, QUESTIONS_PER_SET).map(normalizeQuestion);
    activeSet = themeQuestions;
    questionList.innerHTML = '';
    clearFeedback();

    themeQuestions.forEach((question, index) => {
        questionList.appendChild(buildQuestionNode(question, index));
    });

    resultBox.classList.add('is-info');
    resultBox.dataset.mode = 'generated';
    resultBox.textContent = `Згенеровано новий набір: ${QUIZ_THEME_LABELS[themeKey]} (${themeQuestions.length} питань).`;
}

function collectScore() {
    let score = 0;
    let answered = 0;

    activeSet.forEach((question, index) => {
        const selected = form.querySelector(`input[name="q${index}"]:checked`);
        if (!selected) return;
        answered += 1;
        if (Number(selected.value) === question.answer) score += 1;
    });

    return { score, answered, total: activeSet.length };
}

function feedbackByScore(score, total) {
    const ratio = total > 0 ? score / total : 0;
    if (ratio === 1) return 'Відмінно! Усе правильно.';
    if (ratio >= 0.8) return 'Дуже добре! Ще трохи і буде максимум.';
    if (ratio >= 0.6) return 'Гарний результат. Повтори складні моменти і спробуй ще.';
    return 'Початок є. Переглянь тему і запусти новий набір.';
}

function revealAnswers() {
    activeSet.forEach((question, index) => {
        const questionNode = questionList.querySelector(`.quiz-question[data-question-index="${index}"]`);
        if (!questionNode) return;

        const selected = questionNode.querySelector(`input[name="q${index}"]:checked`);
        const correctOptionNode = questionNode.querySelector(`.quiz-option[data-option-index="${question.answer}"]`);

        if (!selected) {
            questionNode.classList.add('is-unanswered');
            if (correctOptionNode) {
                correctOptionNode.classList.add('is-correct-answer');
            }
            return;
        }

        const selectedOptionNode = selected.closest('.quiz-option');
        if (Number(selected.value) === question.answer) {
            questionNode.classList.add('is-correct');
            if (selectedOptionNode) {
                selectedOptionNode.classList.add('is-correct');
            }
            return;
        }

        questionNode.classList.add('is-incorrect');
        if (selectedOptionNode) {
            selectedOptionNode.classList.add('is-incorrect');
        }
        if (correctOptionNode) {
            correctOptionNode.classList.add('is-correct-answer');
        }
    });
}

newSetBtn.addEventListener('click', () => {
    renderSet(themeSelect.value);
});

themeSelect.addEventListener('change', () => {
    renderSet(themeSelect.value);
});

checkBtn.addEventListener('click', () => {
    const { score, answered, total } = collectScore();
    clearFeedback();
    if (answered < total) {
        revealAnswers();
        resultBox.classList.add('is-warning');
        resultBox.dataset.mode = 'feedback';
        resultBox.textContent = `Відповідай на всі питання: заповнено ${answered} з ${total}.`;
        return;
    }
    revealAnswers();
    resultBox.classList.add(score === total ? 'is-success' : 'is-info');
    resultBox.dataset.mode = 'feedback';
    resultBox.textContent = `Результат: ${score} з ${total}. ${feedbackByScore(score, total)}`;
});

resetBtn.addEventListener('click', () => {
    form.reset();
    clearFeedback();
    resultBox.classList.add('is-info');
    resultBox.dataset.mode = 'reset';
    resultBox.textContent = 'Відповіді скинуто. Можеш перевірити себе знову.';
});

form.addEventListener('change', () => {
    if (resultBox.dataset.mode === 'feedback') {
        clearFeedback();
        resultBox.classList.add('is-info');
        resultBox.dataset.mode = 'edited';
        resultBox.textContent = 'Відповідь змінено. Перевір результат ще раз.';
    }
});

renderSet(themeSelect.value);
