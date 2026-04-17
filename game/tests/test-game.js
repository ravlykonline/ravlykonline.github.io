import { TaskPicker } from '../js/game/task-picker.js';
import { approach, normalizeAngleDifference, updateAngle } from '../js/core/motion.js';
import { isNpcWithinRange, shouldCollectApple, pickNearestByDistance } from '../js/game/rules.js';

const results = document.getElementById('results');
const summary = document.getElementById('summary');
const testResults = [];

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function test(name, run) {
    try {
        run();
        testResults.push({ name, ok: true });
    } catch (error) {
        testResults.push({ name, ok: false, error: error.message });
    }
}

test('TaskPicker вибирає перше завдання при random=0', () => {
    const tasks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const selected = TaskPicker.pickRandomTask(tasks, () => 0);
    assert(selected.id === 'a', 'Очікувалось перше завдання.');
});

test('TaskPicker вибирає останнє завдання при random близькому до 1', () => {
    const tasks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const selected = TaskPicker.pickRandomTask(tasks, () => 0.99);
    assert(selected.id === 'c', 'Очікувалось останнє завдання.');
});

test('approach рухається до цілі без перескоку', () => {
    assert(approach(0, 1, 0.2) === 0.2, 'Потрібен крок до цілі.');
    assert(approach(0.95, 1, 0.2) === 1, 'Значення не повинно перескакувати ціль.');
});

test('normalizeAngleDifference вибирає короткий шлях повороту', () => {
    assert(normalizeAngleDifference(270) === -90, '270 градусів мають скорочуватись до -90.');
    assert(normalizeAngleDifference(-270) === 90, '-270 градусів мають скорочуватись до 90.');
});

test('updateAngle плавно наближає кут до цільового', () => {
    const next = updateAngle(0, 90, 0.2, 0.8);
    assert(next > 0 && next < 90, 'Кут має змінюватись плавно, а не стрибком.');
});

test('isNpcWithinRange повертає true тільки в межах радіуса', () => {
    assert(isNpcWithinRange(100, 120) === true, 'NPC в радіусі має бути доступний.');
    assert(isNpcWithinRange(121, 120) === false, 'NPC поза радіусом не має бути доступний.');
});

test('shouldCollectApple враховує радіус гравця', () => {
    assert(shouldCollectApple(20, 20) === true, 'Близьке яблуко має збиратись.');
    assert(shouldCollectApple(40, 20) === false, 'Далеке яблуко не має збиратись.');
});

test('pickNearestByDistance повертає найближчий елемент', () => {
    const items = [{ id: 'far', d: 10 }, { id: 'near', d: 2 }, { id: 'mid', d: 5 }];
    const nearest = pickNearestByDistance(items, (item) => item.d);
    assert(nearest.id === 'near', 'Потрібно повернути найближчий елемент.');
});

function renderResults() {
    const failed = testResults.filter((result) => !result.ok);
    summary.textContent = failed.length === 0
        ? `Усі ${testResults.length} тестів пройшли`
        : `${failed.length} з ${testResults.length} тестів не пройшли`;
    summary.className = `summary ${failed.length === 0 ? 'pass' : 'fail'}`;

    testResults.forEach((result) => {
        const item = document.createElement('li');
        item.className = result.ok ? 'pass' : 'fail';
        item.textContent = result.ok ? `PASS: ${result.name}` : `FAIL: ${result.name} — ${result.error}`;
        results.appendChild(item);
    });
}

renderResults();
