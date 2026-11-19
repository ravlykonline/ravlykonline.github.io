import { QUIZ_BANK, QUIZ_THEME_LABELS } from './quizBank.js';

const QUESTIONS_PER_SET = 10;

const form = document.getElementById('ravlyk-quiz-form');
const questionList = document.getElementById('quiz-question-list');
const themeSelect = document.getElementById('quiz-theme');
const newSetBtn = document.getElementById('quiz-new-set-btn');
const checkBtn = document.getElementById('quiz-check-btn');
const resetBtn = document.getElementById('quiz-reset-btn');
const resultBox = document.getElementById('quiz-result');
const progressFill = document.getElementById('quiz-progress-fill');
const progressText = document.getElementById('quiz-progress-text');
const OPTION_LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];

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
    const num = document.createElement('span');
    num.className = 'quiz-question-num';
    num.setAttribute('aria-hidden', 'true');
    num.textContent = String(index + 1);
    legend.appendChild(num);
    legend.appendChild(document.createTextNode(question.q));
    fieldset.appendChild(legend);

    question.options.forEach((optionText, optionIndex) => {
        const label = document.createElement('label');
        label.className = 'quiz-option';
        label.dataset.optionIndex = String(optionIndex);

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `q${index}`;
        input.value = String(optionIndex);

        const letter = document.createElement('span');
        letter.className = 'quiz-option-letter';
        letter.setAttribute('aria-hidden', 'true');
        letter.textContent = OPTION_LETTERS[optionIndex] || String(optionIndex + 1);

        const text = document.createElement('span');
        text.className = 'quiz-option-text';
        text.textContent = optionText;

        label.appendChild(input);
        label.appendChild(letter);
        label.appendChild(text);
        fieldset.appendChild(label);
    });

    return fieldset;
}

function updateProgress() {
    const total = activeSet.length;
    const answered = activeSet.filter((_, index) => form.querySelector(`input[name="q${index}"]:checked`)).length;
    progressFill.style.inlineSize = total > 0 ? `${Math.round((answered / total) * 100)}%` : '0%';
    progressText.textContent = `Відповіли: ${answered} з ${total}`;
}

function renderSet(themeKey) {
    const themeQuestions = takeRandomQuestions(themeKey, QUESTIONS_PER_SET).map(normalizeQuestion);
    activeSet = themeQuestions;
    questionList.innerHTML = '';
    clearFeedback();

    themeQuestions.forEach((question, index) => {
        questionList.appendChild(buildQuestionNode(question, index));
    });

    updateProgress();
    resultBox.classList.add('is-info');
    resultBox.dataset.mode = 'generated';
    resultBox.textContent = `Тема: ${QUIZ_THEME_LABELS[themeKey]} (${themeQuestions.length} питань). Удачі!`;
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
    if (ratio === 1) return '🏆 Відмінно! Усе правильно — ти справжній майстер Равлика!';
    if (ratio >= 0.8) return '🌟 Дуже добре! Ще трохи — і буде максимум.';
    if (ratio >= 0.6) return '👍 Гарний результат. Повтори складні моменти і спробуй ще.';
    return '🐌 Початок є! Переглянь урок і спробуй нові питання — у тебе вийде.';
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
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

resetBtn.addEventListener('click', () => {
    form.reset();
    clearFeedback();
    resultBox.classList.add('is-info');
    resultBox.dataset.mode = 'reset';
    resultBox.textContent = 'Відповіді скинуто. Можеш спробувати ще раз!';
    updateProgress();
});

form.addEventListener('change', () => {
    updateProgress();
    if (resultBox.dataset.mode === 'feedback') {
        clearFeedback();
        resultBox.classList.add('is-info');
        resultBox.dataset.mode = 'edited';
        resultBox.textContent = 'Відповідь змінено. Перевір результат ще раз.';
    }
});

renderSet(themeSelect.value);
