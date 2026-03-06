import assert from 'node:assert/strict';
import { QUIZ_BANK, QUIZ_THEME_LABELS } from '../js/quizBank.js';
import { runTest } from './testUtils.js';

runTest('quiz bank exposes expected themes and valid question contracts', () => {
    const themeKeys = Object.keys(QUIZ_BANK);
    assert.deepEqual(themeKeys.sort(), ['basic', 'loops', 'vars']);
    assert.deepEqual(Object.keys(QUIZ_THEME_LABELS).sort(), themeKeys.sort());

    themeKeys.forEach((themeKey) => {
        const questions = QUIZ_BANK[themeKey];
        assert.ok(Array.isArray(questions));
        assert.ok(questions.length >= 10);

        questions.forEach((question) => {
            assert.equal(typeof question.q, 'string');
            assert.ok(question.q.length > 0);
            assert.ok(Array.isArray(question.options));
            assert.ok(question.options.length >= 2);
            assert.equal(Number.isInteger(question.answer), true);
            assert.ok(question.answer >= 0 && question.answer < question.options.length);
        });
    });
});

console.log('Quiz tests completed.');
